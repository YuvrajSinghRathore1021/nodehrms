const db = require('../DB/ConnectionSql');
const { AdminCheck } = require('../model/functlity/AdminCheck');

exports.getEmployeeProfile = async ({ userData, CheckId }) => {
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
            `SELECT embeddings FROM face_auth 
           WHERE face_authentication =1 and employee_id=? AND company_id = ?`, [employeeId, decodedUserData.company_id]
        );

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
            face_detection: emp.face_detection || 0,
            location_access: emp.location_access || 0,
            profile_image: emp.profile_image || '',
            data: employees,
            isAdmin,
            in_time: inIST,
            out_time: outIST,
            half_day_time,
            working_hours,
            latitude: emp.latitude || '',
            longitude: emp.longitude || '',
            branchSwitch: emp?.branch_switch == 1 ? true : false,
            radius: emp.radius || 0,
            reload: false,
            intervalMs: emp.location_time || 0,
            embeddings: embeddings
        };
    } catch (err) {
        return { status: false, message: err.message };
    }
};
