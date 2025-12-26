const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');
const { Shortleave } = require('./Shortleave');

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // in meters
    return distance;
}

function addMinutes(timeStr, minutes) {
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m, 0, 0);
    date.setMinutes(date.getMinutes() + Number(minutes));

    return date.toTimeString().slice(0, 5); // HH:mm
}


router.post('/Attendancemark', async (req, res) => {
    const { type, userData, latitude, longitude, attendanceType = "", employeeId = "0", attendanceTime = "", attendanceDate = "", reason = "", liveFaceRecognition = 0 } = req.body;

    const currentDate = attendanceDate ? new Date(`${attendanceDate}T00:00:00`) : new Date();
    const formattedTime = attendanceTime || `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;


    let decodedUserData = null;
    let IpHandal = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (!latitude || !longitude) {
        return res.status(200).json({ status: false, message: 'Location are required' });
    }
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    if (!decodedUserData || !decodedUserData.company_id || !decodedUserData.id || !type) {
        return res.status(400).json({ status: false, error: 'company_id, id, and type are required' });
    }
    let empId = attendanceType == "hr" && employeeId && employeeId != "0" ? employeeId : decodedUserData.id;
    let companyId = decodedUserData.company_id;
    let applyBy = 0;

    if (empId != decodedUserData.id) {
        applyBy = decodedUserData.id;
    }

    try {
        const employeeResults = await queryDb('SELECT attendance_rules_id,branch_id ,work_week_id FROM employees WHERE employee_status=1 and status=1 and delete_status=0 and  id = ? AND company_id = ?', [empId, companyId]);

        if (employeeResults.length === 0) {
            return res.status(500).json({ status: false, message: 'Employee not found' });
        }

        let empbranch_id = employeeResults[0].branch_id;
        if (empbranch_id != 0 && attendanceType != "hr") {
            const branchResults = await queryDb('SELECT id, company_id, name, location_status, latitude, longitude, radius, ip, ip_status,status,location_required,location_break FROM branches WHERE id = ? AND company_id = ? AND status=1', [employeeResults[0].branch_id, companyId]);
            if (branchResults.length === 0) {

            } else {
                if (branchResults[0].ip_status == 1 && branchResults[0].ip != IpHandal) {
                    return res.status(200).json({ status: false, message: 'You are not allowed to mark attendance from this IP address.' });
                }
                if (branchResults[0].location_status == 1
                    && ((branchResults[0].location_required == 1 && (type == 'in' || type == 'out')) || (branchResults[0].location_required == 2 && type == 'in') || (branchResults[0].location_required == 3 && type == 'out')
                        || ((branchResults[0].location_break == 1 && (type == 'Start_break' || type == 'End_break')) || (branchResults[0].location_break == 2 && type == 'Start_break') || (branchResults[0].location_break == 3 && type == 'End_break')))
                ) {
                    const distance = getDistanceFromLatLonInMeters(latitude, longitude, branchResults[0].latitude, branchResults[0].longitude);
                    if (distance > branchResults[0].radius) {
                        return res.status(200).json({
                            status: false,
                            message: `You are outside the allowed attendance radius. Allowed: ${branchResults[0].radius} meters, Your Distance: ${Math.round(distance)} meters.`
                        });
                    }
                }
            }
        }

        const rulesResults = await queryDb('SELECT in_time,out_time,out_time_required,max_working_hours,working_hours_required,half_day,penalty_rule_applied,late_coming_penalty,last_in_time,early_leaving_penalty,last_out_time,in_grace_period_minutes FROM attendance_rules WHERE rule_id = ? AND company_id = ?', [employeeResults[0].attendance_rules_id, companyId]);
        const rule = rulesResults.length > 0 ? rulesResults[0] : { in_time: '09:30', out_time: '18:30' };

        let dailyStatus = '';
        let timeCount = '';

        if (type === 'in') {
            const inTimeFormatted = rule.in_time ? `${String(rule.in_time).padStart(5, '0')}` : `${String('09:30').padStart(5, '0')}`;
            let late_coming_leaving = 0;
            if (inTimeFormatted > formattedTime) {
                dailyStatus = 'Early';
                timeCount = trackTime(inTimeFormatted, formattedTime);
            } else if (inTimeFormatted < formattedTime) {
                dailyStatus = 'Late';
                timeCount = trackTime(inTimeFormatted, formattedTime);
            } else {
                dailyStatus = 'On Time';
                timeCount = '00:00';
            }


            const attendanceResults = await queryDb('SELECT attendance_id FROM attendance WHERE employee_id = ? AND company_id = ? AND attendance_date = CURDATE()', [empId, companyId]);
            if (attendanceResults.length > 0) {
                return res.status(400).json({ status: false, message: 'Attendance for today is already marked as in.' });
            }
            
            let empAttendanceStatus = 'Present';
            ////neew addd////
            if (rule?.penalty_rule_applied == 1) {
                // Late Coming Penalty Check
                if (rule?.in_grace_period_minutes) {
                    // office time + grace minutes
                    const allowedTime = addMinutes(
                        inTimeFormatted,
                        rule?.in_grace_period_minutes
                    );
                    // If employee comes after allowed time
                    if (formattedTime > allowedTime) {
                        late_coming_leaving = 1;
                    }
                }
                if (rule?.late_coming_penalty == 1 && rule?.last_in_time && rule?.last_in_time != '00:00:00') {
                    const lastInTimeFormatted = String(rule.last_in_time).padStart(5, '0');
                    // If employee comes after allowed late time
                    if (formattedTime && lastInTimeFormatted < formattedTime) {
                        empAttendanceStatus = "half-day";
                    }
                }


            }

            ////neew addd////


            let attendanceCheckInsert = await queryDb('INSERT INTO attendance (status,in_latitude, in_longitude, daily_status_in, daily_status_intime, employee_id, company_id, attendance_date, check_in_time, in_ip,branch_id_in,apply_by,reason,late_coming_leaving) VALUES (?,?,?, ?, ?, ?, ?,CURDATE(), ?,  ?, ?,?,?,?)',
                [empAttendanceStatus, latitude, longitude, dailyStatus, timeCount, empId, companyId, formattedTime, IpHandal, empbranch_id, applyBy, reason, late_coming_leaving]);
            if (!attendanceCheckInsert || !attendanceCheckInsert.insertId) {

                return res.status(500).json({ status: false, message: 'Failed to mark attendance. Please try again.', error: attendanceCheckInsert });
            } else {
                return res.status(200).json({ status: true, message: `Attendance marked as 'in' at ${formattedTime}.` });
            }


        } else if (type === 'out') {
            const checkInResults = await queryDb('SELECT attendance_id,status,check_in_time,attendance_date FROM attendance WHERE employee_id = ? AND company_id = ? AND attendance_date = CURDATE()', [empId, companyId]);
            if (checkInResults.length === 0) {
                return res.status(400).json({ status: false, message: 'No check-in found for today. Please check in first.' });
            }
            const checkInTime = checkInResults[0].check_in_time;
            const checkStatus = checkInResults[0]?.status;
            const attendanceDate = checkInResults[0].attendance_date;
            let duration = '00:00';
            // Calculate total break duration --start
            let breakDurationMillis = 0;
            try {
                // Check attendance
                if (checkInResults.length > 0 && checkInResults[0].attendance_id) {
                    const attendanceId = checkInResults[0].attendance_id;
                    // Get all valid breaks
                    const breakLogs = await queryDb(
                        'SELECT start_time, end_time FROM break_logs WHERE attendance_id = ? AND start_time IS NOT NULL AND end_time IS NOT NULL',
                        [attendanceId]
                    );


                    // Check if any active break is still running
                    const activeBreak = await queryDb(
                        'SELECT start_time FROM break_logs WHERE employee_id = ? AND company_id = ? AND (end_time IS NULL OR end_time = ?) AND DATE(created) = CURDATE() ORDER BY created DESC LIMIT 1',
                        [empId, companyId, '00:00:00']
                    );

                    if (activeBreak.length > 0) {
                        return res.status(400).json({
                            status: false,
                            message: 'Active break found. Please end the break first.'
                        });
                    }

                    // Calculate total break duration
                    for (const breakLog of breakLogs) {
                        const breakStart = new Date(`1970-01-01T${breakLog.start_time}`);
                        const breakEnd = new Date(`1970-01-01T${breakLog.end_time}`);

                        if (isNaN(breakStart.getTime()) || isNaN(breakEnd.getTime())) {
                            console.warn("Skipping invalid break time:", breakLog);
                            continue;
                        }
                        breakDurationMillis += breakEnd - breakStart;
                    }
                }
                // Now calculate total working duration excluding breaks
                duration = await calculateDuration(checkInTime, formattedTime, breakDurationMillis);

            } catch (error) {
                return res.status(500).json({
                    status: false,
                    message: 'Something went wrong while calculating break duration'
                });
            }


            const outTimeFormatted = rule.out_time ? `${String(rule.out_time).padStart(5, '0')}` : `${String('18:30').padStart(5, '0')}`;
            // const maxWorkingHours = rulesResults[0]?.max_working_hours || 8;
            const maxWorkingHours = rulesResults[0]?.working_hours_required == 0 ? 0 : rulesResults[0]?.max_working_hours || 8;

            const halfDayHours = rulesResults[0]?.half_day || 0;

            let attendanceStatus = 0;
            let statusValue = checkStatus;
            const numericDuration = parseDuration(duration)

            if (numericDuration <= maxWorkingHours) {
                attendanceStatus = 0;
            }

            let halfDayDuration = halfDayHours + 0.5;
            if (companyId == 10) {
                //+4:45 hours
                halfDayDuration = halfDayHours + 4.0;
            }

            if (numericDuration >= halfDayHours && numericDuration <= halfDayDuration && halfDayHours != 0) {
                attendanceStatus = 1;
                statusValue = 'half-day';
            }

            if (numericDuration >= maxWorkingHours) {
                attendanceStatus = 1;
            }
            // new 
            if (rule?.out_time_required == 0) {
                attendanceStatus = 1;
                statusValue = 'Present';
            }



            let isWeeklyOffNew = false;
            if (attendanceStatus == 0 || (attendanceStatus == 1 && statusValue == "half-day")) {
                const dateObj = new Date(attendanceDate);
                const dayOfWeek = dateObj.getDay();

                const weekNumber = Math.ceil(dateObj.getDate() / 7);

                const daysOfWeek = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
                const dayKey = `${daysOfWeek[dayOfWeek]}${weekNumber}`;

                //// Whitelist allowed column names (safety check)
                let query = `SELECT \`${dayKey}\` AS dayValue FROM work_week WHERE id = ? AND company_id = ?`;

                const workWeekResult = await queryDb(query, [employeeResults[0].work_week_id, companyId]);

                if (workWeekResult.length > 0) {
                    const isWeeklyOff = workWeekResult[0]?.dayValue == 2;

                    if (isWeeklyOff) {
                        isWeeklyOffNew = true;
                        if (numericDuration >= halfDayHours) {
                            attendanceStatus = 1;
                            statusValue = "Present";
                        }

                    }
                }
            }


            //  ////last_in_time

            // ///last_out_time
            if (rule?.penalty_rule_applied == 1 && !isWeeklyOffNew) {

                // Early Leaving Penalty Check
                if (rule?.early_leaving_penalty == 1 && rule?.last_out_time && rule?.last_out_time !== '00:00:00') {
                    const lastOutTimeFormatted = String(rule?.last_out_time).padStart(5, '0');

                    // If employee leaves before required out time
                    if (formattedTime && lastOutTimeFormatted > formattedTime) {
                        if (attendanceStatus == 1 && statusValue === "Present") {
                            statusValue = "half-day";
                        } else if (attendanceStatus == 0 && numericDuration >= halfDayHours) {
                            statusValue = "half-day";
                            attendanceStatus = 1;
                        }
                    }
                }
            }


            if (rule?.out_time_required == 0) {
                dailyStatus = 'On  Time';
                timeCount = '00:00';
            } else {
                if (outTimeFormatted > formattedTime) {
                    dailyStatus = 'Early';
                    timeCount = trackTime(outTimeFormatted, formattedTime);
                } else if (outTimeFormatted < formattedTime) {
                    dailyStatus = 'Late';
                    timeCount = trackTime(outTimeFormatted, formattedTime);
                } else {
                    dailyStatus = 'On Time';
                    timeCount = '00:00';
                }
            }
            //short leave check
            if (statusValue == "half-day" || (attendanceStatus == 0 && statusValue == "Present")) {

                const shortleaveResult = await Shortleave({
                    employee_id: empId,
                    company_id: companyId,
                    attendance_date: currentDate,
                    duration: numericDuration,
                    statusValue,
                    attendanceStatus,
                    attendance_id: checkInResults[0].attendance_id,
                    formattedTime,
                    checkInTime,
                    checkOutTime: formattedTime,
                    empInTime: rule.in_time,
                    empOutTime: rule.out_time,
                });


                if (shortleaveResult && shortleaveResult.status) {
                    attendanceStatus = shortleaveResult.attendanceStatusNew;
                    statusValue = shortleaveResult.attendanceStatusNewValue;
                }

            }

            await queryDb('UPDATE attendance SET attendance_status=?,status=?,out_latitude=?, out_longitude=?,out_ip=?,daily_status_out=?, daily_status_outtime=?, check_out_time = ?, duration = ? ,branch_id_out=? WHERE employee_id = ? AND company_id = ? AND attendance_date = CURDATE()',
                [attendanceStatus, statusValue, latitude, longitude, IpHandal, dailyStatus, timeCount, formattedTime, duration, empbranch_id, empId, companyId]);

            // After marking 'out', calculate total break duration
            await calculateAndUpdateTotalBreakDuration(empId, companyId);
            return res.status(200).json({ status: true, message: `Attendance marked as 'out' at ${formattedTime}. Duration: ${duration}.` });

        } else if (type === 'Start_break') {
            const attendanceResults = await queryDb(
                'SELECT attendance_id FROM attendance WHERE employee_id = ? AND company_id = ? AND attendance_date = CURDATE() And (check_out_time IS NULL OR check_out_time =?)',
                [empId, companyId, '']
            );

            if (attendanceResults.length === 0) {
                return res.status(400).json({ status: false, message: 'No attendance found for today OR Check Out Done.' });
            }

            const attendanceId = attendanceResults[0].attendance_id;

            // Check if a break has already been started and not ended
            const existingBreak = await queryDb(
                'SELECT break_id FROM break_logs WHERE employee_id = ? AND attendance_id = ? AND company_id = ? AND DATE(created) = CURDATE() AND (end_time IS NULL OR end_time =?)',
                [empId, attendanceId, companyId, '00:00:00']
            );

            if (existingBreak.length > 0) {
                return res.status(400).json({ status: false, message: 'A break is already in progress for today.' });
            }

            // Insert break record with attendance_id
            await queryDb('INSERT INTO break_logs (employee_id,company_id , attendance_id, BreakType, start_time, in_ip, in_latitude, in_longitude, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?,?)',
                [empId, companyId, attendanceId, 'Start', formattedTime, IpHandal, latitude, longitude, currentDate]);

            return res.status(200).json({ status: true, message: `Break started at ${formattedTime}.` });

        } else if (type === 'End_break') {
            const breakStartTime = await queryDb('SELECT start_time, attendance_id FROM break_logs WHERE employee_id = ? AND company_id=? AND (end_time IS NULL OR end_time=?) AND  DATE(created)  = CURDATE() ORDER BY created DESC LIMIT 1', [empId, companyId, '00:00:00']);

            if (breakStartTime.length === 0) {
                return res.status(400).json({ status: false, message: 'No active break found to end.' });
            }

            const breakDuration = calculateDurationCheck(breakStartTime[0].start_time, formattedTime);

            await queryDb('UPDATE break_logs SET out_latitude=?, out_longitude=?, out_ip=?, end_time = ?, duration = ? WHERE employee_id = ? AND start_time = ? And company_id=?',
                [latitude, longitude, IpHandal, formattedTime, breakDuration, empId, breakStartTime[0].start_time, companyId]);

            return res.status(200).json({ status: true, message: `Break ended at ${formattedTime}. Duration: ${breakDuration}.` });
        } else {
            return res.status(400).json({ status: false, message: 'Invalid attendance type. Use "in", "out", "Start_break", or "End_break".' });
        }
    } catch (err) {
        return res.status(500).json({ status: false, message: 'Internal server error.', error: err });
    }
});

const parseDuration = (durationStr) => {
    const regex = /(\d+)\s*hour.*?(\d+)\s*minute/i; // Matches "X hour Y minute"
    const match = durationStr.match(regex);

    if (match) {
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        return hours + minutes / 60; // Convert to hours
    }

    throw new Error('Invalid duration format');
};

const calculateAndUpdateTotalBreakDuration = async (employeeId, companyId) => {
    const breakLogs = await queryDb('SELECT SUM(duration) AS total_break_time FROM break_logs WHERE employee_id = ? AND attendance_id IN (SELECT attendance_id FROM attendance WHERE employee_id = ? AND company_id = ? AND attendance_date = CURDATE())', [employeeId, employeeId, companyId]);

    if (breakLogs.length > 0 && breakLogs[0].total_break_time) {
        const totalBreakTime = breakLogs[0].total_break_time;
        // Update attendance with the total break time
        await queryDb('UPDATE attendance SET duration = ? WHERE employee_id = ? AND company_id = ? AND attendance_date = CURDATE()', [totalBreakTime, employeeId, companyId]);
    }
};

const calculateDurationCheck = (startTime, endTime) => {

    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    const durationMillis = end - start;
    const totalMinutes = Math.floor(durationMillis / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} hour ${minutes} minute`;
};


const calculateDuration = (startTime, endTime, breakDurationMillis = 0) => {
    return new Promise((resolve, reject) => {
        try {
            const start = new Date(`1970-01-01T${startTime}Z`);
            const end = new Date(`1970-01-01T${endTime}Z`);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return reject(new Error('Invalid start or end time'));
            }

            let totalDurationMillis = end.getTime() - start.getTime();

            // Important: if endTime is lower than startTime (means cross over midnight), handle it
            if (totalDurationMillis < 0) {
                totalDurationMillis += 24 * 60 * 60 * 1000; // Add 24 hours
            }

            totalDurationMillis -= breakDurationMillis;

            const totalMinutes = Math.floor(totalDurationMillis / 60000);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;

            resolve(`${hours} hour ${minutes} minute`);
        } catch (error) {
            reject(new Error('Error calculating duration'));
        }
    });
};


const queryDb = (query, params) => {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

function trackTime(officeStartTime, arrivalTimeOrCloseTime) {
    // Convert time strings to Date objects for easier comparison
    const [officeHours, officeMinutes] = officeStartTime.split(':').map(Number);
    const [arrivalHours, arrivalMinutes] = arrivalTimeOrCloseTime.split(':').map(Number);

    const officeStart = new Date();
    officeStart.setHours(officeHours, officeMinutes, 0, 0);

    const arrivalOrClose = new Date();
    arrivalOrClose.setHours(arrivalHours, arrivalMinutes, 0, 0);

    const timeDifferenceMs = arrivalOrClose - officeStart;

    const isLate = timeDifferenceMs > 0;

    const absTimeDifference = Math.abs(timeDifferenceMs);
    const hours = Math.floor(absTimeDifference / 3600000);
    const minutes = Math.floor((absTimeDifference % 3600000) / 60000);

    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return formattedTime;
};

module.exports = router;
