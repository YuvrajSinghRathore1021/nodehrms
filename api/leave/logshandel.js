const express = require("express");
const router = express.Router();
const db = require("../../DB/ConnectionSql");
const { json } = require("body-parser");

////// working code 
// app cheak A / web cheak A
router.post("/FetchLeaveCount", async (req, res) => {
  const { userData, employee_Id = 0 } = req.body;

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
  const employeeId = employee_Id || decodedUserData?.id;

  if (!companyId || !employeeId) {
    return res.status(400).json({
      status: false,
      message: "Company ID and Employee ID are required."
    });
  }

  try {
    // ---- Step 1: Fetch employee joining date
    const [empRows] = await db.promise().query("SELECT date_of_Joining FROM employees WHERE id=? AND company_id=?", [employeeId, companyId]);
    if (!empRows.length) {
      return res.status(404).json({ status: false, message: "Employee not found" });
    }
    const joiningDate = new Date(empRows[0].date_of_Joining);

    // ---- Step 2: Fetch rules + balance
    const [rules] = await db.promise().query(
      `SELECT lr.*, lb.used_leaves, lb.assign_date ,lb.old_balance
       FROM leave_rules lr
       INNER JOIN leave_balance lb ON lr.id = lb.leave_rules_id 
        AND lb.employee_id = ? 
        AND lb.company_id = ? 
         AND CURDATE() BETWEEN lb.session_start AND lb.session_end
       WHERE lr.company_id = ?`,
      [employeeId, companyId, companyId]
    );////AND lb.year = YEAR(CURDATE())
    // ----  Fetch ALL pending leave requests at once
    const [leaveRequests] = await db.promise().query(
      `SELECT leave_rule_id, start_date, end_date, start_half, end_half 
         FROM leaves 
        WHERE employee_id = ? 
          AND company_id = ? 
          AND admin_status = 0 
          AND deletestatus = 0`,
      [employeeId, companyId]
    );
    // Group pending leave days by rule
    const pendingDaysByRule = {};
    for (const lr of leaveRequests) {
      const days = calculateLeaveDays(lr.start_date, lr.end_date, lr.start_half, lr.end_half);
      pendingDaysByRule[lr.leave_rule_id] =
        (pendingDaysByRule[lr.leave_rule_id] || 0) + days;
    }
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-based
    const results = [];

    for (const rule of rules) {
      // --- Eligibility Check ---
      const eligibleDate = new Date(joiningDate);
      eligibleDate.setDate(eligibleDate.getDate() + (rule.eligible_after_days || 0));
      if (today < eligibleDate) {
        results.push({
          employee_id: employeeId,
          employee_id: employeeId,
          leave_rule_id: rule.id,
          leave_number_hide: rule.leave_number_hide,
          leave_type: rule.leave_type,
          used_leaves: "0",
          available_leaves: "0",
          Available: false,
          note: "Not eligible yet"
        });
        continue;
      }

      // --- session handling (apply_leaves_next_year = renewal month) ---
      const sessionStartMonth = rule.apply_leaves_next_year || 1; // default Jan
      let sessionStart = new Date(today.getFullYear(), sessionStartMonth - 1, 1);
      let sessionEnd = new Date(today.getFullYear() + 1, sessionStartMonth - 1, 0);

      // if current month < session start, then session started last year
      if (currentMonth < sessionStartMonth) {
        sessionStart = new Date(today.getFullYear() - 1, sessionStartMonth - 1, 1);
        sessionEnd = new Date(today.getFullYear(), sessionStartMonth - 1, 0);
      }

      // --- effective assign date ---
      const assignDate = rule.assign_date ? new Date(rule.assign_date) : joiningDate;
      const effectiveDate = assignDate > sessionStart ? assignDate : sessionStart;

      // --- accrual calculation ---
      let periodsPerYear = 1;
      switch (rule.accrual_frequency) {
        case "monthly":
          periodsPerYear = 12;
          break;
        case "quarterly":
          periodsPerYear = 4;
          break;
        case "half-yearly":
          periodsPerYear = 2;
          break;
        default:
          periodsPerYear = 1; // yearly
      }
      const leavesPerPeriod = rule.leaves_allowed_year / periodsPerYear;

      // find completed periods between effectiveDate and today
      let creditedPeriods = 0;
      if (rule.accrual_frequency === "monthly") {
        const monthsDiff =
          (today.getFullYear() - effectiveDate.getFullYear()) * 12 +
          (today.getMonth() - effectiveDate.getMonth());
        creditedPeriods = monthsDiff + 1;
      } else if (rule.accrual_frequency === "quarterly") {
        const monthsDiff =
          (today.getFullYear() - effectiveDate.getFullYear()) * 12 +
          (today.getMonth() - effectiveDate.getMonth());
        creditedPeriods = Math.floor(monthsDiff / 3) + 1;
      } else if (rule.accrual_frequency === "half-yearly") {
        const monthsDiff =
          (today.getFullYear() - effectiveDate.getFullYear()) * 12 +
          (today.getMonth() - effectiveDate.getMonth());
        creditedPeriods = Math.floor(monthsDiff / 6) + 1;
      } else {
        creditedPeriods = today >= effectiveDate ? 1 : 0;
      }

      // cap at max periods
      if (creditedPeriods > periodsPerYear) creditedPeriods = periodsPerYear;

      // const totalCredited = Math.round(leavesPerPeriod * creditedPeriods);
      const totalCredited = leavesPerPeriod * creditedPeriods;
      const used = rule.used_leaves || 0;
      let available = totalCredited - used;
      const pending = pendingDaysByRule[rule.id] || 0;
      // let monthly_balance_leave = available + rule.old_balance - pending;

      if (available < 0) available = 0;
      let totalCreditedNew = available;

      if (decodedUserData?.company_id == 10) {
        // employeeId
        const leavecount = await handleleave(employeeId, rule.id);
        // totalCreditedNew = totalCredited + leavecount;
        totalCreditedNew = Number((available + leavecount).toFixed(2));
        available = totalCreditedNew;
      }
      let monthly_balance_leave = (parseFloat(available) + parseFloat(rule.old_balance) - parseFloat(pending)).toFixed(1);

      results.push({
        employee_id: employeeId,
        leave_rule_id: rule.id,
        leave_number_hide: rule.leave_number_hide,
        leave_type: rule.leave_type,
        total_credited: totalCreditedNew,
        used_leaves: used.toString(),
        available_leaves: available.toString(),
        monthly_balance_leave: monthly_balance_leave.toString(),
        Available: available > 0
      });

    }

    res.json({ status: true, records: results });
  } catch (err) {
    console.error("FetchLeaveCount error:", err);
    res.status(500).json({
      status: false,
      message: "Error while fetching leave balances",
      error: err.message
    });
  }
});


const handleleave = async (employeeId, rule_id) => {
  const [rows] = await db.promise().query(
    `SELECT count(id) as total 
        FROM attendance_leave_conversions 
        WHERE employee_id=? and  leave_rule_id=?`,
    [employeeId, rule_id]
  );

  // ✅ If converted to leave
  if (rows.length > 0) {
    return rows[0].total;
  }

  // ❌ No conversion found
  return 0;

};

function calculateLeaveDays(startDate, endDate, startHalf, endHalf) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let totalDays = (end - start) / (1000 * 60 * 60 * 24) + 1;

  if (startHalf == "Second Half") {
    totalDays -= 0.5; // Deduct 0.5 day for second half leave start
  }
  if (endHalf == "First Half") {
    totalDays -= 0.5; // Deduct 0.5 day for first half leave end
  }

  return totalDays;
}




module.exports = router;