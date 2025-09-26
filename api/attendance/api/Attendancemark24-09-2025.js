const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');
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



router.post('/Attendancemark', async (req, res) => {
    
    const { type, userData, latitude, longitude } = req.body;
    const currentDate = new Date();
    const formattedTime = `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
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
    try {
        const employeeResults = await queryDb('SELECT attendance_rules_id,branch_id FROM employees WHERE employee_status=1 and status=1 and delete_status=0 and  id = ? AND company_id = ?', [decodedUserData.id, decodedUserData.company_id]);
        if (employeeResults.length === 0) {
            return res.status(500).json({ status: false, message: 'Employee not found' });
        }
        // const CompanyiPResults = await queryDb('SELECT ip FROM companies WHERE id = ?', [decodedUserData.company_id]);
        // if (CompanyiPResults[0].ip != '') {
        //     if (CompanyiPResults[0].ip != IpHandal) {
        //         return res.status(200).json({ status: false, message: `IP does not match for your company IP pls connect company Ip` });
        //     }
        // }
        let empbranch_id = employeeResults[0].branch_id;
        if (empbranch_id != 0) {


            // if (decodedUserData.id == 10) {
            const branchResults = await queryDb('SELECT id, company_id, name, location_status, latitude, longitude, radius, ip, ip_status,status FROM branches WHERE id = ? AND company_id = ? AND status=1', [employeeResults[0].branch_id, decodedUserData.company_id]);
            if (branchResults.length === 0) {

            } else {
                // if (branchResults[0].status === 0) {
                //     return res.status(403).json({ status: false, message: 'Branch is currently inactive. Please contact HR or Admin.' });
                // } else {
                if (branchResults[0].ip_status == 1 && branchResults[0].ip != IpHandal) {
                    return res.status(200).json({ status: false, message: 'You are not allowed to mark attendance from this IP address.' });
                }
                // if (branchResults[0].location_status === 1) {
                //     // branchResults[0].radius value in miters 
                //     const distance = Math.sqrt(Math.pow(latitude - branchResults[0].latitude, 2) + Math.pow(longitude - branchResults[0].longitude, 2));
                //     if (distance > branchResults[0].radius) {
                //         return res.status(403).json({ status: false, message: `You are outside the allowed attendance radius. distance-${branchResults[0].radius}km` });
                //     }
                // }

                if (branchResults[0].location_status === 1) {
                    const distance = getDistanceFromLatLonInMeters(latitude, longitude, branchResults[0].latitude, branchResults[0].longitude);
                    if (distance > branchResults[0].radius) {
                        return res.status(200).json({
                            status: false,
                            message: `You are outside the allowed attendance radius. Allowed: ${branchResults[0].radius} meters, Your Distance: ${Math.round(distance)} meters.`
                        });
                    }
                }
                // }
            }
            // }
        }

        const rulesResults = await queryDb('SELECT * FROM attendance_rules WHERE rule_id = ? AND company_id = ?', [employeeResults[0].attendance_rules_id, decodedUserData.company_id]);
        const rule = rulesResults.length > 0 ? rulesResults[0] : { in_time: '09:30', out_time: '18:30' };

        let dailyStatus = '';
        let timeCount = '';

        if (type === 'in') {
            const inTimeFormatted = rule.in_time ? `${String(rule.in_time).padStart(5, '0')}` : `${String('09:30').padStart(5, '0')}`;
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
            const attendanceResults = await queryDb('SELECT * FROM attendance WHERE employee_id = ? AND company_id = ? AND attendance_date = CURDATE()', [decodedUserData.id, decodedUserData.company_id]);
            if (attendanceResults.length > 0) {
                return res.status(400).json({ status: false, message: 'Attendance for today is already marked as in.' });
            }
            await queryDb('INSERT INTO attendance (status,in_latitude, in_longitude, daily_status_in, daily_status_intime, employee_id, company_id, attendance_date, check_in_time, in_ip) VALUES (?,?, ?, ?, ?, ?, ?, CURDATE(), ?, ?)',
                ['Present', latitude, longitude, dailyStatus, timeCount, decodedUserData.id, decodedUserData.company_id, formattedTime, IpHandal]);
            return res.status(200).json({ status: true, message: `Attendance marked as 'in' at ${formattedTime}.` });

        } else if (type === 'out') {
            const checkInResults = await queryDb('SELECT attendance_id,check_in_time FROM attendance WHERE employee_id = ? AND company_id = ? AND attendance_date = CURDATE()', [decodedUserData.id, decodedUserData.company_id]);
            if (checkInResults.length === 0) {
                return res.status(400).json({ status: false, message: 'No check-in found for today. Please check in first.' });
            }
            const checkInTime = checkInResults[0].check_in_time;
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
                    console.log("Fetched break logs:", breakLogs);

                    // Check if any active break is still running
                    const activeBreak = await queryDb(
                        'SELECT start_time FROM break_logs WHERE employee_id = ? AND company_id = ? AND (end_time IS NULL OR end_time = ?) AND DATE(created) = CURDATE() ORDER BY created DESC LIMIT 1',
                        [decodedUserData.id, decodedUserData.company_id, '00:00:00']
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
                console.error("Server Error:", error.message);
                return res.status(500).json({
                    status: false,
                    message: 'Something went wrong while calculating break duration'
                });
            }

            // WORKING CODE  

            // if (checkInResults[0].attendance_id) {
            //     const breakLogs = await queryDb(
            //         'SELECT start_time, end_time FROM break_logs WHERE attendance_id = ? AND start_time IS NOT NULL AND end_time IS NOT NULL',
            //         [checkInResults[0].attendance_id]
            //     );
            //     const breakStartTime = await queryDb('SELECT start_time, attendance_id FROM break_logs WHERE employee_id = ? AND company_id=? AND (end_time IS NULL OR end_time=?) AND  DATE(created)  = CURDATE() ORDER BY created DESC LIMIT 1', [decodedUserData.id, decodedUserData.company_id, '00:00:00']);

            //     if (breakStartTime.length > 0) {
            //         return res.status(400).json({ status: false, message: 'active break found ,Pls break off.' });
            //     }

            //     for (const breakLog of breakLogs) {
            //         const breakStart = new Date(`1970-01-01T${breakLog.start_time}`);
            //         const breakEnd = new Date(`1970-01-01T${breakLog.end_time}`);
            //         breakDurationMillis += breakEnd - breakStart;
            //     }

            // }

            // // Calculate total break duration --end
            // duration = calculateDuration(checkInTime, formattedTime, breakDurationMillis);

            const outTimeFormatted = rule.out_time ? `${String(rule.out_time).padStart(5, '0')}` : `${String('18:30').padStart(5, '0')}`;
            const maxWorkingHours = rulesResults[0]?.max_working_hours || 8;
            const halfDayHours = rulesResults[0]?.half_day || 4.5;

            let attendanceStatus = 0;
            let statusValue = 'Present';
            const numericDuration = parseDuration(duration)

            if (numericDuration <= maxWorkingHours) { //bug solve
                attendanceStatus = 0;
            }

            if (numericDuration >= halfDayHours && numericDuration <= halfDayHours + 0.5) {
                attendanceStatus = 1;
                statusValue = 'half-day';
            }

            if (numericDuration >= maxWorkingHours) {
                attendanceStatus = 1;
            }

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
            await queryDb('UPDATE attendance SET attendance_status=?,status=?,out_latitude=?, out_longitude=?,out_ip=?,daily_status_out=?, daily_status_outtime=?, check_out_time = ?, duration = ? WHERE employee_id = ? AND company_id = ? AND attendance_date = CURDATE()',
                [attendanceStatus, statusValue, latitude, longitude, IpHandal, dailyStatus, timeCount, formattedTime, duration, decodedUserData.id, decodedUserData.company_id]);

            // After marking 'out', calculate total break duration
            await calculateAndUpdateTotalBreakDuration(decodedUserData.id, decodedUserData.company_id);
            return res.status(200).json({ status: true, message: `Attendance marked as 'out' at ${formattedTime}. Duration: ${duration}.` });

        } else if (type === 'Start_break') {
            const attendanceResults = await queryDb(
                'SELECT attendance_id FROM attendance WHERE employee_id = ? AND company_id = ? AND attendance_date = CURDATE() And (check_out_time IS NULL OR check_out_time =?)',
                [decodedUserData.id, decodedUserData.company_id, '']
            );

            if (attendanceResults.length === 0) {
                return res.status(400).json({ status: false, message: 'No attendance found for today OR Check Out Done.' });
            }

            const attendanceId = attendanceResults[0].attendance_id;

            // Check if a break has already been started and not ended
            const existingBreak = await queryDb(
                'SELECT break_id FROM break_logs WHERE employee_id = ? AND attendance_id = ? AND company_id = ? AND DATE(created) = CURDATE() AND (end_time IS NULL OR end_time =?)',
                [decodedUserData.id, attendanceId, decodedUserData.company_id, '00:00:00']
            );

            if (existingBreak.length > 0) {
                return res.status(400).json({ status: false, message: 'A break is already in progress for today.' });
            }

            // Insert break record with attendance_id
            await queryDb('INSERT INTO break_logs (employee_id,company_id , attendance_id, BreakType, start_time, in_ip, in_latitude, in_longitude, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?,?)',
                [decodedUserData.id, decodedUserData.company_id, attendanceId, 'Start', formattedTime, IpHandal, latitude, longitude, currentDate]);

            return res.status(200).json({ status: true, message: `Break started at ${formattedTime}.` });

        } else if (type === 'End_break') {
            const breakStartTime = await queryDb('SELECT start_time, attendance_id FROM break_logs WHERE employee_id = ? AND company_id=? AND (end_time IS NULL OR end_time=?) AND  DATE(created)  = CURDATE() ORDER BY created DESC LIMIT 1', [decodedUserData.id, decodedUserData.company_id, '00:00:00']);

            if (breakStartTime.length === 0) {
                return res.status(400).json({ status: false, message: 'No active break found to end.' });
            }

            const breakDuration = calculateDurationCheck(breakStartTime[0].start_time, formattedTime);

            await queryDb('UPDATE break_logs SET out_latitude=?, out_longitude=?, out_ip=?, end_time = ?, duration = ? WHERE employee_id = ? AND start_time = ? And company_id=?',
                [latitude, longitude, IpHandal, formattedTime, breakDuration, decodedUserData.id, breakStartTime[0].start_time, decodedUserData.company_id]);

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

// const calculateDuration = (startTime, endTime, breakDurationMillis = 0) => {
//     try {
//         let totalDurationMillis = 0;

//         // Parse start and end times
//         const start = new Date(`1970-01-01T${startTime}`);
//         const end = new Date(`1970-01-01T${endTime}`);

//         // Calculate the total working duration (excluding breaks)
//         totalDurationMillis = end - start - breakDurationMillis;

//         // Convert total duration to hours and minutes
//         const totalMinutes = Math.floor(totalDurationMillis / 60000);
//         const hours = Math.floor(totalMinutes / 60);
//         const minutes = totalMinutes % 60;

//         return `${hours} hour ${minutes} minute`;
//     } catch (error) {
//         throw new Error('Failed to calculate duration');
//     }
// };



// const calculateDuration = (startTime, endTime, breakDurationMillis = 0) => {
//     return new Promise((resolve, reject) => {
//         try {
//             const start = new Date(`1970-01-01T${startTime}`);
//             const end = new Date(`1970-01-01T${endTime}`);

//             if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//                 return reject(new Error('Invalid start or end time'));
//             }

//             const totalDurationMillis = end - start - breakDurationMillis;
//             const totalMinutes = Math.floor(totalDurationMillis / 60000);
//             const hours = Math.floor(totalMinutes / 60);
//             const minutes = totalMinutes % 60;

//             resolve(`${hours} hour ${minutes} minute`);
//         } catch (error) {
//             console.error("Duration calculation error:", error.message);
//             reject(new Error('Error calculating duration'));
//         }
//     });
// };


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
            console.error("Duration calculation error:", error.message);
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
