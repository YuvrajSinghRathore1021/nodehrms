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
        // console.log(row.date_of_Joining, row.dob, row.last_day)
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
        // console.log(keys)

        const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
        const query = `UPDATE employees SET ${setClause} WHERE employee_id = ? AND company_id = ?`;
        // console.log(setClause)
        // console.log(values)

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
router.post('/api/onboarding/update-contactNumber', upload.single('file'), async (req, res) => {
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

        const keys = ['contact_number', 'emergency_contact_number'];
        const values = [row.contact_number, row.emergency_contact_name];

        const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
        const query = `UPDATE employees SET ${setClause} WHERE employee_id = ? AND company_id = ?`;

        try {
            const [result] = await db.promise().query(query, [...values, empId, 10]);
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



        // console.log(query)
        // console.log(values)
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



router.get('/api/salaryExcel', async (req, res) => {
    try {
        // Fetch salary details for company
        const [data] = await db.promise().query(`
            SELECT esd.month, esd.year, esd.employee_name, esd.present_days, esd.absentee_days, esd.ctc_yearly,
                  sc.amount as monthly_salary, esd.total_monthly_salary, esd.status
            FROM employeesalarydetails as esd
            LEFT JOIN salarycomponents AS sc
            ON esd.id = sc.salary_detail_id
            WHERE esd.company_id = 10 AND esd.month = 9 AND esd.year = 2025 and sc.component_name ="NET SALARY"
        `);

        // If no data esd.found, create blank structure
        let exportData = [];
        if (data.length === 0) {
            exportData = [
                {
                    month: "", year: "", employee_name: "", present_days: "", absentee_days: "",
                    ctc_yearly: "", monthly_salary: "",
                    total_monthly_salary: "", status: "", hold: "", addvance: "", deduction: ""
                }
            ];
        } else {
            exportData = data.map(row => ({
                ...row,
                hold: "",
                addvance: "",
                deduction: ""
            }));
        }

        // Create Excel file
        const ws = xlsx.utils.json_to_sheet(exportData);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'SalaryTemplate');

        const filePath = path.join(__dirname, '../../uploads/salary.xlsx');
        xlsx.writeFile(wb, filePath);

        res.download(filePath, 'Employee_Salary.xlsx', (err) => {
            if (err) console.error('Download error:', err);
            // Optionally delete file after download
            // fs.unlinkSync(filePath);
        });

    } catch (error) {
        console.error('Error generating salary Excel:', error);
        res.status(500).json({ status: false, error: 'Server error while generating Excel' });
    }
});





// leave 
router.post("/upload-leave-balance", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.json({ status: false, message: "No file uploaded" });
        }

        // Read Excel
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        /*
          Excel Format Expected:
          | EMP ID | 23 | 15 |
          index:    0     1    2
        */

        let updated = 0;

        for (let i = 1; i < data.length; i++) {
            const row = data[i];

            const emp_id = row[0];
            const leave_rule_id = row[1];
            const new_balance = row[2];

            if (!emp_id || !leave_rule_id) continue;

            // 🔍 Find employee
            const [emp] = await db.promise().query(
                "SELECT id FROM employees WHERE employee_id = ? and company_id=10",
                [emp_id]
            );
            console.log(emp)
            const Id = emp[0].id
            if (emp.length === 0) continue;

            //     // 🔄 Update leave balance
            //     const [result] = await db.promise().query(
            //         `UPDATE leave_balance 
            //  SET old_balance = ? 
            //  WHERE employee_id = ? AND leave_rules_id = ?`,
            //         [new_balance, Id, leave_rule_id]
            //     );
            console.log(new_balance, Id, leave_rule_id)

            // if (result.affectedRows > 0) {
            //     updated++;
            // }
        }

        res.json({
            status: true,
            message: "Leave balance updated",
            updated_rows: updated
        });

    } catch (error) {
        console.error(error);
        res.json({ status: false, message: "Error", error: error.message });
    }
});

router.post("/upload-leave-balance-json", async (req, res) => {
    try {


        let data =

            [
                { "emp_id": "1HG03022", "value1": 0, "value2": 3.5 },
                { "emp_id": "2HG20024", "value1": 0, "value2": 2 },
                { "emp_id": "3HG17024", "value1": 0, "value2": 2.5 },
                { "emp_id": "4HG08024", "value1": 0, "value2": 0 },
                { "emp_id": "6HG05021", "value1": 0, "value2": 8 },
                { "emp_id": "7HG08019", "value1": 0, "value2": -3.5 },
                { "emp_id": "8HG30024", "value1": 0, "value2": 24 },
                { "emp_id": "9HG07024", "value1": 0, "value2": 0 },
                { "emp_id": "10HG27025", "value1": 0, "value2": -4 },
                { "emp_id": "11HG07025", "value1": 0, "value2": 22 },
                { "emp_id": "12HG08025", "value1": 0, "value2": 23 },
                { "emp_id": "13HG29025", "value1": 0, "value2": 15 },
                { "emp_id": "15HG43025", "value1": 0, "value2": -5 },
                { "emp_id": "16HG44025", "value1": 3, "value2": 8.5 },
                { "emp_id": "17HG44025", "value1": 2, "value2": 3 },
                { "emp_id": "51HG15023", "value1": 0, "value2": -6.5 },
                { "emp_id": "54HG23024", "value1": 7, "value2": 15.5 },
                { "emp_id": "55HG03019", "value1": 0, "value2": 0.5 },
                { "emp_id": "57HG22025", "value1": 0, "value2": -20 },
                { "emp_id": "58HG23025", "value1": 10, "value2": 46.5 },
                { "emp_id": "60HG16024", "value1": 0, "value2": 0.5 },
                { "emp_id": "67HG33025", "value1": 2, "value2": -12 },
                { "emp_id": "53HG19024", "value1": 0, "value2": 13.5 },
                { "emp_id": "131HG42025", "value1": 8, "value2": 1 },
                { "emp_id": "123HG33024", "value1": 0, "value2": -19.5 },
                { "emp_id": "18HG20026", "value1": 1, "value2": 1.5 },
                { "emp_id": "68HG09023", "value1": 4, "value2": -16.5 },
                { "emp_id": "70HG04022", "value1": 9, "value2": 30.5 },
                { "emp_id": "75HG01023", "value1": 1, "value2": 10.5 },
                { "emp_id": "139HG04026", "value1": 6, "value2": 4.5 },
                { "emp_id": "78HG14025", "value1": 3, "value2": -12 },
                { "emp_id": "79HG15025", "value1": 6, "value2": -9 },
                { "emp_id": "102HG02025", "value1": 1, "value2": 25.5 },
                { "emp_id": "148HG13026", "value1": 4, "value2": 3 },
                { "emp_id": "81HG12024", "value1": 12, "value2": -1.5 },
                { "emp_id": "114HG31024", "value1": 10, "value2": -10.5 },
                { "emp_id": "87HG03023", "value1": 8, "value2": 3 },
                { "emp_id": "85HG37024", "value1": 0, "value2": -19.5 },
                { "emp_id": "89HG01022", "value1": 2, "value2": 37.5 },
                { "emp_id": "99HG09024", "value1": 1, "value2": -19.5 },
                { "emp_id": "124HG35025", "value1": 13, "value2": -4.5 },
                { "emp_id": "90HG22024", "value1": 1, "value2": 9.5 },
                { "emp_id": "92HG13023", "value1": 2, "value2": 14 },
                { "emp_id": "93HG07024", "value1": 0, "value2": 23.5 },
                { "emp_id": "133HG44025", "value1": 7, "value2": 6 },
                { "emp_id": "112HG06023", "value1": 0, "value2": 13.5 },
                { "emp_id": "63HG13024", "value1": 0, "value2": 14.5 },
                { "emp_id": "109HG28025", "value1": 0, "value2": 14 },
                { "emp_id": "120HG28024", "value1": 11, "value2": 2.5 },
                { "emp_id": "101HG07023", "value1": 0, "value2": -17 },
                { "emp_id": "117HG04019", "value1": 2, "value2": -11.5 },
                { "emp_id": "82HG36024", "value1": 2, "value2": -18.5 },
                { "emp_id": "126HG37025", "value1": 3, "value2": 7.5 },
                { "emp_id": "111HG08024", "value1": 13, "value2": 3.5 },
                { "emp_id": "71HG24024", "value1": 7, "value2": 21.5 },
                { "emp_id": "56HG18025", "value1": 4, "value2": 29 },
                { "emp_id": "95HG32024", "value1": 11, "value2": -5.5 },
                { "emp_id": "88HG34024", "value1": 0, "value2": -5.5 },
                { "emp_id": "59HG14023", "value1": 0, "value2": 40.5 },
                { "emp_id": "52HG10023", "value1": 3, "value2": 16.5 },
                { "emp_id": "107HG01021", "value1": 12, "value2": 7 },
                { "emp_id": "121HG05023", "value1": 13, "value2": 30.5 },
                { "emp_id": "142HG07026", "value1": 1, "value2": 7.5 },
                { "emp_id": "62HG05025", "value1": 4, "value2": -15.5 },
                { "emp_id": "91HG05019", "value1": 4, "value2": -5.5 },
                { "emp_id": "122HG05024", "value1": 0, "value2": -20 },
                { "emp_id": "61HG01024", "value1": 1, "value2": 1.5 },
                { "emp_id": "76HG04025", "value1": 1, "value2": -1.5 },
                { "emp_id": "86HG38024", "value1": 6, "value2": -15.5 },
                { "emp_id": "100HG06025", "value1": 3, "value2": 14 },
                { "emp_id": "84HG15023", "value1": 3, "value2": -5 },
                { "emp_id": "118HG20025", "value1": 9, "value2": 2 },
                { "emp_id": "137HG02026", "value1": 5, "value2": 4.5 },
                { "emp_id": "136HG01026", "value1": 5, "value2": 4.5 },
                { "emp_id": "138HG03026", "value1": 5, "value2": 4.5 },
                { "emp_id": "145HG10026", "value1": 4, "value2": 4.5 },
                { "emp_id": "156HG21026", "value1": 0, "value2": 0 },
                { "emp_id": "140HG05026", "value1": 5, "value2": 4.5 },
                { "emp_id": "141HG06026", "value1": 5, "value2": 4.5 },
                { "emp_id": "143HG08026", "value1": 0, "value2": 4.5 },
                { "emp_id": "144HG09026", "value1": 1, "value2": 4.5 },
                { "emp_id": "146HG11026", "value1": 5, "value2": 3 },
                { "emp_id": "119HG16025", "value1": 10, "value2": 15 },
                { "emp_id": "96HG14024", "value1": 5, "value2": 10.5 },
                { "emp_id": "66HG06022", "value1": 0, "value2": -10.5 },
                { "emp_id": "151HG16026", "value1": 3, "value2": 3 },
                { "emp_id": "130HG41025", "value1": 0, "value2": -4 },
                { "emp_id": "113HG06024", "value1": 0, "value2": -19.5 },
                { "emp_id": "153HG18026", "value1": 2, "value2": 1.5 },
                { "emp_id": "156HG22026", "value1": 0, "value2": 0 },
                { "emp_id": "97HG01019", "value1": 4, "value2": -11.5 },
                { "emp_id": "147HG12026", "value1": 0, "value2": -8 },
                { "emp_id": "149HG14026", "value1": 4, "value2": 3 },
                { "emp_id": "103HG61019", "value1": 2, "value2": 27.5 },
                { "emp_id": "115HG12023", "value1": 0, "value2": 0.5 },
                { "emp_id": "64HG02019", "value1": 0, "value2": -2.5 },
                { "emp_id": "98HG15024", "value1": 0, "value2": 8.5 },
                { "emp_id": "152HG17026", "value1": 1, "value2": 3 },
                { "emp_id": "150HG15026", "value1": 2, "value2": 3 }
            ]


        let updated = 0;

        for (let i = 1; i < data.length; i++) {
            const row = data[i];

            const emp_id = row?.emp_id;
            const cl = row?.value1;
            const pl = row?.value2;

            if (!emp_id) continue;

            // 🔍 Find employee
            const [emp] = await db.promise().query(
                "SELECT id FROM employees WHERE employee_id = ? and company_id=10",
                [emp_id]
            );
            console.log(emp)
            const Id = emp[0]?.id
            if (emp.length == 1) {



                //  // 🔄 Update leave balance

                // cl 
                const [result1] = await db.promise().query(
                    `UPDATE leave_balance 
                 SET old_balance = ? 
                 WHERE employee_id = ? AND leave_rules_id = ? and session_start >"2026-03-31 00:00:00.000"`,
                    [cl, Id, 23]
                );
                console.log(cl, Id, 23);

                // //// pl 
                const [result2] = await db.promise().query(
                    `UPDATE leave_balance 
                 SET old_balance = ? 
                 WHERE employee_id = ? AND leave_rules_id = ? and session_start >"2026-03-31 00:00:00.000"`,
                    [pl, Id, 15]
                );
                const [result3] = await db.promise().query(
                    `UPDATE leave_balance 
                 SET old_balance = ? 
                 WHERE employee_id = ? AND leave_rules_id = ? and session_start >"2026-03-31 00:00:00.000"`,
                    [pl, Id, 21]
                );
                console.log(pl, Id, 15);



                // if (result.affectedRows > 0) {
                //     updated++;
                // }
            } else {
                console.log("id not exit := ", emp_id)
            }
        }

        res.json({
            status: true,
            message: "Leave balance updated",
            updated_rows: updated
        });

    } catch (error) {
        console.error(error);
        res.json({ status: false, message: "Error", error: error.message });
    }
});
// Export the router
module.exports = router;
