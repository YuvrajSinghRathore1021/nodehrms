const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');


// ✅ 1. ADD LOCK
router.post('/add', async (req, res) => {
    const { lock_type, lock_day, lock_month } = req.body;

    if (!req?.user?.id || !req?.user?.company_id) {
        return res.status(400).json({ status: false, error: 'User not authorized' });
    }

    if (!lock_type) {
        return res.status(400).json({ status: false, error: 'Lock type required' });
    }

    const company_id = req.user.company_id;

    const query = `
        INSERT INTO locks (company_id, lock_type, lock_day, lock_month)
        VALUES (?, ?, ?, ?)
    `;

    db.query(query, [company_id, lock_type, lock_day || null, lock_month || null], (err, result) => {
        if (err) return res.status(500).json({ status: false, error: err });

        res.json({
            status: true,
            message: 'Lock created successfully',
            id: result.insertId
        });
    });
});


// ✅ 2. GET LOCK LIST
router.get('/get', async (req, res) => {

    if (!req?.user?.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID required' });
    }

    const company_id = req.user.company_id;

    const query = `
        SELECT * FROM locks 
        WHERE company_id = ?
        ORDER BY id DESC
    `;

    db.query(query, [company_id], (err, result) => {
        if (err) return res.status(500).json({ status: false, error: err });

        res.json({
            status: true,
            data: result
        });
    });
});


// ✅ 3. UPDATE LOCK
router.post('/update', async (req, res) => {
    const { id, lock_day, lock_month } = req.body;

    if (!id) {
        return res.status(400).json({ status: false, error: 'ID required' });
    }

    const query = `
        UPDATE locks 
        SET lock_day = ?, lock_month = ?
        WHERE id = ?
    `;

    db.query(query, [lock_day || null, lock_month || null, id], (err) => {
        if (err) return res.status(500).json({ status: false, error: err });

        res.json({
            status: true,
            message: 'Lock updated successfully'
        });
    });
});


// ✅ 4. DELETE LOCK
router.post('/delete', async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ status: false, error: 'ID required' });
    }

    const query = `DELETE FROM locks WHERE id = ?`;

    db.query(query, [id], (err) => {
        if (err) return res.status(500).json({ status: false, error: err });

        res.json({
            status: true,
            message: 'Lock deleted successfully'
        });
    });
});


// ✅ 5. CHECK LOCK (MOST IMPORTANT 🔥)
router.post('/check', async (req, res) => {
    const { date } = req.body;

    if (!req?.user?.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID required' });
    }

    const company_id = req.user.company_id;

    const query = `
        SELECT * FROM locks 
        WHERE company_id = ?
    `;

    db.query(query, [company_id], (err, locks) => {
        if (err) return res.status(500).json({ status: false, error: err });

        let isLocked = false;

        const inputDate = new Date(date);
        const today = new Date();

        locks.forEach(lock => {

            // 📅 Monthly Lock
            if (lock.lock_type === 'monthly' && lock.lock_day) {
                if (today.getDate() >= lock.lock_day) {
                    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                    if (inputDate <= lastMonthEnd) {
                        isLocked = true;
                    }
                }
            }

            // 📆 Yearly Lock
            if (lock.lock_type === 'yearly' && lock.lock_day && lock.lock_month) {
                if (
                    today.getDate() === lock.lock_day &&
                    (today.getMonth() + 1) === lock.lock_month
                ) {
                    const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
                    if (inputDate <= lastYearEnd) {
                        isLocked = true;
                    }
                }
            }

        });

        res.json({
            status: true,
            isLocked
        });
    });
});

module.exports = router;