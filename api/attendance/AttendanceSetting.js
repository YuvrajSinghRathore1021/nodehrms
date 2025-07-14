const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');
const { AdminCheck } = require('../../model/functlity/AdminCheck');

// Attendance Settings API
router.post('/api/Attendance_settings', async (req, res) => {
    const { userData, multi_Attendance_approve, Type } = req.body;
    if (!userData) {
        return res.status(400).json({ status: false, error: 'userData is required' });
    }
    let decodedUserData;
    try {
        const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
        decodedUserData = JSON.parse(decodedString);
    } catch (error) {
        return res.status(400).json({ status: false, error: 'Invalid userData format' });
    }
    const { company_id, id: userId } = decodedUserData;
    if (!company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
    }
    try {
        const isAdmin = await AdminCheck(userId, company_id);
        if (!isAdmin) {
            return res.status(403).json({
                status: false,
                error: 'You do not have access to this functionality',
                message: 'Permission denied',
            });
        }

        // Validate required fields
        if (multi_Attendance_approve == null) {
            return res.status(400).json({
                status: false,
                error: 'Missing required fields: multi_Attendance_approve',
            });
        }

        const checkQuery = `SELECT * FROM settings WHERE company_id = ? AND type=?`;
        const insertQuery = `
            INSERT INTO settings (type,company_id, multi_level_approve) 
            VALUES (?, ?, ?)
        `;
        const updateQuery = `
            UPDATE settings 
            SET  multi_level_approve = ? 
            WHERE company_id = ? AND type=?
        `;

        // Check existing settings
        db.query(checkQuery, [company_id, Type], (err, results) => {
            if (err) {
                return res.status(500).json({ status: false, message: 'Database error', error: err });
            }
            if (results.length > 0) {
                db.query(updateQuery, [multi_Attendance_approve, company_id, Type], (updateErr) => {
                    if (updateErr) {
                        return res.status(500).json({ status: false, message: 'Database error', error: updateErr });
                    }
                    return res.status(200).json({ status: true, message: 'Settings updated successfully' });
                });
            } else {
                db.query(insertQuery, [Type, company_id, multi_Attendance_approve], (insertErr) => {
                    if (insertErr) {
                        return res.status(500).json({ status: false, message: 'Database error', error: insertErr });
                    }
                    return res.status(200).json({ status: true, message: 'Settings inserted successfully' });
                });
            }
        });
    } catch (error) {
        return res.status(500).json({ status: false, error: 'Internal server error' });
    }
});

// Get Value
router.post('/api/GetAttendanceValue', async (req, res) => {
    const { userData, Type } = req.body;
    if (!userData) {
        return res.status(400).json({ status: false, error: 'userData is required' });
    }
    let decodedUserData;
    try {
        const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
        decodedUserData = JSON.parse(decodedString);
    } catch (error) {
        return res.status(400).json({ status: false, error: 'Invalid userData format' });
    }
    const { company_id, id: userId } = decodedUserData;
    if (!company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
    }
    try {
        const isAdmin = await AdminCheck(userId, company_id);
        if (!isAdmin) {
            return res.status(403).json({
                status: false,
                error: 'You do not have access to this functionality',
                message: 'Permission denied',
            });
        }
        const Query = `SELECT * FROM settings WHERE company_id = ? AND type=?`;
        db.query(Query, [company_id, Type], (err, results) => {
            if (err) {
                return res.status(500).json({ status: false, message: 'Database error', error: err });
            }
            return res.status(200).json({
                status: true,
                message: 'Data Found',
                data: results
            });
        });
    } catch (error) {
        return res.status(500).json({ status: false, error: 'Internal server error' });
    }
});
module.exports = router;
