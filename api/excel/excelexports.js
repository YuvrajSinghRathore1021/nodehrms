const express = require('express');
const router = express.Router();
const { ExcelMake } = require('./excel');
const db = require('../../DB/ConnectionSql');

router.post('/excelDownload', (req, res) => {
    const { userData } = req.body;
    let decodedUserData = null;

    // Decode userData if provided
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData, decoding failed' });
        }
    }

    // Validate decodedUserData
    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Invalid user data. Employee ID and Company ID are required.' });
    }
    // SQL Query
    const query = `SELECT id, type, first_name, last_name,email_id, contact_number, gender FROM employees Where company_id=?`;
    const ArrayValue = [decodedUserData.company_id];
    db.query(query, ArrayValue, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error', error: err });
        }

        // Excel headers
        const headers = ['ID', 'Type', 'First Name', 'Last Name', 'Email', 'Contact Number', 'Gender'];
        const worksheetData = [];

        results.forEach(row => {
            worksheetData.push([
                row.id || '',
                row.type || '',
                row.first_name || '',
                row.last_name || '',
                row.email_id || '',
                row.contact_number || '',
                row.gender || ''
            ]);
        });

        // Generate Excel file
        const filePath = ExcelMake(headers, worksheetData);
        // console.log(worksheetData);
        // return;
        if (!filePath) {
            return res.status(500).json({ status: false, message: 'Excel file generation failed' });
        }

        res.json({ status: true, message: 'Excel file created successfully', data: filePath,url: filePath});
    });
});


router.post('/excelDownloadNew', (req, res) => {
    const { userData } = req.body;
    let decodedUserData = null;

    // Decode userData if provided
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData, decoding failed' });
        }
    }

    // Validate decodedUserData
    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Invalid user data. Employee ID and Company ID are required.' });
    }
    // SQL Query
    const query = `SELECT id,concat(first_name,' ',last_name) AS name ,ctc/12 as Salary FROM employees WHERE status=1 and company_id=?`;
    const ArrayValue = [decodedUserData.company_id];
    db.query(query, ArrayValue, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error', error: err });
        }

        // Excel headers
        const headers = ['ID',  'Name','Salary'];
        const worksheetData = [];

        results.forEach(row => {
            worksheetData.push([
                row.id || '',
                row.name || '',
                row.Salary || ''
            ]);
        });

        // Generate Excel file
        const filePath = ExcelMake(headers, worksheetData);
        // console.log(worksheetData);
        // return;
        if (!filePath) {
            return res.status(500).json({ status: false, message: 'Excel file generation failed' });
        }

        res.json({ status: true, message: 'Excel file created successfully', data: filePath,url: filePath});
    });
});

module.exports = router;
