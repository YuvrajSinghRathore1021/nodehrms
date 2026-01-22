const express = require('express');
const router = express.Router();
const cors = require('cors');
const db = require('../../../DB/ConnectionSql');
router.use(cors());
// app cheak A
router.post('/api/fetchDetails', (req, res) => {
    const { userData, type, UserId } = req.body;
    let decodedUserData = null;

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
    let EmpID = UserId || decodedUserData.id;
    let query;
    let queryParams = '';

    queryParams = [EmpID];

    if (type === 'Personal') {
        query = `SELECT id, first_name, last_name, blood_group, dob, marital_status, gender,
                         official_email_id, email_id, contact_number,alternate_phone, emergency_contact_name,emergency_contact_number,
                         current_address, permanent_address, social_profile_link 
                  FROM employees WHERE id = ?`;

    } else if (type === 'Work') {

        query = `SELECT e.id, e.date_of_Joining, e.work_location, e.employee_type, e.employee_id, 
       e.experience, e.probation_period, e.probation_status, e.job_title, e.designation, 
       d.name AS department_name, 
       sd.name AS sub_department_name
       ,e.department, 
       e.sub_department,eR.first_name AS reporting_manager_name 
FROM employees AS e 
LEFT JOIN departments AS d ON e.department = d.id
LEFT JOIN departments AS sd ON e.sub_department = sd.id
LEFT JOIN employees AS eR ON e.reporting_manager = eR.id
WHERE e.id = ?`;

    } else {
        return res.status(400).json({ error: 'Invalid type specified' });
    }

    // Execute the query
    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ status: false, status: false, error: 'Server error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ status: false, error: 'No data found' });
        }

        let query = "SELECT instagram, facebook, linkedin FROM social_profile WHERE company_id = ? AND employee_id = ? AND type=? And delete_status=0";
        let dataArray = [decodedUserData.company_id, EmpID, "Employee_Profile"];

        db.query(query, dataArray, (err, results1) => {
            if (err) {
                return res.status(500).json({ status: false, message: 'Database error.', error: err });
            }
            res.json({ data: results[0], SocialProfileData: results1, status: true, message: 'Data found' });
        });

    });
});

// app cheak A
router.post('/api/Update', (req, res) => {
    const {
        userData,type, id, first_name, last_name, blood_group, dob, marital_status, gender, official_email_id,
        email_id, contact_number, alternate_phone, current_address, permanent_address,
        emergency_contact_name, emergency_contact_number, instagram, facebook, linkedin
    } = req.body;

    if (!id) {
        return res.status(400).json({ status: false, message: 'Missing required fields: id' });
    }
    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    let query;
    let values;

    if (type === 'Personal') {
        query = `
            UPDATE employees 
            SET first_name=?, last_name=?, blood_group=?, dob=?, marital_status=?, gender=?, 
                official_email_id=?, email_id=?, contact_number=?, alternate_phone=?, 
                current_address=?, permanent_address=?, emergency_contact_name=?, emergency_contact_number=? 
            WHERE id=?`;
        values = [
            first_name, last_name, blood_group, dob, marital_status, gender, official_email_id,
            email_id, contact_number, alternate_phone, current_address, permanent_address,
            emergency_contact_name, emergency_contact_number, id
        ];
    }

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error', error: err });
        }

        let querySocialProfile = `
            SELECT id FROM social_profile 
            WHERE company_id = ? AND employee_id = ? AND type = ? AND delete_status = 0`;
        let dataArraySocialProfile = [decodedUserData.company_id, id, "Employee_Profile"];

        db.query(querySocialProfile, dataArraySocialProfile, (err, socialResults) => {
            if (err) {
                return res.status(500).json({ status: false, message: 'Database error.', error: err });
            }

            if (socialResults.length > 0) {
                // Update existing social profile
                let updateSocialQuery = `
                    UPDATE social_profile 
                    SET instagram = ?, facebook = ?, linkedin = ? 
                    WHERE company_id = ? AND employee_id = ? AND type = ?`;
                let updateValues = [instagram, facebook, linkedin, decodedUserData.company_id, id, "Employee_Profile"];

                db.query(updateSocialQuery, updateValues, (err) => {
                    if (err) {
                        return res.status(500).json({ status: false, message: 'Database error.', error: err });
                    }
                    return res.json({ status: true, message: 'Update successful' });
                });
            } else {
                // Insert new social profile
                let insertSocialQuery = `
                    INSERT INTO social_profile (company_id, employee_id, type, instagram, facebook, linkedin) 
                    VALUES (?, ?, ?, ?, ?, ?)`;
                let insertValues = [decodedUserData.company_id, id, "Employee_Profile", instagram, facebook, linkedin];

                db.query(insertSocialQuery, insertValues, (err) => {
                    if (err) {
                        return res.status(500).json({ status: false, message: 'Database error.', error: err });
                    }
                    return res.json({ status: true, message: 'Update successful' });
                });
            }
        });
    });
});


// Export the router
module.exports = router;
