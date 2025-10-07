const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

router.get('/api/AttendanceApprovalLog', async (req, res) => {
    try {
        const { data, userData } = req.query;
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
        let startDate = data?.startDate || formatDate(new Date());
        let endDate = data?.endDate || formatDate(new Date());
        let searchData = data?.searchData || null;
        let EmployeeId = data?.EmployeeId || null;

        // Query to fetch attendance requests
        const query = `
    SELECT 
        AR.id,
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
        AR.employee_id = ? 
        AND (
            -- Case 1: Manager's requests
            AR.rm_id = ? 
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
                AND AR.rm_id = 0
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

const decodeUserData = (userData) => {
    try {
        const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
        return JSON.parse(decodedString);
    } catch (error) {
        return null;
    }
};

// new 
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

    const query = `SELECT AR.rm_status,AR.id, AR.rm_id,AR.employee_id, AR.admin_id, AR.admin_status, AR.request_type,AR.rm_remark,AR.admin_remark, AR.request_date, AR.in_time, AR.out_time, AR.status, AR.reason, AR.created, e.first_name AS employee_first_name, e.employee_id, d.name AS department_name, em.first_name AS Rm FROM attendance_requests AS AR INNER JOIN employees AS e ON e.id = AR.employee_id LEFT JOIN departments AS d ON e.department = d.id LEFT JOIN employees AS em ON e.reporting_manager = em.id WHERE AR.company_id = ? AND AR.id=?`;

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
    const { userData, ApprovalRequests_id, Type, ApprovalStatus, employee_id, in_time, out_time, reason, request_date, request_type } = req.body;
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

    let query = '';
    let queryArray = [];
    // Update attendance request
    if (Type == 'Rm' || Type == 'rm') {
        query = `
        UPDATE attendance_requests 
        SET rm_status = ?, rm_remark = ?,request_type=? 
        WHERE id = ? AND company_id = ?`;
        queryArray = [ApprovalStatus, reason, request_type, ApprovalRequests_id, company_id];
    } else {
        query = `
        UPDATE attendance_requests 
        SET admin_status = ?, admin_remark = ?, admin_id = ? ,request_type=?
        WHERE id = ? AND company_id = ?`;
        queryArray = [ApprovalStatus, reason, decodedUserData.id, request_type, ApprovalRequests_id, company_id];
    }

    try {

        const AttendanceApprovalRequestsDate = await queryDb(
            'SELECT request_date,attendance_id FROM attendance_requests WHERE id=? AND company_id = ?',
            [ApprovalRequests_id, decodedUserData.company_id]
        );
        let ReqData = AttendanceApprovalRequestsDate[0]['request_date'];
        let AttendanceId = AttendanceApprovalRequestsDate[0]['attendance_id'];

        const AttendanceApprovalCheck = await queryDb(
            'SELECT attendance_id FROM attendance WHERE attendance_date = ? AND employee_id = ? AND company_id = ?',
            [ReqData, employee_id, decodedUserData.company_id]
        );
        if ((AttendanceApprovalCheck.length > 0 && AttendanceId == 0) || (AttendanceId > 0 && AttendanceApprovalCheck.length > 1)) {
            return res.status(200).json({
                status: false,
                message: 'Attendance already exists for this date'
            });
        }




        const updateResult = await queryDb(query, queryArray);
        if (updateResult.affectedRows === 0) {
            return res.status(404).json({
                status: false,
                message: 'No matching attendance request found to update'
            });
        }

        const attendanceRequestType = await queryDb(
            'SELECT request_type,in_time,out_time,request_date,attendance_id FROM attendance_requests WHERE id = ? AND company_id = ?',
            [ApprovalRequests_id, company_id]
        );
        let message = '';
        if (ApprovalStatus == 1 && (Type == 'Admin' || Type == 'admin')) {
            const employeeResults = await queryDb(
                'SELECT attendance_rules_id FROM employees WHERE id = ? AND company_id = ?',
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
            // Insert attendance record  request_date
            let insertQuery = '';
            let insertParams = '';
            let actionType = '';

            if (attendanceRequestType[0].attendance_id != 0 && attendanceRequestType[0].attendance_id != '') {

                insertQuery = `
                UPDATE attendance SET request_id=?,daily_status_in=?, daily_status_intime=?, daily_status_out=?, daily_status_outtime=?, 
                     status=?, check_in_time=?, check_out_time=?, approval_status=? Where  employee_id=? AND company_id=? And attendance_id=?`;

                insertParams = [ApprovalRequests_id,
                    dailyStatusIN, timeCountIN, dailyStatusOUT, timeCountOUT,
                    attendanceRequestType[0].request_type, in_time || attendanceRequestType[0].in_time, out_time || attendanceRequestType[0].out_time, 1
                    , employee_id, company_id, attendanceRequestType[0].attendance_id];

                actionType = 'update';
                // console.log(insertQuery);
                // console.log(insertParams);
            } else {
                insertQuery = `
                INSERT INTO attendance (request_id,daily_status_in, daily_status_intime, daily_status_out, daily_status_outtime, 
                    employee_id, company_id, attendance_date, status, check_in_time, check_out_time, approval_status
                ) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                insertParams = [ApprovalRequests_id,
                    dailyStatusIN, timeCountIN, dailyStatusOUT, timeCountOUT,
                    employee_id, company_id, attendanceRequestType[0].request_date, attendanceRequestType[0].request_type, in_time || attendanceRequestType[0].in_time, out_time || attendanceRequestType[0].out_time, 1
                ];
                actionType = 'insert';
            }

            const resultss = await queryDb(insertQuery, insertParams);


            if (actionType === 'update') {
                message = resultss.affectedRows > 0
                    ? 'Approval updated successfully'
                    : 'No record found to update';
            } else {
                message = resultss.insertId
                    ? 'Approval inserted successfully'
                    : 'Failed to insert approval';
            }
        }
        return res.status(200).json({
            status: true,
            message: message || 'Approval status updated',
        });
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