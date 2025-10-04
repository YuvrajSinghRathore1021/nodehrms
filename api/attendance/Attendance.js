const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');

// Route handler for marking attendance

router.post('/Attendancemark', async (req, res) => {
    const { type, userData, latitude, longitude } = req.body;
    const currentDate = new Date();
    const formattedTime = `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
    // Decode and validate user data
    let decodedUserData = null;
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
        const employeeResults = await queryDb('SELECT attendance_rules_id FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 And id = ? AND company_id = ?', [decodedUserData.id, decodedUserData.company_id]);
        if (employeeResults.length === 0) {
            return res.status(500).json({ status: false, message: 'Employee not found' });
        }
        const CompanyiPResults = await queryDb('SELECT ip FROM companies WHERE id = ?', [decodedUserData.company_id]);
        if (CompanyiPResults.length === 0) {
            return res.status(403).json({ status: false, message: 'Some error Pls Login' });
        } else {
            // const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
            const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            console.log('Client IP:', ip);
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
            // Check if attendance has already been marked today
            const attendanceResults = await queryDb('SELECT * FROM attendance WHERE employee_id = ? AND company_id = ? AND attendance_date = CURDATE()', [decodedUserData.id, decodedUserData.company_id]);
            if (attendanceResults.length > 0) {
                return res.status(400).json({ status: false, message: 'Attendance for today is already marked as in.' });
            }
            await queryDb('INSERT INTO attendance (in_latitude, in_longitude,daily_status_in, daily_status_intime, employee_id, company_id, attendance_date, check_in_time) VALUES (?, ?,?, ?, ?, ?, CURDATE(), ?)',
                [latitude, longitude, dailyStatus, timeCount, decodedUserData.id, decodedUserData.company_id, formattedTime]);
            return res.status(200).json({ status: true, message: `Attendance marked as 'in' at ${formattedTime}.` });
        } else if (type === 'out') {
            const checkInResults = await queryDb('SELECT check_in_time FROM attendance WHERE employee_id = ? AND company_id = ? AND attendance_date = CURDATE()', [decodedUserData.id, decodedUserData.company_id]);
            if (checkInResults.length === 0) {
                return res.status(400).json({ status: false, message: 'No check-in found for today. Please check in first.' });
            }
            const checkInTime = checkInResults[0].check_in_time;
            const duration = calculateDuration(checkInTime, formattedTime);
            const outTimeFormatted = rule.out_time ? `${String(rule.out_time).padStart(5, '0')}` : `${String('18:30').padStart(5, '0')}`;
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
            await queryDb('UPDATE attendance SET daily_status_out=?, daily_status_outtime=?, check_out_time = ?, duration = ? WHERE employee_id = ? AND company_id = ? AND attendance_date = CURDATE()',
                [dailyStatus, timeCount, formattedTime, duration, decodedUserData.id, decodedUserData.company_id]);

            return res.status(200).json({ status: true, message: `Attendance marked as 'out' at ${formattedTime}. Duration: ${duration}.` });
        } else {
            return res.status(400).json({ status: false, message: 'Invalid attendance type. Use "in" or "out".' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: 'Internal server error.', error: err });
    }
});

// router.post('/AttendanceGet', (req, res) => {

//     const { userData } = req.body;

//     let decodedUserData = null;
//     if (userData) {
//         try {
//             const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
//             decodedUserData = JSON.parse(decodedString);
//         } catch (error) {
//             return res.status(400).json({ status: false, error: 'Invalid userData' });
//         }
//     }
//     if (!decodedUserData || !decodedUserData.company_id || !decodedUserData.id) {
//         return res.status(400).json({ status: false, error: 'company_id, id are required' });
//     }

//     db.query('SELECT attendance_id,check_in_time,created,check_out_time,duration FROM attendance WHERE employee_id = ? AND attendance_date = CURDATE()',
//         [decodedUserData.id],
//         (err, results) => {
//             if (err) {
//                 return res.status(500).json({
//                     status: false,
//                     message: 'Database error.',
//                     error: err
//                 });
//             }

//             // If no entry exists for today
//             if (results.length === 0) {
//                 return res.status(200).json({
//                     status: false,
//                     message: 'No check-in record found for today.'
//                 });
//             }

//             const checkInTime = results[0].created;
//             const check_out_time = results[0].check_out_time;
//             const check_in_time = results[0].check_in_time;
//             const duration = results[0].duration;
//             const attendance_id = results[0].attendance_id;

//             db.query(`SELECT start_time, end_time FROM break_logs WHERE attendance_id = ? and (end_time IS  NULL or end_time ='00:00:00') ORDER by break_id DESC LIMIT 1`,
//                 [results[0].attendance_id],
//                 (err, resultsData) => {
//                     if (err) {
//                         return res.status(500).json({
//                             status: false,
//                             message: 'Database error.',
//                             error: err
//                         });
//                     }

//                     // If no entry exists for today
//                     if (resultsData.length === 0) {
//                         return res.status(200).json({
//                             status: true,
//                             message: 'Check-in time retrieved successfully.',
//                             InTime: checkInTime,
//                             check_in_time: check_in_time,
//                             attendance_id: attendance_id,
//                             check_out_time: check_out_time,
//                             duration: duration,
//                             Breakstart_time: '',
//                             Breakend_time: ''
//                         });

//                     } else {
//                         const Breakend = resultsData[0].end_time;
//                         let BreakendValue = resultsData[0].end_time;
//                         if (Breakend == '00:00:00') {
//                             BreakendValue = "";
//                         } else {
//                             BreakendValue = resultsData[0].end_time;
//                         }
//                         return res.status(200).json({
//                             status: true,
//                             message: 'Check-in time retrieved successfully.',
//                             InTime: checkInTime,
//                             check_in_time: check_in_time,
//                             attendance_id: attendance_id,
//                             check_out_time: check_out_time,
//                             duration: duration,
//                             data: resultsData,
//                             Breakstart_time: resultsData[0].start_time,
//                             Breakend_time: BreakendValue
//                         });
//                     }
//                 });
//         });
// });

router.post('/AttendanceGet', (req, res) => {
    const { userData } = req.body;
    let decodedUserData;

    try {
        if (!userData) throw new Error("Missing userData");
        decodedUserData = JSON.parse(Buffer.from(userData, 'base64').toString('utf-8'));
    } catch (error) {
        return res.status(400).json({ status: false, error: 'Invalid userData' });
    }

    const { company_id, id: employee_id } = decodedUserData || {};
    if (!company_id || !employee_id) {
        return res.status(400).json({ status: false, error: 'company_id, id are required' });
    }

    const sql = `
        SELECT a.attendance_id, a.check_in_time, a.created, a.check_out_time, a.duration, bl.start_time AS Breakstart_time, bl.end_time AS Breakend_time
        FROM attendance a
        LEFT JOIN (SELECT * FROM break_logs WHERE (end_time IS NULL OR end_time = '00:00:00') ORDER BY break_id DESC LIMIT 1
        ) bl ON bl.attendance_id = a.attendance_id WHERE a.employee_id = ? AND a.attendance_date = CURDATE() LIMIT 1
    `;

    db.query(sql, [employee_id], (err, results) => {
        if (err) {
            return res.status(500).json({ status: false, message: 'Database error.', error: err });
        }

        if (results.length === 0) {
            return res.status(200).json({ status: false, message: 'No check-in record found for today.' });
        }

        const record = results[0];
        return res.status(200).json({
            status: true,
            message: 'Check-in time retrieved successfully.',
            attendance_id: record.attendance_id,
            InTime: record.created,
            check_in_time: record.check_in_time,
            check_out_time: record.check_out_time,
            duration: record.duration,
            Breakstart_time: record.Breakstart_time || '',
            Breakend_time: (record.Breakend_time && record.Breakend_time !== '00:00:00') ? record.Breakend_time : ''
        });
    });
});

router.get('/api/Attendancedirectory', async (req, res) => {
    const { userData, data } = req.query;
    let SearchDate = null;

    if (data && data.Date) {
        SearchDate = data.Date ? data.Date : null;
    }
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData format' });
        }
    }
    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
    }
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;
    const offset = (page - 1) * limit;
    try {
        // Main query to fetch attendance
        const attendanceResults = await new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    b.id AS employee_id,
                    CONCAT(b.first_name, ' ', b.last_name) AS first_name,  
                    b.work_week_id, 
                    a.attendance_date, 
                    a.status, 
                    a.daily_status_in, 
                    a.daily_status_out, 
                    a.daily_status_intime, 
                    a.daily_status_outtime, 
                    a.check_in_time, 
                    a.check_out_time, 
                    a.duration
                FROM employees AS b
                LEFT JOIN attendance AS a 
                ON a.employee_id = b.id 
                   AND a.attendance_date = ?
                WHERE  b.employee_status=1 and b.status=1 and b.delete_status=0 And b.company_id = ?
                ORDER BY b.first_name ASC
                LIMIT ? OFFSET ?
            `;
            const queryParams = [SearchDate || null, decodedUserData.company_id, limit, offset];
            db.query(query, queryParams, (err, results) => (err ? reject(err) : resolve(results)));
        });
        const totalEmployees = await new Promise((resolve, reject) => {
            const queryCountTotal = `
                SELECT COUNT(id) AS total
                FROM employees
                WHERE employee_status=1 and status=1 and delete_status=0 and company_id = ?
            `;
            db.query(queryCountTotal, [decodedUserData.company_id], (err, results) => (err ? reject(err) : resolve(results[0].total)));
        });
        // Query to fetch leaves
        const leaveResults = await new Promise((resolve, reject) => {
            const query = `
                SELECT leave_id, employee_id, leave_type, start_date, end_date 
                FROM leaves 
                WHERE ? BETWEEN start_date AND end_date
            `;
            db.query(query, [SearchDate], (err, results) => (err ? reject(err) : resolve(results)));
        });

        // Query to fetch holidays
        const holidayResults = await new Promise((resolve, reject) => {
            const query = `
                SELECT id, date, holiday 
                FROM holiday 
                WHERE company_id=? And date = ?
            `;
            db.query(query, [decodedUserData.company_id, SearchDate], (err, results) => (err ? reject(err) : resolve(results)));
        });

        // Process and combine data
        const employeesWithDetails = await Promise.all(
            attendanceResults.map(async (attendance) => {
                const leave = leaveResults.find(l => l.employee_id === attendance.employee_id);
                const holiday = holidayResults.length > 0 ? holidayResults[0] : null;
                let status = 'A'; // Default to 'Absent'

                if (attendance.check_in_time) {
                    if (attendance.status == 'absent') {
                        status = 'A'; // Present
                    }
                    else if (attendance.status == 'half-day') {
                        status = 'HF'; // Present
                    }
                    else if (attendance.status == 'Present') {
                        status = 'P'; // Present
                    } else {
                        status = 'P'; // Present
                    }

                } else if (holiday) {
                    status = 'H'; // Holiday
                } else if (leave) {
                    status = 'L'; // Leave
                } else if (status === 'A' && attendance.work_week_id) {
                    try {
                        const workWeekResults = await new Promise((resolve, reject) => {
                            db.query(
                                `SELECT * FROM work_week WHERE company_id = ? AND id = ?`,
                                [decodedUserData.company_id, attendance.work_week_id],
                                (err, results) => (err ? reject(err) : resolve(results))
                            );
                        });
                        const workWeekStatus = getWorkWeekStatus(workWeekResults, SearchDate);
                        if (workWeekStatus) {
                            status = 'WO';
                        }
                    } catch (err) {
                        console.error('Error fetching work week records:', err);
                    }
                }

                return {
                    srnu: offset + attendanceResults.indexOf(attendance) + 1,
                    attendance_date: attendance.attendance_date || SearchDate,
                    check_in_time: attendance.check_in_time || null,
                    check_out_time: attendance.check_out_time || null,
                    daily_status_in: attendance.daily_status_in || null,
                    daily_status_intime: attendance.daily_status_intime || null,
                    daily_status_out: attendance.daily_status_out || null,
                    daily_status_outtime: attendance.daily_status_outtime || null,
                    duration: attendance.duration || null,
                    employee_id: attendance.employee_id,
                    first_name: attendance.first_name,
                    id: attendance.employee_id,
                    status: status,
                };
            })
        );
        // Respond with results
        res.json({
            status: true,
            Attendanceemployees: employeesWithDetails,
            total: totalEmployees,
            page,
            limit,
        });
    } catch (error) {
        console.error('Error processing attendance directory:', error);
        res.status(500).json({ status: false, error: 'Server error' });
    }
});

// Helper function to determine work week status
function getWorkWeekStatus(workWeekResults, date) {
    if (!workWeekResults || workWeekResults.length === 0) {
        return null;
    }
    const dayOfWeek = new Date(date).getDay(); // 0 (Sunday) - 6 (Saturday)
    const workWeek = workWeekResults[0];
    const workWeekStatusMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const statusKey = `${workWeekStatusMap[dayOfWeek]}1`;
    return workWeek && workWeek[statusKey] === 3 ? 'WO' : null;
}



// new 
router.get('/api/attendanceSummary', async (req, res) => {
    const { userData, data } = req.query;
    let SearchDate = null;
    if (data && data.Date) {
        SearchDate = data.Date ? data.Date : null;
    }
    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData format' });
        }
    }

    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
    }

    try {
        const totalEmployees = await new Promise((resolve, reject) => {
            const query = `
                SELECT COUNT(id) AS total
                FROM employees
                WHERE employee_status=1 and status=1 and delete_status=0 and company_id = ?
            `;
            db.query(query, [decodedUserData.company_id], (err, results) => (err ? reject(err) : resolve(results[0].total)));
        });

        // Query to count the attendance records for the given date
        const attendanceCount = await new Promise((resolve, reject) => {
            const query = `
                SELECT COUNT(DISTINCT employee_id) AS total
                FROM attendance
                WHERE attendance_date = ? AND company_id = ?
            `;
            db.query(query, [SearchDate || null, decodedUserData.company_id], (err, results) => (err ? reject(err) : resolve(results[0].total)));
        });

        // Query to count the leave records for the given date
        const leaveCount = await new Promise((resolve, reject) => {
            const query = `
                SELECT COUNT(DISTINCT employee_id) AS total
                FROM leaves
                WHERE ? BETWEEN start_date AND end_date AND company_id = ?
            `;
            db.query(query, [SearchDate || null, decodedUserData.company_id], (err, results) => (err ? reject(err) : resolve(results[0].total)));
        });

        // Calculate the number of absentees
        const absentees = totalEmployees - attendanceCount - leaveCount;

        // Respond with the attendance summary
        res.json({
            status: true,
            date: SearchDate,
            summary: {
                totalEmployees: totalEmployees,
                attendanceCount: attendanceCount,
                leaveCount: leaveCount,
                absentees: absentees
            }
        });
    } catch (error) {
        console.error('Error fetching attendance summary:', error);
        res.status(500).json({ status: false, error: 'Server error fetching attendance summary' });
    }
});


function trackTime(officeStartTime, arrivalTimeOrCloseTime) {
    // Convert time strings to Date objects for easier comparison
    const [officeHours, officeMinutes] = officeStartTime.split(':').map(Number);
    const [arrivalHours, arrivalMinutes] = arrivalTimeOrCloseTime.split(':').map(Number);

    // Create Date objects for office start and arrival/close times
    const officeStart = new Date();
    officeStart.setHours(officeHours, officeMinutes, 0, 0);  // Set office start time

    const arrivalOrClose = new Date();
    arrivalOrClose.setHours(arrivalHours, arrivalMinutes, 0, 0);  // Set arrival or close time

    // Calculate the difference in milliseconds
    const timeDifferenceMs = arrivalOrClose - officeStart;

    // If timeDifferenceMs is negative, you are early, otherwise you're late
    const isLate = timeDifferenceMs > 0;

    // Convert milliseconds to hours and minutes
    const absTimeDifference = Math.abs(timeDifferenceMs);
    const hours = Math.floor(absTimeDifference / 3600000);
    const minutes = Math.floor((absTimeDifference % 3600000) / 60000);

    // Format the time difference
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    // Return the result
    if (isLate) {
        return formattedTime;
        // return `You are late by ${formattedTime}`;
    } else {
        return formattedTime;
        // return `You are early by ${formattedTime}`;
    }
}

// Helper function to calculate the duration between check-in and check-out times
const calculateDuration = (checkInTime, checkOutTime) => {
    const checkIn = new Date(`1970-01-01T${checkInTime}`);
    const checkOut = new Date(`1970-01-01T${checkOutTime}`);
    const durationMillis = checkOut - checkIn;
    const totalMinutes = Math.floor(durationMillis / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} hour ${minutes} minute`;
};

// Helper function to query the database with Promise
const queryDb = (query, params) => {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};


const decodeUserData = (userData) => {
    try {
        const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
        return JSON.parse(decodedString);
    } catch (error) {
        return null;
    }
};

// Helper function to check if a date is in the past or today
const isDateBeforeOrEqualToday = (date) => {
    const today = new Date();
    const inputDate = new Date(date);
    return inputDate <= today;
};

// Helper function to check if start date is before or equal to end date
const isStartDateBeforeOrEqualEndDate = (startDate, endDate) => {
    return new Date(startDate) <= new Date(endDate);
};

// Helper function to check if the difference between dates is within 31 days
const isDateRangeValid = (startDate, endDate) => {
    const diffTime = new Date(endDate) - new Date(startDate);
    return diffTime <= 31 * 24 * 60 * 60 * 1000; // 31 days in milliseconds
};


// Helper functions

// router.get('/api/data', async (req, res) => {
//     try {
//         const { userData, data } = req.query;
//         let { startDate, endDate, UserId } = data || {};
//         const limit = parseInt(req.query.limit, 10) || 10;
//         const page = parseInt(req.query.page, 10) || 1;

//         // Step 1: Decode user data
//         let decodedUserData = null;

//         if (userData) {
//             decodedUserData = decodeUserData(userData);
//             if (!decodedUserData) {
//                 return res.status(400).json({ status: false, message: 'Invalid userData', error: 'Invalid userData' });
//             }
//         }

//         if (!decodedUserData || !decodedUserData.id) {
//             return res.status(400).json({ status: false, message: 'Employee ID is required', error: 'Employee ID is required' });
//         }

//         const EmployeeId = UserId || decodedUserData.id;

//         // Step 2: Validate date range
//         startDate = startDate ? new Date(startDate) : new Date();
//         endDate = endDate ? new Date(endDate) : new Date();
//         if (!startDate || !endDate) {
//             return res.status(400).json({ status: false, message: 'Both startDate and endDate are required', error: 'Both startDate and endDate are required' });
//         }

//         if (!isDateBeforeOrEqualToday(endDate)) {
//             return res.status(400).json({ status: false, message: 'End date cannot be greater than today.' });
//         }

//         if (!isStartDateBeforeOrEqualEndDate(startDate, endDate)) {
//             return res.status(400).json({ status: false, message: 'Start date must be before or equal to end date.' });
//         }

//         if (!isDateRangeValid(startDate, endDate)) {
//             return res.status(400).json({ status: false, message: 'The date range cannot exceed 31 days.' });
//         }

//         // Step 3: Generate list of dates for the range
//         const dates = [];
//         let currentDate = new Date(startDate);
//         const end = new Date(endDate);
//         while (currentDate <= end) {
//             dates.push(currentDate.toISOString().split('T')[0]);
//             currentDate.setDate(currentDate.getDate() + 1);
//         }

//         // Fetch employee's work week configuration
//         const [workWeekData] = await db.promise().query(
//             `SELECT * FROM work_week WHERE id = (
//                 SELECT work_week_id FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 and id = ? AND company_id = ?
//             )`,
//             [EmployeeId, decodedUserData.company_id]
//         );

//         const workWeek = workWeekData.length > 0 ? workWeekData[0] : null;
//         const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

//         // Step 4: Pagination logic
//         const startIndex = (page - 1) * limit;
//         const endIndex = startIndex + limit;
//         const paginatedDates = dates.slice(startIndex, endIndex);

//         // Step 5: Fetch attendance data for each date
//         const allData = [];

//         for (let date of paginatedDates) {
//             const dayOfWeek = new Date(date).getDay(); // Get day index (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
//             const weekNumber = Math.ceil(new Date(date).getDate() / 7); // Determine the week number (1 to 5)
//             const dayKey = `${daysOfWeek[dayOfWeek]}${weekNumber}`;
//             let isWeeklyOff = false;
//             if (workWeek && workWeek[dayKey] === 3) {
//                 isWeeklyOff = true; // Weekly Off
//             }

//             let record = await getAttendanceData(decodedUserData.company_id, EmployeeId, date);

//             if (record.length > 0) {
//                 const attendanceRecord = record[0];
//                 if (!attendanceRecord.attendance_date) {
//                     const holiday = await checkHoliday(decodedUserData.company_id, date);
//                     const status = holiday.length > 0
//                         ? `Holiday(${holiday[0].holiday})`
//                         : isWeeklyOff
//                             ? 'WO'
//                             : 'Absent';
//                     allData.push(createAttendanceResponse(attendanceRecord, status, date));
//                 } else {
//                     allData.push(attendanceRecord);
//                 }
//             } else {
//                 const employeeInfo = await getEmployeeInfo(decodedUserData.company_id, EmployeeId);
//                 const holiday = await checkHoliday(decodedUserData.company_id, date);
//                 const status = holiday.length > 0
//                     ? `Holiday(${holiday[0].holiday})`
//                     : isWeeklyOff
//                         ? 'WO'
//                         : 'Absent';
//                 allData.push(createAttendanceResponse(employeeInfo[0], status, date));
//             }
//         }




//         return res.status(200).json({
//             status: true,
//             message: 'Data Found',
//             attendance: allData,
//             total: dates.length,
//             page,
//             limit
//         });
//     } catch (err) {
//         return res.status(500).json({
//             status: false,
//             message: 'Database error occurred while fetching attendance details',
//             error: err.message || err
//         });
//     }
// });


// router.get('/api/data', async (req, res) => {
//     try {
//         const { userData, data } = req.query;
//         let { startDate, endDate, UserId } = data || {};
//         const limit = parseInt(req.query.limit, 10) || 10;
//         const page = parseInt(req.query.page, 10) || 1;

//         // Step 1: Decode user data
//         let decodedUserData = userData ? decodeUserData(userData) : null;
//         if (!decodedUserData || !decodedUserData.id) {
//             return res.status(400).json({ status: false, message: 'Invalid or missing user data' });
//         }

//         const EmployeeId = UserId || decodedUserData.id;

//         // Step 2: Validate date range
//         startDate = startDate ? new Date(startDate) : new Date();
//         endDate = endDate ? new Date(endDate) : new Date();

//         if (!isDateBeforeOrEqualToday(endDate)) {
//             return res.status(400).json({ status: false, message: 'End date cannot be greater than today.' });
//         }
//         if (!isStartDateBeforeOrEqualEndDate(startDate, endDate)) {
//             return res.status(400).json({ status: false, message: 'Start date must be before or equal to end date.' });
//         }
//         if (!isDateRangeValid(startDate, endDate)) {
//             return res.status(400).json({ status: false, message: 'Date range cannot exceed 31 days.' });
//         }

//         // Step 3: Generate list of dates
//         const dates = [];
//         let currentDate = new Date(startDate);
//         while (currentDate <= endDate) {
//             dates.push(currentDate.toISOString().split('T')[0]);
//             currentDate.setDate(currentDate.getDate() + 1);
//         }

//         // Step 4: Fetch Work Week Configuration
//         const [workWeekData] = await db.promise().query(
//             `SELECT * FROM work_week WHERE id = (
//                 SELECT work_week_id FROM employees WHERE employee_status=1 AND status=1 AND delete_status=0 
//                 AND id = ? AND company_id = ?
//             )`,
//             [EmployeeId, decodedUserData.company_id]
//         );
//         const workWeek = workWeekData.length > 0 ? workWeekData[0] : null;
//         const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

//         // Step 5: Fetch Leaves
//         const [leaveResultsRequest] = await db.promise().query(
//             `SELECT employee_id, start_date, end_date, start_half, end_half
//              FROM leaves WHERE deletestatus=0 AND status=1 AND admin_status=1 
//              AND company_id=? AND employee_id=?`,
//             [decodedUserData.company_id, EmployeeId]
//         );

//         // Step 6: Paginate Dates
//         const startIndex = (page - 1) * limit;
//         const paginatedDates = dates.slice(startIndex, startIndex + limit);

//         // Step 7: Fetch Attendance Data
//         const allData = [];
//         for (let date of paginatedDates) {
//             const dayOfWeek = new Date(date).getDay();
//             const weekNumber = Math.ceil(new Date(date).getDate() / 7);
//             const dayKey = `${daysOfWeek[dayOfWeek]}${weekNumber}`;
//             let isWeeklyOff = workWeek && workWeek[dayKey] === 3;

//             // Default status
//             let status = "Absent";

//             // Check Leave
//             const leaveRecord = leaveResultsRequest.find(leave =>
//                 date >= leave.start_date.split('T')[0] && date <= leave.end_date.split('T')[0]
//             );
//             console.log(leaveResultsRequest);
//             if (leaveRecord) {
//                 // if (leaveRecord.start_date.split('T')[0] == date && leaveRecord.start_half == "Second Half") {
//                 //     // status = "Leave (Afternoon)";
//                 //     status = "Leave";
//                 // } else if (leaveRecord.end_date.split('T')[0] == date && leaveRecord.end_half == "First Half") {
//                 //     // status = "Leave (Forenoon)";
//                 //     status = "Leave";
//                 // } else {
//                 //     status = "Leave";
//                 // }

//                 status = "Leave";
//             } else {
//                 const holiday = await checkHoliday(decodedUserData.company_id, date);
//                 if (holiday.length > 0) {
//                     status = `Holiday(${holiday[0].holiday})`;
//                 } else if (isWeeklyOff) {
//                     status = 'WO';
//                 }
//             }

//             // Fetch Attendance
//             let record = await getAttendanceData(decodedUserData.company_id, EmployeeId, date);
//             if (record.length > 0) {
//                 allData.push(record[0]);
//             } else {
//                 const employeeInfo = await getEmployeeInfo(decodedUserData.company_id, EmployeeId);
//                 allData.push(createAttendanceResponse(employeeInfo[0], status, date));
//             }
//         }

//         return res.status(200).json({
//             status: true,
//             message: 'Data Found',
//             attendance: allData,
//             total: dates.length,
//             page,
//             limit
//         });
//     } catch (err) {
//         return res.status(500).json({
//             status: false,
//             message: 'Database error occurred while fetching attendance details',
//             error: err.message || err
//         });
//     }
// });

router.post('/api/data', async (req, res) => {
    try {
        const { userData, data } = req.body;
        let { startDate, endDate, UserId } = req.body;
        const limit = parseInt(req.body.limit, 10) || 10;
        const page = parseInt(req.body.page, 10) || 1;

        // Step 1: Decode user data
        let decodedUserData = userData ? decodeUserData(userData) : null;
        if (!decodedUserData || !decodedUserData.id) {
            return res.status(400).json({ status: false, message: 'Invalid or missing user data' });
        }

        const EmployeeId = UserId || decodedUserData.id;

        // Step 2: Validate date range
        startDate = startDate ? new Date(startDate) : new Date();
        endDate = endDate ? new Date(endDate) : new Date();

        if (!isDateBeforeOrEqualToday(endDate)) {
            return res.status(400).json({ status: false, message: 'End date cannot be greater than today.' });
        }
        if (!isStartDateBeforeOrEqualEndDate(startDate, endDate)) {
            return res.status(400).json({ status: false, message: 'Start date must be before or equal to end date.' });
        }
        if (!isDateRangeValid(startDate, endDate)) {
            return res.status(400).json({ status: false, message: 'Date range cannot exceed 31 days.' });
        }

        // Step 3: Generate list of dates
        const dates = [];
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            dates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Step 4: Fetch Work Week Configuration
        const [workWeekData] = await db.promise().query(
            `SELECT * FROM work_week WHERE id = (
                SELECT work_week_id FROM employees WHERE employee_status=1 AND status=1 AND delete_status=0 
                AND id = ? AND company_id = ?
            )`,
            [EmployeeId, decodedUserData.company_id]
        );
        const workWeek = workWeekData.length > 0 ? workWeekData[0] : null;
        const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

        // Step 5: Fetch Leaves
        const [leaveResultsRequest] = await db.promise().query(
            `SELECT employee_id, start_date, end_date, start_half, end_half
             FROM leaves WHERE deletestatus=0 AND status=1 AND admin_status=1 
             AND company_id=? AND employee_id=?`,
            [decodedUserData.company_id, EmployeeId]
        );

        // Step 6: Paginate Dates
        const startIndex = (page - 1) * limit;
        const paginatedDates = dates.slice(startIndex, startIndex + limit);

        // Step 7: Fetch Attendance Data
        const allData = [];
        for (let date of paginatedDates) {
            const dayOfWeek = new Date(date).getDay();
            const weekNumber = Math.ceil(new Date(date).getDate() / 7);
            const dayKey = `${daysOfWeek[dayOfWeek]}${weekNumber}`;
            let isWeeklyOff = workWeek && workWeek[dayKey] === 3;

            // Default status
            let status = "Absent";

            // Check Leave
            const leaveRecord = leaveResultsRequest.find(leave =>
                date >= leave.start_date.split('T')[0] && date <= leave.end_date.split('T')[0]
            );

            if (leaveRecord) {
                if (leaveRecord.start_date.split('T')[0] == date && leaveRecord.start_half == "Second Half") {
                    // status = "Leave (Afternoon)";
                    status = "Leave";
                } else if (leaveRecord.end_date.split('T')[0] == date && leaveRecord.end_half == "First Half") {
                    // status = "Leave (Forenoon)";
                    status = "Leave";
                } else {
                    status = "Leave";
                }
            } else {
                const holiday = await checkHoliday(decodedUserData.company_id, date);
                if (holiday.length > 0) {
                    status = `Holiday(${holiday[0].holiday})`;
                } else if (isWeeklyOff) {
                    status = 'WO';
                }
            }

            // Fetch Attendance
            let record = await getAttendanceData(decodedUserData.company_id, EmployeeId, date);

            if (record.length > 0) {
                const {
                    id,
                    first_name,
                    name,
                    in_ip,
                    out_ip,
                    in_latitude,
                    in_longitude,
                    out_latitude,
                    out_longitude,
                    attendance_id,
                    status,
                    check_in_time,
                    check_out_time,
                    duration,
                    created,
                    attendance_date, profile_image
                } = record[0];

                allData.push({
                    id,
                    first_name,
                    name,
                    in_ip,
                    out_ip,
                    in_latitude,
                    in_longitude,
                    out_latitude,
                    out_longitude,
                    attendance_id,
                    status,
                    check_in_time,
                    check_out_time,
                    duration,
                    created,
                    attendance_date: attendance_date || date,
                    profile_image
                });
            }
            else {
                const employeeInfo = await getEmployeeInfo(decodedUserData.company_id, EmployeeId);
                allData.push(createAttendanceResponse(employeeInfo[0], status, date));
            }
        }

        return res.status(200).json({
            status: true,
            message: 'Data Found',
            attendance: allData,
            total: dates.length,
            page,
            limit
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Database error occurred while fetching attendance details',
            error: err.message || err
        });
    }
});


const getAttendanceData = (companyId, employeeId, date) => {

    return new Promise((resolve, reject) => {
        db.query('SELECT b.id, CONCAT(b.first_name, " ", b.last_name,"-",b.employee_id) AS first_name,CONCAT(b.first_name, " ", b.last_name,"-",b.employee_id) AS name,b.profile_image,a.in_ip,out_ip,a.in_latitude,a.out_ip, a.in_longitude,a.out_latitude,a.out_longitude, a.attendance_id, a.status, a.check_in_time, a.check_out_time, a.duration, a.created, a.attendance_date FROM employees b LEFT JOIN attendance a ON a.employee_id = b.id WHERE  b.employee_status=1 and b.status=1 and b.delete_status=0 and b.company_id = ? AND b.id = ? AND (a.attendance_date = ? OR a.attendance_date IS NULL)',
            [companyId, employeeId, date], (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
    });
};

const checkHoliday = (companyId, date) => {
    return new Promise((resolve, reject) => {
        db.query('SELECT date, holiday FROM holiday WHERE status = 1 AND company_id = ? AND date = ?',
            [companyId, date], (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
    });
};

const getEmployeeInfo = (companyId, employeeId) => {
    return new Promise((resolve, reject) => {
        db.query('SELECT b.id, CONCAT(b.first_name, " ", b.last_name,"-",b.employee_id) AS first_name,b.profile_image FROM employees b WHERE b.company_id = ? AND b.id = ?',
            [companyId, employeeId], (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
    });
};

const createAttendanceResponse = (record, status, date) => {
    return {
        id: record.id,
        name: record.first_name,
        first_name: record.first_name,
        profile_image: record.profile_image,
        attendance_id: '0',
        status,
        check_in_time: '00:00',
        check_out_time: '00:00',
        duration: '00:00',
        created: date,
        attendance_date: date,
    };
};


router.get('/api/attendance', async (req, res) => {
    const { data, userData, employeeId, departmentId = 0, subDepartmentid = 0, employeeStatus = 1 } = req.query;
    let year = null;
    let month = null;
    let searchData = null;
    let decodedUserData = null;

    if (userData) {
        decodedUserData = decodeUserData(userData);
        if (!decodedUserData) {
            return res.status(200).json({ status: false, message: 'Invalid userData', error: 'Invalid userData' });
        }
    }

    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, message: 'Employee ID is required', error: 'Employee ID is required' });
    }


    if (data) {
        year = parseInt(data['Year'], 10) || null;
        month = parseInt(data['Month'], 10) || null;
        searchData = data['searchData'] || null;
    }

    // let employeeIds = employeeId || decodedUserData.id.toString();

    let employeeIds;
    if (!employeeId || employeeId.trim() === "" || employeeId.trim().toLowerCase() === "null" || employeeId.trim().toLowerCase() === "undefined" || employeeId.trim() === '""' // 👈 catch "%22%22"
    ) {
        employeeIds = decodedUserData.id.toString();
    } else {
        employeeIds = employeeId;
    }

    const cleanIds = employeeIds.replace(/^,|,$/g, '').trim();
    let employeeIdsArray = cleanIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

    if (!employeeIds || !month || !year || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
        return res.status(200).json({ status: false, message: 'Invalid or missing parameters' });
    }

    if (employeeIdsArray.length === 0) {
        return res.status(200).json({ status: false, message: 'Invalid employee IDs' });
    }
    try {
        let empsql = `SELECT id, CONCAT(first_name, " ", last_name,"-",employee_id) AS first_name, work_week_id, employee_id FROM employees WHERE company_id=? AND id IN (?)`;
        let EmpArrayValue = [decodedUserData.company_id, employeeIdsArray];
        //// filter 
        if (employeeStatus && employeeStatus == 1) {
            empsql += ` AND employee_status=1 and status=1 and delete_status=0 `;
        } else {
            empsql += ` AND (employee_status=0 or status=0 or delete_status=1) `;
        }

        if (departmentId && departmentId != 0) {
            empsql += ` AND department = ?`;
            EmpArrayValue.push(departmentId);
        } else if (subDepartmentid && subDepartmentid != 0) {
            empsql += ` AND sub_department = ?`;
            EmpArrayValue.push(subDepartmentid);
        }


        if (searchData) {
            empsql += ` AND first_name LIKE ?`;
            EmpArrayValue.push(`%${searchData}%`);
        }

        const [empResults] = await db.promise().query(empsql, EmpArrayValue);
        if (empResults.length === 0) {
            return res.status(200).json({ status: false, message: 'Employees not found' });
        }

        const [holidayResults] = await db.promise().query(`
            SELECT date, holiday
            FROM holiday
            WHERE company_id=? And status = 1 AND YEAR(date) = ? AND MONTH(date) = ?`,
            [decodedUserData.company_id, year, month]
        );

        // const holidays = new Set(holidayResults.map(holiday => new Date(holiday.date).toISOString().split('T')[0]));
        const holidays = {};
        holidayResults.forEach(h => {
            const dateKey = new Date(h.date).toISOString().split('T')[0];
            holidays[dateKey] = h.holiday;
        });
        const employeesAttendanceData = [];
        for (const employee of empResults) {
            const [WorkWeek] = await db.promise().query(
                `SELECT id, mon1, tue1, wed1, thu1, fri1, sat1, sun1, mon2, tue2, wed2, thu2, fri2, sat2, sun2, 
                mon3, tue3, wed3, thu3, fri3, sat3, sun3, mon4, tue4, wed4, thu4, fri4, sat4, sun4, 
                mon5, tue5, wed5, thu5, fri5, sat5, sun5 
                FROM work_week 
                WHERE id = ? AND company_id=?`,
                [employee.work_week_id, decodedUserData.company_id]
            );

            const workWeekData = WorkWeek.length > 0 ? WorkWeek[0] : null;

            const [attendanceResults] = await db.promise().query(`
                SELECT status, check_in_time, check_out_time, attendance_date,approval_status,attendance_status
                FROM attendance
                WHERE employee_id = ? AND YEAR(attendance_date) = ? AND MONTH(attendance_date) = ?`,
                [employee.id, year, month]
            );


            const monthStr = String(month).padStart(2, '0'); // ensures "08" instead of "8"
            const monthStart = `${year}-${monthStr}-01`;
            const monthEnd = `${year}-${monthStr}-${new Date(year, month, 0).getDate()}`;

            const [leaveResultsRequest] = await db.promise().query(
                `SELECT employee_id, start_date, end_date, start_half, end_half,leave_type FROM leaves WHERE deletestatus = 0 AND status = 1 AND admin_status = 1 AND company_id = ?  AND employee_id = ?  
     AND ((start_date BETWEEN ? AND ?)  OR  (end_date BETWEEN ? AND ?) OR  (start_date <= ? AND end_date >= ?))`,
                [decodedUserData.company_id, employee.id, monthStart, monthEnd, monthStart, monthEnd, monthStart, monthEnd]
            );

            const monthlyAttendanceLogs = [];
            const daysInMonth = new Date(year, month, 0).getDate();

            const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

            for (let dayNo = 1; dayNo <= daysInMonth; dayNo++) {
                const dateValue = new Date(year, month - 1, dayNo);
                const date1 = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}-${String(dateValue.getDate()).padStart(2, '0')}`;
                const date = new Date(date1);

                if (date.getMonth() !== month - 1) break;

                const dayOfWeek = date.getDay();
                const weekNumber = Math.ceil(dayNo / 7);
                const dayKey = `${daysOfWeek[dayOfWeek]}${weekNumber}`;
                // console.log(dayKey);
                const isWeeklyOff = workWeekData && workWeekData[dayKey] === 3;
                // const isHoliday = holidays.has(date.toISOString().split('T')[0]);


                const attendance = attendanceResults.find(a => {
                    const attDate = new Date(a.attendance_date);
                    return attDate.getDate() === dayNo && attDate.getMonth() === month - 1;
                });
                const formattedDate = new Date(date).toISOString().split("T")[0];
                const isHoliday = holidays[formattedDate];
                // converts "2025-08-01T00:00:00.000Z" → "2025-08-01"

                const leaveRecord = leaveResultsRequest.find(leave =>
                    formattedDate >= leave.start_date.split("T")[0] &&
                    formattedDate <= leave.end_date.split("T")[0]
                );

                let status = '';
                let label = '';

                if (isWeeklyOff) {
                    status = 'WO';
                    label = 'Weekly Off';
                } else if (isHoliday) {
                    status = 'H';
                    // label = `Holiday`;                   
                    label = `Holiday - ${isHoliday}`;
                } else if (attendance) {
                    if (attendance.status.toLowerCase() === 'present') {
                        status = 'P';
                        const checkInTime = new Date(`1970-01-01T${attendance.check_in_time}Z`);
                        const checkOutTime = attendance.check_out_time ? new Date(`1970-01-01T${attendance.check_out_time}Z`) : null;
                        if (checkInTime && checkOutTime && attendance.approval_status != 1 && attendance.attendance_status != 1) {
                            const workDuration = (checkOutTime - checkInTime) / (1000 * 60);
                            if (workDuration < 510) {
                                status = '-WD';
                                label = 'Less Work Duration';
                            }
                        }
                        if (!attendance.check_out_time) {
                            status = 'NCO';
                            label = 'Not Checked Out';
                        }
                    } else if (attendance.status.toLowerCase() === 'half-day') {
                        status = 'HF';
                        label = 'Half Day';
                    } else if (attendance.status.toLowerCase() === 'absent') {
                        status = 'A';
                        label = 'Absent (Applied)';
                    }
                }
                else if (leaveRecord) {
                    status = "L";
                    // label = 'Leave';
                    label = `Leave - ${leaveRecord.leave_type}`;
                }

                else {
                    status = 'A';
                    label = 'Absent';
                }

                monthlyAttendanceLogs.push({
                    day_no: dayNo,
                    status: status,
                    label: label,
                    date: date,
                    in_time: attendance ? attendance.check_in_time : '',
                    out_time: attendance ? attendance.check_out_time : ''
                });
            }

            employeesAttendanceData.push({
                emp_details: {
                    name: employee.first_name,
                    first_name: employee.first_name,
                    userId: employee.employee_id,
                    Id: employee.id
                },
                monthly_attendance_logs: monthlyAttendanceLogs
            });
        }

        res.json({
            status: true,
            employees: employeesAttendanceData
        });
    } catch (err) {
        console.error('Error occurred:', err);
        res.status(500).json({ message: 'An error occurred while fetching attendance data', error: err.message });
    }
});



router.post('/api/BreakDetails', async (req, res) => {
    const { userData, attendance_id } = req.body;
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData format' });
        }
    }
    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
    }
    const query = 'SELECT break_id, start_time, end_time, duration, in_ip, out_ip, in_latitude, in_longitude, out_latitude, out_longitude, created FROM break_logs WHERE attendance_id=?';
    const queryParams = [attendance_id];
    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching data records:', err);
            return res.status(500).json({ status: false, error: 'Server error' });
        }

        // Add serial number (srno) to each result
        const dataWithSrno = results.map((item, index) => ({
            srno: index + 1,
            ...item
        }));
        res.json({
            status: true,
            data: dataWithSrno,

        });
    });

});



// router.post('/api/AttendanceTypeDetails', async (req, res) => {
//     const { userData, Date, type = 'persent' } = req.body;
//     let SearchDate = null;

//     if (Date) {
//         SearchDate = Date;
//     }

//     let decodedUserData = null;
//     if (userData) {
//         try {
//             const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
//             decodedUserData = JSON.parse(decodedString);
//         } catch (error) {
//             return res.status(400).json({ status: false, error: 'Invalid userData format' });
//         }
//     }
//     if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
//         return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
//     }
//     const limit = parseInt(req.body.limit, 10) || 10;
//     const page = parseInt(req.body.page, 10) || 1;

//     const offset = (page - 1) * limit;

//     try {

//         const attendanceResults = await new Promise((resolve, reject) => {
//             const query = `
//                 SELECT 
//                     b.id AS employee_id,
//                     a.attendance_id,
//                     CONCAT(b.first_name, ' ', b.last_name) AS first_name,  
//                     b.work_week_id, 
//                     a.attendance_date, 
//                     a.status, 
//                     a.daily_status_in, 
//                     a.daily_status_out, 
//                     a.daily_status_intime, 
//                     a.daily_status_outtime, 
//                     a.check_in_time, 
//                     a.check_out_time, 
//                     a.duration
//                 FROM employees AS b
//                 LEFT JOIN attendance AS a 
//                 ON a.employee_id = b.id AND a.attendance_date = ?
//                 WHERE  b.employee_status=1 and b.status=1 and b.delete_status=0 And b.company_id = ?
//                 ORDER BY b.first_name ASC
//                 LIMIT ? OFFSET ?
//             `;
//             const queryParams = [SearchDate || null, decodedUserData.company_id, limit, offset];
//             db.query(query, queryParams, (err, results) => (err ? reject(err) : resolve(results)));
//         });



//         const leaveResults = await new Promise((resolve, reject) => {
//             const query = `
//                 SELECT leave_id, employee_id, leave_type, start_date, end_date 
//                 FROM leaves 
//                 WHERE ? BETWEEN start_date AND end_date
//             `;
//             db.query(query, [SearchDate], (err, results) => (err ? reject(err) : resolve(results)));
//         });

//         const holidayResults = await new Promise((resolve, reject) => {
//             const query = `
//                 SELECT id, date, holiday 
//                 FROM holiday 
//                 WHERE date = ?
//             `;
//             db.query(query, [SearchDate], (err, results) => (err ? reject(err) : resolve(results)));
//         });

//         const employeesWithDetails = await Promise.all(
//             attendanceResults.map(async (attendance, index) => {
//                 const leave = leaveResults.find(l => l.employee_id === attendance.employee_id);
//                 const holiday = holidayResults.length > 0 ? holidayResults[0] : null;
//                 let status = 'A'; // Default

//                 if (attendance.check_in_time) {
//                     if (attendance.status == 'absent') {
//                         status = 'A';
//                     }
//                     else if (attendance.status == 'half-day') {
//                         status = 'HF';
//                     }
//                     else if (attendance.status == 'Present') {
//                         status = 'P';
//                     } else {
//                         status = 'P';
//                     }
//                 } else if (holiday) {
//                     status = 'H';
//                 } else if (leave) {
//                     status = 'L';
//                 } else if (status === 'A' && attendance.work_week_id) {
//                     try {
//                         const workWeekResults = await new Promise((resolve, reject) => {
//                             db.query(
//                                 `SELECT * FROM work_week WHERE company_id = ? AND id = ?`,
//                                 [decodedUserData.company_id, attendance.work_week_id],
//                                 (err, results) => (err ? reject(err) : resolve(results))
//                             );
//                         });
//                         const workWeekStatus = getWorkWeekStatus(workWeekResults, SearchDate);
//                         if (workWeekStatus) {
//                             status = 'WO';
//                         }
//                     } catch (err) {
//                         console.error('Error fetching work week records:', err);
//                     }
//                 }
//                 let BreckDetails = null;
//                 if (attendance.attendance_id && status === 'P') {
//                     BreckDetails = await new Promise((resolve, reject) => {
//                         db.query('SELECT break_id,start_time, end_time, duration, in_ip, out_ip, in_latitude, in_longitude, out_latitude, out_longitude, created FROM break_logs WHERE attendance_id=?', [attendance.attendance_id], (err, results) => {
//                             if (err) reject(err);
//                             resolve(results);
//                         });
//                     });

//                 }

//                 return {
//                     srnu: offset + index + 1,
//                     attendance_date: attendance.attendance_date || SearchDate,
//                     check_in_time: attendance.check_in_time || null,
//                     check_out_time: attendance.check_out_time || null,
//                     daily_status_in: attendance.daily_status_in || null,
//                     daily_status_intime: attendance.daily_status_intime || null,
//                     daily_status_out: attendance.daily_status_out || null,
//                     daily_status_outtime: attendance.daily_status_outtime || null,
//                     duration: attendance.duration || null,
//                     employee_id: attendance.employee_id,
//                     first_name: attendance.first_name,
//                     id: attendance.employee_id,
//                     status: status,
//                     BreckDetails: BreckDetails || [],
//                 };
//             })
//         );

//         // Now filter based on "type"
//         let filteredEmployees = employeesWithDetails;

//         if (type === 'persent') {
//             filteredEmployees = employeesWithDetails.filter(emp => emp.status === 'P' || emp.status === 'HF');
//         } else if (type === 'apsent') {
//             filteredEmployees = employeesWithDetails.filter(emp => emp.status === 'A');
//         } else if (type === 'leave') {
//             filteredEmployees = employeesWithDetails.filter(emp => emp.status === 'L');
//         }

//         // Respond
//         res.json({
//             status: true,
//             Attendanceemployees: filteredEmployees,
//                        page,
//             limit,
//         });
//     } catch (error) {
//         console.error('Error processing attendance directory:', error);
//         res.status(500).json({ status: false, error: 'Server error' });
//     }
// });


router.post('/api/AttendanceTypeDetails', async (req, res) => {
    const { userData, Date, type = 'persent' } = req.body;
    let SearchDate = null;

    if (Date) {
        SearchDate = Date;
    }

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData format' });
        }
    }
    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
    }
    const limit = parseInt(req.body.limit, 10) || 10;
    const page = parseInt(req.body.page, 10) || 1;

    const offset = (page - 1) * limit;

    try {
        // Main query to fetch attendance
        const attendanceResults = await new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    b.id AS employee_id,
                    CONCAT(b.first_name, ' ', b.last_name) AS first_name,  
                    a.attendance_id,
                    b.work_week_id, 
                    a.attendance_date, 
                    a.status, 
                    a.daily_status_in, 
                    a.daily_status_out, 
                    a.daily_status_intime, 
                    a.daily_status_outtime, 
                    a.check_in_time, 
                    a.check_out_time, 
                    a.duration,
                    a.in_latitude, a.in_longitude, a.out_latitude, a.out_longitude
                FROM employees AS b
                LEFT JOIN attendance AS a 
                ON a.employee_id = b.id 
                   AND a.attendance_date = ?
                WHERE  b.employee_status=1 and b.status=1 and b.delete_status=0 And b.company_id = ?
                ORDER BY b.first_name ASC
                LIMIT ? OFFSET ?
            `;
            const queryParams = [SearchDate || null, decodedUserData.company_id, limit, offset];
            db.query(query, queryParams, (err, results) => (err ? reject(err) : resolve(results)));
        });
        const totalEmployees = await new Promise((resolve, reject) => {
            const queryCountTotal = `
                SELECT COUNT(id) AS total
                FROM employees
                WHERE employee_status=1 and status=1 and delete_status=0 and company_id = ?
            `;
            db.query(queryCountTotal, [decodedUserData.company_id], (err, results) => (err ? reject(err) : resolve(results[0].total)));
        });
        // Query to fetch leaves
        const leaveResults = await new Promise((resolve, reject) => {
            const query = `
                SELECT leave_id, employee_id, leave_type, start_date, end_date 
                FROM leaves 
                WHERE ? BETWEEN start_date AND end_date
            `;
            db.query(query, [SearchDate], (err, results) => (err ? reject(err) : resolve(results)));
        });

        // Query to fetch holidays
        const holidayResults = await new Promise((resolve, reject) => {
            const query = `
                SELECT id, date, holiday 
                FROM holiday 
                WHERE company_id=? And date = ?
            `;
            db.query(query, [decodedUserData.company_id, SearchDate], (err, results) => (err ? reject(err) : resolve(results)));
        });

        // Process and combine data
        const employeesWithDetails = await Promise.all(
            attendanceResults.map(async (attendance) => {
                const leave = leaveResults.find(l => l.employee_id === attendance.employee_id);
                const holiday = holidayResults.length > 0 ? holidayResults[0] : null;
                let status = 'A'; // Default to 'Absent'

                if (attendance.check_in_time) {
                    if (attendance.status == 'absent') {
                        status = 'A';
                    }
                    else if (attendance.status == 'half-day') {
                        status = 'HF'; // Present
                    }
                    else if (attendance.status == 'present') {
                        status = 'P'; // Present
                    } else {
                        status = 'P'; // Present
                    }

                } else if (holiday) {
                    status = 'H'; // Holiday
                } else if (leave) {
                    status = 'L'; // Leave
                } else if (status === 'A' && attendance.work_week_id) {
                    try {
                        const workWeekResults = await new Promise((resolve, reject) => {
                            db.query(
                                `SELECT * FROM work_week WHERE company_id = ? AND id = ?`,
                                [decodedUserData.company_id, attendance.work_week_id],
                                (err, results) => (err ? reject(err) : resolve(results))
                            );
                        });
                        const workWeekStatus = getWorkWeekStatus(workWeekResults, SearchDate);
                        if (workWeekStatus) {
                            status = 'WO';
                        }
                    } catch (err) {
                        console.error('Error fetching work week records:', err);
                    }
                }
                let BreckDetails = null;
                if (status === 'P') {
                    BreckDetails = await new Promise((resolve, reject) => {
                        db.query('SELECT break_id,start_time, end_time, duration, in_ip, out_ip, in_latitude, in_longitude, out_latitude, out_longitude, created FROM break_logs WHERE attendance_id=?', [attendance.attendance_id], (err, results) => {
                            if (err) reject(err);
                            resolve(results);
                        });
                    });

                }

                return {
                    srnu: offset + attendanceResults.indexOf(attendance) + 1,
                    attendance_date: attendance.attendance_date || SearchDate,
                    check_in_time: attendance.check_in_time || null,
                    check_out_time: attendance.check_out_time || null,
                    daily_status_in: attendance.daily_status_in || null,
                    daily_status_intime: attendance.daily_status_intime || null,
                    daily_status_out: attendance.daily_status_out || null,
                    daily_status_outtime: attendance.daily_status_outtime || null,
                    duration: attendance.duration || null,
                    employee_id: attendance.employee_id,
                    first_name: attendance.first_name,
                    id: attendance.employee_id,
                    in_latitude: attendance.in_latitude || null,
                    in_longitude: attendance.in_longitude || null,
                    out_latitude: attendance.out_latitude || null,
                    out_longitude: attendance.out_longitude || null,
                    status: status,
                    BreckDetails: BreckDetails || [],
                };
            })
        );

        let filteredEmployees = [];
        if (type == 'present') {
            filteredEmployees = employeesWithDetails.filter(emp => emp.status == 'P' || emp.status == 'HF');
        } else if (type == 'absent') {
            filteredEmployees = employeesWithDetails.filter(emp => emp.status == 'A');
        } else if (type == 'leave') {
            filteredEmployees = employeesWithDetails.filter(emp => emp.status == 'L');
        }
        // do not use else 

        // Respond with results
        res.json({
            status: true,
            Attendanceemployees: filteredEmployees,
            total: totalEmployees,
            page,
            limit,
        });

    } catch (error) {
        console.error('Error processing attendance directory:', error);
        res.status(500).json({ status: false, error: 'Server error' });
    }
});


// Export the router
module.exports = router;