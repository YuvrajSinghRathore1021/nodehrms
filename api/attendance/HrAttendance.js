const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');


router.post('/attendanceEdit', async (req, res) => {
    const { userData, ApprovalStatus } = req.body;
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
    // Update attendance request
    const query = `UPDATE attendance_requests SET admin_status = ? AND company_id = ?`;
    const queryArray = [ApprovalStatus, company_id];

    try {
        const updateResult = await queryDb(query, queryArray);
        // console.log(updateResult);
        if (updateResult.affectedRows == 1) {

            return res.status(200).json({
                status: true,
                message: 'Updated successfully',
            });
        } else {
            return res.status(200).json({
                status: false,
                message: 'Update failed',
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


router.post('/attendanceDetails', async (req, res) => {
    const { userData, attendanceId } = req.body;
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
    // Update attendance request
    // SELECT att.attendance_id, att.employee_id, att.company_id, att.request_id,   att.attendance_date, att.status, att.daily_status_in, att.daily_status_out, att.daily_status_intime, att.daily_status_outtime, att.check_in_time, att.check_out_time, att.duration, att.approval_status, att.attendance_status, att.in_ip, att.out_ip, att.in_latitude, att.in_longitude, att.out_latitude, att.out_longitude,  att.reason, att.created ,
    // br.name as branch_in_name,br1.name as branch_out_name,
    // CONCAT(emp.first_name,' ',emp.last_name,' -',emp.employee_id) as employee_name,
    // CONCAT(emp2.first_name,' ',emp2.last_name,' -',emp2.employee_id) as apply_by_name
    // FROM attendance as att
    // LEFT JOIN employees as emp ON att.employee_id=emp.id
    // LEFT JOIN employees as emp2 ON  att.apply_by=emp2.id
    // LEFT JOIN attendance_requests as ar ON  att.request_id=ar.id
    // LEFT JOIN branches as br ON  att.branch_id_in=br.id
    // LEFT JOIN branches as br1 ON  att.branch_id_out=br1.id
    // WHERE att.attendance_id=? and company_id=?


    const query = `SELECT 
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

    -- Branch names
    br.name AS branch_in_name,
    br1.name AS branch_out_name,

    -- Employee names
    CONCAT(emp.first_name,' ',emp.last_name,' -',emp.employee_id) AS employee_name,
    CONCAT(emp2.first_name,' ',emp2.last_name,' -',emp2.employee_id) AS apply_by_name,

    -- Attendance request details
    ar.id AS request_id,
    ar.rm_status,
    ar.rm_id,
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
LEFT JOIN attendance_requests AS ar ON att.request_id = ar.id
LEFT JOIN employees AS rm ON ar.rm_id = rm.id          -- RM details
LEFT JOIN employees AS admin ON ar.admin_id = admin.id -- Admin details
LEFT JOIN branches AS br ON att.branch_id_in = br.id
LEFT JOIN branches AS br1 ON att.branch_id_out = br1.id
WHERE att.attendance_id = ? 
  AND att.company_id = ?;
`;
    const queryArray = [attendanceId, company_id];

    try {
        const updateResult = await queryDb(query, queryArray);
        // console.log(updateResult);
        if (updateResult.affectedRows == 1) {

            return res.status(200).json({
                status: true,
                message: 'Updated successfully',
            });
        } else {
            return res.status(200).json({
                status: false,
                message: 'Update failed',
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


// Export the router
module.exports = router;