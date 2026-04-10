// HomeApi.js 

const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');
const { AdminCheck } = require('../../model/functlity/AdminCheck');

// Rules
// /// web cheak A
// router.post('/api/attendancerulesEdit', async (req, res) => {
//     const { userData,
//         rule_name,
//         rule_description,
//         in_time,
//         out_time,
//         max_working_hours,
//         half_day,
//         total_break_duration,
//         overtime_rate,
//         max_overtime_hours,
//         leave_approval_required,
//         rule_id, out_time_required, working_hours_required, last_in_time, last_out_time
//     } = req.body;
//     // ,penalty_rule_applied,late_coming_penalty,early_leaving_penalty
//     let penalty_rule_applied = req.body.penalty_rule_applied == true || req.body.penalty_rule_applied == "true" ? 1 : 0;
//     let sandwich_leave_applied = req.body.sandwich_leave_applied == true || req.body.sandwich_leave_applied == "true" ? 1 : 0;
//     let late_coming_penalty = req.body.late_coming_penalty == true || req.body.late_coming_penalty == "true" ? 1 : 0;
//     let early_leaving_penalty = req.body.early_leaving_penalty == true || req.body.early_leaving_penalty == "true" ? 1 : 0;
//     let in_grace_period_minutes = req.body.in_grace_period_minutes == 'null' || req.body.in_grace_period_minutes == '' ? 0 : req.body.in_grace_period_minutes;
//     let out_grace_period_minutes = req.body.out_grace_period_minutes == 'null' || req.body.out_grace_period_minutes == '' ? 0 : req.body.out_grace_period_minutes;
//     let late_coming_allowed_days = req.body.late_coming_allowed_days == 'null' || req.body.late_coming_allowed_days == '' ? 0 : req.body.late_coming_allowed_days;
//     let late_coming_penalty_type = req.body.late_coming_penalty_type == 'null' || req.body.late_coming_penalty_type == '' ? 'half-day' : req.body.late_coming_penalty_type;
//     let early_leaving_penalty_type = req.body.early_leaving_penalty_type == 'null' || req.body.early_leaving_penalty_type == '' ? 'half-day' : req.body.early_leaving_penalty_type;
//     let early_leaving_allowed_days = req.body.early_leaving_allowed_days == 'null' || req.body.early_leaving_allowed_days == '' ? 0 : req.body.early_leaving_allowed_days;

//      



//     const company_id = req?.user?.company_id;
//     // Server-side validation
//     if (!company_id || !rule_name || !in_time || !out_time || max_working_hours <= 0 || overtime_rate <= 0 || max_overtime_hours < 0) {
//         return res.status(400).json({ status: false, message: 'Invalid input data' });
//     }
//     const isAdmin = await AdminCheck(req?.user?.id, req?.user?.company_id);
//     if (isAdmin === false) {
//         return res.status(200).json({
//             status: false,
//             error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
//         });
//     }

//     const query = `UPDATE attendance_rules SET  
//    rule_name=?, rule_description=?, in_time=?, out_time=?, max_working_hours=?, 
//   in_grace_period_minutes=?, out_grace_period_minutes=?, half_day=?, total_break_duration=?, 
//   overtime_rate=?, max_overtime_hours=?, leave_approval_required=? ,penalty_rule_applied=?,sandwich_leave_applied=?,
//         late_coming_penalty=?,late_coming_allowed_days=?,late_coming_penalty_type =?,early_leaving_penalty=?,early_leaving_allowed_days=?,
//         early_leaving_penalty_type=?,out_time_required=?,working_hours_required=? ,last_in_time=?,last_out_time=? WHERE company_id=? And rule_id=?
// `;

//     const values = [
//         rule_name, rule_description, in_time, out_time, max_working_hours,
//         in_grace_period_minutes, out_grace_period_minutes, half_day, total_break_duration,
//         overtime_rate, max_overtime_hours, leave_approval_required, penalty_rule_applied, sandwich_leave_applied,
//         late_coming_penalty, late_coming_allowed_days, late_coming_penalty_type, early_leaving_penalty, early_leaving_allowed_days,
//         early_leaving_penalty_type, out_time_required, working_hours_required, last_in_time, last_out_time, company_id, rule_id
//     ];

//     db.query(query, values, (err, result) => {
//         if (err) {
//             console.error('Error inserting data: ' + err.stack);
//             return res.status(500).json({ status: false, message: 'Database error' });
//         }
//         res.status(200).json({ status: true, message: 'Data UPDATE successfully', result });
//     });
// });

router.post('/api/attendancerulesEdit', async (req, res) => {
    const {
        userData,
        rule_name,
        rule_description,
        in_time,
        out_time,
        max_working_hours,
        half_day,
        total_break_duration,
        overtime_rate,
        max_overtime_hours,
        leave_approval_required,
        rule_id,
        out_time_required,
        working_hours_required,
        last_in_time,
        last_out_time,
        // New fields
        attendance_type,
        shift_type,
        in_time_required,
        allow_break,
        allow_overtime,
        monthly_hours
    } = req.body;

    // Convert boolean/string values to proper format
    let penalty_rule_applied = req.body.penalty_rule_applied == true || req.body.penalty_rule_applied == "true" ? 1 : 0;
    let sandwich_leave_applied = req.body.sandwich_leave_applied == true || req.body.sandwich_leave_applied == "true" ? 1 : 0;
    let late_coming_penalty = req.body.late_coming_penalty == true || req.body.late_coming_penalty == "true" ? 1 : 0;
    let early_leaving_penalty = req.body.early_leaving_penalty == true || req.body.early_leaving_penalty == "true" ? 1 : 0;

    // Handle allow_break and allow_overtime
    let allow_break_value = allow_break == true || allow_break == "true" ? 1 : 0;
    let allow_overtime_value = allow_overtime == true || allow_overtime == "true" ? 1 : 0;

    // Handle required fields (1=required, 0=not required)
    let in_time_required_value = in_time_required == "1" || in_time_required == 1 ? 1 : 0;
    let out_time_required_value = out_time_required == "1" || out_time_required == 1 ? 1 : 0;
    let working_hours_required_value = working_hours_required == "1" || working_hours_required == 1 ? 1 : 0;

    // Handle grace periods and allowed days with null/empty checks
    let in_grace_period_minutes = req.body.in_grace_period_minutes == 'null' || req.body.in_grace_period_minutes == '' || req.body.in_grace_period_minutes == undefined ? 0 : req.body.in_grace_period_minutes;
    let out_grace_period_minutes = req.body.out_grace_period_minutes == 'null' || req.body.out_grace_period_minutes == '' || req.body.out_grace_period_minutes == undefined ? 0 : req.body.out_grace_period_minutes;
    let late_coming_allowed_days = req.body.late_coming_allowed_days == 'null' || req.body.late_coming_allowed_days == '' || req.body.late_coming_allowed_days == undefined ? 0 : req.body.late_coming_allowed_days;
    let early_leaving_allowed_days = req.body.early_leaving_allowed_days == 'null' || req.body.early_leaving_allowed_days == '' || req.body.early_leaving_allowed_days == undefined ? 0 : req.body.early_leaving_allowed_days;

    // Handle penalty types with defaults
    let late_coming_penalty_type = req.body.late_coming_penalty_type == 'null' || req.body.late_coming_penalty_type == '' || req.body.late_coming_penalty_type == undefined ? 'half-day' : req.body.late_coming_penalty_type;
    let early_leaving_penalty_type = req.body.early_leaving_penalty_type == 'null' || req.body.early_leaving_penalty_type == '' || req.body.early_leaving_penalty_type == undefined ? 'half-day' : req.body.early_leaving_penalty_type;

    // Handle time fields - set to NULL if not provided or if required is false
    let in_time_value = (in_time_required_value === 1 && in_time) ? in_time : null;
    let last_in_time_value = (in_time_required_value === 1 && last_in_time) ? last_in_time : null;
    let out_time_value = (out_time_required_value === 1 && out_time) ? out_time : null;
    let last_out_time_value = (out_time_required_value === 1 && last_out_time) ? last_out_time : null;

    // Handle break duration - set to NULL if allow_break is false
    let total_break_duration_value = (allow_break_value === 1 && total_break_duration) ? total_break_duration : null;

    // Handle overtime fields - set to NULL if allow_overtime is false
    let overtime_rate_value = (allow_overtime_value === 1 && overtime_rate) ? overtime_rate : null;
    let max_overtime_hours_value = (allow_overtime_value === 1 && max_overtime_hours) ? max_overtime_hours : null;

    // Handle monthly hours - set to NULL if not provided
    let monthly_hours_value = monthly_hours ? monthly_hours : null;

     


    const company_id = req?.user?.company_id;

    // Server-side validation - only validate required fields based on settings
    if (!company_id || !rule_name) {
        return res.status(400).json({ status: false, message: 'Invalid input data: Company ID and Rule Name are required' });
    }

    // Validate time fields only if they are required
    if (in_time_required_value === 1 && (!in_time || in_time === '')) {
        return res.status(400).json({ status: false, message: 'In Time is required when In Time Required is set to Yes' });
    }

    if (out_time_required_value === 1 && (!out_time || out_time === '')) {
        return res.status(400).json({ status: false, message: 'Out Time is required when Out Time Required is set to Yes' });
    }

    // Validate working hours if required
    if (working_hours_required_value === 1 && (!max_working_hours || max_working_hours <= 0)) {
        return res.status(400).json({ status: false, message: 'Max Working Hours is required and must be greater than 0' });
    }

    // Validate break fields if break is allowed
    if (allow_break_value === 1 && (!total_break_duration || total_break_duration <= 0)) {
        return res.status(400).json({ status: false, message: 'Total Break Duration is required when Allow Break is enabled' });
    }

    // Validate overtime fields if overtime is allowed
    if (allow_overtime_value === 1) {
        if (!overtime_rate || overtime_rate <= 0) {
            return res.status(400).json({ status: false, message: 'Overtime Rate is required and must be greater than 0 when Allow Overtime is enabled' });
        }
        if (!max_overtime_hours || max_overtime_hours < 0) {
            return res.status(400).json({ status: false, message: 'Max Overtime Hours is required when Allow Overtime is enabled' });
        }
    }

    // Validate monthly hours for regular/flexible attendance
    if ((attendance_type === 'regular' || attendance_type === 'flexible') && (!monthly_hours || monthly_hours <= 0)) {
        return res.status(400).json({ status: false, message: 'Monthly Hours is required for Regular and Flexible attendance types' });
    }

    const isAdmin = await AdminCheck(req?.user?.id, req?.user?.company_id);
    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality',
            message: 'You do not have access to this functionality'
        });
    }

    // Updated query with all new fields
    const query = `UPDATE attendance_rules SET  
        rule_name = ?,
        rule_description = ?,
        in_time = ?,
        out_time = ?,
        max_working_hours = ?,
        in_grace_period_minutes = ?,
        out_grace_period_minutes = ?,
        half_day = ?,
        total_break_duration = ?,
        overtime_rate = ?,
        max_overtime_hours = ?,
        leave_approval_required = ?,
        penalty_rule_applied = ?,
        sandwich_leave_applied = ?,
        late_coming_penalty = ?,
        late_coming_allowed_days = ?,
        late_coming_penalty_type = ?,
        early_leaving_penalty = ?,
        early_leaving_allowed_days = ?,
        early_leaving_penalty_type = ?,
        out_time_required = ?,
        working_hours_required = ?,
        last_in_time = ?,
        last_out_time = ?,
        attendance_type = ?,
        shift_type = ?,
        in_time_required = ?,
        allow_break = ?,
        allow_overtime = ?,
        monthly_hours = ?
        WHERE company_id = ? AND rule_id = ?
    `;

    const values = [
        rule_name,
        rule_description,
        in_time_value,
        out_time_value,
        max_working_hours,
        in_grace_period_minutes,
        out_grace_period_minutes,
        half_day,
        total_break_duration_value,
        overtime_rate_value,
        max_overtime_hours_value,
        leave_approval_required,
        penalty_rule_applied,
        sandwich_leave_applied,
        late_coming_penalty,
        late_coming_allowed_days,
        late_coming_penalty_type,
        early_leaving_penalty,
        early_leaving_allowed_days,
        early_leaving_penalty_type,
        out_time_required_value,
        working_hours_required_value,
        last_in_time_value,
        last_out_time_value,
        attendance_type || null, // Set to NULL if empty
        shift_type || null, // Set to NULL if empty
        in_time_required_value,
        allow_break_value,
        allow_overtime_value,
        monthly_hours_value,
        company_id,
        rule_id
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error updating data: ' + err.stack);
            return res.status(500).json({ status: false, message: 'Database error', error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: false, message: 'Rule not found or no changes made' });
        }

        res.status(200).json({
            status: true,
            message: 'Data updated successfully',
            result,
            data: {
                rule_id,
                rule_name,
                attendance_type,
                shift_type,
                in_time_required: in_time_required_value,
                out_time_required: out_time_required_value,
                allow_break: allow_break_value,
                allow_overtime: allow_overtime_value
            }
        });
    });
});

// web cheak A
router.get('/api/fetchDetails', async (req, res) => {

    const { userData, search = "" } = req.query;
     
    if ( !req?.user?.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }
    const isAdmin = await AdminCheck(req?.user?.id, req?.user?.company_id);
    // console.log(isAdmin);
    let query;
    let queryParams = [];

    query = `
        SELECT * FROM attendance_rules 
        WHERE 1=1
    `;
    // query = `
    //     SELECT 
    //         rule_id, company_id, rule_name, rule_description, 
    //         in_time, out_time, max_working_hours, in_grace_period_minutes, 
    //         out_grace_period_minutes, half_day, total_break_duration, 
    //         overtime_rate, max_overtime_hours, sandwich_leave_applied,last_in_time,last_out_time
    //         leave_approval_required, created_at , penalty_rule_applied, late_coming_penalty, late_coming_allowed_days, in_grace_period_minutes, late_coming_penalty_type, early_leaving_penalty, early_leaving_allowed_days, out_grace_period_minutes, early_leaving_penalty_type
    //     ,out_time_required,working_hours_required 
    //     FROM attendance_rules 
    //     WHERE 1=1
    // `;

    // If the user is not an admin, restrict results based on the user's attendance rule ID

    if (!isAdmin) {
        db.query('SELECT attendance_rules_id FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 and id = ? AND company_id = ?', [req?.user?.id, req?.user?.company_id], (err, results) => {
            if (err) {
                console.error('Error querying employee data:', err);
                return res.status(500).json({ status: false, error: 'Server error while fetching employee data' });
            }
            if (results.length > 0) {
                const attendanceRuleId = results[0]['attendance_rules_id'];
                // If no attendance rule is set for the employee (ID is 0 or null), use the default rule
                if (attendanceRuleId == '0' || attendanceRuleId == null) {
                    queryParams.push(1);
                } else {
                    queryParams.push(attendanceRuleId); // Use employee's specific rule ID
                }
                query += ' AND rule_id = ?';
            }

            // Execute the query to fetch attendance rules
            db.query(query, queryParams, (err, results) => {
                if (err) {
                    console.error('Error fetching data:', err);
                    return res.status(500).json({ status: false, error: 'Server error' });
                }

                if (results.length === 0) {
                    return res.status(200).json({ status: false, isAdmin, error: 'No data found' });
                }
                return res.json({
                    data: results,
                    status: true,
                    isAdmin,
                    message: 'Data found'
                });

            });
        });
    } else {
        // req?.user?.company_id
        queryParams.push(req?.user?.company_id)
        query += ' AND company_id = ?';
        // Execute the query to fetch attendance rules
        db.query(query, queryParams, (err, results) => {
            if (err) {
                console.error('Error fetching data:', err);
                return res.status(500).json({ status: false, error: 'Server error' });
            }

            if (results.length === 0) {
                return res.status(200).json({ status: false, isAdmin, error: 'No data found' });
            }

            return res.json({
                data: results,
                status: true,
                isAdmin,
                message: 'Data found'
            });
        });
    }


});
// web cheak A
router.get('/api/fetchType', async (req, res) => {
    const { userData, type } = req.query;
     
    if ( !req?.user?.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }
    const isAdmin = await AdminCheck(req?.user?.id, req?.user?.company_id);
    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
        });
    }
    // Determine the query based on type
    let query;
    let queryParams = '';
    queryParams = [req?.user?.company_id];
    query = `SELECT rule_id, rule_name FROM attendance_rules WHERE company_id = ?`;
    db.query(query, queryParams, (err, results) => {
        // db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ status: false, status: false, error: 'Server error' });
        }
        // Check if any results were found
        if (results.length === 0) {
            return res.status(200).json({ status: false, error: 'No data found' });
        }
        res.json({
            // data: results[0],
            data: results,
            status: true,
            message: 'Data found'
        });
    });
});

// web cheak A
router.post('/api/AddType', async (req, res) => {
    const { name, userData } = req.body;
     

    const company_id = req?.user?.company_id;
    if (!name || !company_id) {
        return res.status(400).json({ status: false, error: 'Department name, company ID are required' });
    }
    const isAdmin = await AdminCheck(req?.user?.id, req?.user?.company_id);
    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
        });
    }
    // Insert the new department into the database
    db.query(
        'INSERT INTO attendance_rules (rule_name, company_id) VALUES (?, ?)',
        [name, company_id],
        (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ status: false, error: 'Error while adding department' });
            }
            res.status(201).json({ status: true, message: 'Rule Type added successfully' });
        }
    );
});

// Deleteapi web check y
router.post('/api/Deleteapi', (req, res) => {
    const { id, userData } = req.body;
     

  

    const company_id = req?.user?.company_id;

    if (!id || !company_id) {
        return res.status(400).json({ status: false, message: 'ID is required.' });
    }

    db.query(
        'DELETE FROM attendance_rules WHERE rule_id = ? AND company_id=?',
        [id, company_id],
        (err, results) => {
            if (err) {
                return res.status(500).json({ status: false, message: 'Error updating leave.', error: err.message });
            }
            if (results.affectedRows === 0) {
                return res.status(200).json({ status: false, message: 'Type not found or no changes made.' });
            }
            // console.log('Data deleted successfully');
            return res.status(200).json({ status: true, message: 'Data deleted successfully' });
        }
    );
});


// asine rules
// web cheak A
router.get('/api/data', async (req, res) => {
    const { userData, data, departmentId = 0, subDepartmentid = 0, employeeStatus = 1 } = req.query;

    let Search = null;
    if (data) {
        Search = data['Search'] ? data['Search'] : null;
    }

     

  
    const isAdmin = await AdminCheck(req?.user?.id, req?.user?.company_id);
    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
        });
    }
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;
    const offset = (page - 1) * limit;

    if ( !req?.user?.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }

    // Build the base query

    let query = `
        SELECT CONCAT(a.first_name, " ", a.last_name,"-",a.employee_id) AS first_name, a.id, a.employee_id, b.rule_name, b.rule_id 
        FROM employees AS a
        LEFT JOIN attendance_rules AS b ON a.attendance_rules_id = b.rule_id
        WHERE a.company_id = ?`;

    let queryParams = [req?.user?.company_id];

    if (employeeStatus && employeeStatus == 1) {
        query += ` AND a.employee_status=1 and a.status=1 and a.delete_status=0 `;
    } else {
        query += ` AND (a.employee_status=0 or a.status=0 or a.delete_status=1) `;
    }

    if (departmentId && departmentId != 0) {
        query += ` AND a.department = ?`;
        queryParams.push(departmentId);
    } if (subDepartmentid && subDepartmentid != 0) {
        query += ` AND a.sub_department = ?`;
        queryParams.push(subDepartmentid);
    }

    // Add Search filter if provided
    if (Search) {
        query += ' AND (a.first_name LIKE ? or a.last_name LIKE ? OR a.employee_id=?)';
        queryParams.push(`%${Search}%`, `%${Search}%`, `%${Search}%`);
    }
    // first_name order by asc
    query += ' ORDER BY a.first_name ASC';
    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    // Execute query
    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching data records:', err);
            return res.status(500).json({ status: false, error: 'Server error' });
        }

        // Add serial number (srno) to each result
        const dataWithSrno = results.map((item, index) => ({
            srno: offset + index + 1, // Generate serial number based on offset
            ...item
        }));

        // Get total count of records (for pagination)
        let countQuery = 'SELECT COUNT(id) AS total FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 and company_id = ?';
        let countQueryParams = [req?.user?.company_id];

        if (Search) {
            countQuery += ' AND first_name LIKE ?';
            countQueryParams.push(`%${Search}%`);
        }

        db.query(countQuery, countQueryParams, (err, countResults) => {
            if (err) {
                console.error('Error counting data records:', err);
                return res.status(500).json({ status: false, error: 'Server error' });
            }
            const total = countResults[0].total;
            res.json({
                status: true,
                data: dataWithSrno,
                total,
                page,
                limit
            });
        });
    });
})


// GetCompanyRule
// web cheak A
router.post('/api/GetCompanyRule', async (req, res) => {
    const { userData } = req.body;
    if (!req?.user?.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
    }

    const isAdmin = await AdminCheck(req?.user?.id, req?.user?.company_id);

    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
        });
    }
    db.query(
        'SELECT rule_id,rule_name FROM attendance_rules WHERE company_id = ?',
        [req?.user?.company_id],
        (err, results) => {
            if (err) {
                return res.status(500).json({
                    status: false,
                    message: 'Database error occurred while fetching department details',
                    error: err.message || err
                });
            }
            if (results.length === 0) {
                return res.status(200).json({ status: false, message: 'No Attendance Rules found for this company' });
            }
            res.json({
                status: true,
                data: results
            });
        }
    );




});
// web cheak A
router.post('/api/Update', async (req, res) => {
    const { id, rule_id, userData } = req.body;
     
 const isAdmin = await AdminCheck(req?.user?.id, req?.user?.company_id);
    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
        });
    }
    if (!req?.user?.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
    }

    if (!id) {
        return res.status(400).json({ status: false, message: 'Missing required fields: id' });
    }

    let query;
    let values;
    query = 'UPDATE employees SET attendance_rules_id=? WHERE id=? AND company_id=?';
    values = [rule_id, id, req?.user?.company_id];

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error', error: err });
        }
        res.json({ status: true, message: 'Update successful', data: results });
    });
});

// Export the router
module.exports = router;
