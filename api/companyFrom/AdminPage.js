//AdminPage.js
const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');


router.post('/api/Update', (req, res) => {
    const { EmployeesData, TypeValue, userData } = req.body;

    if (!TypeValue || !EmployeesData || !userData) {
        return res.status(400).json({ status: false, message: 'Missing required fields' });
    }
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData, decoding failed' });
        }
    }
    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Invalid user data. Employee ID and Company ID are required.' });
    }
    let employeeIds = Array.isArray(EmployeesData) ? EmployeesData : EmployeesData.split(',').map(id => parseInt(id.trim()));
    const query = 'UPDATE employees SET type=? WHERE id IN (?) AND company_id=?';
    const values = [TypeValue, employeeIds, decodedUserData.company_id];

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error', error: err });
        }
        res.json({ status: true, message: 'Update successful', data: results });
    });
});
router.post('/api/EmployeeRemove', (req, res) => {
    const { id, userData } = req.body;

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData, decoding failed' });
        }
    }

    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Invalid user data. Employee ID and Company ID are required.' });
    }
    const query = 'UPDATE employees SET type="employee" WHERE id =? AND company_id=?';
    const values = [ id, decodedUserData.company_id];

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error', error: err });
        }
        res.json({ status: true, message: 'Update successful', data: results });
    });
});


// Employees:

router.get('/api/EmployeesDetiles', async (req, res) => {
    const { userData } = req.query;
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
    if (!decodedUserData || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }

    let query;
    let queryParams = '';

    queryParams = [decodedUserData.company_id];
    query = `SELECT id,type,first_name FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 and  company_id = ?`;

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ status: false, status: false, error: 'Server error' });
        }
        if (results.length === 0) {
            return res.status(200).json({ status: false, error: 'No data found' });
        }
        res.json({
            data: results,
            status: true,
            message: 'Data found'
        });
    });
});


router.get('/api/fetchType', async (req, res) => {
    const { userData } = req.query;
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

    if (!decodedUserData || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }

    let query;
    let queryParams = '';

    queryParams = [decodedUserData.company_id];
    query = `SELECT id,profile_image,type, first_name FROM employees WHERE employee_status=1 and status=1 and delete_status=0 and  company_id = ?`;

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ status: false, error: 'Server error' });
        }

        if (results.length === 0) {
            return res.status(200).json({ status: false, error: 'No data found' });
        }

        // Grouping employees by type
        const groupedByType = results.reduce((acc, employee) => {
            if (!acc[employee.type]) {
                acc[employee.type] = [];
            }
            acc[employee.type].push({ name: employee.first_name, profile_image: employee.profile_image, id: employee.id });
            return acc;
        }, {});

        // Prepare the response object with dynamic properties for each employee type
        const response = {};
        for (const type in groupedByType) {
            response[type.toLowerCase()] = groupedByType[type];
        }
        res.json({
            data: response,
            status: true,
            message: 'Data found'
        });
    });
});


module.exports = router;
