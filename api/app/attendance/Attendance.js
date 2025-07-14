const express = require('express');
const router = express.Router();
const db = require('../../../DB/ConnectionSql');

const decodeUserData = (userData) => {
    try {
        const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
        return JSON.parse(decodedString);
    } catch (error) {
        return null;
    }
};


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

const PendingForFunction = async (ReqId) => {
    if (ReqId === '') {
        return 'Get Approve';
    }

    try {
        const [PendingFor] = await db.promise().query(
            `SELECT id, rm_status, rm_id, rm_remark, admin_id, admin_status FROM attendance_requests WHERE id = ?`,
            [ReqId]
        );

        // Check if the query returned any result
        if (PendingFor.length === 0) {
            return 'Request not found';
        }

        let Type = '';

        // Check conditions based on the returned row data
        if (PendingFor[0].rm_id !== 0 && PendingFor[0].rm_status === 0 && PendingFor[0].admin_id === 0) {
            Type = 'Pending For Rm';
        } else if ((PendingFor[0].rm_id === 0 || (PendingFor[0].rm_id !== 0 && PendingFor[0].rm_status === 1)) && PendingFor[0].admin_id === 0) {
            Type = 'Pending For Admin';
        } else {
            Type = 'Approved';
        }
        return Type;
    } catch (error) {
        console.error('Error querying database:', error);
        return 'Error fetching data';
    }
};


function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
// Helper function to check if a date is in the past or today
const isDateBeforeOrEqualToday = (date) => {
    const today = new Date();
    const inputDate = new Date(date);
    return inputDate <= today;
};
const isDateBeforeToday = (date) => {
    const today = new Date();
    const inputDate = new Date(date);
    return inputDate < today;
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
router.post('/api/data', async (req, res) => {
    try {
        let { userData, startDate, endDate, UserId } = req.body;
        const limit = parseInt(req.body.limit, 10) || 10;
        const page = parseInt(req.body.page, 10) || 1;

        // Step 1: Decode user data
        let decodedUserData = null;

        if (userData) {
            decodedUserData = decodeUserData(userData);
            if (!decodedUserData) {
                return res.status(400).json({ status: false, message: 'Invalid userData', error: 'Invalid userData' });
            }
        }

        if (!decodedUserData || !decodedUserData.id) {
            return res.status(400).json({ status: false, message: 'Employee ID is required', error: 'Employee ID is required' });
        }

        const EmployeeId = UserId || decodedUserData.id;

        let currentDateToday = new Date();
        // Set default startDate to 30 days before today
        let defaultStartDate = new Date();
        defaultStartDate.setDate(currentDateToday.getDate() - 30);



        // Step 2: Validate date range
        startDate = startDate ? new Date(startDate) : currentDateToday;
        endDate = endDate ? new Date(endDate) : new Date();


        if (!startDate || !endDate) {
            return res.status(400).json({ status: false, message: 'Both startDate and endDate are required', error: 'Both startDate and endDate are required' });
        }

        if (!isDateBeforeOrEqualToday(endDate)) {
            return res.status(400).json({ status: false, message: 'End date cannot be greater than today.' });
        }

        if (!isStartDateBeforeOrEqualEndDate(startDate, endDate)) {
            return res.status(400).json({ status: false, message: 'Start date must be before or equal to end date.' });
        }

        if (!isDateRangeValid(startDate, endDate)) {
            return res.status(400).json({ status: false, message: 'The date range cannot exceed 31 days.' });
        }

        // Step 3: Generate list of dates for the range
        const dates = [];
        let currentDate = new Date(startDate);
        const end = new Date(endDate);

        while (currentDate <= end) {
            dates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Fetch employee's work week configuration
        const [workWeekData] = await db.promise().query(
            `SELECT * FROM work_week WHERE id = (
                SELECT work_week_id FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 and id = ? AND company_id = ?
            )`,
            [EmployeeId, decodedUserData.company_id]
        );

        const workWeek = workWeekData.length > 0 ? workWeekData[0] : null;
        const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

        // Step 4: Pagination logic
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedDates = dates.slice(startIndex, endIndex);

        // Step 5: Fetch attendance data for each date
        const allData = [];
        for (let date of paginatedDates) {
            const dayOfWeek = new Date(date).getDay(); // Get day index (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
            const weekNumber = Math.ceil(new Date(date).getDate() / 7); // Determine the week number (1 to 5)
            const dayKey = `${daysOfWeek[dayOfWeek]}${weekNumber}`;
            let isWeeklyOff = false;
            if (workWeek && workWeek[dayKey] === 3) {
                isWeeklyOff = true; // Weekly Off
            }

            let record = await getAttendanceData(decodedUserData.company_id, EmployeeId, date);

            if (record.length > 0) {
                const attendanceRecord = record[0];
                if (!attendanceRecord.attendance_date) {
                    const holiday = await checkHoliday(decodedUserData.company_id, date);
                    const status = holiday.length > 0
                        ? `Holiday(${holiday[0].holiday})`
                        : isWeeklyOff
                            ? 'WO'
                            : 'Absent';
                    allData.push(createAttendanceResponse(attendanceRecord, status, date));
                } else {
                    allData.push(attendanceRecord);
                }
            } else {
                const employeeInfo = await getEmployeeInfo(decodedUserData.company_id, EmployeeId);
                const holiday = await checkHoliday(decodedUserData.company_id, date);
                const status = holiday.length > 0
                    ? `Holiday(${holiday[0].holiday})`
                    : isWeeklyOff
                        ? 'WO'
                        : 'Absent';
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
        db.query('SELECT b.id, CONCAT(b.first_name," ",b.last_name, " - ", b.employee_id) AS name,a.in_ip,out_ip,a.in_latitude,a.out_ip, a.in_longitude,a.out_latitude,a.out_longitude, a.attendance_id, a.status, a.check_in_time, a.check_out_time, a.duration, a.created, a.attendance_date FROM employees b LEFT JOIN attendance a ON a.employee_id = b.id WHERE  b.employee_status=1 and b.status=1 and b.delete_status=0 and b.company_id = ? AND b.id = ? AND (a.attendance_date = ? OR a.attendance_date IS NULL)',
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
        db.query('SELECT b.id, CONCAT(b.first_name, " - ", b.employee_id) AS name FROM employees b WHERE b.company_id = ? AND b.id = ?',
            [companyId, employeeId], (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
    });
};

const createAttendanceResponse = (record, status, date) => {
    return {
        id: record.id,
        name: record.name,
        attendance_id: '0',
        status,
        check_in_time: '00:00',
        check_out_time: '00:00',
        duration: '00:00',
        created: date
    };
};




router.post('/api/AttendanceDelete', async (req, res) => {

    const { requestId, userData } = req.body;

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
        const AttendanceDelete = await queryDb(
            'DELETE FROM `attendance` WHERE request_id= ? AND company_id = ?',
            [requestId, decodedUserData.company_id]
        );
        const AttendanceRequestDelete = await queryDb(
            'DELETE FROM `attendance_requests` WHERE id= ? AND company_id = ?',
            [requestId, decodedUserData.company_id]
        );
        if (AttendanceDelete.affectedRows > 0 || AttendanceRequestDelete.affectedRows > 0) {
            res.json({ status: true, message: 'Attendance request deleted successfully' });
        } else {
            res.status(200).json({ status: false, message: 'Attendance request not found or already deleted' });
        }

    } catch (err) {
        res.status(500).json({ status: false, message: 'Database error', error: err.message });
    }
});
function queryDb(query, params) {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

// new 
router.post('/api/AttendanceReqSubmit', async (req, res) => {

    const { userData, request_date, attendance_id, request_type, in_time, out_time, reason } = req.body;

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
    let employee_id = req.body.employee_id || decodedUserData.id;


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


// appro ......

router.post('/api/AttendancePending', async (req, res) => {

    let { userData, startDate, endDate, searchData, EmployeeId } = req.body;
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

    let currentDate = new Date();
    // Set default startDate to 30 days before today
    let defaultStartDate = new Date();
    defaultStartDate.setDate(currentDate.getDate() - 30);
    let OnedayBack = new Date();
    OnedayBack.setDate(currentDate.getDate() - 1);

    // Use provided startDate/endDate or default values
    startDate = startDate || formatDate(defaultStartDate);
    endDate = endDate || formatDate(OnedayBack);

    searchData = searchData || null;
    EmployeeId = EmployeeId || decodedUserData.id;


    if (!startDate || !endDate) {
        return res.status(400).json({ status: false, message: 'Both startDate and endDate are required' });
    }
    if (!isDateBeforeToday(endDate)) {
        return res.status(400).json({ status: false, message: 'End date cannot be greater than today.' });
    }
    if (decodedUserData.id == EmployeeId) {
        // try {
        //     const start = new Date(startDate);
        //     const end = new Date(endDate);

        //     if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        //         return res.status(400).json({ status: false, message: 'Invalid startDate or endDate format. Expected YYYY-MM-DD.' });
        //     }

        //     let empsql = `SELECT id, CONCAT(first_name,' ', last_name) As first_name, employee_id FROM employees WHERE employee_status=1 and status=1 and delete_status=0 and id=? AND company_id=?`;
        //     let EmpArrayValue = [EmployeeId, decodedUserData.company_id];

        //     if (searchData) {
        //         empsql += ` AND first_name LIKE ?`;
        //         EmpArrayValue.push(`%${searchData}%`);
        //     }

        //     // Fetch employees
        //     const [empResults] = await db.promise().query(empsql, EmpArrayValue);
        //     if (empResults.length === 0) {
        //         return res.status(200).json({ status: false, message: 'Employees not found' });
        //     }

        //     // Fetch holidays
        //     const [holidayResults] = await db.promise().query(
        //         `SELECT date FROM holiday WHERE company_id=? And status = 1 AND date BETWEEN ? AND ?`,
        //         [decodedUserData.company_id, startDate, endDate]
        //     );
        //     const holidays = new Set(holidayResults.map(holiday => new Date(holiday.date).toISOString().split('T')[0]));

        //     // Fetch work week data
        //     const [workWeekData] = await db.promise().query(
        //         `SELECT * FROM work_week WHERE id = (
        //         SELECT work_week_id FROM employees WHERE employee_status=1 and status=1 and delete_status=0 and id = ? AND company_id = ?
        //     )`,
        //         [EmployeeId, decodedUserData.company_id]
        //     );

        //     const workWeek = workWeekData.length > 0 ? workWeekData[0] : null;
        //     const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

        //     // Fetch attendance logs for the date range
        //     const monthlyAttendanceLogs = [];
        //     for (const employee of empResults) {
        //         const [attendanceResults] = await db.promise().query(
        //             `SELECT attendance_id, status,request_id, check_in_time, check_out_time, attendance_date, duration,attendance_status
        //          FROM attendance WHERE employee_id = ? AND attendance_date BETWEEN ? AND ?`,
        //             [employee.id, startDate, endDate]
        //         );
        //         const [attendanceApprovalRequests] = await db.promise().query(
        //             `SELECT id, request_date,in_time, out_time
        //          FROM attendance_requests
        //          WHERE company_id=? AND employee_id = ? AND request_date BETWEEN ? AND ?`,
        //             [decodedUserData.company_id, employee.id, startDate, endDate]
        //         );

        //         const startDateObj = new Date(startDate);
        //         const endDateObj = new Date(endDate);

        //         for (let currentDate = startDateObj; currentDate <= endDateObj; currentDate.setDate(currentDate.getDate() + 1)) {
        //             const formattedDate = currentDate.toISOString().split('T')[0];
        //             const dayOfWeek = currentDate.getDay(); // Get day index (0 = Sunday, ..., 6 = Saturday)
        //             const weekNumber = Math.ceil(currentDate.getDate() / 7); // Determine the week number (1 to 5)
        //             const dayKey = `${daysOfWeek[dayOfWeek]}${weekNumber}`;

        //             const isWeeklyOff = workWeek && workWeek[dayKey] === 3;

        //             const attendance = attendanceResults.find(a => new Date(a.attendance_date).toISOString().split('T')[0] === formattedDate);
        //             const ApprovalRequests = attendanceApprovalRequests.find(b => new Date(b.request_date).toISOString().split('T')[0] === formattedDate);

        //             const isHoliday = holidays.has(formattedDate);
        //             const inTime = attendance ? attendance.check_in_time : ApprovalRequests ? ApprovalRequests.in_time : '';
        //             const request_id = attendance ? attendance.request_id : 0;
        //             const attendance_date = attendance ? attendance.attendance_date : '';
        //             const outTime = attendance ? attendance.check_out_time : ApprovalRequests ? ApprovalRequests.out_time : '';
        //             const duration = attendance ? attendance.duration : '';
        //             const attendance_id = attendance ? attendance.attendance_id : '';
        //             const ApprovalRequests_id = ApprovalRequests ? ApprovalRequests.id : '';

        //             let status = isHoliday ? 'H' : isWeeklyOff ? 'WO' : attendance ? attendance.status : 'A';
        //             let attendance_statusCheck = attendance ? attendance.attendance_status : 0;
        //             const PendingFor = await PendingForFunction(ApprovalRequests_id);

        //             if (status != 'WO' && status != 'H' && attendance_statusCheck != 1 && request_id == 0) {
        //                 monthlyAttendanceLogs.push({
        //                     name: employee.first_name,
        //                     userId: employee.employee_id,
        //                     Id: employee.id,
        //                     date: formattedDate,
        //                     status: status,
        //                     in_time: inTime,
        //                     out_time: outTime,
        //                     duration: duration,
        //                     attendance_id: attendance_id,
        //                     ApprovalRequests_id: ApprovalRequests_id,
        //                     attendance_date: attendance_date,
        //                     PendingFor: PendingFor,
        //                     usertype: 'employee'
        //                 });
        //             }
        //         }
        //     }
        //     res.json({
        //         status: true,
        //         ApprovalLog: monthlyAttendanceLogs,
        //         message: 'Data Found',
        //     });
        // } catch (err) {
        //     res.status(500).json({ status: false, message: 'An error occurred while fetching attendance data', error: err.message });
        // }
        
        
        
        try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ status: false, message: 'Invalid startDate or endDate format. Expected YYYY-MM-DD.' });
    }

    let empsql = `SELECT id, CONCAT(first_name,' ', last_name) AS first_name, employee_id 
                  FROM employees 
                  WHERE employee_status=1 AND status=1 AND delete_status=0 AND id=? AND company_id=?`;
    let EmpArrayValue = [EmployeeId, decodedUserData.company_id];

    if (searchData) {
        empsql += ` AND first_name LIKE ?`;
        EmpArrayValue.push(`%${searchData}%`);
    }

    const [empResults] = await db.promise().query(empsql, EmpArrayValue);
    if (empResults.length === 0) {
        return res.status(200).json({ status: false, message: 'Employees not found' });
    }

    const [holidayResults] = await db.promise().query(
        `SELECT date FROM holiday WHERE company_id=? AND status=1 AND date BETWEEN ? AND ?`,
        [decodedUserData.company_id, startDate, endDate]
    );
    const holidays = new Set(holidayResults.map(holiday => new Date(holiday.date).toISOString().split('T')[0]));

    const [workWeekData] = await db.promise().query(
        `SELECT * FROM work_week WHERE id = (
            SELECT work_week_id FROM employees 
            WHERE employee_status=1 AND status=1 AND delete_status=0 AND id=? AND company_id=?
        )`,
        [EmployeeId, decodedUserData.company_id]
    );
    const workWeek = workWeekData.length > 0 ? workWeekData[0] : null;
    const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    // ✅ Fetch approved leaves
    const [leaveRequest] = await db.promise().query(
        `SELECT employee_id, start_date, end_date, start_half, end_half 
         FROM leaves 
         WHERE deletestatus=0 AND status=1 AND admin_status=1 
         AND company_id=? AND employee_id=?`,
        [decodedUserData.company_id, EmployeeId]
    );

    const monthlyAttendanceLogs = [];

    for (const employee of empResults) {
        const [attendanceResults] = await db.promise().query(
            `SELECT attendance_id, status, request_id, check_in_time, check_out_time, attendance_date, duration, attendance_status 
             FROM attendance 
             WHERE employee_id=? AND attendance_date BETWEEN ? AND ?`,
            [employee.id, startDate, endDate]
        );

        const [attendanceApprovalRequests] = await db.promise().query(
            `SELECT id, request_date, in_time, out_time,rm_status, rm_id, admin_id, admin_status 
             FROM attendance_requests 
             WHERE company_id=? AND employee_id=? AND request_date BETWEEN ? AND ?`,
            [decodedUserData.company_id, employee.id, startDate, endDate]
        );

        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        for (let currentDate = new Date(startDateObj); currentDate <= endDateObj; currentDate.setDate(currentDate.getDate() + 1)) {
            const formattedDate = currentDate.toISOString().split('T')[0];
            const dayOfWeek = currentDate.getDay(); // 0-6
            const weekNumber = Math.ceil(currentDate.getDate() / 7); // Week 1 to 5
            const dayKey = `${daysOfWeek[dayOfWeek]}${weekNumber}`;

            const isWeeklyOff = workWeek && workWeek[dayKey] === 3;
            const isHoliday = holidays.has(formattedDate);

            // ✅ Check if this date is in any approved leave range
            const isLeave = leaveRequest.some(leave => {
                const leaveStart = new Date(leave.start_date);
                const leaveEnd = new Date(leave.end_date);
                return currentDate >= leaveStart && currentDate <= leaveEnd;
            });

            const attendance = attendanceResults.find(a => new Date(a.attendance_date).toISOString().split('T')[0] === formattedDate);
            const ApprovalRequests = attendanceApprovalRequests.find(b => new Date(b.request_date).toISOString().split('T')[0] === formattedDate);

            const inTime = attendance ? attendance.check_in_time : ApprovalRequests ? ApprovalRequests.in_time : '';
            const outTime = attendance ? attendance.check_out_time : ApprovalRequests ? ApprovalRequests.out_time : '';
            const request_id = attendance ? attendance.request_id : 0;
            const attendance_date = attendance ? attendance.attendance_date : '';
            const duration = attendance ? attendance.duration : '';
            const attendance_id = attendance ? attendance.attendance_id : '';
            const ApprovalRequests_id = ApprovalRequests ? ApprovalRequests.id : '';
             const rm_status = ApprovalRequests ? ApprovalRequests.rm_status : '';
            const rm_id = ApprovalRequests ? ApprovalRequests.rm_id : '';
            const admin_id = ApprovalRequests ? ApprovalRequests.admin_id : '';
            const admin_status = ApprovalRequests ? ApprovalRequests.admin_status : '';
            let status = isHoliday ? 'H' : isWeeklyOff ? 'WO' : attendance ? attendance.status : 'A';
            let attendance_statusCheck = attendance ? attendance.attendance_status : 0;
            const PendingFor = await PendingForFunction(ApprovalRequests_id);

            // ✅ Only push pending data if NOT holiday, NOT weekly off, NOT approved leave
            if (status !== 'WO' && status !== 'H' && !isLeave && attendance_statusCheck !== 1 && request_id === 0) {
                monthlyAttendanceLogs.push({
                    name: employee.first_name,
                    userId: employee.employee_id,
                    Id: employee.id,
                    date: formattedDate,
                    status: status,
                    in_time: inTime,
                     rm_status:rm_status, rm_id:rm_id, admin_id:admin_id, admin_status:admin_status, 
                    out_time: outTime,
                    duration: duration,
                    attendance_id: attendance_id,
                    ApprovalRequests_id: ApprovalRequests_id,
                    attendance_date: attendance_date,
                    PendingFor: PendingFor,
                    usertype: 'employee'
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

    } else {

        const query = `
        SELECT AR.id,AR.id as ApprovalRequests_id,AR.employee_id, AR.company_id, AR.rm_status, AR.rm_id, AR.rm_remark, AR.admin_id, AR.admin_status, AR.admin_remark, AR.request_type, AR.request_date, AR.in_time, AR.out_time, AR.status, AR.reason, AR.reason_admin, AR.reason_rm, AR.created,Emp.first_name AS name,Emp.employee_id AS userId
        FROM 
            attendance_requests AS AR
        INNER JOIN 
            employees AS Emp 
            ON Emp.id = AR.employee_id
        WHERE 
            AR.employee_id = ? 
            AND (
                -- Case 1: Manager's requests
                AR.rm_id = ? and (AR.rm_status = 0 OR AR.admin_status = 0)
                -- Case 2: admin/CEO/HR with no RM assigned
                OR (
                    EXISTS (
                        SELECT 1 
                        FROM employees 
                        WHERE 
                            id = ? 
                            AND company_id = ? 
                            AND FIND_IN_SET(type, 'admin,ceo,hr') > 0
                    ) 
                    AND AR.rm_id = 0 and AR.admin_status = 0
                )
                
                -- Case 3: Admin/CEO/HR with RM assigned and approved
                OR (
                    EXISTS (
                        SELECT 1 
                        FROM employees 
                        WHERE 
                            id = ? 
                            AND company_id = ? 
                            AND FIND_IN_SET(type, 'admin,ceo,hr') > 0
                    ) 
                    AND AR.rm_id != 0 
                    AND AR.rm_status = 1
                    and AR.admin_status = 0
                )
            )
        ORDER BY 
            AR.id DESC;
    `;

        const queryParams = [
            EmployeeId,
            decodedUserData.id,
            decodedUserData.id,
            decodedUserData.company_id,
            decodedUserData.id,
            decodedUserData.company_id
        ];

        // Execute the query
        const [results] = await db.promise().query(query, queryParams);

        // Count total records for pagination
        const countQuery = 'SELECT COUNT(id) AS total FROM attendance_requests WHERE 1 = 1';
        const [countResults] = await db.promise().query(countQuery);

        const total = countResults[0]?.total || 0;

        // Add serial number (srnu) to each result
        const requestsWithSrnu = results.map((request, index) => {
            let usertype = '';
            let PendingFor = '';
            if (request.rm_id !== 0 && request.rm_status === 0 && request.admin_id === 0) {
                usertype = 'Rm';
                PendingFor = 'Pending For Rm';
            } else if (
                (request.rm_id === 0 || (request.rm_id !== 0 && request.rm_status === 1)) &&
                request.admin_id === 0
            ) {
                usertype = 'Admin';
                PendingFor = 'Pending For Admin';
            } else {
                PendingFor = 'Approved';
            }

            return {
                srnu: index + 1,
                usertype,
                PendingFor,
                ...request,
            };
        });

        res.json({
            status: true,
            ApprovalLog: requestsWithSrnu,
            total,
        });
    }
});



router.post('/api/AttendanceApprovalLog', async (req, res) => {
    try {
        let { EmployeeId, userData } = req.body;
        // Decode user data
        let decodedUserData = null;

        if (userData) {
            decodedUserData = decodeUserData(userData);
            if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
                return res.status(400).json({ status: false, message: 'Invalid userData', error: 'Invalid userData' });
            }
        } else {
            return res.status(400).json({ status: false, message: 'userData is required', error: 'Missing userData' });
        }

        // Parse filters
        EmployeeId = EmployeeId || decodedUserData.id;

        // Query to fetch attendance requests

        const query = `
    SELECT 
        AR.id,
        AR.id as ApprovalRequests_id,
        AR.employee_id, 
        AR.company_id, 
        AR.rm_status, 
        AR.rm_id, 
        AR.rm_remark, 
        AR.admin_id, 
        AR.admin_status, 
        AR.admin_remark, 
        AR.request_type, 
        AR.request_date, 
        AR.in_time, 
        AR.out_time, 
        AR.status, 
        AR.reason, 
        AR.reason_admin, 
        AR.reason_rm, 
        AR.created,
        Emp.first_name AS name,
        Emp.employee_id AS userId
    FROM 
        attendance_requests AS AR
    INNER JOIN 
        employees AS Emp 
        ON Emp.id = AR.employee_id
    WHERE 
        AR.employee_id = ? AND AR.company_id = ?
        AND (AR.rm_id = ? OR AR.admin_id = ? OR AR.employee_id=?) AND (AR.admin_status = 1 OR AR.admin_status = 2) 
         
    ORDER BY 
        AR.id DESC;
`;

        const queryParams = [
            EmployeeId,
            decodedUserData.company_id,
            decodedUserData.id,
            decodedUserData.id,
            EmployeeId
        ];

        // Execute the query
        const [results] = await db.promise().query(query, queryParams);

        // Count total records for pagination
        const countQuery = 'SELECT COUNT(id) AS total FROM attendance_requests WHERE 1 = 1';
        const [countResults] = await db.promise().query(countQuery);

        const total = countResults[0]?.total || 0;

        // Add serial number (srnu) to each result
        const requestsWithSrnu = results.map((request, index) => ({
            srnu: index + 1,
            ...request,
        }));

        res.json({
            status: true,
            requests: requestsWithSrnu,
            total,
        });
    } catch (err) {
        console.error('Error fetching attendance approval log:', err);
        res.status(500).json({ status: false, error: 'Server error', message: err.message });
    }
});


// get for one day Att 
router.post('/api/Attendancedirectory', async (req, res) => {
    const { userData, date } = req.body;
    let SearchDate = null;

    if (date) {
        SearchDate = date ? date : null;
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
                SELECT b.id AS employee_id, b.first_name,b.profile_image, b.work_week_id, a.attendance_date, a.status, a.daily_status_in, a.daily_status_out, a.daily_status_intime, a.daily_status_outtime, a.check_in_time, a.check_out_time, a.duration,a.attendance_id
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


        // Query to fetch leaves
        const leaveResults = await new Promise((resolve, reject) => {
            const query = `
                SELECT leave_id, employee_id, leave_type, start_date, end_date FROM leaves 
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
                    attendance_id: attendance.attendance_id || 0,
                    employee_id: attendance.employee_id,
                    first_name: attendance.first_name,
                    profile_image: attendance.profile_image,
                    id: attendance.employee_id,
                    status: status,
                };
            })
        );

        const totalEmployees = await new Promise((resolve, reject) => {
            const query = `
                SELECT COUNT(id) AS total FROM employees
                WHERE employee_status=1 and status=1 and delete_status=0 and company_id = ?
            `;
            db.query(query, [decodedUserData.company_id], (err, results) => (err ? reject(err) : resolve(results[0].total)));
        });

        // Query to count the attendance records for the given date
        const attendanceCount = await new Promise((resolve, reject) => {
            const query = `
                SELECT COUNT(DISTINCT employee_id) AS total FROM attendance
                WHERE attendance_date = ? AND company_id = ?
            `;
            db.query(query, [SearchDate || null, decodedUserData.company_id], (err, results) => (err ? reject(err) : resolve(results[0].total)));
        });

        // Query to count the leave records for the given date
        const leaveCount = await new Promise((resolve, reject) => {
            const query = `SELECT COUNT(DISTINCT employee_id) AS total FROM leaves
                WHERE ? BETWEEN start_date AND end_date AND company_id = ?`;
            db.query(query, [SearchDate || null, decodedUserData.company_id], (err, results) => (err ? reject(err) : resolve(results[0].total)));
        });

        // Calculate the number of absentees
        const absentees = totalEmployees - attendanceCount - leaveCount;
        // Respond with results
        res.json({
            status: true,
            Attendanceemployees: employeesWithDetails,
            // total: attendanceResults.length,
            total: totalEmployees,
            summary: {
                totalEmployees: totalEmployees,
                attendanceCount: attendanceCount,
                leaveCount: leaveCount,
                absentees: absentees
            },
            page,
            limit,
        });

    } catch (error) {
        console.error('Error processing attendance directory:', error);
        res.status(500).json({ status: false, error: 'Server error' });
    }
});



// // employee Get UnderOne Employee

router.post('/api/EmployeesUnderRm', async (req, res) => {
    const { userData } = req.body;
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

    query = `SELECT id, CONCAT(first_name,' ',last_name) AS name,employee_id,profile_image FROM employees WHERE employee_status=1 and status=1 and delete_status=0 and company_id = ? and (reporting_manager=? OR id=?)`;
    dataArray.push(company_id, decodedUserData.id, decodedUserData.id);

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


// Export the router
module.exports = router;