// routes/locks.js
const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');

// ------------------- Helper -------------------
// Convert comma-separated employee_ids string to array if needed (optional)

// ------------------- 1. GET ALL LOCKS -------------------
router.get('/get', async (req, res) => {
    if (!req?.user?.id || !req?.user?.company_id) {
        return res.status(400).json({ status: false, error: 'User not authorized' });
    }
    const company_id = req.user.company_id;

    const query = `
        SELECT id, company_id, rule_name, lock_type, lock_day, lock_month,
               DATE_FORMAT(fix_date, '%Y-%m-%d') as fix_date,
               attendance_approval, attendance_request, leave_request, leave_approval, is_locked,
               created_at, updated_at
        FROM locks
        WHERE company_id = ?
        ORDER BY id DESC
    `;

    db.query(query, [company_id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ status: false, error: 'Database error' });
        }
        res.json({ status: true, data: results });
    });
});

// ------------------- 2. GET SINGLE LOCK DETAILS -------------------
router.post('/details', async (req, res) => {
    if (!req?.user?.id || !req?.user?.company_id) {
        return res.status(400).json({ status: false, error: 'User not authorized' });
    }
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ status: false, error: 'Lock ID required' });
    }

    const company_id = req.user.company_id;
    const query = `
        SELECT id, company_id, employee_ids, rule_name, lock_type, lock_day, lock_month,
               DATE_FORMAT(fix_date, '%Y-%m-%d') as fix_date,
               attendance_approval, attendance_request, leave_request, leave_approval, is_locked,
               created_at, updated_at
        FROM locks
        WHERE id = ? AND company_id = ?
    `;

    db.query(query, [id, company_id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ status: false, error: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ status: false, error: 'Lock not found' });
        }
        res.json({ status: true, data: results });
    });
});

// ------------------- 3. ADD NEW LOCK -------------------
router.post('/add', async (req, res) => {
    if (!req?.user?.id || !req?.user?.company_id) {
        return res.status(400).json({ status: false, error: 'User not authorized' });
    }

    const {
        rule_name,
        lock_type,
        lock_day,
        lock_month,
        fix_date,
        employee_ids = '',
        attendance_approval = 0,
        attendance_request = 0,
        leave_request = 0,
        leave_approval = 0,
        is_locked = 0
    } = req.body;

    // Validation
    if (!rule_name || !lock_type || !fix_date) {
        return res.status(400).json({ status: false, error: 'Missing required fields: rule_name, lock_type, fix_date' });
    }

    if (!['daily', 'monthly', 'yearly'].includes(lock_type)) {
        return res.status(400).json({ status: false, error: 'Invalid lock_type' });
    }

    // Conditional validation for lock_day / lock_month
    if ((lock_type === 'monthly' || lock_type === 'yearly') && (lock_day === undefined || lock_day === null)) {
        return res.status(400).json({ status: false, error: 'lock_day is required for monthly/yearly' });
    }
    if (lock_type === 'yearly' && (lock_month === undefined || lock_month === null)) {
        return res.status(400).json({ status: false, error: 'lock_month is required for yearly' });
    }

    const company_id = req.user.company_id;

    const query = `
        INSERT INTO locks (
            company_id, employee_ids, rule_name, lock_type, lock_day, lock_month, fix_date,
            attendance_approval, attendance_request, leave_request, leave_approval, is_locked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        company_id,
        employee_ids,
        rule_name,
        lock_type,
        lock_day || null,
        lock_month || null,
        fix_date,
        attendance_approval,
        attendance_request,
        leave_request,
        leave_approval,
        is_locked
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ status: false, error: 'Database error' });
        }
        res.json({
            status: true,
            message: 'Lock created successfully',
            id: result.insertId
        });
    });
});

// ------------------- 4. UPDATE LOCK -------------------
router.post('/update', async (req, res) => {
    if (!req?.user?.id || !req?.user?.company_id) {
        return res.status(400).json({ status: false, error: 'User not authorized' });
    }

    const {
        id,
        employee_ids,
        rule_name,
        lock_type,
        lock_day,
        lock_month,
        fix_date,
        attendance_approval,
        attendance_request,
        leave_request,
        leave_approval,
        is_locked
    } = req.body;

    if (!id) {
        return res.status(400).json({ status: false, error: 'Lock ID required' });
    }

    // Basic validation
    if (!rule_name || !lock_type || !fix_date) {
        return res.status(400).json({ status: false, error: 'Missing required fields' });
    }

    const company_id = req.user.company_id;

    // First check if lock exists and belongs to company
    const checkQuery = 'SELECT id FROM locks WHERE id = ? AND company_id = ?';
    db.query(checkQuery, [id, company_id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ status: false, error: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ status: false, error: 'Lock not found or not owned by company' });
        }

        const updateQuery = `
            UPDATE locks SET
                employee_ids = ?,
                rule_name = ?,
                lock_type = ?,
                lock_day = ?,
                lock_month = ?,
                fix_date = ?,
                attendance_approval = ?,
                attendance_request = ?,
                leave_request = ?,
                leave_approval = ?,
                is_locked = ?
            WHERE id = ? AND company_id = ?
        `;

        const values = [
            employee_ids || '',
            rule_name,
            lock_type,
            lock_day || null,
            lock_month || null,
            fix_date,
            attendance_approval,
            attendance_request,
            leave_request,
            leave_approval,
            is_locked,
            id,
            company_id
        ];

        db.query(updateQuery, values, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ status: false, error: 'Database error' });
            }
            res.json({
                status: true,
                message: 'Lock updated successfully',
                affectedRows: result.affectedRows
            });
        });
    });
});

// ------------------- 5. DELETE LOCK -------------------
router.post('/delete', async (req, res) => {
    if (!req?.user?.id || !req?.user?.company_id) {
        return res.status(400).json({ status: false, error: 'User not authorized' });
    }

    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ status: false, error: 'Lock ID required' });
    }

    const company_id = req.user.company_id;

    // Optional: check ownership before deleting
    const deleteQuery = 'DELETE FROM locks WHERE id = ? AND company_id = ?';
    db.query(deleteQuery, [id, company_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ status: false, error: 'Database error' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: false, error: 'Lock not found or not owned by company' });
        }
        res.json({
            status: true,
            message: 'Lock deleted successfully'
        });
    });
});

module.exports = router;