const express = require("express");
const router = express.Router();
const db = require("../../DB/ConnectionSql");
const calculateLeaveDays = require("../../utils/calculateLeaveDays");
const leaveconversion = require("../../utils/leave/leaveconversion");


////// working code 

// // // // app cheak A / web cheak A -- proepr working not remove code 
// router.post("/FetchLeaveCount", async (req, res) => {
//   const { userData, employee_Id = 0 } = req.body;

//   if (!userData) {
//     return res.status(400).json({ status: false, message: "UserData is required." });
//   }

//   let decodedUserData;
//   try {
//     const decodedString = Buffer.from(userData, "base64").toString("utf-8");
//     decodedUserData = JSON.parse(decodedString);
//   } catch (error) {
//     return res.status(400).json({ status: false, message: "Invalid UserData format." });
//   }

//   const companyId = decodedUserData?.company_id;
//   const employeeId = employee_Id || decodedUserData?.id;

//   if (!companyId || !employeeId) {
//     return res.status(400).json({
//       status: false,
//       message: "Company ID and Employee ID are required."
//     });
//   }

//   try {
//     // ---- Step 1: Fetch employee joining date
//     const [empRows] = await db.promise().query("SELECT date_of_Joining FROM employees WHERE id=? AND company_id=?", [employeeId, companyId]);
//     if (!empRows.length) {
//       return res.status(404).json({ status: false, message: "Employee not found" });
//     }
//     const joiningDate = new Date(empRows[0].date_of_Joining);

//     // ---- Step 2: Fetch rules + balance
//     const [rules] = await db.promise().query(
//       `SELECT lr.*, lb.used_leaves, lb.assign_date ,lb.old_balance
//        FROM leave_rules lr
//        INNER JOIN leave_balance lb ON lr.id = lb.leave_rules_id 
//         AND lb.employee_id = ? 
//         AND lb.company_id = ? 
//          AND CURDATE() BETWEEN lb.session_start AND lb.session_end
//        WHERE lr.company_id = ?`,
//       [employeeId, companyId, companyId]
//     );



//     // ----  Fetch ALL pending leave requests at once
//     const [leaveRequests] = await db.promise().query(
//       `SELECT leave_rule_id, start_date, end_date, start_half, end_half 
//          FROM leaves 
//         WHERE employee_id = ? 
//           AND company_id = ? 
//           AND admin_status = 0 
//           AND deletestatus = 0`,
//       [employeeId, companyId]
//     );
//     // Group pending leave days by rule
//     const pendingDaysByRule = {};
//     for (const lr of leaveRequests) {
//       const days = calculateLeaveDays(lr.start_date, lr.end_date, lr.start_half, lr.end_half);
//       pendingDaysByRule[lr.leave_rule_id] = (pendingDaysByRule[lr.leave_rule_id] || 0) + days;
//     }
//     const today = new Date();
//     const currentMonth = today.getMonth() + 1; // 1-based
//     const results = [];

//     for (const rule of rules) {
//       // --- Eligibility Check ---
//       const eligibleDate = new Date(joiningDate);
//       eligibleDate.setDate(eligibleDate.getDate() + (rule.eligible_after_days || 0));
//       if (today < eligibleDate) {
//         results.push({
//           employee_id: employeeId,
//           employee_id: employeeId,
//           leave_rule_id: rule.id,
//           leave_number_hide: rule.leave_number_hide,
//           leave_type: rule.leave_type,
//           used_leaves: "0",
//           available_leaves: "0",
//           Available: false,
//           note: "Not eligible yet"
//         });
//         continue;
//       }

//       // --- session handling (apply_leaves_next_year = renewal month) ---
//       const sessionStartMonth = rule.apply_leaves_next_year || 1; // default Jan
//       let sessionStart = new Date(today.getFullYear(), sessionStartMonth - 1, 1);
//       let sessionEnd = new Date(today.getFullYear() + 1, sessionStartMonth - 1, 0);

//       // if current month < session start, then session started last year
//       if (currentMonth < sessionStartMonth) {
//         sessionStart = new Date(today.getFullYear() - 1, sessionStartMonth - 1, 1);
//         sessionEnd = new Date(today.getFullYear(), sessionStartMonth - 1, 0);
//       }

//       // --- effective assign date ---
//       const assignDate = rule.assign_date ? new Date(rule.assign_date) : joiningDate;
//       const effectiveDate = assignDate > sessionStart ? assignDate : sessionStart;

//       // --- accrual calculation ---
//       let periodsPerYear = 1;
//       switch (rule.accrual_frequency) {
//         case "monthly":
//           periodsPerYear = 12;
//           break;
//         case "quarterly":
//           periodsPerYear = 4;
//           break;
//         case "half-yearly":
//           periodsPerYear = 2;
//           break;
//         default:
//           periodsPerYear = 1; // yearly
//       }
//       const leavesPerPeriod = rule.leaves_allowed_year / periodsPerYear;

//       // find completed periods between effectiveDate and today
//       let creditedPeriods = 0;
//       if (rule.accrual_frequency === "monthly") {
//         const monthsDiff =
//           (today.getFullYear() - effectiveDate.getFullYear()) * 12 +
//           (today.getMonth() - effectiveDate.getMonth());
//         creditedPeriods = monthsDiff + 1;
//       } else if (rule.accrual_frequency === "quarterly") {
//         const monthsDiff =
//           (today.getFullYear() - effectiveDate.getFullYear()) * 12 +
//           (today.getMonth() - effectiveDate.getMonth());
//         creditedPeriods = Math.floor(monthsDiff / 3) + 1;
//       } else if (rule.accrual_frequency === "half-yearly") {
//         const monthsDiff =
//           (today.getFullYear() - effectiveDate.getFullYear()) * 12 +
//           (today.getMonth() - effectiveDate.getMonth());
//         creditedPeriods = Math.floor(monthsDiff / 6) + 1;
//       } else {
//         creditedPeriods = today >= effectiveDate ? 1 : 0;
//       }

//       // cap at max periods
//       if (creditedPeriods > periodsPerYear) creditedPeriods = periodsPerYear;

//       // const totalCredited = Math.round(leavesPerPeriod * creditedPeriods);
//       const totalCredited = leavesPerPeriod * creditedPeriods;
//       const used = rule.used_leaves || 0;
//       let available = totalCredited - used;
//       const pending = pendingDaysByRule[rule.id] || 0;
//       // let monthly_balance_leave = available + rule.old_balance - pending;

//       if (available < 0) available = 0;
//       let totalCreditedNew = available;

//       if (decodedUserData?.company_id == 10) {
//         // employeeId
//         // const leavecount = await handleleave(employeeId, rule.id);
//         const leavecount = await leaveconversion(employeeId, rule.id);
//         // totalCreditedNew = totalCredited + leavecount;
//         totalCreditedNew = Number((available + leavecount).toFixed(2));
//         available = totalCreditedNew;
//       }
//       let monthly_balance_leave = (parseFloat(available) + parseFloat(rule.old_balance) - parseFloat(pending)).toFixed(1);

//       results.push({
//         employee_id: employeeId,
//         leave_rule_id: rule.id,
//         leave_number_hide: rule.leave_number_hide,
//         leave_type: rule.leave_type,
//         total_credited: totalCreditedNew,
//         used_leaves: used.toString(),
//         available_leaves: available.toString(),
//         monthly_balance_leave: monthly_balance_leave.toString(),
//         Available: available > 0
//       });
//     }

//     res.json({ status: true, records: results });
//   } catch (err) {
//     console.error("FetchLeaveCount error:", err);
//     res.status(500).json({
//       status: false,
//       message: "Error while fetching leave balances",
//       error: err.message
//     });
//   }
// });


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
    // ---- Step 1: Fetch employee joining date and details
    const [empRows] = await db.promise().query(
      `SELECT date_of_Joining, probation_period, employee_status 
       FROM employees WHERE id=? AND company_id=?`,
      [employeeId, companyId]
    );

    if (!empRows.length) {
      return res.status(404).json({ status: false, message: "Employee not found" });
    }

    const joiningDate = new Date(empRows[0].date_of_Joining);
    const today = new Date();

    // Calculate probation end date if applicable
    let probationEndDate = null;
    if (empRows[0].probation_period) {
      probationEndDate = new Date(joiningDate);
      probationEndDate.setMonth(probationEndDate.getMonth() + parseInt(empRows[0].probation_period));
    }

    // ---- Step 2: Fetch rules with current balance
    const [rules] = await db.promise().query(
      `SELECT lr.*, lb.used_leaves, lb.total_leaves, lb.remaining_leaves, 
              lb.assign_date, lb.old_balance, lb.session_start, lb.session_end,
              lb.rule_version_at_calc, lb.carry_forward_from_prev, lb.locked              
       FROM leave_rules lr
       INNER JOIN leave_balance lb ON lr.id = lb.leave_rules_id 
        AND lb.employee_id = ? 
        AND lb.company_id = ? 
        AND CURDATE() BETWEEN lb.session_start AND lb.session_end And lb.assign_date <= CURDATE()
       WHERE lr.company_id = ? AND (lr.effective_from IS NULL OR lr.effective_from <= CURDATE())
         AND (lr.effective_to IS NULL OR lr.effective_to >= CURDATE())`,
      [employeeId, companyId, companyId]

    );

    // ---- Step 3: Fetch ALL pending leave requests
    const [leaveRequests] = await db.promise().query(
      `SELECT leave_rule_id, start_date, end_date, start_half, end_half 
         FROM leaves 
        WHERE employee_id = ? 
          AND company_id = ? 
          and (rm_status =0 or rm_status=1) and admin_status =0 
          AND deletestatus = 0`,
      [employeeId, companyId]
    );

    // Group pending leave days by rule
    const pendingDaysByRule = {};
    for (const lr of leaveRequests) {
      const days = calculateLeaveDays(lr.start_date, lr.end_date, lr.start_half, lr.end_half);
      pendingDaysByRule[lr.leave_rule_id] = (pendingDaysByRule[lr.leave_rule_id] || 0) + days;
    }

    // ---- Step 4: Fetch holidays for the year
    // const [holidays] = await db.promise().query(
    //   `SELECT date FROM holiday 
    //    WHERE company_id = ? AND YEAR(date) = ?`,
    //   [companyId, today.getFullYear()]
    // );
    // const holidayDates = holidays.map(h => h.date);

    const results = [];
    let month = 0;
    let monthCount = 1;
    for (const rule of rules) {
      // --- Eligibility Check ---
      let isEligible = true;
      let eligibilityNote = "";

      // Check probation eligibility
      if (rule.under_probation && probationEndDate && today < probationEndDate) {
        isEligible = false;
        eligibilityNote = "Under probation period";
      }

      // Check eligible after days from joining
      if (rule.eligible_after_days > 0) {
        const eligibleDate = new Date(joiningDate);
        eligibleDate.setDate(eligibleDate.getDate() + rule.eligible_after_days);
        if (today < eligibleDate) {
          isEligible = false;
          eligibilityNote = `Eligible after ${rule.eligible_after_days} days of joining`;
        }
      }

      // Check if balance is locked
      if (rule.locked) {
        isEligible = false;
        eligibilityNote = rule.locked_reason || "Leave balance is locked";
      }

      if (!isEligible) {
        results.push({
          employee_id: employeeId,
          leave_rule_id: rule.id,
          leave_number_hide: rule.leave_number_hide,
          leave_type: rule.leave_type,
          total_leaves: "0",
          used_leaves: "0",
          pending_leaves: "0",
          available_leaves: "0",
          carry_forward: rule.carry_forward_from_prev || "0",
          session_start: rule.session_start,
          session_end: rule.session_end,
          Available: false,
          note: eligibilityNote,
          is_locked: rule.locked ? 1 : 0,
          monthly_balance_leave: 0

        });
        continue;
      }



      // --- Calculate available leaves ---
      const used = parseFloat(rule.used_leaves || 0);
      const total = parseFloat(rule.total_leaves || 0);
      const carryForward = parseFloat(rule.carry_forward_from_prev || 0);
      const pending = pendingDaysByRule[rule.id] || 0;



      if (rule?.accrual_frequency == "half_yearly") {
        month = 6
      } else if (rule?.accrual_frequency == "monthly") {
        month = monthcount(rule.assign_date, rule.session_end)
        let currentDate = new Date()
        monthCount = monthcount(rule.assign_date, currentDate)
      }
      // Calculate available leaves (total + carry forward - used - pending)    
      let available = total

      // Apply negative leaves limit if applicable


      // Check max leaves per month for new applications
      let monthlyRemaining = rule.max_leaves_month;
      if (rule.max_leaves_month > 0) {
        // Get leaves taken this month
        const [monthlyLeaves] = await db.promise().query(
          `SELECT SUM(DATEDIFF(end_date, start_date) + 1) as monthly_used
           FROM leaves 
           WHERE employee_id = ? AND leave_rule_id = ?
           AND MONTH(start_date) = MONTH(CURDATE()) 
           AND YEAR(start_date) = YEAR(CURDATE())
           AND admin_status = 1`,
          [employeeId, rule.id]
        );
        monthlyRemaining = rule.max_leaves_month - (monthlyLeaves[0].monthly_used || 0);
      }

      // Apply company-specific logic (example for company_id = 10)
      if (companyId == 10) {
        const leavecount = await leaveconversion(employeeId, rule.id);
        available = Number((available + leavecount).toFixed(2));
      }

      // Round to 1 decimal place
      available = Math.round(available * 10) / 10;
      const totalAvailable = Math.round((total + carryForward) * 10) / 10;
      if (month) {
        available = Math.round(available / month) * monthCount;
      }
      available = available + carryForward - used - pending;
      if (!rule.negative_leaves && available < 0) {
        available = 0;
      } else if (rule.negative_leaves && rule.max_negative_leaves > 0) {
        // Allow negative up to max_negative_leaves
        if (available < -rule.max_negative_leaves) {
          available = -rule.max_negative_leaves;
        }
      }
      results.push({
        employee_id: employeeId,
        leave_rule_id: rule.id,
        leave_number_hide: rule.leave_number_hide,
        leave_type: rule.leave_type,
        description: rule.description,
        total_leaves: total.toString(),
        carry_forward: carryForward.toString(),
        total_available: totalAvailable.toString(),
        used_leaves: used.toString(),
        pending_leaves: pending.toString(),
        available_leaves: available.toString(),
        monthly_balance_leave: available.toString(),
        monthly_remaining: monthlyRemaining.toString(),
        session_start: rule.session_start,
        session_end: rule.session_end,
        accrual_frequency: rule.accrual_frequency,
        max_leaves_month: rule.max_leaves_month,
        negative_leaves_allowed: rule.negative_leaves ? 1 : 0,
        max_negative: rule.max_negative_leaves,
        requires_approval: rule.requires_approval ? 1 : 0,
        approval_levels: rule.approval_levels || 1,
        Available: available > 0 || rule.negative_leaves,
        note: available < 0 ? "Negative balance" : "",
        is_locked: 0
      });
    }

    // Log the balance fetch in audit log
    await db.promise().query(
      `INSERT INTO leave_audit_log 
       (action_type, employee_id, company_id, performed_by, notes)
       VALUES (?, ?, ?, ?, ?)`,
      ['balance_updated', employeeId, companyId, employeeId, 'Leave balance fetched']
    );

    res.json({
      status: true,
      records: results,
      employee_details: {
        joining_date: joiningDate,
        probation_end: probationEndDate,
        is_active: empRows[0].employee_status == 1
      }
    });

  } catch (err) {
    console.error("FetchLeaveCount error:", err);

    // Log error
    await db.promise().query(
      `INSERT INTO leave_audit_log 
       (action_type, employee_id, company_id, notes)
       VALUES (?, ?, ?, ?)`,
      ['balance_updated', employeeId, companyId, 'Error: ' + err.message]
    );

    res.status(500).json({
      status: false,
      message: "Error while fetching leave balances",
      error: err.message
    });
  }
});


function monthcount(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  // If end date day is greater or equal, count full month
  if (end.getDate() >= start.getDate()) {
    months += 1;
  }

  return months;
}

module.exports = router;