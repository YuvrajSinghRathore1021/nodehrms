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
            failed.push({ ...row, error: 'Required fields missing' });
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
                [company_id, row.type, row.employee_id, row.first_name, row.last_name, row.official_email_id, row.email_id, row.date_of_Joining, row.last_day, row.contact_number, row.alternate_phone, row.dob, row.gender, row.work_location, row.department, row.sub_department, row.designation, row.employee_status, row.employee_type, row.probation_period, row.probation_status, row.notice_period, row.reporting_manager, row.marital_status, row.ctc, row.aadhaar_card, row.pan_card, row.emergency_contact_name, row.emergency_contact_number, row.current_address, row.permanent_address, row.job_title, row.experience, row.blood_group, row.relation, row.account_holder_name, row.upi, row.bank, row.branch, row.city, row.ifsc, row.account_number]
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


// Export the router
module.exports = router;
