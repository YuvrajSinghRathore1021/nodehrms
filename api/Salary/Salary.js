const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');

// web cheak A
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
        const query = `SELECT id, employee_id,  first_name, last_name, official_email_id, email_id, date_of_Joining, last_day,upi,account_holder_name, contact_number, alternate_phone,bank, branch, city, ifsc, account_number,ctc FROM employees WHERE id=? And company_id = ? ORDER BY id DESC `;
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
// web cheak A 
router.post("/api/UpdateBankDetails", (req, res) => {
    const { id, bank, branch, city, ifsc, account_number, date_of_Joining, account_holder_name, upi, last_day, userData } = req.body;

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
        [date_of_Joining, bank, branch, city, ifsc, account_number, account_holder_name, upi, last_day, id, decodedUserData.company_id],
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
                return res.status(200).json({
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

// web cheak A
router.post("/api/UpdateSalary", async (req, res) => {
    const { id, increment_percent, newSalary, reason, userData } = req.body;

    // Validate employee ID
    if (!id) {
        return res.status(400).json({ status: false, message: "Employee ID is required" });
    }

    let decodedUserData = null;
    try {
        const decodedString = Buffer.from(userData, "base64").toString("utf-8");
        decodedUserData = JSON.parse(decodedString);
    } catch (error) {
        return res.status(400).json({ status: false, error: "Invalid userData" });
    }

    // const { company_id, employee_id } = decodedUserData || {};
    let company_id = decodedUserData ? decodedUserData.company_id : 0;
    let employee_id = decodedUserData ? decodedUserData.id : 0;
    if (!company_id) {
        return res.status(400).json({ status: false, error: "Company ID is missing or invalid" });
    }

    try {
        // 1️⃣ Fetch current ctc
        const [empRows] = await db.promise()
            .query("SELECT ctc FROM employees WHERE id = ? AND company_id = ?", [id, company_id]);

        if (empRows.length === 0) {
            return res.status(200).json({ status: false, message: "Employee not found" });
        }

        const old_salary = parseFloat(empRows[0].ctc || 0);

        // 3️⃣ Update ctc in main employee table
        await db
            .promise()
            .query("UPDATE employees SET ctc = ? WHERE id = ? AND company_id = ?", [
                newSalary,
                id,
                company_id,
            ]);

        // 4️⃣ Log the update
        await db.promise().query(
            `INSERT INTO salary_update_logs 
             (company_id, employee_id, old_salary, new_salary, increment_percent, updated_by,  update_reason) 
             VALUES ( ?, ?, ?, ?, ?, ?, ?)`,
            [
                company_id,
                id,
                old_salary,
                newSalary,
                increment_percent || 0,
                employee_id || 0,
                reason || null
            ]
        );

        return res.json({
            status: true,
            message: "Salary updated successfully",
            old_salary,
            new_salary: newSalary,
            increment_percent
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: err.message });
    }
});


// web cheak A
router.post("/api/salaryLog", async (req, res) => {
    const { id, userData } = req.body;

    // Validate employee ID
    if (!id) {
        return res.status(400).json({ status: false, message: "Employee ID is required" });
    }
    let decodedUserData = null;
    try {
        const decodedString = Buffer.from(userData, "base64").toString("utf-8");
        decodedUserData = JSON.parse(decodedString);
    } catch (error) {
        return res.status(400).json({ status: false, error: "Invalid userData" });
    }

    let company_id = decodedUserData ? decodedUserData.company_id : 0;
    let employee_id = decodedUserData ? decodedUserData.id : 0;

    if (!company_id) {
        return res.status(400).json({ status: false, error: "Company ID is missing or invalid" });
    }

    try {
        // 1️⃣ Fetch current ctc
        const [empRows] = await db.promise().query(`SELECT sul.id,sul.employee_id,  sul.old_salary, 
            sul.new_salary, sul.increment_percent, CONCAT(e.first_name,' ', e.last_name) AS name,CONCAT(el.first_name,' ', el.last_name) AS updated_by, sul.update_reason, sul.updated_at 
FROM salary_update_logs as sul inner JOIN employees as e ON sul.employee_id = e.id
left join employees as el ON sul.updated_by = el.id WHERE 
sul.company_id = ? AND sul.employee_id = ?  ORDER BY sul.id DESC`, [company_id, id]);

        if (empRows.length === 0) {
            return res.status(200).json({ status: false, message: "Salary Log not found" });
        }

        return res.json({
            status: true,
            message: "Salary Log fetched successfully",
            data: empRows

        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: err.message });
    }
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