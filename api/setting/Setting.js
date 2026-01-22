// HomeApi.js 

const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');
const { AdminCheck } = require('../../model/functlity/AdminCheck');
const { assign } = require('nodemailer/lib/shared');

router.get('/api/fetchDetails', async (req, res) => {
    const { userData, UserId } = req.query;
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    if (!decodedUserData || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }

    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);

    let query;
    let queryParams = [];

    query = `SELECT * FROM work_week WHERE id=? `;

    queryParams.push(UserId);
    if (!isAdmin) {
        db.query(query, queryParams, (err, results) => {
            if (err) {
                return res.status(500).json({ status: false, error: 'Server error' });
            }
            if (results.length === 0) {
                return res.status(200).json({ status: false, error: 'No data found' });
            }
            return res.json({
                data: results,
                status: true,
                isAdmin,
                message: 'Data found'
            });

        });

    } else {
        // decodedUserData.company_id
        queryParams.push(decodedUserData.company_id)
        query += ' AND company_id = ?';
        // Execute the query to fetch attendance rules
        db.query(query, queryParams, (err, results) => {
            if (err) {
                return res.status(500).json({ status: false, error: 'Server error' });
            }

            if (results.length === 0) {
                return res.status(200).json({ status: false, error: 'No data found' });
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

router.post('/api/fetchUserWorkWeekDetails', async (req, res) => {
    const { userData, CheckId } = req.body;
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

    // Validate company_id
    if (!decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
    }
    let id = '';
    if (CheckId && CheckId !== null && CheckId !== undefined && CheckId !== '' && CheckId !== 'null' && CheckId !== 'undefined') {
        id = CheckId;
    } else {
        id = decodedUserData.id;
    }
    // SINGLE QUERY using INNER JOIN
    const query = `
        SELECT ww.*
        FROM employees e
        INNER JOIN work_week ww ON e.work_week_id = ww.id
        WHERE e.id = ? AND e.company_id = ?
    `;

    db.query(query, [id, decodedUserData.company_id], (err, results) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: 'Database error occurred while fetching work week details',
                error: err.message || err
            });
        }

        if (results.length === 0) {
            return res.status(200).json({ status: false, message: 'No work week found for this employee or company' });
        }

        return res.json({
            status: true,
            data: results,
            message: 'Fetched successfully',
        });
    });
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
    // if (isAdmin === false) {
    //     return res.status(200).json({
    //         status: false,
    //         isAdmin:false,
    //         error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
    //     });
    // }

    // Determine the query based on type
    let query;
    let queryParams = '';
    queryParams = [decodedUserData.company_id];
    query = `SELECT id, rule_name,description,status FROM work_week WHERE company_id = ?`;
    db.query(query, queryParams, (err, results) => {
        if (err) {
            return res.status(500).json({ isAdmin: isAdmin, status: false, status: false, error: 'Server error' });
        }
        if (results.length === 0) {
            return res.status(200).json({ isAdmin: isAdmin, status: false, error: 'No data found' });
        }
        res.json({

            isAdmin: isAdmin,
            data: results,
            status: true,
            message: 'Data found'
        });
    });
});

// app cheak A
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
        return res.status(400).json({ status: false, error: 'name, company ID are required' });
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
        'INSERT INTO work_week (rule_name, company_id) VALUES (?, ?)',
        [name, company_id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ status: false, error: 'Error while adding department' });
            }
            res.status(201).json({ status: true, message: 'Rule Type added successfully' });
        }
    );
});

// app cheak A
router.post('/api/work_weekEdit', async (req, res) => {
    const { userData, rule_name, description, id } = req.body;
    let Week = null;
    try {
        Week = JSON.parse(req.body.Week);
    } catch (error) {
        return res.status(400).json({ status: false, error: 'Invalid Week data format' });
    }
    // console.log(Week);

    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    const company_id = decodedUserData?.company_id;
    if (!company_id || !rule_name) {
        return res.status(400).json({ status: false, message: 'Invalid input data' });
    }

    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality',
            message: 'You do not have access to this functionality',
        });
    }

    // Prepare flat structure for update query
    const weekColumns = {};
    Week.forEach((week, index) => {
        const weekIndex = index + 1; // Start from 1
        weekColumns[`mon${weekIndex}`] = week.Mon;
        weekColumns[`tue${weekIndex}`] = week.Tue;
        weekColumns[`wed${weekIndex}`] = week.Wed;
        weekColumns[`thu${weekIndex}`] = week.Thu;
        weekColumns[`fri${weekIndex}`] = week.Fri;
        weekColumns[`sat${weekIndex}`] = week.Sat;
        weekColumns[`sun${weekIndex}`] = week.Sun;
    });

    // Generate the update query dynamically
    const weekUpdateQuery = Object.keys(weekColumns)
        .map((col) => `${col}=?`)
        .join(', ');

    const query = `
        UPDATE work_week 
        SET rule_name=?, description=?, ${weekUpdateQuery}
        WHERE company_id=? AND id=?
    `;

    const values = [
        rule_name,
        description,
        ...Object.values(weekColumns),

        company_id,
        id,
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            return res.status(500).json({ status: false, message: 'Database error', error: err.message });
        }
        return res.status(200).json({ status: true, message: 'Data updated successfully', result });
    });
});

router.post('/api/Deleteapi', async (req, res) => {
    return res.json({ status: true, message: 'Coming soon' });
    const { id, userData } = req.body;
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
    }

    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
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

    query = 'DELETE FROM work_week WHERE id=? AND company_id=?';
    values = [id, decodedUserData.company_id];

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error', error: err });
        }
        res.json({ status: true, message: 'DELETE successful', data: results });
    });

});

// assign rules

router.get('/api/data', async (req, res) => {
    const { userData, search = "", departmentId = 0, subDepartmentid = 0, employeeStatus = 1 } = req.query;
    let Search = search;

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
        SELECT a.first_name, a.id, a.employee_id, b.rule_name, b.id as rule_id
        FROM employees AS a
        LEFT JOIN work_week AS b ON a.work_week_id = b.id
        WHERE a.company_id = ?`;

    let queryParams = [decodedUserData.company_id];
    if (Search) {
        query += ` AND (a.first_name LIKE ? or a.last_name=? or a.employee_id=?)`;
        queryParams.push(`%${Search}%`, `%${Search}%`, `%${Search}%`);
    }
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
    query += ' ORDER BY a.first_name ASC';
    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);
    // first_name order by


    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching data records:', err);
            return res.status(500).json({ status: false, error: 'Server error' });
        }

        const dataWithSrno = results.map((item, index) => ({
            srno: offset + index + 1,
            ...item
        }));
        // Get total count of records (for pagination)
        let countQuery = 'SELECT COUNT(id) AS total FROM employees WHERE company_id = ?';
        let countQueryParams = [decodedUserData.company_id];

        if (Search) {
            countQuery += ' AND (first_name LIKE ? or last_name=? or employee_id=?)';
            countQueryParams.push(`%${Search}%`, `%${Search}%`, `%${Search}%`);
        }
        if (employeeStatus && employeeStatus == 1) {
            countQuery += ` AND employee_status=1 and status=1 and delete_status=0 `;
        } else {
            countQuery += ` AND (employee_status=0 or status=0 or delete_status=1) `;
        }

        if (departmentId && departmentId != 0) {
            countQuery += ` AND department = ?`;

            countQueryParams.push(departmentId);
        } if (subDepartmentid && subDepartmentid != 0) {
            countQuery += ` AND sub_department = ?`;

            countQueryParams.push(subDepartmentid);
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
        'SELECT id AS rule_id,rule_name FROM work_week WHERE company_id = ?',
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
// app cheak A
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
    query = 'UPDATE employees SET work_week_id=? WHERE id=? AND company_id=?';
    values = [rule_id, id, decodedUserData.company_id];

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
