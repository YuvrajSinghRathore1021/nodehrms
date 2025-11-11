const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');
const { AdminCheck } = require('../../model/functlity/AdminCheck');

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

router.get('/api/AttendanceApproval', async (req, res) => {
    const { data, userData } = req.query;
    let startDate = null;
    let endDate = null;
    let searchData = null;
    let EmployeeId = null;
    let decodedUserData = null;
    if (userData) {
        decodedUserData = decodeUserData(userData);
        if (!decodedUserData) {
            return res.status(400).json({ status: false, message: 'Invalid userData', error: 'Invalid userData' });
        }
    }
    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, message: 'Employee ID is required', error: 'Employee ID is required' });
    }

    if (data) {
        let currentDate = new Date();
        startDate = data['startDate'] || formatDate(currentDate);
        endDate = data['endDate'] || formatDate(currentDate);
        searchData = data['searchData'] || null;
        EmployeeId = data['EmployeeId'] || null;
    }
    if (!startDate || !endDate) {
        return res.status(400).json({ status: false, message: 'Both startDate and endDate are required' });
    }
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ status: false, message: 'Invalid startDate or endDate format. Expected YYYY-MM-DD.' });
        }

        let empsql = `SELECT id, first_name, employee_id FROM employees WHERE employee_status=1 and status=1 and delete_status=0 and id=? AND company_id=?`;
        let EmpArrayValue = [EmployeeId, decodedUserData.company_id];

        if (searchData) {
            empsql += ` AND first_name LIKE ?`;
            EmpArrayValue.push(`%${searchData}%`);
        }

        // Fetch employees
        const [empResults] = await db.promise().query(empsql, EmpArrayValue);
        if (empResults.length === 0) {
            return res.status(200).json({ status: false, message: 'Employees not found' });
        }

        // Fetch holidays
        const [holidayResults] = await db.promise().query(
            `SELECT date FROM holiday WHERE company_id=? And status = 1 AND date BETWEEN ? AND ?`,
            [decodedUserData.company_id, startDate, endDate]
        );
        const holidays = new Set(holidayResults.map(holiday => new Date(holiday.date).toISOString().split('T')[0]));

        // Fetch work week data
        const [workWeekData] = await db.promise().query(
            `SELECT * FROM work_week WHERE id = (
                SELECT work_week_id FROM employees WHERE employee_status=1 and status=1 and delete_status=0 and id = ? AND company_id = ?
            )`,
            [EmployeeId, decodedUserData.company_id]
        );

        const workWeek = workWeekData.length > 0 ? workWeekData[0] : null;
        const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

        // Fetch attendance logs for the date range
        const monthlyAttendanceLogs = [];
        for (const employee of empResults) {
            const [attendanceResults] = await db.promise().query(
                `SELECT attendance_id, status, check_in_time, check_out_time, attendance_date, duration,attendance_status
                 FROM attendance WHERE employee_id = ? AND attendance_date BETWEEN ? AND ?`,
                [employee.id, startDate, endDate]
            );
            // console.log(attendanceResults);
            const [attendanceApprovalRequests] = await db.promise().query(
                `SELECT id, request_date
                 FROM attendance_requests
                 WHERE company_id=? AND employee_id = ? AND request_date BETWEEN ? AND ?`,
                [decodedUserData.company_id, employee.id, startDate, endDate]
            );

            const startDateObj = new Date(startDate);
            const endDateObj = new Date(endDate);

            for (let currentDate = startDateObj; currentDate <= endDateObj; currentDate.setDate(currentDate.getDate() + 1)) {
                const formattedDate = currentDate.toISOString().split('T')[0];
                const dayOfWeek = currentDate.getDay(); // Get day index (0 = Sunday, ..., 6 = Saturday)
                const weekNumber = Math.ceil(currentDate.getDate() / 7); // Determine the week number (1 to 5)
                const dayKey = `${daysOfWeek[dayOfWeek]}${weekNumber}`;

                const isWeeklyOff = workWeek && workWeek[dayKey] === 3;

                const attendance = attendanceResults.find(a => new Date(a.attendance_date).toISOString().split('T')[0] === formattedDate);
                const ApprovalRequests = attendanceApprovalRequests.find(b => new Date(b.request_date).toISOString().split('T')[0] === formattedDate);

                const isHoliday = holidays.has(formattedDate);
                const inTime = attendance ? attendance.check_in_time : '';
                const attendance_date = attendance ? attendance.attendance_date : '';
                const outTime = attendance ? attendance.check_out_time : '';
                const duration = attendance ? attendance.duration : '';
                const attendance_id = attendance ? attendance.attendance_id : '';
                const ApprovalRequests_id = ApprovalRequests ? ApprovalRequests.id : '';

                let status = isHoliday ? 'H' : isWeeklyOff ? 'WO' : attendance ? attendance.status : 'A';
                let attendance_statusCheck = attendance ? attendance.attendance_status : 0;
                if (status != 'WO' && status != 'H' && attendance_statusCheck != 1) {
                    monthlyAttendanceLogs.push({
                        name: employee.first_name,
                        userId: employee.employee_id,
                        Id: employee.id,
                        date: formattedDate,
                        status: status,
                        in_time: inTime,
                        out_time: outTime,
                        duration: duration,
                        attendance_id: attendance_id,
                        ApprovalRequests_id: ApprovalRequests_id,
                        attendance_date: attendance_date,
                    });
                }
            }
        }

        res.json({
            status: true,
            ApprovalLog: monthlyAttendanceLogs,
            message: 'Data Found',
        });
    } catch (err) {
        res.status(500).json({ status: false, message: 'An error occurred while fetching attendance data', error: err.message });
    }
});

const decodeUserData = (userData) => {
    try {
        const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
        return JSON.parse(decodedString);
    } catch (error) {
        return null;
    }
};

router.get('/api/companyEmployeeName', async (req, res) => {
    const { userData, searchData = '', type = "" } = req.query;
    let decodedUserData = null;
    if (userData) {
        try {
            decodedUserData = decodeUserData(userData);
            if (!decodedUserData || !decodedUserData.company_id) {
                return res.status(400).json({
                    status: false,
                    message: 'Invalid or missing company_id in userData',
                    error: 'Invalid userData'
                });
            }
        } catch (error) {
            return res.status(400).json({
                status: false,
                error: 'Invalid userData format',
                message: 'Invalid userData format'
            });
        }
    } else {
        return res.status(400).json({
            status: false,
            message: 'userData query parameter is required',
            error: 'Missing userData'
        });
    }
    const company_id = decodedUserData.company_id;
    if (!company_id) {
        return res.status(400).json({
            status: false,
            error: 'Company ID is missing or invalid',
            message: 'Company ID is missing or invalid'
        });
    }
    let query = "";
    let dataArray = [];

    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
    let NewFilds = "";
    if (type == "permission") {
        NewFilds += " ,designation,profile_image "
    }
    if (isAdmin == true) {
        // query = `SELECT id,CONCAT(IFNULL(first_name, ''), ' ', IFNULL(last_name, ''),' - ',IFNULL(employee_id, '')) AS name FROM employees WHERE employee_status=1 and status=1 and delete_status=0 and company_id = ?`;
        // dataArray.push(company_id);
        query = `
  SELECT 
    id,
    CONCAT_WS(' - ',
      CONCAT_WS(' ', IFNULL(first_name, ''), IFNULL(last_name, '')),
      IFNULL(employee_id, '')
    ) AS name
     ${NewFilds}
  FROM employees 
  WHERE employee_status = 1 
    AND status = 1 
    AND delete_status = 0 
    AND company_id = ?
   
`;
        dataArray.push(company_id);

    } else {
        // query = `SELECT id, CONCAT(IFNULL(first_name, ''), ' ', IFNULL(last_name, ''),' - ',IFNULL(employee_id, '')) AS name FROM employees WHERE employee_status=1 and status=1 and delete_status=0 and company_id = ? and reporting_manager=?`;
        // dataArray.push(company_id, decodedUserData.id);
        query = `
  SELECT 
    id,
    CONCAT_WS(' - ',
      CONCAT_WS(' ', IFNULL(first_name, ''), IFNULL(last_name, '')),
      IFNULL(employee_id, '')
    ) AS name
      ${NewFilds}
  FROM employees 
  WHERE employee_status = 1 
    AND status = 1 
    AND delete_status = 0 
    AND company_id = ? 
    AND (reporting_manager = ? or id=?)

 
`;
        dataArray.push(company_id, decodedUserData.id, decodedUserData.id);

    }
    if (searchData) {
        query += ` AND (first_name LIKE ? OR last_name LIKE ? Or employee_id LIKE ?)`;
        dataArray.push(`%${searchData}%`, `%${searchData}%`, `%${searchData}%`);
    }

    query += ` ORDER BY first_name ASC`;

    db.query(query, dataArray, (err, results) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: 'Database error occurred while fetching employees',
                error: err.message || err
            });
        }
        if (results.length === 0) {
            return res.status(200).json({
                status: false,
                message: 'No employees found for this company'
            });
        }
        res.json({
            status: true,
            data: results,
            message: 'Data found successfully'
        });
    });
});

router.post('/api/companyEmployeeName', async (req, res) => {
    const { userData, searchData = '', type = "" } = req.body;
    let decodedUserData = null;
    if (userData) {
        try {
            decodedUserData = decodeUserData(userData);
            if (!decodedUserData || !decodedUserData.company_id) {
                return res.status(400).json({
                    status: false,
                    message: 'Invalid or missing company_id in userData',
                    error: 'Invalid userData'
                });
            }
        } catch (error) {
            return res.status(400).json({
                status: false,
                error: 'Invalid userData format',
                message: 'Invalid userData format'
            });
        }
    } else {
        return res.status(400).json({
            status: false,
            message: 'userData query parameter is required',
            error: 'Missing userData'
        });
    }
    const company_id = decodedUserData.company_id;
    if (!company_id) {
        return res.status(400).json({
            status: false,
            error: 'Company ID is missing or invalid',
            message: 'Company ID is missing or invalid'
        });
    }
    let query = "";
    let dataArray = [];

    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
    let NewFilds = "";
    if (type == "permission") {
        NewFilds += " ,designation,profile_image "
    }
    if (isAdmin == true) {
        // query = `SELECT id,CONCAT(IFNULL(first_name, ''), ' ', IFNULL(last_name, ''),' - ',IFNULL(employee_id, '')) AS name FROM employees WHERE employee_status=1 and status=1 and delete_status=0 and company_id = ?`;
        // dataArray.push(company_id);
        query = `
  SELECT 
    id,
    CONCAT_WS(' - ',
      CONCAT_WS(' ', IFNULL(first_name, ''), IFNULL(last_name, '')),
      IFNULL(employee_id, '')
    ) AS name
      ${NewFilds}
  FROM employees 
  WHERE employee_status = 1 
    AND status = 1 
    AND delete_status = 0 
    AND company_id = ?
  
`;
        dataArray.push(company_id);

    } else {
        // query = `SELECT id, CONCAT(IFNULL(first_name, ''), ' ', IFNULL(last_name, ''),' - ',IFNULL(employee_id, '')) AS name FROM employees WHERE employee_status=1 and status=1 and delete_status=0 and company_id = ? and reporting_manager=?`;
        // dataArray.push(company_id, decodedUserData.id);
        query = `
  SELECT 
    id,
    CONCAT_WS(' - ',
      CONCAT_WS(' ', IFNULL(first_name, ''), IFNULL(last_name, '')),
      IFNULL(employee_id, '')
    ) AS name
      ${NewFilds}
  FROM employees 
  WHERE employee_status = 1 
    AND status = 1 
    AND delete_status = 0 
    AND company_id = ? 
    AND (reporting_manager = ? or id=?)
  
`;
        dataArray.push(company_id, decodedUserData.id, decodedUserData.id);

    }
    if (searchData) {
        query += ` AND (first_name LIKE ? OR last_name LIKE ? Or employee_id LIKE ?)`;
        dataArray.push(`%${searchData}%`, `%${searchData}%`, `%${searchData}%`);
    }

    query += ` ORDER BY first_name ASC`;
    db.query(query, dataArray, (err, results) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: 'Database error occurred while fetching employees',
                error: err.message || err
            });
        }
        if (results.length === 0) {
            return res.status(200).json({
                status: false,
                message: 'No employees found for this company'
            });
        }
        res.json({
            status: true,
            data: results,
            message: 'Data found successfully'
        });
    });
});

// new 
router.post('/api/ApprovalCheck', async (req, res) => {
    const { userData, employee_id, request_date, attendance_id, request_type, in_time, out_time, reason } = req.body;

    if (!userData) {
        return res.status(400).json({ status: false, error: 'Missing userData', message: 'userData is required' });
    }

    let decodedUserData;
    try {
        const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
        decodedUserData = JSON.parse(decodedString);
    } catch (error) {
        return res.status(400).json({ status: false, error: 'Invalid userData', message: 'Invalid userData' });
    }

    if (!decodedUserData || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Missing company ID', message: 'Company ID is required' });
    }

    try {
        let RmIdValue = 0;
        // Step 1: Get the reporting manager ID
        const [SettingMultiLeaveApprove] = await db.promise().query(
            'SELECT multi_level_approve FROM settings WHERE company_id = ?',
            [decodedUserData.company_id]
        );
        if (SettingMultiLeaveApprove.length === 0) {

        } else {
            if (SettingMultiLeaveApprove[0].multi_level_approve == 1) {
                const [managerResults] = await db.promise().query(
                    'SELECT reporting_manager FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 and id = ? AND company_id = ?',
                    [employee_id, decodedUserData.company_id]
                );
                if (managerResults.length === 0) {
                    return res.status(404).json({ status: false, error: 'Employee not found', message: 'Invalid employee ID or company ID' });
                }
                RmIdValue = managerResults[0].reporting_manager ? managerResults[0].reporting_manager : 0;
            }
        }
        // Step 2: Insert the attendance request
        const [insertResults] = await db.promise().query(
            'INSERT INTO attendance_requests (attendance_id,rm_id, employee_id, company_id, request_type, request_date, in_time, out_time, reason) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?)',
            [attendance_id, RmIdValue, employee_id, decodedUserData.company_id, request_type, request_date, in_time, out_time, reason]
        );
        res.json({ status: true, message: 'INSERT successful', data: insertResults });
    } catch (err) {
        res.status(500).json({ status: false, message: 'Database error', error: err.message });
    }
});

router.post('/api/ChackViewDetails', (req, res) => {
    const { userData, Logid } = req.body;
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({
                status: false,
                error: 'Invalid userData',
                message: 'Invalid userData'
            });
        }
    }
    if (!decodedUserData || !decodedUserData.company_id) {
        return res.status(400).json({
            status: false,
            error: 'ID is required',
            message: 'ID is required'
        });
    }
    const company_id = decodedUserData.company_id;
    if (!company_id) {
        return res.status(400).json({
            status: false,
            error: 'Company ID is missing or invalid',
            message: 'Company ID is missing or invalid'
        });
    }
    const query = `SELECT AR.rm_status, AR.rm_id, AR.admin_id, AR.admin_status, AR.request_type, AR.request_date, AR.in_time, AR.out_time, AR.status, AR.reason, AR.created, e.first_name AS employee_first_name, e.employee_id, d.name AS department_name, em.first_name AS Rm FROM attendance_requests AS AR INNER JOIN employees AS e ON e.id = AR.employee_id LEFT JOIN departments AS d ON e.department = d.id LEFT JOIN employees AS em ON e.reporting_manager = em.id WHERE  e.employee_status=1 and e.status=1 and e.delete_status=0 and  AR.company_id = ? AND AR.id=?`;
    db.query(query, [company_id, Logid], (err, results) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: 'Database error occurred while fetching employees',
                error: err.message || err
            });
        }
        if (results.length === 0) {
            return res.status(200).json({
                status: false,
                message: 'No employees found for this company'
            });
        }
        res.json({
            status: true,
            data: results[0],
            message: 'Data found successfully'
        });
    });

});


router.post('/api/ApprovalSubmit', async (req, res) => {
    const { userData, ApprovalRequests_id, ApprovalStatus, employee_id, in_time, out_time, reason, request_date, request_type } = req.body;
    let decodedUserData = null;
    // Decode and validate userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({
                status: false,
                error: 'Invalid userData',
                message: 'Invalid userData'
            });
        }
    }

    // Validate company_id
    if (!decodedUserData || !decodedUserData.company_id) {
        return res.status(400).json({
            status: false,
            error: 'Company ID is required',
            message: 'Company ID is required'
        });
    }
    const company_id = decodedUserData.company_id;
    // Update attendance request
    const query = `
        UPDATE attendance_requests 
        SET admin_status = ?, reason_admin = ?, admin_id = ? 
        WHERE id = ? AND company_id = ?
    `;

    const queryArray = [ApprovalStatus, reason, employee_id, ApprovalRequests_id, company_id];
    try {
        const updateResult = await queryDb(query, queryArray);
        // console.log(updateResult);
        if (updateResult.affectedRows == 1) {
            const attendanceRequestType = await queryDb(
                'SELECT request_type,in_time,out_time FROM attendance_requests WHERE id = ? AND company_id = ?',
                [ApprovalRequests_id, company_id]
            );
            if (ApprovalStatus == 1) {
                const employeeResults = await queryDb(
                    'SELECT attendance_rules_id FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 and id = ? AND company_id = ?',
                    [employee_id, company_id]
                );
                if (employeeResults.length === 0) {
                    return res.status(404).json({ status: false, message: 'Employee not found' });
                }
                const rulesResults = await queryDb(
                    'SELECT in_time, out_time FROM attendance_rules WHERE rule_id = ? AND company_id = ?',
                    [employeeResults[0].attendance_rules_id, company_id]
                );
                const rule = rulesResults.length > 0 ? rulesResults[0] : { in_time: '09:30', out_time: '18:30' };
                const { dailyStatus: dailyStatusIN, timeCount: timeCountIN } = calculateStatus(in_time || attendanceRequestType[0].in_time, rule.in_time || '09:30');
                const { dailyStatus: dailyStatusOUT, timeCount: timeCountOUT } = calculateStatus(out_time || attendanceRequestType[0].out_time, rule.out_time || '18:30');
                // Insert attendance record
                const insertQuery = `
                INSERT INTO attendance (request_id,daily_status_in, daily_status_intime, daily_status_out, daily_status_outtime, 
                    employee_id, company_id, attendance_date, status, check_in_time, check_out_time, approval_status
                ) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                const insertParams = [ApprovalRequests_id,
                    dailyStatusIN, timeCountIN, dailyStatusOUT, timeCountOUT,
                    employee_id, company_id, request_date, attendanceRequestType[0].request_type, in_time || attendanceRequestType[0].in_time, out_time || attendanceRequestType[0].out_time, 1
                ];
                await queryDb(insertQuery, insertParams);
            }
            return res.status(200).json({
                status: true,
                message: 'Approval updated successfully',
            });
        } else {
            return res.status(200).json({
                status: false,
                message: 'Approval update failed',
            });
        }

    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'An error occurred while processing the request',
            error: err.message,
        });
    }
});


function calculateStatus(time, ruleTime) {
    const formattedRuleTime = String(ruleTime).padStart(5, '0');
    const formattedtime = String(time).padStart(5, '0');
    if (!formattedtime) return { dailyStatus: '', timeCount: '' };
    if (formattedtime < formattedRuleTime) {
        return { dailyStatus: 'Early', timeCount: trackTime(formattedRuleTime, formattedtime) };
    } else if (formattedtime > formattedRuleTime) {
        return { dailyStatus: 'Late', timeCount: trackTime(formattedRuleTime, formattedtime) };
    } else {
        return { dailyStatus: 'On Time', timeCount: '00:00' };
    }
}

// Generic function to execute database queries
function queryDb(query, params) {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

// new time check 
function trackTime(officeStartTime, arrivalTimeOrCloseTime) {
    const [officeHours, officeMinutes] = officeStartTime.split(':').map(Number);
    const [arrivalHours, arrivalMinutes] = arrivalTimeOrCloseTime.split(':').map(Number);
    const officeStart = new Date();
    officeStart.setHours(officeHours, officeMinutes, 0, 0);
    const arrivalOrClose = new Date();
    arrivalOrClose.setHours(arrivalHours, arrivalMinutes, 0, 0);
    // Calculate the difference in milliseconds
    const timeDifferenceMs = arrivalOrClose - officeStart;
    const isLate = timeDifferenceMs > 0;
    // Convert milliseconds to hours and minutes
    const absTimeDifference = Math.abs(timeDifferenceMs);
    const hours = Math.floor(absTimeDifference / 3600000);
    const minutes = Math.floor((absTimeDifference % 3600000) / 60000);
    // Format the time difference
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    if (isLate) {
        return formattedTime;
    } else {
        return formattedTime;
    }
};

module.exports = router;