const express = require('express');
const multer = require('multer');
const router = express.Router();
const db = require('../../DB/ConnectionSql');
const path = require('path');
const fs = require('fs');

const { getEmployeeProfile } = require('../../helpers/getEmployeeProfile');

// Rules
// SELECT `id`, `employee_id`, `company_id`, `face_authentication`, `face_url`, `embeddings`,
//  `created_at` FROM `face_auth` WHERE 1


// Set up multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../uploads/face');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}${ext}`);
    }
});

const upload = multer({ storage: storage });



router.post('/faceRegister', async (req, res) => {

    const { userData, embeddings, employeeId, face } = req.body;
    let decodedUserData = null;

    // Decode userData safely
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    const company_id = decodedUserData?.company_id;
    const id = employeeId || decodedUserData?.id;
    let userId = id;
    if (!company_id || !id) {
        return res.status(400).json({ status: false, message: 'Invalid input data' });
    }
    let faceUrl = face || '';

    const result = await getEmployeeProfile(req.body, id);

    try {
        const [rows] = await db.promise().query(
            `SELECT id FROM face_auth WHERE employee_id = ? AND company_id = ?`,
            [id, company_id]
        );

        if (rows.length > 0) {
            // Update existing record
            await db.promise().query(
                `UPDATE face_auth 
                 SET face_url = ?, embeddings = ?, face_authentication = 1 
                 WHERE employee_id = ? AND company_id = ?`,
                [faceUrl, embeddings, id, company_id]
            );
            req.io.to(userId.toString()).emit("profileUpdate", result);

            return res.status(200).json({ status: true, message: 'Face data updated successfully!' });
        } else {
            // Insert new record
            await db.promise().query(
                `INSERT INTO face_auth (employee_id, company_id, face_url, embeddings, face_authentication) 
                 VALUES (?, ?, ?, ?, ?)`,
                [id, company_id, faceUrl, embeddings, 1]
            );

            req.io.to(userId.toString()).emit("profileUpdate", result);

            return res.status(200).json({ status: true, message: 'Face data registered successfully!' });
        }
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({ status: false, message: 'Database error', error: err.message });
    }
});





router.post('/faceDelete', async (req, res) => {
    const { userData, employeeId } = req.body;

    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            // decodedUserData=userData;
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    const company_id = decodedUserData.company_id;
    const id = employeeId || decodedUserData.id;
    // Server-side validation
    if (!company_id) {
        return res.status(400).json({ status: false, message: 'Invalid input data' });
    }


    const query = `SELECT id FROM face_auth WHERE employee_id = ? AND company_id = ?`;

    const values = [id, company_id];

    try {
        const [rows] = await db.promise().query(query, values);
        if (rows.length > 0) {
            // Delete existing record
            const deleteQuery = `DELETE FROM face_auth WHERE employee_id = ? AND company_id = ? and face_authentication=1`;
            const deleteValues = [id, company_id];
            await db.promise().query(deleteQuery, deleteValues);
            return res.status(200).json({ status: true, message: 'Face data deleted successfully!' });
        } else {
            return res.status(404).json({ status: false, message: 'No face data found to delete!' });
        }


    } catch (err) {
        return { status: false, message: err.message };
    }


});


///refaceUplode

///get face details 
router.post('/faceDetails', async (req, res) => {
    const { userData } = req.body;

    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            // decodedUserData=userData;
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    const company_id = decodedUserData.company_id;
    // Server-side validation
    if (!company_id) {
        return res.status(400).json({ status: false, message: 'Invalid input data' });
    }


    const query = `SELECT concat(e.first_name,' ',e.last_name) as name,e.id,e.employee_id, fa.face_authentication, fa.face_url, fa.embeddings FROM face_auth fa
INNER JOIN employees e on e.id=fa.employee_id WHERE fa.company_id = ? and fa.face_authentication=1`;

    const values = [company_id];

    try {
        const [rows] = await db.promise().query(query, values);
        if (rows.length > 0) {
            return res.status(200).json({ status: true, data: rows });
        } else {
            return res.status(404).json({ status: false, message: 'No face data found!' });
        }
    } catch (err) {
        return { status: false, message: err.message };
    }


});




/////// permission

// update permission

router.post('/permissionUpdate', async (req, res) => {
    const { userData, employee_id, block_app = 0, block_delete_button = 0, location_access = 0, interval_ms = 0, face_detection = 0, live_face_detection = 0, branch_switch = 0, reload = 0, allow_relogin = 0, block_punch_in_out = 0, block_break_in_out = 0, hide_attendance = 0, hide_leaves = 0, hide_team = 0, hide_register_face = 0, hide_payroll = 0, hide_holiday_calendar = 0, hide_id_card = 0, hide_expenses = 0, hide_employees = 0, hide_chat = 0, hide_permissions = 0, block_get_approve_button = 0, block_approve_button = 0, block_create_leave_button = 0, block_approve_leave = 0, block_reject_leave = 0, block_delete_leave = 0, block_create_holiday = 0, block_create_expense = 0, block_edit_employee = 0, block_edit_profile_button = 0, block_personal_info_edit = 0, block_work_week_edit = 0, block_document_upload = 0, hide_profile_tab = 0, block_work_details_edit = 0, block_department_edit = 0, block_subdepartment_edit = 0, hide_track_employees = 0 } = req.body;

    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            // decodedUserData=userData;
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    const company_id = decodedUserData?.company_id;
    // Server-side validation
    if (!company_id) {
        return res.status(400).json({ status: false, message: 'Invalid input data' });
    }


    const query = `SELECT id From app_settings Where company_id=? and employee_id=?`;

    const values = [company_id, employee_id];

    let type = "";
    try {
        let newQuery = "";
        let arrayPrems = "";
        const [rows] = await db.promise().query(query, values);
        if (rows.length > 0) {
            type = "update";
        } else {
            type = "insert";
        }

        if (type == "update") {
            newQuery = `UPDATE app_settings 
                 SET block_delete_button=?,block_app=?, location_access=?, interval_ms=?, face_detection=?, live_face_detection=?, branch_switch=?, reload=?, allow_relogin=?, block_punch_in_out=?, block_break_in_out=?, hide_attendance=?, hide_leaves=?, hide_team=?, hide_register_face=?, hide_payroll=?, hide_holiday_calendar=?, hide_id_card=?, hide_expenses=?, hide_employees=?, hide_chat=?, hide_permissions=?, block_get_approve_button=?, block_approve_button=?, block_create_leave_button=?, block_approve_leave=?, block_reject_leave=?, block_delete_leave=?, block_create_holiday=?, block_create_expense=?, block_edit_employee=?, block_edit_profile_button=?, block_personal_info_edit=?, block_work_week_edit=?, block_document_upload=?, hide_profile_tab=?, block_work_details_edit=?, block_department_edit=?, block_subdepartment_edit=?, hide_track_employees=? 
                 where company_id=? and employee_id=?
`
            arrayPrems = [block_delete_button, block_app, location_access, interval_ms, face_detection, live_face_detection, branch_switch, reload, allow_relogin, block_punch_in_out, block_break_in_out, hide_attendance, hide_leaves, hide_team, hide_register_face, hide_payroll, hide_holiday_calendar, hide_id_card, hide_expenses, hide_employees, hide_chat, hide_permissions, block_get_approve_button, block_approve_button, block_create_leave_button, block_approve_leave, block_reject_leave, block_delete_leave, block_create_holiday, block_create_expense, block_edit_employee, block_edit_profile_button, block_personal_info_edit, block_work_week_edit, block_document_upload, hide_profile_tab, block_work_details_edit, block_department_edit, block_subdepartment_edit, hide_track_employees, company_id, employee_id]

        } else if (type == "insert") {
            newQuery = `INSERT INTO app_settings (block_delete_button,employee_id, company_id, block_app, location_access, interval_ms, face_detection, live_face_detection, branch_switch, reload, allow_relogin, block_punch_in_out, block_break_in_out, hide_attendance, hide_leaves, hide_team, hide_register_face, hide_payroll, hide_holiday_calendar, hide_id_card, hide_expenses, hide_employees, hide_chat, hide_permissions, block_get_approve_button, block_approve_button, block_create_leave_button, block_approve_leave, block_reject_leave, block_delete_leave, block_create_holiday, block_create_expense, block_edit_employee, block_edit_profile_button, block_personal_info_edit, block_work_week_edit, block_document_upload, hide_profile_tab, block_work_details_edit, block_department_edit, block_subdepartment_edit, hide_track_employees) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
            arrayPrems = [block_delete_button, employee_id, company_id, block_app, location_access, interval_ms, face_detection, live_face_detection, branch_switch, reload, allow_relogin, block_punch_in_out, block_break_in_out, hide_attendance, hide_leaves, hide_team, hide_register_face, hide_payroll, hide_holiday_calendar, hide_id_card, hide_expenses, hide_employees, hide_chat, hide_permissions, block_get_approve_button, block_approve_button, block_create_leave_button, block_approve_leave, block_reject_leave, block_delete_leave, block_create_holiday, block_create_expense, block_edit_employee, block_edit_profile_button, block_personal_info_edit, block_work_week_edit, block_document_upload, hide_profile_tab, block_work_details_edit, block_department_edit, block_subdepartment_edit, hide_track_employees]
        }


        const [updatedata] = await db.promise().query(newQuery, arrayPrems)


        const resultEmp = await getEmployeeProfile(req.body, employee_id, reload);
        let userId = employee_id;
        // check on live ---not work
        // req.io.to(userId.toString()).emit("profileResponse", resultEmp);
        

        if (type == "update") {
            if (updatedata.affectedRows > 0) {
                return res.json({
                    status: true,
                    message: "Record updated successfully",
                    result: updatedata
                });
            } else {
                return res.json({
                    status: false,
                    message: "No record updated"
                });
            }
        } else {
            if (updatedata?.insertId > 0) {
                return res.json({
                    status: true,
                    message: "Record inserted successfully",
                    insertId: updatedata.insertId
                });
            } else {
                return res.json({
                    status: false,
                    message: "Failed to insert record"
                });
            }
        }

    } catch (err) {

    return res.status(500).json({
        status: false,
        message: err.message
    });
    }


});


router.post('/permissionDetails', async (req, res) => {
    const { userData, employee_id, } = req.body;

    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            // decodedUserData=userData;
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    const company_id = decodedUserData.company_id;

    // Server-side validation
    if (!company_id) {
        return res.status(400).json({ status: false, message: 'Invalid input data' });
    }


    const query = `SELECT * FROM app_settings WHERE company_id = ? and employee_id=?`;

    const values = [company_id, employee_id];

    try {
        const [rows] = await db.promise().query(query, values);
        if (rows.length > 0) {
            return res.status(200).json({ status: true, data: rows, message: 'data found!' });

        } else {
            let datakey = [{
                company_id: 0,
                block_app: 0,
                location_access: 0,
                interval_ms: 0,
                face_detection: 0,
                live_face_detection: 0,
                branch_switch: 0,
                allow_relogin: 0,
                block_punch_in_out: 0,
                block_break_in_out: 0,
                hide_attendance: 0,
                hide_leaves: 0,
                hide_team: 0,
                hide_register_face: 0,
                hide_payroll: 0,
                hide_holiday_calendar: 0,
                hide_id_card: 0,
                hide_expenses: 0,
                hide_employees: 0,
                hide_chat: 0,
                hide_permissions: 0,
                block_get_approve_button: 0,
                block_approve_button: 0,
                block_create_leave_button: 0,
                block_approve_leave: 0,
                block_reject_leave: 0,
                block_delete_leave: 0,
                block_create_holiday: 0,
                block_create_expense: 0,
                block_edit_employee: 0,
                block_edit_profile_button: 0,
                block_personal_info_edit: 0,
                block_work_week_edit: 0,
                block_document_upload: 0,
                hide_profile_tab: 0,
                block_work_details_edit: 0,
                block_department_edit: 0,
                block_subdepartment_edit: 0,
                hide_track_employees: 0,
                block_delete_button: 0

            }]
            return res.status(200).json({ status: true, data: datakey, message: 'key found' });
        }
    } catch (err) {
        return { status: false, message: err.message };
    }
});

// Export the router
module.exports = router;
