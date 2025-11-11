const db = require('../DB/ConnectionSql');
const { AdminCheck } = require('../model/functlity/AdminCheck');

exports.getEmployeeProfile = async ({ userData, CheckId, reload = false }) => {
    try {
        let decodedUserData = null;

        if (!userData) throw new Error("userData is missing");

        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch {
            throw new Error("Invalid userData format");
        }


        if (!decodedUserData?.company_id)
            throw new Error("Company ID is missing or invalid");

        const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
        const employeeId = CheckId || decodedUserData.id;

        const [employees] = await db.promise().query(
            `SELECT 
        e.profile_image, 
        e.location_time, 
        e.type, 
        e.attendance_rules_id,
        e.branch_id,
        e.branch_switch,
        CONCAT_WS(' ', e.first_name, e.last_name) AS full_name,
        CONCAT_WS(' ', e.first_name, e.last_name) AS first_name,
        e.email_id, 
        e.official_email_id,
        e.face_detection,
        e.login_status,
        e.location_access,
        b.latitude,
        b.longitude,
        b.radius,
        e.re_login
      FROM employees e
      LEFT JOIN branches b ON e.branch_id = b.id AND b.company_id = e.company_id
      WHERE e.employee_status = 1 
        AND e.status = 1 
        AND e.delete_status = 0 
        AND e.id = ?`,
            [employeeId]
        );

        if (employees.length === 0) throw new Error("Employee not found");

        const emp = employees[0];
        if (emp.login_status != 1) throw new Error("Invalid token.");
        if (emp?.re_login == 1) {
            return res.status(403).json({ status: false, message: 'Please Re-Login.' });
        }
        // Default times
        let in_time = '09:30';
        let out_time = '18:30';
        let half_day_time = '04:30';
        let working_hours = '09:00';

        const [rules] = await db.promise().query(
            `SELECT in_time, out_time, half_day, max_working_hours FROM attendance_rules 
       WHERE rule_id = ? AND company_id = ?`, [emp.attendance_rules_id, decodedUserData.company_id]
        );

        //     // embeddings
        const [faceAuth] = await db.promise().query(
            `SELECT embeddings,face_authentication FROM face_auth 
           WHERE face_authentication =1 and employee_id=? AND company_id = ?`, [employeeId, decodedUserData.company_id]
        );
        const [permissions] = await db.promise().query(
            `SELECT block_app, location_access,block_delete_button, interval_ms, face_detection, live_face_detection, branch_switch, reload, allow_relogin, block_punch_in_out, block_break_in_out, hide_attendance, hide_leaves, hide_team, hide_register_face, hide_payroll, hide_holiday_calendar, hide_id_card, hide_expenses, hide_employees, hide_chat, hide_permissions, block_get_approve_button, block_approve_button, block_create_leave_button, block_approve_leave, block_reject_leave, block_delete_leave, block_create_holiday, block_create_expense, block_edit_employee, block_edit_profile_button, block_personal_info_edit, block_work_week_edit, block_document_upload, hide_profile_tab, block_work_details_edit, block_department_edit, block_subdepartment_edit, hide_track_employees FROM app_settings WHERE  employee_id=? AND company_id = ?`, [employeeId, decodedUserData.company_id]
        );
        let permissionData = permissions.length > 0 ? permissions[0] : {};
        let embeddings = faceAuth.length > 0 ? faceAuth[0].embeddings : null;


        if (rules.length > 0) {
            const rule = rules[0];
            in_time = rule.in_time || in_time;
            out_time = rule.out_time || out_time;
            half_day_time = rule.half_day || half_day_time;
            working_hours = rule.max_working_hours || working_hours;
        }

        const today = new Date();
        const [inHours, inMinutes] = in_time.split(':').map(Number);
        const [outHours, outMinutes] = out_time.split(':').map(Number);
        const inIST = new Date(today.getFullYear(), today.getMonth(), today.getDate(), inHours, inMinutes);
        const outIST = new Date(today.getFullYear(), today.getMonth(), today.getDate(), outHours, outMinutes);


        return {
            status: true,
            message: "Profile fetched successfully",
            profile_image: emp.profile_image || '',
            data: employees,
            isAdmin,
            in_time: inIST,
            out_time: outIST,
            half_day_time,
            working_hours,
            latitude: emp.latitude || '',
            longitude: emp.longitude || '',

            radius: emp.radius || 0,
            reload: reload,
            intervalMs: emp.location_time || 0,
            embeddings: embeddings,
            isFaceRegistered: faceAuth[0]?.face_authentication == 1 ? true : false,


            face_detection: permissionData?.face_detection || 0,
            location_access: permissionData?.location_access || 0,
            branchSwitch: permissionData?.branch_switch == 1 ? true : false,
            liveFaceDetection: permissionData?.live_face_detection,

            permission: {
                block_app: permissionData?.block_app || 0,
                location_access: permissionData?.location_access || 0,
                interval_ms: permissionData?.interval_ms || 0,
                face_detection: permissionData?.face_detection || 0,
                live_face_detection: permissionData?.live_face_detection || 0,
                branch_switch: permissionData?.branch_switch || 0,
                allow_relogin: permissionData?.allow_relogin || 0,
                block_punch_in_out: permissionData?.block_punch_in_out || 0,
                block_break_in_out: permissionData?.block_break_in_out || 0,
                hide_attendance: permissionData?.hide_attendance || 0,
                hide_leaves: permissionData?.hide_leaves || 0,
                hide_team: permissionData?.hide_team || 0,
                hide_register_face: permissionData?.hide_register_face || 0,
                hide_payroll: permissionData?.hide_payroll || 0,
                hide_holiday_calendar: permissionData?.hide_holiday_calendar || 0,
                hide_id_card: permissionData?.hide_id_card || 0,
                hide_expenses: permissionData?.hide_expenses || 0,
                hide_employees: permissionData?.hide_employees || 0,
                hide_chat: permissionData?.hide_chat || 0,
                hide_permissions: permissionData?.hide_permissions || 0,
                block_get_approve_button: permissionData?.block_get_approve_button || 0,
                block_approve_button: permissionData?.block_approve_button || 0,
                block_create_leave_button: permissionData?.block_create_leave_button || 0,
                block_approve_leave: permissionData?.block_approve_leave || 0,
                block_reject_leave: permissionData?.block_reject_leave || 0,
                block_delete_leave: permissionData?.block_delete_leave || 0,
                block_create_holiday: permissionData?.block_create_holiday || 0,
                block_create_expense: permissionData?.block_create_expense || 0,
                block_edit_employee: permissionData?.block_edit_employee || 0,
                block_edit_profile_button: permissionData?.block_edit_profile_button || 0,
                block_personal_info_edit: permissionData?.block_personal_info_edit || 0,
                block_work_week_edit: permissionData?.block_work_week_edit || 0,
                block_document_upload: permissionData?.block_document_upload || 0,
                hide_profile_tab: permissionData?.hide_profile_tab || 0,
                block_work_details_edit: permissionData?.block_work_details_edit || 0,
                block_department_edit: permissionData?.block_department_edit || 0,
                block_subdepartment_edit: permissionData?.block_subdepartment_edit || 0,
                hide_track_employees: permissionData?.hide_track_employees || 0,
                block_delete_button: permissionData?.block_delete_button || 0,
            }


        };
    } catch (err) {
        return { status: false, message: err.message };
    }
};
