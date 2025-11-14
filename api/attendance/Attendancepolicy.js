const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');

///// Attendancepolicy.js



router.get('/rule/get', async (req, res) => {
    const { userData } = req.query;
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    if (!decodedUserData || !decodedUserData.company_id || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'company_id and id are required' });
    }
    let company_id = decodedUserData.company_id;
    try {
        const [policyRows] = await db.promise().query(
            `SELECT id, policy_name 
            FROM attendance_policy WHERE company_id = ? `,
            [company_id]
        );
        if (!policyRows.length) {
            return { status: false, message: "No attendance policy found for this company" };

        }
        return res.status(200).json({ status: true, data: policyRows, message: "Attendance policy found for this company" });
    }
    catch (err) {
        return res.status(500).json({ status: false, message: 'Internal server error.', error: err });
    }

});

router.post('/rule/details', async (req, res) => {
    const { userData, id } = req.body;
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    if (!decodedUserData || !decodedUserData.company_id || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'company_id and  id are required' });
    }
    let company_id = decodedUserData.company_id;

    try {
        const [policyRows] = await db.promise().query(
            `SELECT * FROM attendance_policy WHERE company_id = ? and id=? `,
            [company_id, id]
        );

        if (!policyRows.length) {
            return { status: false, message: "No attendance policy found for this company" };

        }
        return res.status(200).json({ status: true, data: policyRows, message: "Attendance policy found for this company" });
    }
    catch (err) {
        return res.status(500).json({ status: false, message: 'Internal server error.', error: err });
    }
});



// CREATE
router.post('/create', async (req, res) => {
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
        return res.status(400).json({ status: false, error: 'Name, company ID are required' });
    }

    // Insert the new department into the database
    db.query('INSERT INTO attendance_policy (policy_name, company_id) VALUES (?, ?)', [name, company_id],
        (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ status: false, error: 'Error while adding department' });
            }

            res.status(201).json({ status: true, message: 'Policy Rule added successfully' });
        }
    );
});




router.post('/rule/update', async (req, res) => {
    const { userData, id, employee_ids, policy_name, short_leave_limit_in, short_leave_duration_in, short_leave_limit_out, short_leave_duration_out, short_leave_in_working_hours, short_leave_out_working_hours, total_leave_status, short_leave_total } = req.body;
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    if (!decodedUserData || !decodedUserData.company_id || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'company_id and  id are required' });
    }
    let company_id = decodedUserData.company_id;

    try {
        const [policyRowsUpdate] = await db.promise().query(
            `update attendance_policy set employee_ids=?, policy_name=?, short_leave_limit_in=?, short_leave_duration_in=?, short_leave_limit_out=?, short_leave_duration_out=?, short_leave_in_working_hours=?, short_leave_out_working_hours=?, total_leave_status=?, short_leave_total=? WHERE company_id = ? and id=? `,
            [employee_ids, policy_name, short_leave_limit_in, short_leave_duration_in, short_leave_limit_out, short_leave_duration_out, short_leave_in_working_hours, short_leave_out_working_hours, total_leave_status, short_leave_total, company_id, id]
        );

        if (policyRowsUpdate.affectedRows == 1) {
            return res.status(200).json({ status: true, message: "Attendance policy Update " });
        } else {
            return res.status(404).json({
                status: false,
                message: "Attendance policy not found or no changes made"
            });
        }

    }
    catch (err) {
        return res.status(500).json({ status: false, message: 'Internal server error.', error: err });
    }
});


router.post('/rule/delete', async (req, res) => {
    const { userData, id } = req.body;
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    if (!decodedUserData || !decodedUserData.company_id || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'company_id and  id are required' });
    }
    let company_id = decodedUserData.company_id;
    try {
        const [policyDelete] = await db.promise().query(
            `DELETE FROM attendance_policy WHERE company_id = ? and id=? `,
            [company_id, id]
        );

        if (policyDelete.affectedRows === 1) {
            return res.status(200).json({
                status: true,
                message: "Attendance policy deleted successfully"
            });
        } else {
            return res.status(404).json({
                status: false,
                message: "Attendance policy not found"
            });
        }

    }
    catch (err) {
        return res.status(500).json({ status: false, message: 'Internal server error.', error: err });
    }
});






module.exports = router;
