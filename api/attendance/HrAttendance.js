const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');


//////
router.post('/attendanceEdit', async (req, res) => {
    const { userData, status, checkInTime, attendance_status, checkOutTime, duration, reason, branchIdIn, branchIdOut, attendanceId, hrReason, type, employeeId } = req.body;
    let decodedUserData = null;
    // Decode and validate userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({
                status: false, error: 'Invalid userData', message: 'Invalid userData'
            }); 3
        }
    }

    // Validate company_id
    if (!decodedUserData || !decodedUserData.company_id) {
        return res.status(400).json({
            status: false, error: 'Company ID is required', message: 'Company ID is required'
        });
    }

    const company_id = decodedUserData.company_id;
    try {
        let result;
        if (type == "AttendanceSubmit") {

            [result] = await db.promise().query(
                `INSERT INTO attendance ( status,check_in_time ,check_out_time,duration ,reason,branch_id_in, branch_id_out,employee_id , company_id,apply_by,reason) values (?,?,?,?,?,?,?,?,) `,
                [status, checkInTime, checkOutTime, duration, reason, branchIdIn, branchIdOut, employeeId, company_id, decodedUserData.id, hrReason]
            );

        } else {
            [result] = await db.promise().query(
                `UPDATE attendance SET attendance_status=?, status=?,check_in_time=? ,check_out_time=?,duration=? ,reason=?,branch_id_in=?, branch_id_out=? WHERE attendance_id=? and company_id=?`,
                [attendance_status, status, checkInTime, checkOutTime, duration, reason, branchIdIn, branchIdOut, attendanceId, company_id]
            );



        }
        if (result.affectedRows > 0) {
            return res.status(200).json({
                status: true,
                message: 'update successfully',
                data: result
            });
        } else {
            return res.status(200).json({
                status: false,
                message: 'failed',
                data: result
            });
        }
    } catch (err) {
        return res.status(200).json({
            status: false,
            message: 'failed'
        });
    }
});


router.post('/attendanceRequestEdit', async (req, res) => {
    const { userData, attendanceId, request_type, in_time, out_time, reason, rm_id, rm_status, admin_id, admin_status, request_id } = req.body;

    let decodedUserData = null;

    // Decode and validate userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, message: 'Invalid userData' });
        }
    }

    if (!decodedUserData || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, message: 'Company ID is required' });
    }

    const company_id = decodedUserData.company_id;

    try {
        const [result] = await db.promise().query(
            `UPDATE attendance_requests 
             SET request_type=?, in_time=?, out_time=?, reason=?, rm_id=?, rm_status=?, admin_id=?, admin_status=? 
             WHERE id=? AND company_id=?`,
            [request_type, in_time, out_time, reason, rm_id, rm_status, admin_id, admin_status, request_id, company_id]
        );

        if (result.affectedRows === 0) {
            return res.status(200).json({ status: false, message: 'No record updated' });
        }

        let message = 'Request updated successfully';

        // If approved by admin, sync to attendance table
        if (admin_status == 1) {
            const attendanceRequestType = await queryDb(
                `SELECT id, employee_id, company_id, attendance_id, rm_status, rm_id, rm_remark, admin_id, admin_status, 
                        admin_remark, request_type, request_date, in_time, out_time, status, reason, reason_admin, 
                        reason_rm, created 
                 FROM attendance_requests WHERE id = ? AND company_id = ?`,
                [request_id, company_id]
            );

            if (!attendanceRequestType.length) {
                return res.status(404).json({ status: false, message: 'Attendance request not found' });
            }

            const employeeResults = await queryDb(
                `SELECT attendance_rules_id FROM employees WHERE id = ? AND company_id = ?`,
                [attendanceRequestType[0].employee_id, company_id]
            );

            if (!employeeResults.length) {
                return res.status(404).json({ status: false, message: 'Employee not found' });
            }

            const rulesResults = await queryDb(
                `SELECT in_time, out_time FROM attendance_rules WHERE rule_id = ? AND company_id = ?`,
                [employeeResults[0].attendance_rules_id, company_id]
            );

            const rule = rulesResults.length > 0 ? rulesResults[0] : { in_time: '09:30', out_time: '18:30' };

            const { dailyStatus: dailyStatusIN, timeCount: timeCountIN } = calculateStatus(in_time || attendanceRequestType[0].in_time, rule.in_time);
            const { dailyStatus: dailyStatusOUT, timeCount: timeCountOUT } = calculateStatus(out_time || attendanceRequestType[0].out_time, rule.out_time);

            let insertQuery, insertParams, actionType;

            if (attendanceRequestType[0].attendance_id && attendanceRequestType[0].attendance_id != 0) {
                // Update attendance
                insertQuery = `
                    UPDATE attendance 
                    SET request_id=?, daily_status_in=?, daily_status_intime=?, daily_status_out=?, daily_status_outtime=?, 
                        status=?, check_in_time=?, check_out_time=?, approval_status=? 
                    WHERE employee_id=? AND company_id=? AND attendance_id=?`;

                insertParams = [
                    request_id,
                    dailyStatusIN, timeCountIN,
                    dailyStatusOUT, timeCountOUT,
                    attendanceRequestType[0].request_type,
                    in_time || attendanceRequestType[0].in_time,
                    out_time || attendanceRequestType[0].out_time,
                    1,
                    attendanceRequestType[0].employee_id,
                    company_id,
                    attendanceRequestType[0].attendance_id
                ];
                actionType = 'update';
            } else {
                // Insert attendance
                insertQuery = `
                    INSERT INTO attendance (request_id, daily_status_in, daily_status_intime, daily_status_out, daily_status_outtime, 
                        employee_id, company_id, attendance_date, status, check_in_time, check_out_time, approval_status
                    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`;

                insertParams = [
                    request_id,
                    dailyStatusIN, timeCountIN,
                    dailyStatusOUT, timeCountOUT,
                    attendanceRequestType[0].employee_id,
                    company_id,
                    attendanceRequestType[0].request_date,
                    attendanceRequestType[0].request_type,
                    in_time || attendanceRequestType[0].in_time,
                    out_time || attendanceRequestType[0].out_time,
                    1
                ];
                actionType = 'insert';
            }

            const resultss = await queryDb(insertQuery, insertParams);

            if (actionType === 'update') {
                message = resultss.affectedRows > 0 ? 'Attendance updated successfully' : 'No attendance record found to update';
            } else {
                message = resultss.insertId ? 'Attendance inserted successfully' : 'Failed to insert attendance';
            }
        }

        return res.status(200).json({ status: true, message });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: 'Internal server error' });
    }
});


// Generic function to execute database queries
function queryDb(query, params) {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}
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

// router.post('/attendanceRequestEdit', async (req, res) => {
//     const { userData, attendanceId, request_type, in_time, out_time, reason, rm_id, rm_status, admin_id, admin_status, request_id } = req.body;

//     let decodedUserData = null;
//     // Decode and validate userData
//     if (userData) {
//         try {
//             const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
//             decodedUserData = JSON.parse(decodedString);
//         } catch (error) {
//             return res.status(400).json({
//                 status: false, error: 'Invalid userData', message: 'Invalid userData'
//             });
//         }
//     }

//     // Validate company_id
//     if (!decodedUserData || !decodedUserData.company_id) {
//         return res.status(400).json({
//             status: false, error: 'Company ID is required', message: 'Company ID is required'
//         });
//     }

//     const company_id = decodedUserData.company_id;
//     try {
//         const [result] = await db.promise().query(
//             `UPDATE attendance_requests SET request_type=?,in_time=?,out_time=?,reason=?,rm_id=?,rm_status=?,admin_id=?,admin_status=? WHERE id=? and company_id=?`,
//             [request_type, in_time, out_time, reason, rm_id, rm_status, admin_id, admin_status, request_id, company_id]
//         );

//         if (result.affectedRows > 0) {
//             return res.status(200).json({
//                 status: true,
//                 message: 'update successfully',
//                 data: result
//             });
//         }

//         else {
//             return res.status(200).json({
//                 status: false,
//                 message: 'failed',
//                 data: result
//             });
//         }
//     } catch (err) {
//         return res.status(200).json({
//             status: false,
//             message: 'failed'
//         });
//     }
// });

router.post('/attendanceDetails', async (req, res) => {
    const { userData, attendanceId, attendanceDate, employeeId } = req.body;
    let decodedUserData = null;

    // Decode and validate userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({
                status: false, error: 'Invalid userData', message: 'Invalid userData'
            });
        }
    }

    // Validate company_id
    if (!decodedUserData || !decodedUserData.company_id) {
        return res.status(400).json({
            status: false, error: 'Company ID is required', message: 'Company ID is required'
        });
    }

    const company_id = decodedUserData.company_id;
    let employee_Id = employeeId;

    let query = "";
    let queryArray = "";


    query = `SELECT 
    att.attendance_id, 
    att.employee_id, 
    att.company_id, 
    att.request_id,   
    att.attendance_date, 
    att.status, 
    att.daily_status_in, 
    att.daily_status_out, 
    att.daily_status_intime, 
    att.daily_status_outtime, 
    att.check_in_time, 
    att.check_out_time, 
    att.duration, 
    att.approval_status, 
    att.attendance_status, 
    att.in_ip, 
    att.out_ip, 
    att.in_latitude, 
    att.in_longitude, 
    att.out_latitude, 
    att.out_longitude,  
    att.reason, 
    att.created,
    att.branch_id_in,
    att.branch_id_out,

    -- Branch names
    br.name AS branch_in_name,
    br1.name AS branch_out_name,

    -- Employee names
    CONCAT(emp.first_name,' ',emp.last_name,' -',emp.employee_id) AS employee_name,
    CONCAT(emp2.first_name,' ',emp2.last_name,' -',emp2.employee_id) AS apply_by_name,
    
    -- Attendance request details

    ar.id AS request_id,ar.rm_status, ar.rm_id,
    CONCAT(rm.first_name,' ',rm.last_name,' -',rm.employee_id) AS rm_name,
    ar.rm_remark,
    ar.admin_id,
    CONCAT(admin.first_name,' ',admin.last_name,' -',admin.employee_id) AS admin_name,
    ar.admin_status,
    ar.admin_remark,
    ar.request_type,
    ar.request_date,
    ar.in_time,
    ar.out_time,
    ar.status AS request_status,
    ar.reason AS request_reason,
    ar.reason_admin,
    ar.reason_rm,
    ar.created AS request_created

FROM attendance AS att
LEFT JOIN employees AS emp ON att.employee_id = emp.id
LEFT JOIN employees AS emp2 ON att.apply_by = emp2.id
LEFT JOIN attendance_requests AS ar ON att.attendance_id = ar.attendance_id
LEFT JOIN employees AS rm ON ar.rm_id = rm.id          -- RM details
LEFT JOIN employees AS admin ON ar.admin_id = admin.id -- Admin details
LEFT JOIN branches AS br ON att.branch_id_in = br.id
LEFT JOIN branches AS br1 ON att.branch_id_out = br1.id

WHERE (att.attendance_id = ? or (att.attendance_date=? and att.employee_id=?)) AND att.company_id = ?`;
    queryArray = [attendanceId, attendanceDate, employeeId, company_id];


    db.query(query, queryArray, (err, results) => {
        if (err) {
            return res.status(500).json({ status: false, message: 'Database error.', error: err });
        }

        if (results.length === 0) {
            return res.status(200).json({ status: false, message: ' record not found.' });
        }

        return res.status(200).json({
            status: true,
            message: 'successfully',
            data: results
        });

    });
});


router.post('/attendanceDetailsSummary', async (req, res) => {
    const { userData, employeeId, timeAllow = "00:20", startDate, endDate } = req.body;

    let decodedUserData = null;
    try {
        decodedUserData = JSON.parse(Buffer.from(userData, 'base64').toString('utf-8'));
    } catch (error) {
        return res.status(400).json({ status: false, message: "Invalid userData" });
    }

    if (!decodedUserData?.company_id) {
        return res.status(400).json({ status: false, message: "Company ID is required" });
    }

    const company_id = decodedUserData.company_id;

    // office timings
    const officeIn = "09:30:00";
    const officeOut = "18:30:00";

    try {
        // 1️⃣ Attendance summary
        const [attendanceSummary] = await db.promise().query(
            `
            SELECT 
                COUNT(*) AS present,
                SUM(CASE WHEN check_in_time > ADDTIME(?, ?) THEN 1 ELSE 0 END) AS lateComing,
                SUM(CASE WHEN check_out_time < SUBTIME(?, ?) THEN 1 ELSE 0 END) AS earlyGoing,
                SUM(CASE WHEN check_in_time <= ADDTIME(?, ?) 
                          AND check_out_time >= SUBTIME(?, ?) THEN 1 ELSE 0 END) AS attendanceProper,
                SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) AS attendanceApprove
            FROM attendance
            WHERE company_id = ? 
              AND employee_id = ? 
              AND attendance_date BETWEEN ? AND ? 
              AND status = 'present'
            `,
            [officeIn, timeAllow, officeOut, timeAllow, officeIn, timeAllow, officeOut, timeAllow,
                company_id, employeeId, startDate, endDate]
        );

        // 2️⃣ Leave count
        const [leaveSummary] = await db.promise().query(
            `SELECT COUNT(*) AS leaveCount
            FROM leaves
            WHERE company_id = ?
              AND employee_id = ?
              AND status = 'approved'
              AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?))`,
            [company_id, employeeId, startDate, endDate, startDate, endDate]
        );

        // 3️⃣ Holiday count
        const [holidaySummary] = await db.promise().query(
            `SELECT COUNT(*) AS holiday FROM holiday WHERE company_id = ? AND date BETWEEN ? AND ? AND 
            status = 1`,
            [company_id, startDate, endDate]
        );

        // 4️⃣ Calculate absent = totalDays - (present + leave + holiday)
        const [totalDaysResult] = await db.promise().query(
            `SELECT DATEDIFF(?, ?) + 1 AS totalDays`,
            [endDate, startDate]
        );
        const totalDays = totalDaysResult[0].totalDays || 0;

        const present = attendanceSummary[0].present || 0;
        const leaveCount = leaveSummary[0].leaveCount || 0;
        const holiday = holidaySummary[0].holiday || 0;

        const absent = Math.max(0, totalDays - (present + leaveCount + holiday));

        return res.json({
            status: true,
            data: {
                present,
                leaveCount,
                holiday,
                absent,
                lateComing: attendanceSummary[0].lateComing,
                earlyGoing: attendanceSummary[0].earlyGoing,
                attendanceProper: attendanceSummary[0].attendanceProper,
                attendanceApprove: attendanceSummary[0].attendanceApprove
            }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: "Error fetching attendance summary" });
    }
});


/////AttendanceRequestDetails

router.post('/AttendanceRequestDetails', async (req, res) => {
    const { userData, employeeId, attendanceDate } = req.body;

    let decodedUserData = null;
    try {
        decodedUserData = JSON.parse(Buffer.from(userData, 'base64').toString('utf-8'));
    } catch (error) {
        return res.status(400).json({ status: false, message: "Invalid userData" });
    }

    if (!decodedUserData?.company_id) {
        return res.status(400).json({ status: false, message: "Company ID is required" });
    }

    const company_id = decodedUserData.company_id;
    let employee_Id = employeeId || decodedUserData.id;

    try {
        // 1️⃣ Attendance summary
        const [attendance] = await db.promise().query(
            `SELECT 
    ar.id, 
    ar.employee_id, 
    ar.company_id, 
    ar.attendance_id, 
    ar.rm_status, 
    ar.rm_id, 
    ar.rm_remark, 
    ar.admin_id, 
    ar.admin_status, 
    ar.admin_remark, 
    ar.request_type, 
    ar.request_date, 
    ar.in_time, 
    ar.out_time, 
    ar.status, 
    ar.reason, 
    ar.reason_admin, 
    ar.reason_rm, 
    ar.created,
    CONCAT(empName.first_name, ' ', empName.last_name, '-', empName.employee_id) AS employee_name,
    CONCAT(rmName.first_name, ' ', rmName.last_name, '-', rmName.employee_id) AS rm_name,
    CONCAT(adminName.first_name, ' ', adminName.last_name, '-', adminName.employee_id) AS admin_name
FROM attendance_requests AS ar
LEFT JOIN employees AS empName ON ar.employee_id = empName.id
LEFT JOIN employees AS rmName ON ar.rm_id = rmName.id
LEFT JOIN employees AS adminName ON ar.admin_id = adminName.id
WHERE ar.company_id=? and ar.employee_id=? and ar.request_date=?;`,
            [company_id, employee_Id, attendanceDate]
        );


        return res.json({
            status: true,
            data: attendance
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: "Error fetching attendance summary" });
    }
});

// Export the router
module.exports = router;


