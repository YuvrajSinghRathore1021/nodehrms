const express = require("express");
const router = express.Router();
const db = require("../../DB/ConnectionSql");
const { json } = require("body-parser");


router.post("/FetchLeaveCount", async (req, res) => {
    const { leave_type, userData, start_date, end_date, reason, start_half, end_half } = req.body;

    if (!userData) {
        return res.status(400).json({ status: false, message: "UserData is required." });
    }

    let decodedUserData;
    try {
        const decodedString = Buffer.from(userData, "base64").toString("utf-8");
        decodedUserData = JSON.parse(decodedString);
    } catch (error) {
        return res.status(400).json({ status: false, message: "Invalid UserData format." });
    }

    const companyId = decodedUserData?.company_id;
    const employeeId = decodedUserData?.id;

    const EmployeeData = await queryDb('SELECT id, leave_rule_id, first_name, last_name, date_of_Joining, contact_number, probation_period, probation_status,notice_period FROM employees WHERE id=?)', [employeeId]);
    if (EmployeeData.length === 0) {
        return res.status(400).json({ status: false, message: 'Employee Not found' });
    }

    const [LeaveRuleDataGet] = await db.promise().query("SELECT id, company_id, leave_type, description, leaves_allowed_year, weekends_leave, holidays_leave, creditable, accrual_frequency, accrual_period, under_probation, notice_period, encash_enabled, carry_forward, remaining_leaves, max_leaves_month, continuous_leaves, negative_leaves, future_dated_leaves, future_dated_leaves_after, backdated_leaves, backdated_leaves_up_to, apply_leaves_next_year FROM leave_rules WHERE id = ?", [leave_type]);
    // Check if leave type exists
    if (!LeaveRuleDataGet || LeaveRuleDataGet.length === 0) {
        return res.status(400).json({
            status: false,
            message: "Invalid leave type."
        });
    }

    if (LeaveRuleDataGet[0].under_probation == 0 && EmployeeData[0].probation_status == 1) {
        return res.status(400).json({
            status: false,
            message: "You are under probation period."
        });
    }
    if (LeaveRuleDataGet[0].notice_period == 0 && EmployeeData[0].notice_period == 1) {
        return res.status(400).json({
            status: false,
            message: "You are under notice period."
        });
    }

    const LeaveTableData = await db.promise().query("SELECT  leave_id, employee_id, company_id, leave_rule_id, leave_type, start_date, end_date, status, rm_id, rm_remark, rm_status, admin_id, admin_remark, admin_status, reason, action_by, deletestatus, created, updated, start_half, end_half FROM leaves WHERE employee_id = ? AND leave_type = ? AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?))", [employeeId, leave_type, start_date, end_date, start_date, end_date]);
    if (LeaveTableData[0].length > 0) {
        return res.status(400).json({
            status: false,
            message: "Leave already applied for this date."
        });
    }





});
















module.exports = router;