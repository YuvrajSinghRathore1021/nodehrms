// leaveapi.js
const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');

router.post('/leave', (req, res) => {
    const { leave_type, userData, start_date, end_date, reason } = req.body;

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    //Apply Leave query
    db.query('INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason) VALUES (?, ?, ?, ?, ?)',
        [decodedUserData.id, leave_type, start_date, end_date, reason], (err, results) => {
            if (err) {
                return res.status(500).json({ status: false, message: 'Error creating leave record.', error: err.message });
            }
            res.status(200).json({ status: true, message: 'Data inserted successfully.', id: results.insertId });
        });
});



// Fetch Leave query

router.get('/fetchleave', (req, res) => {
    const { userData } = req.query;
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid userData' });
        }
    }
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;

    const offset = (page - 1) * limit;

    if (!decodedUserData || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }

    const query = `
    SELECT 
        a.employee_id, 
        a.leave_type, 
        a.status, 
        a.start_date, 
        a.end_date, 
        a.reason, 
        a.created, 
        a.updated, 
        a.leave_id,
        CONCAT(e.first_name, ' - ', e.employee_id) AS name 
    FROM 
        leaves a 
    INNER JOIN 
        employees e ON a.employee_id = e.id 
    WHERE 
        a.employee_id = ? AND a.deletestatus = 0  -- Exclude deleted records
    LIMIT ? OFFSET ?`;

    const queryParams = [decodedUserData.id, limit, offset];
    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching leave records:', err);
            return res.status(500).json({ status: false, error: 'Server error' });
        }

        // Count total records for pagination, excluding deleted ones
        const countQuery = 'SELECT COUNT(leave_id) AS total FROM leaves WHERE employee_id = ? AND deletestatus = 0';
        db.query(countQuery, [decodedUserData.id], (err, countResults) => {
            if (err) {
                console.error('Error counting leave records:', err);
                return res.status(500).json({ status: false, error: 'Server error' });
            }
            const total = countResults[0].total;

            // Add srnu to each result
            const companiesWithSrnu = results.map((company, index) => ({
                srnu: offset + index + 1, // Serial number starts from 1
                ...company
            }));

            res.json({
                status: true,
                companies: companiesWithSrnu,
                total,
                page,
                limit
            });
        });
    });
});

// Soft Delete
router.post('/delete', (req, res) => {
    const { leave_id } = req.body;

    if (!leave_id) {
        return res.status(400).json({ message: 'Leave ID is required.' });
    }

    db.query(
        'UPDATE leaves SET deletestatus = 1 WHERE leave_id = ?',
        [leave_id],
        (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ status: false, message: 'Error updating leave.', error: err.message });
            }
            console.log('Update Results:', results);
            if (results.affectedRows === 0) {
                return res.status(404).json({ status: false, message: 'Leave not found or no changes made.' });
            }
            console.log('Data deleted successfully');
            return res.status(200).json({ status: true, message: 'Data deleted successfully' });
        }
    );
});

// Update Leave Data (Update)
router.post('/leaveupdate', (req, res) => {
    const { leave_type, deletestatus, start_date, end_date, reason, leave_id } = req.body;

    if (!leave_id) {
        return res.status(400).json({ status: false, message: 'Leave ID is required.' });
    }
    db.query(
        'UPDATE leaves SET leave_type = ?, deletestatus = ?, start_date = ?, end_date = ?, reason = ? WHERE leave_id = ?',
        [leave_type, deletestatus, start_date, end_date, reason, leave_id],
        (err, results) => {
            if (err) {
                return res.status(500).json({ status: false, message: 'Error updating leave.', error: err.message });
            }

            // Check if the leave was found and updated
            if (results.affectedRows === 0) {
                return res.status(404).json({ status: false, message: 'Leave not found or no changes made.' });
            }

            // Successfully updated
            res.status(200).json({ status: true, message: 'Leave updated successfully' });
        }
    );
});




module.exports = router;