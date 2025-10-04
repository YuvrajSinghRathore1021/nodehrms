// HomeApi.js 

const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');
const { AdminCheck } = require('../../model/functlity/AdminCheck');

// Rules

router.post('/api/attendancerulesEdit', async (req, res) => {
    const { userData,
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
        rule_id, out_time_required, working_hours_required
    } = req.body;
    // ,penalty_rule_applied,late_coming_penalty,early_leaving_penalty
    let penalty_rule_applied = req.body.penalty_rule_applied == true || req.body.penalty_rule_applied == "true" ? 1 : 0;
    let sandwich_leave_applied = req.body.sandwich_leave_applied == true || req.body.sandwich_leave_applied == "true" ? 1 : 0;
    let late_coming_penalty = req.body.late_coming_penalty == true || req.body.late_coming_penalty == "true" ? 1 : 0;
    let early_leaving_penalty = req.body.early_leaving_penalty == true || req.body.early_leaving_penalty == "true" ? 1 : 0;
    let in_grace_period_minutes = req.body.in_grace_period_minutes == 'null' || req.body.in_grace_period_minutes == '' ? 0 : req.body.in_grace_period_minutes;
    let out_grace_period_minutes = req.body.out_grace_period_minutes == 'null' || req.body.out_grace_period_minutes == '' ? 0 : req.body.out_grace_period_minutes;
    let late_coming_allowed_days = req.body.late_coming_allowed_days == 'null' || req.body.late_coming_allowed_days == '' ? 0 : req.body.late_coming_allowed_days;
    let late_coming_penalty_type = req.body.late_coming_penalty_type == 'null' || req.body.late_coming_penalty_type == '' ? 'half-day' : req.body.late_coming_penalty_type;
    let early_leaving_penalty_type = req.body.early_leaving_penalty_type == 'null' || req.body.early_leaving_penalty_type == '' ? 'half-day' : req.body.early_leaving_penalty_type;
    let early_leaving_allowed_days = req.body.early_leaving_allowed_days == 'null' || req.body.early_leaving_allowed_days == '' ? 0 : req.body.early_leaving_allowed_days;

    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            // decodedUserData=userData;
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    const company_id = decodedUserData.company_id;
    // Server-side validation
    if (!company_id || !rule_name || !in_time || !out_time || max_working_hours <= 0 || overtime_rate <= 0 || max_overtime_hours < 0) {
        return res.status(400).json({ status: false, message: 'Invalid input data' });
    }
    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
        });
    }

    const query = `UPDATE attendance_rules SET  
   rule_name=?, rule_description=?, in_time=?, out_time=?, max_working_hours=?, 
  in_grace_period_minutes=?, out_grace_period_minutes=?, half_day=?, total_break_duration=?, 
  overtime_rate=?, max_overtime_hours=?, leave_approval_required=? ,penalty_rule_applied=?,sandwich_leave_applied=?,
        late_coming_penalty=?,
        late_coming_allowed_days=?,
        late_coming_penalty_type =?,
        early_leaving_penalty=?,
        early_leaving_allowed_days=?,
        early_leaving_penalty_type=?,out_time_required=?,working_hours_required=? WHERE company_id=? And rule_id=?
`;

    const values = [
        rule_name, rule_description, in_time, out_time, max_working_hours,
        in_grace_period_minutes, out_grace_period_minutes, half_day, total_break_duration,
        overtime_rate, max_overtime_hours, leave_approval_required, penalty_rule_applied, sandwich_leave_applied,
        late_coming_penalty,
        late_coming_allowed_days,
        late_coming_penalty_type,
        early_leaving_penalty,
        early_leaving_allowed_days,
        early_leaving_penalty_type, out_time_required, working_hours_required, company_id, rule_id
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error inserting data: ' + err.stack);
            return res.status(500).json({ status: false, message: 'Database error' });
        }
        res.status(200).json({ status: true, message: 'Data UPDATE successfully', result });
    });
});

router.post('/api/attendancerules', async (req, res) => {
    const { userData,
        rule_name,
        rule_description,
        in_time,
        out_time,
        max_working_hours,
        in_grace_period_minutes,
        out_grace_period_minutes,
        half_day,
        total_break_duration,
        overtime_rate,
        max_overtime_hours,
        leave_approval_required, rule_id
    } = req.body;

    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            // decodedUserData=userData;
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    const company_id = decodedUserData.company_id;
    // Server-side validation
    if (!company_id || !rule_name || !in_time || !out_time || max_working_hours <= 0 || overtime_rate <= 0 || max_overtime_hours < 0) {
        return res.status(400).json({ status: false, message: 'Invalid input data' });
    }
    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
        });
    }


    const query = `INSERT INTO attendance_rules (
  company_id, rule_name, rule_description, in_time, out_time, max_working_hours, 
  in_grace_period_minutes, out_grace_period_minutes, half_day, total_break_duration, 
 overtime_rate, max_overtime_hours, leave_approval_required
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
        company_id, rule_name, rule_description, in_time, out_time, max_working_hours,
        in_grace_period_minutes, out_grace_period_minutes, half_day, total_break_duration,
        overtime_rate, max_overtime_hours, leave_approval_required
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error inserting data: ' + err.stack);
            return res.status(500).json({ status: false, message: 'Database error' });
        }
        res.status(200).json({ status: true, message: 'Data inserted successfully', result });
    });
});



router.get('/api/fetchDetails', async (req, res) => {

    const { userData, search = "" } = req.query;
    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    // Validate decoded userData
    if (!decodedUserData || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }
    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
    console.log(isAdmin);
    let query;
    let queryParams = [];

    query = `
        SELECT 
            rule_id, company_id, rule_name, rule_description, 
            in_time, out_time, max_working_hours, in_grace_period_minutes, 
            out_grace_period_minutes, half_day, total_break_duration, 
            overtime_rate, max_overtime_hours, sandwich_leave_applied,
            leave_approval_required, created_at , penalty_rule_applied, late_coming_penalty, late_coming_allowed_days, in_grace_period_minutes, late_coming_penalty_type, early_leaving_penalty, early_leaving_allowed_days, out_grace_period_minutes, early_leaving_penalty_type
        ,out_time_required,working_hours_required FROM attendance_rules 
        WHERE 1=1
    `;

    // If the user is not an admin, restrict results based on the user's attendance rule ID

    if (!isAdmin) {
        db.query('SELECT attendance_rules_id FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 and id = ? AND company_id = ?', [decodedUserData.id, decodedUserData.company_id], (err, results) => {
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
        // decodedUserData.company_id
        queryParams.push(decodedUserData.company_id)
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

router.get('/api/fetchType', async (req, res) => {
    const { userData, type } = req.query;
    let decodedUserData = null;
    // Decode userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    // Validate decoded userData
    if (!decodedUserData || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }
    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
        });
    }
    // Determine the query based on type
    let query;
    let queryParams = '';
    queryParams = [decodedUserData.company_id];
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

router.post('/api/AddType', async (req, res) => {
    const { name, userData } = req.body;
    let decodedUserData = null;

    // Decode userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    const company_id = decodedUserData.company_id;
    if (!name || !company_id) {
        return res.status(400).json({ status: false, error: 'Department name, company ID are required' });
    }
    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
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

// Deleteapi
router.post('/api/Deleteapi', (req, res) => {
    const { id, userData } = req.body;
    let decodedUserData = null;

    // Decode userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    const company_id = decodedUserData.company_id;

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
            console.log('Data deleted successfully');
            return res.status(200).json({ status: true, message: 'Data deleted successfully' });
        }
    );
});


// asine rules
router.get('/api/data', async (req, res) => {
    const { userData, data, departmentId = 0, subDepartmentid = 0, employeeStatus=1 } = req.query;
 
    let Search = null;

    if (data) {
        Search = data['Search'] ? data['Search'] : null;
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
    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
        });
    }
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;
    const offset = (page - 1) * limit;

    if (!decodedUserData || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }

    // Build the base query

    let query = `
        SELECT CONCAT(a.first_name, " ", a.last_name,"-",a.employee_id) AS first_name, a.id, a.employee_id, b.rule_name, b.rule_id 
        FROM employees AS a
        LEFT JOIN attendance_rules AS b ON a.attendance_rules_id = b.rule_id
        WHERE a.company_id = ?`;

    let queryParams = [decodedUserData.company_id];

    if (employeeStatus && employeeStatus == 1) {
        query += ` AND a.employee_status=1 and a.status=1 and a.delete_status=0 `;
    } else {
        query += ` AND (a.employee_status=0 or a.status=0 or a.delete_status=1) `;
    }

    if (departmentId && departmentId != 0) {
        query += ` AND a.department = ?`;
        queryParams.push(departmentId);
    } else if (subDepartmentid && subDepartmentid != 0) {
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
        let countQueryParams = [decodedUserData.company_id];

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

router.post('/api/GetCompanyRule', async (req, res) => {
    const { userData } = req.body;
    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    // console.log(decodedUserData);
    if (!decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
    }

    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);

    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
        });
    }
    db.query(
        'SELECT rule_id,rule_name FROM attendance_rules WHERE company_id = ?',
        [decodedUserData.company_id],
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
router.post('/api/Update', async (req, res) => {
    const { id, rule_id, userData } = req.body;
    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    } else {
        return res.status(400).json({ status: false, error: 'Invalid userData' });

    } const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
        });
    }
    // console.log(decodedUserData);
    if (!decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
    }

    if (!id) {
        return res.status(400).json({ status: false, message: 'Missing required fields: id' });
    }

    let query;
    let values;
    query = 'UPDATE employees SET attendance_rules_id=? WHERE id=? AND company_id=?';
    values = [rule_id, id, decodedUserData.company_id];

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error', error: err });
        }
        res.json({ status: true, message: 'Update successful', data: results });
    });
});

// get ip 

// router.post('/api/DeleteapiIp', (req, res) => {
//     const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
//     res.json({ ip });
// });

router.post('/api/DeleteapiIp', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const cleanIp = ip.split(',')[0];
    res.json({ ip: cleanIp });
});

// Export the router
module.exports = router;
