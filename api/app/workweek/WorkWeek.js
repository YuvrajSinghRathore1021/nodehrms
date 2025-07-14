const express = require("express");
const router = express.Router();
const db = require("../../../DB/ConnectionSql");
const { AdminCheck } = require('../../../model/functlity/AdminCheck');

router.post('/api/fetchType', async (req, res) => {
    const { userData, type } = req.body;
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
            isAdmin: false,
            error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
        });
    }

    // Determine the query based on type
    let query;
    let queryParams = '';
    queryParams = [decodedUserData.company_id];
    query = `SELECT id, rule_name ,id AS rule_id FROM work_week WHERE company_id = ?`;
    db.query(query, queryParams, (err, results) => {
        if (err) {
            return res.status(500).json({ isAdmin: isAdmin, status: false, status: false, error: 'Server error' });
        }
        if (results.length === 0) {
            return res.status(200).json({ isAdmin: isAdmin, status: false, error: 'No data found' });
        }
        res.json({ isAdmin: isAdmin, data: results, status: true, message: 'Data found' });

    });
});

router.post('/api/fetchDetailsWorkWeek', async (req, res) => {
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
    if (!decodedUserData || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }
    let Id = req.body.Id;

    if (!Id) {
        let QueryGetworkWeek = `SELECT work_week_id FROM employees WHERE id = ?`;
        db.query(QueryGetworkWeek, [decodedUserData.id], (err, results) => {
            if (err) {
                return res.status(500).json({ status: false, error: 'Server error' });
            }
            if (results.length === 0) {
                return res.status(200).json({ status: false, error: 'No data found' });
            }
            Id = results[0].work_week_id;
            let query = `SELECT * FROM work_week WHERE id=? AND company_id = ?`;
            let queryParams = [Id, decodedUserData.company_id];

            db.query(query, queryParams, (err, results) => {
                if (err) {
                    return res.status(500).json({ status: false, error: 'Server error' });
                }
                if (results.length === 0) {
                    return res.status(200).json({ status: false, error: 'No data found' });
                }
                return res.json({ data: results, status: true, message: 'Data found' });
            });
        });
    } else {
        let query = `SELECT * FROM work_week WHERE id=? AND company_id = ?`;
        let queryParams = [Id, decodedUserData.company_id];

        db.query(query, queryParams, (err, results) => {
            if (err) {
                return res.status(500).json({ status: false, error: 'Server error' });
            }
            if (results.length === 0) {
                return res.status(200).json({ status: false, error: 'No data found' });
            }
            return res.json({ data: results, status: true, message: 'Data found' });
        });
    }
});

router.post('/api/data', async (req, res) => {
    const { userData, Search } = req.body;
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
    const limit = parseInt(req.body.limit, 10) || 10;
    const page = parseInt(req.body.page, 10) || 1;
    const offset = (page - 1) * limit;

    if (!decodedUserData || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }
    // Build the base query
    let query = `SELECT a.first_name, a.id, a.employee_id, b.rule_name, b.id as rule_id FROM employees AS a
        LEFT JOIN work_week AS b ON a.work_week_id = b.id WHERE a.company_id = ?`;

    const queryParams = [decodedUserData.company_id];
    if (Search) {
        query += ' AND a.first_name LIKE ?';
        queryParams.push(`%${Search}%`);
    }
    query += ' LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

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




module.exports = router;
