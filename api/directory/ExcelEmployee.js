const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const cors = require('cors');
const db = require('../../DB/ConnectionSql');
router.use(cors());

// Storage for uploaded Excel
const upload = multer({ dest: 'uploads/' });

router.post('/api/onboarding/upload', upload.single('file'), async (req, res) => {
    const { userData } = req.body;


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
    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and company ID are required' });
    }

    let company_id = decodedUserData.company_id;

    if (!req.file) return res.status(400).json({ status: false, message: 'No file uploaded' });

    const filePath = path.resolve(req.file.path);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let successCount = 0;
    let failed = [];

    for (let i = 0; i < sheetData.length; i++) {
        const row = sheetData[i];
        // Do validations
        if (!row.first_name || !row.email_id) {
            let missingFields = [];

            if (!row.first_name) {
                missingFields.push('First name');
            }
            if (!row.email_id) {
                missingFields.push('Email ID');
            }

            const errorMessage = `Required fields missing: ${missingFields.join(', ')}`;
            failed.push({ ...row, error: errorMessage });
            continue;
        }


        // Check for duplicates or other validation (you can reuse your existing logic)
        const [existing] = await db.promise().query('SELECT id FROM employees WHERE contact_number = ? OR email_id = ? OR official_email_id=?', [row.contact_number, row.email_id, row.official_email_id]);
        if (existing.length > 0) {
            failed.push({ ...row, error: 'Duplicate entry' });
            continue;
        }

        try {
            // Insert into DB
            await db.promise().query(
                'INSERT INTO employees (company_id,type, employee_id, first_name, last_name, official_email_id, email_id, date_of_Joining, last_day, contact_number, alternate_phone, dob, gender, work_location, department, sub_department, designation, employee_status, employee_type, probation_period, probation_status, notice_period, reporting_manager,marital_status, ctc, aadhaar_card, pan_card, emergency_contact_name, emergency_contact_number, current_address, permanent_address,  job_title, experience, blood_group,  relation, account_holder_name, upi, bank, branch, city, ifsc, account_number) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                [company_id, row.type || 'employee', row.employee_id, row.first_name, row.last_name, row.official_email_id, row.email_id, row.date_of_Joining, row.last_day, row.contact_number, row.alternate_phone, row.dob, row.gender, row.work_location, row.department, row.sub_department, row.designation, row.employee_status, row.employee_type, row.probation_period, row.probation_status, row.notice_period, row.reporting_manager, row.marital_status, row.ctc, row.aadhaar_card, row.pan_card, row.emergency_contact_name, row.emergency_contact_number, row.current_address, row.permanent_address, row.job_title, row.experience, row.blood_group, row.relation, row.account_holder_name, row.upi, row.bank, row.branch, row.city, row.ifsc, row.account_number]
            );
            successCount++;
        } catch (error) {
            failed.push({ ...row, error: error.sqlMessage });
        }
    }

    fs.unlinkSync(filePath); // delete temp file

    // If any failed, return an error Excel
    if (failed.length > 0) {
        const errorSheet = xlsx.utils.json_to_sheet(failed);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, errorSheet, "Errors");

        const outputPath = `uploads/emponbord/errors_${Date.now()}.xlsx`;
        xlsx.writeFile(wb, outputPath);
        return res.status(200).json({ status: false, message: 'Some records failed', file: outputPath });
    }

    res.json({ status: true, message: `${successCount} employees onboarded successfully` });
});



router.get('/api/onboarding/template', (req, res) => {
    const structure = [
        {
            employee_id: '',
            type: '',
            first_name: '',
            last_name: '',
            official_email_id: '',
            email_id: '',
            date_of_Joining: '',
            last_day: '',
            contact_number: '',
            alternate_phone: '',
            dob: '',
            gender: '',
            work_location: '',
            department: '',
            sub_department: '',
            designation: '',
            employee_status: '',
            employee_type: '',
            probation_period: '',
            probation_status: '',
            notice_period: '',
            reporting_manager: '',
            marital_status: '',
            ctc: '',
            aadhaar_card: '',
            pan_card: '',
            emergency_contact_name: '',
            emergency_contact_number: '',
            current_address: '',
            permanent_address: '',
            job_title: '',
            experience: '',
            blood_group: '',
            relation: '',
            account_holder_name: '',
            upi: '',
            bank: '',
            branch: '',
            city: '',
            ifsc: '',
            account_number: ''
        }
    ];
    const ws = xlsx.utils.json_to_sheet(structure);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Template');

    const filePath = `uploads/employee_template.xlsx`;
    xlsx.writeFile(wb, filePath);

    res.download(filePath, 'Employee_Onboarding_Template.xlsx');
});

// update 
const moment = require('moment');
// helper function for Excel date parsing
function parseExcelDate(value) {
    if (!value) return null;

    // if it's a number, treat as Excel serial date
    if (!isNaN(value) && typeof value === "number") {
        const date = new Date((value - 25569) * 86400 * 1000);
        return date.toISOString().split("T")[0]; // YYYY-MM-DD
    }

    // try normal Date parse
    const parsed = new Date(value);
    if (!isNaN(parsed)) {
        return parsed.toISOString().split("T")[0];
    }

    return null;
}

router.post('/api/onboarding/update', upload.single('file'), async (req, res) => {
    const { userData, columns } = req.body;

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and company ID are required' });
    }

    let selectedColumns;
    try {
        selectedColumns = JSON.parse(columns); // sent as JSON string
        if (!Array.isArray(selectedColumns) || selectedColumns.length === 0) {
            return res.status(400).json({ status: false, error: 'No columns specified' });
        }
    } catch (e) {
        return res.status(400).json({ status: false, error: 'Invalid columns format' });
    }

    if (!req.file) return res.status(400).json({ status: false, message: 'No file uploaded' });

    const filePath = path.resolve(req.file.path);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let successCount = 0;
    let failed = [];

    for (let row of sheetData) {
        console.log(row.date_of_Joining, row.dob, row.last_day)
        const empId = row.employee_id;

        if (!empId) {
            failed.push({ ...row, error: 'Missing employee_id for update' });
            continue;
        }

        // Map custom fields
        if (row.birth_day && !row.dob && selectedColumns.includes("dob")) {
            row.dob = row.birth_day;
        }


        ['dob', 'date_of_Joining', 'last_day'].forEach((field) => {
            if (selectedColumns.includes(field) && row[field]) {
                row[field] = parseExcelDate(row[field]);
            }
        });


        // Build dynamic update query
        const keys = selectedColumns.filter(col => row[col] != undefined);
        const values = keys.map(col => row[col]);
        if (keys.length === 0) {
            failed.push({ ...row, error: 'No valid update fields present in row' });
            continue;
        }
        console.log(keys)

        const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
        const query = `UPDATE employees SET ${setClause} WHERE employee_id = ? AND company_id = ?`;
        console.log(setClause)
        console.log(values)

        try {
            const [result] = await db.promise().query(query, [...values, empId, decodedUserData.company_id]);
            if (result.affectedRows > 0) {
                successCount++;
            } else {
                failed.push({ ...row, error: 'No matching employee found' });
            }
        } catch (err) {
            failed.push({ ...row, error: err.sqlMessage });
        }
    }

    fs.unlinkSync(filePath); // Clean up

    if (failed.length > 0) {
        const errorSheet = xlsx.utils.json_to_sheet(failed);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, errorSheet, 'Errors');

        const outputPath = `uploads/emponbord/update_errors_${Date.now()}.xlsx`;
        xlsx.writeFile(wb, outputPath);

        return res.status(200).json({
            status: false,
            message: 'Some records failed to update',
            file: outputPath
        });
    }

    res.json({ status: true, message: `${successCount} employees updated successfully` });
});


router.post('/api/onboarding/update-dates', upload.single('file'), async (req, res) => {
    const { userData } = req.body;

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    if (!decodedUserData?.id || !decodedUserData?.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and company ID are required' });
    }

    if (!req.file) return res.status(400).json({ status: false, message: 'No file uploaded' });

    const filePath = path.resolve(req.file.path);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let successCount = 0;
    let failed = [];

    for (let row of sheetData) {
        const empId = row.employee_id;
        if (!empId) {
            failed.push({ ...row, error: 'Missing employee_id' });
            continue;
        }

        // Parse date fields
        const dob = parseExcelDate(row.dob || row.birth_day);
        const date_of_Joining = parseExcelDate(row.date_of_Joining);
        const last_day = parseExcelDate(row.last_day);

        const updateFields = {};
        if (dob) updateFields.dob = dob;
        if (date_of_Joining) updateFields.date_of_Joining = date_of_Joining;
        if (last_day) updateFields.last_day = last_day;

        if (Object.keys(updateFields).length === 0) {
            failed.push({ ...row, error: 'No valid date fields to update' });
            continue;
        }

        const keys = ['dob', 'date_of_Joining', 'last_day'];
        const values = [dob, date_of_Joining, last_day];

        const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
        const query = `UPDATE employees SET ${setClause} WHERE employee_id = ? AND company_id = ?`;



        console.log(query)
        console.log(values)
        try {
            const [result] = await db.promise().query(query, [...values, empId, decodedUserData.company_id]);
            if (result.affectedRows > 0) {
                successCount++;
            } else {
                failed.push({ ...row, error: 'No matching employee found' });
            }
        } catch (err) {
            failed.push({ ...row, error: err.sqlMessage });
        }
    }

    fs.unlinkSync(filePath);

    if (failed.length > 0) {
        const errorSheet = xlsx.utils.json_to_sheet(failed);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, errorSheet, 'Errors');

        const outputPath = `uploads/emponbord/update_date_errors_${Date.now()}.xlsx`;
        xlsx.writeFile(wb, outputPath);

        return res.status(200).json({
            status: false,
            message: 'Some records failed to update',
            file: outputPath
        });
    }

    res.json({ status: true, message: `${successCount} employees updated successfully` });
});

router.post('/api/onboarding/updateRM', upload.single('file'), async (req, res) => {
    const { userData } = req.body;

    // Decode userData
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    if (!decodedUserData?.id || !decodedUserData?.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and company ID are required' });
    }

    const companyId = decodedUserData.company_id;

    if (!req.file) return res.status(400).json({ status: false, message: 'No file uploaded' });

    const filePath = path.resolve(req.file.path);
    let sheetData = [];

    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } catch (err) {
        return res.status(500).json({ status: false, message: 'Error reading Excel file', error: err.message });
    }

    let successCount = 0;
    let failed = [];

    for (let row of sheetData) {
        const empId = row.employee_id;
        const rmEmployeeId = row.reporting_manager;

        if (!empId || !rmEmployeeId) {
            failed.push({ ...row, error: 'Missing employee_id or reporting_manager' });
            continue;
        }

        // Prevent employee becoming their own RM
        if (empId === rmEmployeeId) {
            failed.push({ ...row, error: 'Employee cannot be their own RM' });
            continue;
        }

        try {
            // First fetch RM ID
            const [rmRows] = await db.promise().query(
                `SELECT id FROM employees WHERE company_id = ? AND employee_id = ?`,
                [companyId, rmEmployeeId]
            );

            if (rmRows.length === 0) {
                failed.push({ ...row, error: `Reporting Manager ${rmEmployeeId} not found` });
                continue;
            }

            const rmId = rmRows[0].id;

            // Update employee's RM
            const [result] = await db.promise().query(
                `UPDATE employees SET reporting_manager = ? WHERE company_id = ? AND employee_id = ?`,
                [rmId, companyId, empId]
            );

            if (result.affectedRows > 0) {
                successCount++;
            } else {
                failed.push({ ...row, error: 'Employee not found for update' });
            }

        } catch (err) {
            failed.push({ ...row, error: err.sqlMessage || 'DB error' });
        }
    }

    // Clean up uploaded file safely
    fs.unlink(filePath, () => { });

    // If there are failed rows, export them
    if (failed.length > 0) {
        const errorSheet = xlsx.utils.json_to_sheet(failed);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, errorSheet, 'Errors');

        const outputPath = `uploads/emponbord/update_errors_${Date.now()}.xlsx`;
        xlsx.writeFile(wb, outputPath);

        return res.status(200).json({
            status: false,
            message: `${successCount} employees updated, ${failed.length} failed`,
            file: outputPath
        });
    }

    res.json({ status: true, message: `${successCount} employees updated successfully` });
});

router.post('/api/onboarding/updateCTC', upload.single('file'), async (req, res) => {
    const { userData } = req.body;

    // Decode userData
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    if (!decodedUserData?.id || !decodedUserData?.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and company ID are required' });
    }

    const companyId = decodedUserData.company_id;

    if (!req.file) return res.status(400).json({ status: false, message: 'No file uploaded' });

    const filePath = path.resolve(req.file.path);
    let sheetData = [];

    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } catch (err) {
        return res.status(500).json({ status: false, message: 'Error reading Excel file', error: err.message });
    }

    let successCount = 0;
    let failed = [];

    for (let row of sheetData) {
        const empId = row.employee_id;
        const ctc = row.ctc;



        try {
            const [result] = await db.promise().query(
                `UPDATE employees SET ctc = ? WHERE company_id = ? AND employee_id = ?`,
                [ctc, companyId, empId]
            );

            if (result.affectedRows > 0) {
                successCount++;
            } else {
                failed.push({ ...row, error: 'Employee not found for update' });
            }

        } catch (err) {
            failed.push({ ...row, error: err.sqlMessage || 'DB error' });
        }
    }

    // Clean up uploaded file safely
    fs.unlink(filePath, () => { });

    // If there are failed rows, export them
    if (failed.length > 0) {
        const errorSheet = xlsx.utils.json_to_sheet(failed);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, errorSheet, 'Errors');

        const outputPath = `uploads/emponbord/update_errors_${Date.now()}.xlsx`;
        xlsx.writeFile(wb, outputPath);

        return res.status(200).json({
            status: false,
            message: `${successCount} employees updated, ${failed.length} failed`,
            file: outputPath
        });
    }

    res.json({ status: true, message: `${successCount} employees updated successfully` });
});

// Export the router
module.exports = router;
