const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');


router.post('/api/BankDetails', async (req, res) => {
    try {
        const { userData } = req.body;
        let { EmployeeId = null } = req.body;

        let decodedUserData = null;
        if (userData) {
            decodedUserData = decodeUserData(userData);
            if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
                return res.status(400).json({ status: false, message: 'Invalid userData', error: 'Invalid userData' });
            }
        } else {
            return res.status(400).json({ status: false, message: 'userData is required', error: 'Missing userData' });
        }

        // Query to fetch attendance requests
        const query = `SELECT id, employee_id,  first_name, last_name, official_email_id, email_id, date_of_Joining, last_day,upi,account_holder_name, contact_number, alternate_phone,bank, branch, city, ifsc, account_number FROM employees WHERE id=? And company_id = ? ORDER BY id DESC `;
        const queryParams = [EmployeeId, decodedUserData.company_id];

        // Execute the query
        const [results] = await db.promise().query(query, queryParams);

        // Count total records for pagination


        // Add serial number (srnu) to each result
        const requestsWithSrnu = results.map((request, index) => ({
            srnu: index + 1,
            ...request,
        }));

        res.json({
            status: true,
            data: requestsWithSrnu,
            massage: 'Bank details fetched successfully',
        });
    } catch (err) {
        console.error('Error fetching attendance approval log:', err);
        res.status(500).json({ status: false, error: 'Server error', message: err.message });
    }
});

router.post("/api/UpdateBankDetails", (req, res) => {
    const { id, bank, branch, city, ifsc, account_number, date_of_Joining,account_holder_name, upi, last_day, userData } = req.body;

    // Validate input
    if (!id) {
        return res.status(400).json({ status: false, message: "ID is required to update holiday." });
    }

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, "base64").toString("utf-8");
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: "Invalid userData" });
        }
    }

    if (!decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: "Company ID is missing or invalid" });
    }
    db.query("UPDATE employees SET date_of_Joining=?,bank=?,branch=?,city=?,ifsc=?,account_number=?,account_holder_name=?,upi=?,last_day=? WHERE id = ? AND company_id=?",
        [date_of_Joining,bank, branch, city, ifsc, account_number, account_holder_name, upi, last_day, id, decodedUserData.company_id],
        (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({
                    status: false,
                    message: "Error updating holiday.",
                    error: err.message
                });
            }
            if (results.affectedRows === 0) {
                return res.status(404).json({
                    status: false,
                    message: "Holiday not found or no changes made."
                });
            }
            res
                .status(200)
                .json({ status: true, message: "Holiday updated successfully." });
        }
    );
});

const decodeUserData = (userData) => {
    try {
        const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
        return JSON.parse(decodedString);
    } catch (error) {
        return null;
    }
};

module.exports = router;