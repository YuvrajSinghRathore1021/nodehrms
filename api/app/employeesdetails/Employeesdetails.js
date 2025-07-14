const express = require("express");
const router = express.Router();
const db = require("../../../DB/ConnectionSql");
const { AdminCheck } = require('../../../model/functlity/AdminCheck');
router.post('/api/IdCard', async (req, res) => {
    const { userData } = req.body;
    let decodedUserData = null;
    // Decode and validate userData
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
        let query = `SELECT e.id, e.employee_id,CONCAT(e.first_name,'', e.last_name) AS name, e.official_email_id, e.email_id,  e.contact_number, e.alternate_phone,  e.dob, e.gender,e.designation, e.profile_image,c.company_name,c.logo FROM employees AS e INNER JOIN companies AS c ON e.company_id=c.id WHERE e.company_id=? AND e.id=?`;
        let values = [decodedUserData.company_id, decodedUserData.id];

        db.query(query, values, (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ status: false, message: 'Database error', error: err });
            }
            res.json({
                status: true,
                message: 'fetched successfully',
                data: results,
            });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ status: false, error: 'Server error fetching PayDetails' });
    }
});



router.post('/api/SalarySlipStructure', async (req, res) => {
    const { userData } = req.body;
    let decodedUserData = null;
    // Decode and validate userData
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
        let query = `-- Get CTC row
SELECT 'CTC' AS component_name, 
       e.ctc / 12 AS Monthly_Amount, 
       e.ctc AS Yearly_Amount
FROM employees e
WHERE e.id = ?

UNION ALL

-- Get all other salary components
SELECT sc.component_name, 
       CASE 
           WHEN sc.calculation_method = 'fixed_amount' THEN sc.fixed_amount
           WHEN sc.calculation_method = 'percentage' THEN (e.ctc / 12 * sc.percentage / 100)
           ELSE 0
       END AS Monthly_Amount,
       (CASE 
           WHEN sc.calculation_method = 'fixed_amount' THEN sc.fixed_amount
           WHEN sc.calculation_method = 'percentage' THEN (e.ctc / 12 * sc.percentage / 100)
           ELSE 0
       END) * 12 AS Yearly_Amount
FROM employees e
JOIN salary_structure ss ON e.structure_id = ss.structure_id
JOIN salary_component sc ON ss.structure_id = sc.structure_id
WHERE e.id = ? AND e.company_id = ?`;
        let values = [decodedUserData.id, decodedUserData.id, decodedUserData.company_id];

        db.query(query, values, (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ status: false, message: 'Database error', error: err });
            }
            res.json({
                status: true,
                message: 'fetched successfully',
                data: results,
            });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ status: false, error: 'Server error fetching PayDetails' });
    }
});




router.get('/api/documentGet', async (req, res) => {
    const { userData, data } = req.query;
    let EmployeeId = null;

    if (data) {
        EmployeeId = data['EmployeeId'] ? data['EmployeeId'] : null;
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
    let query = `SELECT id, employee_id, company_id, document_name, file_path, status, add_stamp, uploaded_at FROM documents WHERE company_id = ? And employee_id = ?`;

    const queryParams = [decodedUserData.company_id, EmployeeId || decodedUserData.id];

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
        let countQuery = 'SELECT COUNT(id) AS total FROM documents WHERE company_id = ? And employee_id = ?';
        let countQueryParams = [decodedUserData.company_id, EmployeeId || decodedUserData.id];


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

router.post('/api/documentUpdate', async (req, res) => {
    try {
        const { userData, id, status } = req.body;
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
            return res.status(400).json({
                status: false,
                error: 'Employee ID and Company ID are required',
            });
        }

        const Query = `UPDATE documents SET status = ? WHERE id = ?`;
        const QueryArray = [status, id];

        db.query(Query, QueryArray, (err, Result) => {
            if (err) {
                console.error('Error checking for duplicate salary details:', err);
                return res.status(500).json({
                    status: false,
                    message: 'Failed to check duplicate salary details.',
                });
            }
            return res.status(200).json({
                status: true,
                message: 'successfully updated',
                data: Result,
            });

        })
    } catch (error) {
        console.error('Error processing salary submission:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to process salary submission.',
        });
    }
});


module.exports = router;
