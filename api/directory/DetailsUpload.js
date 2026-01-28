
const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');
const { AdminCheck } = require('../../model/functlity/AdminCheck');
// web cheak A
router.post('/FamilyDoc/submit', async (req, res) => {
    try {
        const { data, type, CheckId } = req.body;
        const { userData } = req.body;
        const NewData = JSON.parse(data);
        // Check if data is an array
        if (!Array.isArray(NewData)) {
            return res.status(400).json({
                status: false,
                error: 'data should be an array',
            });
        }

        let decodedUserData = null;
        if (userData) {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        }

        if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
            return res.status(400).json({
                status: false,
                error: 'Employee ID and Company ID are required',
            });
        }

        const id = CheckId || decodedUserData.id;
        const insertQuery = `
            INSERT INTO details_upload (company_id, employee_id, type,name, relation, dob, contact) 
            VALUES ?
        `;

        // Map the data for the bulk insert
        const values = NewData.map(member => [decodedUserData.company_id, id, type, member.name, member.relation, member.dob, member.contact]);

        // Insert the data into the database
        db.query(insertQuery, [values], (err, result) => {
            if (err) {
                console.error('Error inserting data:', err);
                return res.status(500).json({
                    status: false,
                    error: 'Error inserting data into database',
                });
            }
            res.status(200).json({
                status: true,
                message: 'Data submitted successfully!',
                result,
            });
        });

    } catch (error) {
        console.error('Error processing the request:', error);
        return res.status(500).json({
            status: false,
            error: 'Server error. Please try again later.',
        });
    }
});


//// check y web
router.get("/FamilyDoc", (req, res) => {
    const type = req.query.type;
    const UserId = req.query.UserId;
    let decodedUserData = "";
    const userData = req.query.userData;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, "base64").toString("utf-8");
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(200).json({ status: false, error: "Invalid userData" });
        }
    } else {
        return res.status(200).json({ status: false, error: "Invalid userData" });
    }

    if (!decodedUserData || !decodedUserData.company_id) {
        return res.status(200).json({ status: false, error: "ID is required" });
    }
    const id = UserId || decodedUserData.id;

    const query = `SELECT id, company_id, employee_id, type, name, relation, dob, contact, delete_status FROM details_upload WHERE delete_status=0 and company_id=? and employee_id=?`;
    const values = [decodedUserData.company_id, id];

    db.query(query, values, (err, results) => {
        if (err) {
            return res.status(200).json({
                status: false,
                message: "Error fetching leave records.",
                error: err.message
            });
        }
        res.status(200).json({
            status: true,
            message: "Data fetched successfully.",
            data: results
        });
    });
});

// web cheak A 
router.post('/api/Update', (req, res) => {
    const { type, id, name, relation, dob, contact, userData } = req.body;

    let decodedUserData = null;
    if (userData) {
        const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
        decodedUserData = JSON.parse(decodedString);
    }
    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({
            status: false,
            error: 'Employee ID and Company ID are required',
        });
    }
    let query;
    let values;
    if (!id) {
        return res.status(400).json({ status: false, message: 'Missing required fields: id' });
    }

    query = 'UPDATE details_upload SET type=?,name=?, relation=?, dob=?, contact=? WHERE id=?';
    values = [type, name, relation, dob, contact, id];

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error', error: err });
        }
        res.json({ status: true, message: 'Update successful', data: results });
    });

});
// web cheak 
router.post('/api/Delete', (req, res) => {
    const { id, userData } = req.body;

    let decodedUserData = null;
    if (userData) {
        const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
        decodedUserData = JSON.parse(decodedString);
    }
    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({
            status: false,
            error: 'Employee ID and Company ID are required',
        });
    }
    let query;
    let values;
    if (!id) {
        return res.status(400).json({ status: false, message: 'Missing required fields: id' });
    }

    query = 'UPDATE details_upload SET delete_status=1 WHERE id=?';
    values = [id];

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error', error: err });
        }
        res.json({ status: true, message: 'Delete successful', data: results });
    });

});
module.exports = router;


