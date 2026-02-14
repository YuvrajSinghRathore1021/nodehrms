const db = require("../DB/ConnectionSql");
const calculateLeaveDays = require("./calculateLeaveDays");

const updateLeaveBalance = async (leaveId, company_id) => {
    try {
        // 1. Fetch leave details
        const [leaveRows] = await db.promise().query(
            `SELECT leave_id, employee_id, leave_rule_id, start_date, end_date, start_half, end_half 
       FROM leaves WHERE leave_id = ? AND company_id = ?`,
            [leaveId, company_id]
        );

        if (!leaveRows.length) return;
        const leave = leaveRows[0];

        // 2. Calculate leave days
        const leaveDays = calculateLeaveDays(
            leave.start_date,
            leave.end_date,
            leave.start_half,
            leave.end_half
        );

        // 3. Fetch leave balance
        const [balanceRows] = await db.promise().query(
            `SELECT * FROM leave_balance
       WHERE employee_id = ? 
       AND leave_rules_id = ? 
       AND company_id = ?
       AND ? BETWEEN session_start AND session_end`,
            [leave.employee_id, leave.leave_rule_id, company_id, leave.start_date]
        );


        if (!balanceRows.length) return;

        const balance = balanceRows[0];

        const usedLeaves = parseFloat(balance.used_leaves) || 0;
        const totalLeaves = parseFloat(balance.total_leaves) || 0;
        const leaveDaysNum = parseFloat(leaveDays) || 0;

        let used = usedLeaves + leaveDaysNum;
        let remaining = totalLeaves - used;

        if (remaining < 0) remaining = 0;

        // 4. Update balance
        await db.promise().query(
            `UPDATE leave_balance
       SET used_leaves = ?, remaining_leaves = ?, last_updated = NOW()
       WHERE id = ?`,
            [used, remaining, balance.id]
        );

    } catch (err) {
        console.error("Leave balance update error:", err);
    }
};

module.exports = updateLeaveBalance;
