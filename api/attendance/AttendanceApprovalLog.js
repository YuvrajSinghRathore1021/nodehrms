const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');

// web cheak A
router.post('/api/ChackViewDetails', (req, res) => {
    const { userData, Logid, attendanceId = 0 } = req.body;
    const attendanceIdNum = Number(attendanceId);
    let decodedUserData = null;

    // 🔐 Decode userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({
                status: false,
                message: 'Invalid userData'
            });
        }
    }

    if (!decodedUserData?.company_id) {
        return res.status(400).json({
            status: false,
            message: 'Company ID is required'
        });
    }

    const company_id = decodedUserData.company_id;

    /* =====================================================
       CASE 1️⃣ : attendanceId AVAILABLE → attendance table
       ===================================================== */
    if (attendanceIdNum > 0) {
        const attendanceQuery = `
      SELECT 
        a.attendance_id,
        a.request_id,
        a.employee_id,
        a.attendance_date,
        a.status,
        a.check_in_time,
        a.check_out_time,
        a.duration,
        a.approval_status,
        a.attendance_status,
        a.late_coming_leaving,
        a.short_leave,
        a.reason,
        a.created,

        e.first_name AS employee_name,
        e.employee_id AS emp_code,
        d.name AS department_name

      FROM attendance a
      INNER JOIN employees e ON e.id = a.employee_id
      LEFT JOIN departments d ON d.id = e.department
      WHERE a.company_id = ?
        AND a.attendance_id = ?
    `;

        return db.query(attendanceQuery, [company_id, attendanceIdNum], (err, results) => {
            if (err) {
                return res.status(500).json({
                    status: false,
                    message: 'Database error',
                    error: err.message
                });
            }


            if (!results.length) {
                return res.json({
                    status: false,
                    message: 'Attendance record not found'
                });
            }

            return res.json({
                status: true,
                type: 'attendance',
                data: results[0],
                message: 'Attendance data fetched successfully'
            });
        });
    } else {

        /* =====================================================
           CASE 2️⃣ : attendanceId NOT available → request table
           ===================================================== */
        const requestQuery = `
    SELECT 
      AR.rm_status,
      AR.id,
      AR.rm_id,
      AR.employee_id,
      AR.admin_id,
      AR.admin_status,
      AR.request_type,
      AR.rm_remark,
      AR.admin_remark,
      AR.request_date,
      AR.in_time ,
      AR.out_time ,
      AR.in_time as check_in_time,
      AR.out_time as check_out_time,
      AR.status,
      AR.reason,
      AR.created,

      e.first_name AS employee_name,
      e.employee_id AS emp_code,
      d.name AS department_name,
      em.first_name AS rm_name

    FROM attendance_requests AR
    INNER JOIN employees e ON e.id = AR.employee_id
    LEFT JOIN departments d ON d.id = e.department
    LEFT JOIN employees em ON em.id = e.reporting_manager
    WHERE AR.company_id = ?
      AND AR.id = ?
  `;

        db.query(requestQuery, [company_id, Logid], (err, results) => {
            if (err) {
                return res.status(500).json({
                    status: false,
                    message: 'Database error',
                    error: err.message
                });
            }

            if (!results.length) {
                return res.json({
                    status: false,
                    message: 'Attendance request not found'
                });
            }

            return res.json({
                status: true,
                type: 'request',
                data: results[0],
                message: 'Attendance request fetched successfully'
            });

        });
    }
});

// app cheak A
router.post('/api/ChackViewDetailsNew', async (req, res) => {
    const { userData, attendanceDate, employeeId = 0, status } = req.body;
    // status =>a:-absence, p:-present, l:-leave, h:-holiday,hf:-halfday,lwp:-leave without pay,wo:-week off,
    if (!attendanceDate) {
        return res.status(400).json({ status: false, message: 'attendanceDate is required' });
    }

    let decodedUserData;
    try {
        const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
        decodedUserData = JSON.parse(decodedString);
    } catch (err) {
        return res.status(400).json({ status: false, message: 'Invalid userData' });
    }

    const { company_id } = decodedUserData;

    let employee_id = employeeId || decodedUserData.id;

    if (!employee_id || !company_id) {
        return res.status(400).json({ status: false, message: 'Invalid employee or company' });
    }

    try {
        /* ===================== employee ===================== */
        const [employee] = await db.promise().query(`
            SELECT id as employee_id, CONCAT(first_name," ",last_name, " - ", employee_id) AS name,profile_image FROM employees WHERE id=? LIMIT 1
        `, [employee_id]);

        /* ===================== ATTENDANCE ===================== */
        const [attendance] = await db.promise().query(`
           SELECT a.attendance_id, a.request_id, a.attendance_date, a.status, a.daily_status_in, a.daily_status_out, a.daily_status_intime, a.daily_status_outtime, a.check_in_time, a.check_out_time, a.duration, a.approval_status, a.attendance_status,  a.in_latitude, a.in_longitude, a.out_latitude, a.out_longitude, a.reason, a.hr_reason, a.late_coming_leaving, a.attendance_reason, a.short_leave, a.short_leave_type, a.short_leave_reason, bi.name AS branch_in_name, bo.name AS branch_out_name , CONCAT(e.first_name," ",e.last_name, " - ", e.employee_id) AS apply_by_name,e.profile_image as apply_by_profile_image
FROM attendance as a
LEFT JOIN branches AS bi ON a.branch_id_in = bi.id
LEFT JOIN branches AS bo  ON a.branch_id_out = bo.id
LEFT JOIN employees AS e  ON a.apply_by = e.id WHERE a.employee_id = ? AND a.company_id = ? AND a.attendance_date = ? LIMIT 1
        `, [employee_id, company_id, attendanceDate]);

        /* ===================== REQUEST ===================== */
        const [request] = await db.promise().query(`
    SELECT 
        ar.id AS request_id,
        ar.employee_id,
        ar.id AS ApprovalRequests_id,
        ar.attendance_id,
        ar.request_type,
        ar.request_date,
        ar.in_time,
        ar.out_time,
            ar.in_time as check_in_time,
      ar.out_time as check_out_time,
        ar.status AS request_status,
        ar.reason AS employee_reason,
        ar.reason_rm,
        ar.reason_admin,
        ar.created,
        ar.short_leave, ar.short_leave_type, ar.short_leave_reason,

        -- RM Info
        ar.rm_id,
        CONCAT(rm.first_name, ' ', rm.last_name, ' - ', rm.employee_id) AS rm_name,
        rm.profile_image AS rm_profile_image,
        ar.rm_status,
        ar.rm_remark,

        -- Admin Info
        ar.admin_id,
        CONCAT(ad.first_name, ' ', ad.last_name, ' - ', ad.employee_id) AS admin_name,
        ad.profile_image AS admin_profile_image,
        ar.admin_status,
        ar.admin_remark,

        -- Applied By
        CONCAT(emp.first_name, ' ', emp.last_name, ' - ', emp.employee_id) AS applied_by_name,
        emp.profile_image AS applied_by_profile_image,

        -- Status Labels
        CASE 
            WHEN ar.admin_status = 1 THEN 'Approved'
            WHEN ar.admin_status = 2 THEN 'Rejected'
            WHEN ar.rm_status = 1 AND ar.admin_status = 0 THEN 'RM Approved'
            WHEN ar.rm_status = 2 THEN 'RM Rejected'
            ELSE 'Pending'
        END AS final_request_status

    FROM attendance_requests ar

    LEFT JOIN employees emp ON emp.id = ar.employee_id
    LEFT JOIN employees rm  ON rm.id  = ar.rm_id
    LEFT JOIN employees ad  ON ad.id  = ar.admin_id

    WHERE ar.employee_id = ?
      AND ar.company_id = ?
      AND ar.request_date = ?

    ORDER BY ar.id DESC
    LIMIT 1
`, [employee_id, company_id, attendanceDate]);

        /* ===================== LEAVE ===================== */
        const [leave] = await db.promise().query(`
    SELECT 
        l.leave_id,
        l.start_date,
        l.end_date,
        l.start_half,
        l.end_half,

        l.status,
        l.deletestatus,
        l.created,

        -- Leave Rule Info
        lr.leave_type AS leave_rule_name,

        -- Reasons
        l.reason AS employee_reason,
        l.rm_remark,
        l.admin_remark,

        -- RM Info
        l.rm_id,
        CONCAT(rm.first_name, ' ', rm.last_name, ' - ', rm.employee_id) AS rm_name,
        rm.profile_image AS rm_profile_image,
        l.rm_status,

        -- Admin Info
        l.admin_id,
        CONCAT(ad.first_name, ' ', ad.last_name, ' - ', ad.employee_id) AS admin_name,
        ad.profile_image AS admin_profile_image,
        l.admin_status,

        -- Applied By
        CONCAT(emp.first_name, ' ', emp.last_name, ' - ', emp.employee_id) AS applied_by_name,
        emp.profile_image AS applied_by_profile_image,

        -- FINAL STATUS
        CASE
            WHEN l.admin_status = 1 THEN 'Approved'
            WHEN l.admin_status = 2 THEN 'Rejected'
            WHEN l.rm_status = 1 AND l.admin_status = 0 THEN 'RM Approved'
            WHEN l.rm_status = 2 THEN 'RM Rejected'
            ELSE 'Pending'
        END AS final_leave_status,

        -- LEAVE TYPE LABEL
        CASE
            WHEN l.start_half = 'First Half' AND l.end_half = 'First Half' THEN 'Half Day'
            WHEN l.start_half = 'Second Half' AND l.end_half = 'Second Half' THEN 'Half Day'
            ELSE 'Full Day'
        END AS leave_day_type

    FROM leaves l

    LEFT JOIN employees emp ON emp.id = l.employee_id
    LEFT JOIN employees rm  ON rm.id  = l.rm_id
    LEFT JOIN employees ad  ON ad.id  = l.admin_id
    LEFT JOIN leave_rules lr ON lr.id = l.leave_rule_id

    WHERE l.employee_id = ?
      AND l.company_id = ?
      AND ? BETWEEN l.start_date AND l.end_date
      AND l.deletestatus = 0

    ORDER BY l.leave_id DESC
    LIMIT 1
`, [employee_id, company_id, attendanceDate]);

        /* ===================== HOLIDAY ===================== */
        const [holiday] = await db.promise().query(`
            SELECT holiday
            FROM holiday
            WHERE company_id = ?
              AND status = 1
              AND date = ?
            LIMIT 1
        `, [company_id, attendanceDate]);

        /* ===================== FINAL STATUS ===================== */
        let finalStatus = 'A';
        let label = 'Absent';

        // ---- Attendance ----
        if (attendance.length > 0) {
            const att = attendance[0];

            if (att.status === 'present') {
                finalStatus = 'P';
                label = 'Present';

                if (!att.check_out_time) {
                    finalStatus = 'NCO';
                    label = 'Not Checked Out';
                }
                if (att.short_leave == 1) {
                    finalStatus = 'SL';
                    label = att.short_leave_reason || 'Short Leave';
                }
            }
            else if (att.status === 'half-day') {
                finalStatus = 'HF';
                label = 'Half Day';
            }
            else if (att.status === 'lwp') {
                finalStatus = 'LWP';
                label = 'Leave Without Pay';
            }
        }

        // ---- Leave ----
        else if (leave.length > 0) {
            const lv = leave[0];

            if (lv.start_half == lv.end_half) {
                finalStatus = 'HL';
                label = `Half Day Leave (${lv.leave_rule_name})`;
            } else {
                finalStatus = 'L';
                label = lv.leave_rule_name;
            }
        }
        // ---- Holiday ----
        else if (holiday.length > 0) {
            finalStatus = 'H';
            label = `Holiday - ${holiday[0].holiday}`;
        } else if (status) {
            finalStatus = status;
            if (status == 'P' || status == 'p') {
                label = 'Present';
            } else if (status == 'A' || status == 'a') {
                label = 'Absent';
            } else if (status == 'H' || status == 'h') {
                label = 'Holiday';
            } else if (status == 'L' || status == 'l') {
                label = 'Leave';
            } else if (status == 'HF' || status == 'hf') {
                label = 'Half Day';
            } else if (status == 'LWP' || status == 'lwp') {
                label = 'Leave Without Pay';
            } else if (status == 'WO' || status == 'wo') {
                label = 'Week Off';
            }
        }

        /* ===================== RESPONSE ===================== */
        res.json({
            status: true,
            date: attendanceDate,
            final_status: finalStatus,
            label,
            employee: employee[0] || null,
            attendance: attendance[0] || null,
            leave: leave[0] || null,
            request: request[0] || null,
            holiday: holiday[0] || null,
            sl_eligible: true
        });

    } catch (error) {
        console.error('CheckViewDetails Error:', error);
        res.status(500).json({
            status: false,
            message: 'Error fetching attendance details',
            error: error.message
        });
    }
});

// app cheak A / web cheak A
router.post('/api/ApprovalSubmit', async (req, res) => {
    const { userData, ApprovalRequests_id, Type, ApprovalStatus, employee_id, in_time, out_time, reason, request_date, request_type,short_leave=0,short_leave_type=0,short_leave_reason="" } = req.body;
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
        SET rm_status = ?, rm_remark = ?,request_type=?, short_leave=?, short_leave_type=?, short_leave_reason=? 
        WHERE id = ? AND company_id = ?`;
        queryArray = [ApprovalStatus, reason, request_type, short_leave, short_leave_type, short_leave_reason, ApprovalRequests_id, company_id];
    } else {
        query = `
        UPDATE attendance_requests 
        SET admin_status = ?, admin_remark = ?, admin_id = ? ,request_type=?, short_leave=?, short_leave_type=?, short_leave_reason=?
        WHERE id = ? AND company_id = ?`;
        queryArray = [ApprovalStatus, reason, decodedUserData.id, request_type, short_leave, short_leave_type, short_leave_reason, ApprovalRequests_id, company_id];
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
            'SELECT request_type,in_time,out_time,request_date,attendance_id,short_leave,short_leave_type,short_leave_reason FROM attendance_requests WHERE id = ? AND company_id = ?',
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
                     status=?, check_in_time=?, check_out_time=?, approval_status=?, short_leave=?, short_leave_type=?, short_leave_reason=?
                      Where  employee_id=? AND company_id=? And attendance_id=?`;

                insertParams = [ApprovalRequests_id,
                    dailyStatusIN, timeCountIN, dailyStatusOUT, timeCountOUT,
                    attendanceRequestType[0].request_type, in_time || attendanceRequestType[0].in_time, out_time || attendanceRequestType[0].out_time, 1
                    , short_leave, short_leave_type, short_leave_reason,
                     employee_id, company_id, attendanceRequestType[0].attendance_id];

                actionType = 'update';

            } else {
                insertQuery = `
                INSERT INTO attendance (request_id,daily_status_in, daily_status_intime, daily_status_out, daily_status_outtime, 
                    employee_id, company_id, attendance_date, status, check_in_time, check_out_time, approval_status, short_leave, short_leave_type, short_leave_reason
                ) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                insertParams = [ApprovalRequests_id,
                    dailyStatusIN, timeCountIN, dailyStatusOUT, timeCountOUT,
                    employee_id, company_id, attendanceRequestType[0].request_date, attendanceRequestType[0].request_type, in_time || attendanceRequestType[0].in_time, out_time || attendanceRequestType[0].out_time, 1
                    , short_leave, short_leave_type, short_leave_reason
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