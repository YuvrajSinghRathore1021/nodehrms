const db = require('../../DB/ConnectionSql');

exports.Shortleave = async ({
    employee_id,
    company_id,
    attendance_date,
    duration,
    statusValue,
    attendanceStatus,
    attendance_id,
    formattedTime,      // actual OUT time (HH:mm)
    checkInTime,        // actual IN time (HH:mm:ss)
    checkOutTime,       // actual OUT time (HH:mm:ss)
    empInTime,          // scheduled IN time (from rule)
    empOutTime          // scheduled OUT time (from rule)
}) => {
    try {
        // 1️⃣ Fetch company short leave policy
        const [policyRows] = await db.promise().query(
            `SELECT id, company_id, short_leave_limit_in, short_leave_duration_in, short_leave_limit_out, 
            short_leave_duration_out ,total_leave_status ,short_leave_total 
            FROM attendance_policy WHERE company_id = ? and employee_ids in (?) 
             LIMIT 1`,
            [company_id, employee_id]
        );

        if (!policyRows.length) {
            return { status: false, message: "No attendance policy found for this company" };
        }

        const policy = policyRows[0];
        const { short_leave_limit_in = 0, short_leave_duration_in = 0, short_leave_limit_out = 0, short_leave_duration_out = 0, total_leave_status = 0, short_leave_total = 0 } = policy;


        // 2️⃣ Count how many short leaves are already used this month
        const [used] = await db.promise().query(
            `SELECT COUNT(attendance_id) as total FROM attendance WHERE employee_id = ? AND company_id = ? 
             AND MONTH(attendance_date)=MONTH(?) AND YEAR(attendance_date)=YEAR(?) AND short_leave = 1`,
            [employee_id, company_id, attendance_date, attendance_date]
        );

        const totalUsed = used[0]?.total || 0;
        const maxShortLeave = short_leave_limit_in + short_leave_limit_out + short_leave_total;


        if (totalUsed >= maxShortLeave && maxShortLeave > 0) {
            return { status: false, message: "Short leave limit exceeded for this month" };
        }


        // Helper: convert HH:mm or HH:mm:ss to total minutes
        const toMinutes = (t) => {
            if (!t) return 0;
            const [h, m, s] = t.split(':').map(Number);
            return h * 60 + (m || 0);
        };
        // Convert all times to minutes for easy comparison
        const actualIn = toMinutes(checkInTime);
        const actualOut = toMinutes(checkOutTime);
        const scheduledIn = toMinutes(empInTime);
        const scheduledOut = toMinutes(empOutTime);


        let leaveType = "";
        let shortLeaveType = 0; // 1 = IN, 2 = OUT
        let isEligible = false;


        // 3️⃣ Check for Short Leave (IN) - Late Coming
        if (scheduledIn && actualIn > scheduledIn) {

            const diffIn = actualIn - scheduledIn; // how many minutes late
            // if (diffIn <= short_leave_duration_in) {
            if (diffIn >= short_leave_duration_in - 30 && diffIn <= short_leave_duration_in + 5) {
                // Check IN short leave limit
                const [usedIn] = await db.promise().query(
                    `SELECT COUNT(attendance_id) as total 
                     FROM attendance 
                     WHERE employee_id = ? AND company_id = ? 
                     AND MONTH(attendance_date)=MONTH(?) 
                     AND YEAR(attendance_date)=YEAR(?) 
                     AND short_leave=1 AND short_leave_type=1`,
                    [employee_id, company_id, attendance_date, attendance_date]
                );
                const usedInCount = usedIn[0]?.total || 0;
                if (usedInCount < short_leave_limit_in) {
                    leaveType = `Short Leave (IN) - Late by ${diffIn} mins`;
                    shortLeaveType = 1;
                    isEligible = true;
                } else if (total_leave_status == 1 && totalUsed >= short_leave_total) {
                    leaveType = `Short Leave (IN) - Late by ${diffIn} mins`;
                    shortLeaveType = 1;
                    isEligible = true;
                }
            }
        }

        // 4️⃣ Check for Short Leave (OUT) - Early Leaving
        else if (!isEligible && scheduledOut && actualOut < scheduledOut) {
            const diffOut = scheduledOut - actualOut; // how many minutes early
            // if (diffOut <= short_leave_duration_out) {
            if (diffOut >= short_leave_duration_out - 30 && diffOut <= short_leave_duration_out + 5) {
                const [usedOut] = await db.promise().query(
                    `SELECT COUNT(attendance_id) as total 
                     FROM attendance 
                     WHERE employee_id = ? AND company_id = ? 
                     AND MONTH(attendance_date)=MONTH(?) 
                     AND YEAR(attendance_date)=YEAR(?) 
                     AND short_leave=1 AND short_leave_type=2`,
                    [employee_id, company_id, attendance_date, attendance_date]
                );
                const usedOutCount = usedOut[0]?.total || 0;
                if (usedOutCount < short_leave_limit_out) {
                    leaveType = `Short Leave (OUT) - Left early by ${diffOut} mins`;
                    shortLeaveType = 2;
                    isEligible = true;
                } else if (total_leave_status == 1 && totalUsed >= short_leave_total) {
                    leaveType = `Short Leave (OUT) - Left early by ${diffOut} mins`;
                    shortLeaveType = 2;
                    isEligible = true;
                }
            }
        }

        // 5️⃣ Apply Short Leave if eligible
        if (isEligible) {
            await db.promise().query(
                `UPDATE attendance 
                 SET short_leave = 1, short_leave_type = ?, short_leave_reason = ?, status = 'Present', attendance_status = 1
                 WHERE attendance_id = ?`,
                [shortLeaveType, leaveType, attendance_id]
            );
            return {
                status: true,
                message: `${leaveType} applied successfully.`,
                leaveType,
                shortLeaveType,
                attendanceStatusNew: 1,
                attendanceStatusNewValue: 'Present'
            };
        }
        return { status: false, message: "Not eligible for short leave" };
    } catch (err) {
        console.error("Short Leave Error:", err);
        return { status: false, message: err.message };
    }
};
