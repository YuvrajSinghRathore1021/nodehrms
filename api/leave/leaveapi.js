const express = require("express");
const router = express.Router();
const db = require("../../DB/ConnectionSql");
const { sendNotification } = require('../../api/firebase/notificationComman');
const updateLeaveBalance = require("../../utils/leaveBalance");
const calculateLeaveDays = require("../../utils/calculateLeaveDays");


// app cheak A / web cheak A

router.post("/leave", async (req, res) => {
  const { leave_type, userData, start_date, end_date, reason, start_half, end_half, employeeId = 0 } = req.body;
  let type = "";

  // ================== BASIC VALIDATION ====================
  if (!leave_type || !userData || !start_date || !end_date || !reason) {
    return res.status(400).json({
      status: false,
      message: "Missing required fields: leave_type, userData, start_date, end_date, or reason."
    });
  }

  if (reason.trim().length < 3) {
    return res.status(400).json({
      status: false,
      message: "Reason must be at least 3 characters long."
    });
  }

  // ================== DECODE USER DATA ====================
  let decodedUserData = null;
  try {
    const decodedString = Buffer.from(userData, "base64").toString("utf-8");
    decodedUserData = JSON.parse(decodedString);
    if (!decodedUserData?.id || !decodedUserData?.company_id) {
      return res.status(400).json({ status: false, error: "Invalid userData: missing id or company_id" });
    }
  } catch (error) {
    return res.status(400).json({ status: false, error: "Invalid userData format" });
  }

  const employeeIdNew = employeeId || decodedUserData?.id;
  if (employeeId != decodedUserData?.id && employeeId > 0) {
    type = "admin";
  }

  // ================== VALIDATE DATES ====================
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(400).json({
      status: false,
      message: "Invalid date format."
    });
  }

  if (startDate > endDate) {
    return res.status(400).json({
      status: false,
      message: "Start date cannot be after end date."
    });
  }

  // ================== VALIDATE EMPLOYEE ====================
  const [EmployeeData] = await db.promise().query(
    'SELECT id, leave_rule_id, first_name, last_name, date_of_Joining, contact_number, probation_period, probation_status, notice_period, employee_status, status, delete_status, company_id, reporting_manager FROM employees WHERE id=? AND company_id=? AND delete_status=0',
    [employeeIdNew, decodedUserData.company_id]
  );

  if (!EmployeeData || EmployeeData.length == 0) {
    return res.status(404).json({
      status: false,
      message: 'Employee not found or inactive'
    });
  }

  if (EmployeeData[0].employee_status != 1 || EmployeeData[0].status != 1) {
    return res.status(400).json({
      status: false,
      message: 'Employee is not active. Cannot apply for leave.'
    });
  }

  // ================== VALIDATE LEAVE RULE ====================
  const [LeaveRuleDataGet] = await db.promise().query(
    "SELECT id, company_id, leave_type, description, leaves_allowed_year, weekends_leave, holidays_leave, creditable, accrual_frequency, accrual_period, under_probation, notice_period, encash_enabled, carry_forward, remaining_leaves, max_leaves_month, continuous_leaves, negative_leaves, max_negative_leaves, future_dated_leaves, future_dated_leaves_after, backdated_leaves, backdated_leaves_up_to, apply_leaves_next_year FROM leave_rules WHERE id = ? AND company_id = ?",
    [leave_type, decodedUserData.company_id]
  );

  if (!LeaveRuleDataGet || LeaveRuleDataGet.length == 0) {
    return res.status(404).json({
      status: false,
      message: "Invalid leave type or leave rule not found for this company."
    });
  }

  const leaveRule = LeaveRuleDataGet[0];

  // ================== EMPLOYMENT STATUS VALIDATION ====================
  // Probation period validation
  if (leaveRule.under_probation == 0 && EmployeeData[0].probation_status == 1) {
    const doj = new Date(EmployeeData[0].date_of_Joining);
    const probationDays = EmployeeData[0].probation_period || 90; // Default 90 days
    const probationEndDate = new Date(doj.getTime() + (probationDays * 24 * 60 * 60 * 1000));

    if (new Date() < probationEndDate) {
      return res.status(400).json({
        status: false,
        message: `You are under probation period until ${probationEndDate.toLocaleDateString()}. Cannot apply for this leave type.`
      });
    }
  }

  // Notice period validation
  if (leaveRule.notice_period == 0 && EmployeeData[0].notice_period == 1) {
    return res.status(400).json({
      status: false,
      message: "You are under notice period and cannot apply for this leave type."
    });
  }

  // ================== CHECK DUPLICATE LEAVES ====================
  const [existingLeave] = await db.promise().query(
    `SELECT leave_id, status FROM leaves 
     WHERE employee_id = ? AND company_id = ? 
     AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?) OR (start_date <= ? AND end_date >= ?))
     AND ((rm_id > 0 and rm_status != 2) OR (admin_id>0 and admin_status != 2)) and deletestatus=0`,
    [employeeIdNew, decodedUserData.company_id, start_date, end_date, start_date, end_date, start_date, end_date]
  );
  if (existingLeave.length > 0) {
    const statusMap = { 0: 'Pending', 1: 'Approved', 2: 'Rejected' };
    return res.status(400).json({
      status: false,
      message: `Leave for this date range has already been applied. Status: ${statusMap[existingLeave[0].status] || 'Unknown'}`,
      existing_leave_id: existingLeave[0].leave_id
    });
  }

  // ================== CALCULATE LEAVE DAYS ====================
  let leaveDays = calculateLeaveDays(startDate, endDate, start_half, end_half);



  if (leaveDays <= 0) {
    return res.status(400).json({
      status: false,
      message: "Invalid leave duration. Please check your start and end dates with half-day selections."
    });
  }

  // ================== LEAVE BALANCE VALIDATION ====================

  const [leaveBalance] = await db.promise().query(
    `SELECT id, total_leaves, used_leaves, remaining_leaves,  status 
     FROM leave_balance 
     WHERE employee_id = ? AND company_id = ? AND leave_rules_id = ?  AND status = 1 and session_start <= ? and session_end >= ?`,
    [employeeIdNew, decodedUserData.company_id, leave_type, startDate, endDate]
  );

  if (leaveBalance.length == 0) {
    return res.status(400).json({
      status: false,
      message: `No active leave balance found for the selected leave type and date range. Please contact HR.`
    });
  }

  if (leaveBalance[0].remaining_leaves < leaveDays && leaveRule.negative_leaves == 0) {
    return res.status(400).json({
      status: false,
      message: `Insufficient leave balance. Available: ${leaveBalance[0].remaining_leaves} days, Requested: ${leaveDays} days.`
    });
  }

  // ================== LEAVE POLICY VALIDATIONS ====================
  // Maximum leaves per month validation
  if (leaveRule.max_leaves_month > 0) {
    const yearMonth = start_date.substring(0, 7); // YYYY-MM format
    const [monthlyLeaves] = await db.promise().query(
      `SELECT SUM(DATEDIFF(end_date, start_date) + 1) as total_days 
       FROM leaves 
       WHERE employee_id = ? AND company_id = ? AND leave_rule_id = ?
       AND DATE_FORMAT(start_date, '%Y-%m') = ? AND status NOT IN (3, 4)`,
      [employeeIdNew, decodedUserData.company_id, leave_type, yearMonth]
    );

    const totalDaysThisMonth = parseInt(monthlyLeaves[0]?.total_days || 0) + leaveDays;
    if (totalDaysThisMonth > leaveRule.max_leaves_month) {
      return res.status(400).json({
        status: false,
        message: `Maximum ${leaveRule.max_leaves_month} days allowed per month. You already have ${parseInt(monthlyLeaves[0]?.total_days || 0)} days, requesting ${leaveDays} days.`
      });
    }
  }

  // Continuous leaves validation
  if (leaveRule.continuous_leaves > 0 && leaveDays > leaveRule.continuous_leaves) {
    return res.status(400).json({
      status: false,
      message: `Maximum ${leaveRule.continuous_leaves} continuous days allowed. You requested ${leaveDays} days.`
    });
  }

  // ================== FUTURE DATED LEAVES VALIDATION ====================
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);

  if (startDate >= currentDate) {
    // Future leave validation
    if (leaveRule.future_dated_leaves == 0) {
      return res.status(400).json({
        status: false,
        message: "Future dated leaves are not allowed for this leave type."
      });
    }

    if (leaveRule.future_dated_leaves_after > 0) {
      const maxFutureDate = new Date(currentDate);
      maxFutureDate.setDate(maxFutureDate.getDate() + leaveRule.future_dated_leaves_after);

      if (startDate > maxFutureDate) {
        return res.status(400).json({
          status: false,
          message: `Future leaves can only be applied up to ${maxFutureDate.toLocaleDateString()}.`
        });
      }
    }
  } else {
    // ================== BACKDATED LEAVES VALIDATION ====================

    if (leaveRule.backdated_leaves == 0 && employeeIdNew == decodedUserData?.id) {
      return res.status(400).json({
        status: false,
        message: "Backdated leaves are not allowed for this leave type."
      });
    }

    if (leaveRule.backdated_leaves_up_to > 0) {
      const backdatedLimit = new Date(currentDate);
      backdatedLimit.setDate(backdatedLimit.getDate() - leaveRule.backdated_leaves_up_to);

      if (startDate < backdatedLimit && employeeIdNew == decodedUserData?.id) {
        return res.status(400).json({
          status: false,
          message: `Backdated leaves can only be applied within ${leaveRule.backdated_leaves_up_to} days. Limit: ${backdatedLimit.toLocaleDateString()}`
        });
      }
    }

    // Check if backdated leave requires admin approval
    if (employeeIdNew != decodedUserData?.id && leaveRule.backdated_leaves == 1) {
      type = "admin"; // Force admin approval for backdated leaves
    }
  }

  // ================== NEGATIVE LEAVES VALIDATION ====================
  if (leaveBalance[0].remaining_leaves < leaveDays) {
    if (leaveRule.negative_leaves == 0) {
      return res.status(400).json({
        status: false,
        message: `Insufficient leave balance (${leaveBalance[0].remaining_leaves} days) and negative leaves are not allowed.`
      });
    }

    if (leaveRule.max_negative_leaves > 0 && leaveRule.negative_leaves == 1) {
      const currentNegative = Math.abs(leaveBalance[0].remaining_leaves - leaveDays);
      if (currentNegative > leaveRule.max_negative_leaves) {
        return res.status(400).json({
          status: false,
          message: `Maximum negative leaves allowed is ${leaveRule.max_negative_leaves} days. You are requesting ${currentNegative} days negative.`
        });
      }
    }
  }

  // ================== NEXT YEAR LEAVE VALIDATION ====================
  if (startDate.getFullYear() > currentDate.getFullYear()) {
    if (leaveRule.apply_leaves_next_year == 0 && employeeIdNew == decodedUserData?.id) {
      return res.status(400).json({
        status: false,
        message: "Cannot apply for leaves for next year. Please apply after year end."
      });
    }
  }

  // ================== COMPANY SETTINGS VALIDATION ====================
  const [settingResult] = await db.promise().query(
    "SELECT multi_level_approve FROM settings WHERE type=? and company_id = ?",
    ["Leave_setting", decodedUserData.company_id]
  );


  // ================== PROCESS LEAVE APPLICATION ====================
  try {
    let RmIdValue = 0;
    let leaveStatus = 0; // Default pending
    let adminStatus = null;
    let adminRemark = null;
    let adminId = null;


    if (type == "admin") {
      // Admin-applied leaves are auto-approved
      leaveStatus = 1;
      adminStatus = 1;
      adminRemark = reason;
      adminId = decodedUserData.id;
    } else {

      // Get reporting manager if multi-level approval is enabled
      if (settingResult.length > 0 && settingResult[0].multi_level_approve == 1) {
        RmIdValue = EmployeeData[0].reporting_manager || 0;

        if (RmIdValue == 0) {
          return res.status(400).json({
            status: false,
            message: "No reporting manager assigned. Please contact HR."
          });
        }
      }
    }

    // Insert leave record

    let insertResult;
    const insertQuery = type == "admin"
      ? "INSERT INTO leaves (company_id, employee_id, leave_type, leave_rule_id, start_date, end_date,  reason, rm_id, start_half, end_half, admin_status, admin_remark, admin_id, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())"
      : "INSERT INTO leaves (company_id, employee_id, leave_type, leave_rule_id, start_date, end_date,  reason, rm_id, start_half, end_half, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";

    const insertParams = type == "admin"
      ? [decodedUserData.company_id, employeeIdNew, leaveRule.leave_type, leave_type, start_date, end_date, reason, RmIdValue, start_half, end_half, adminStatus, adminRemark, adminId]
      : [decodedUserData.company_id, employeeIdNew, leaveRule.leave_type, leave_type, start_date, end_date, reason, RmIdValue, start_half, end_half];

    [insertResult] = await db.promise().query(insertQuery, insertParams);

    // Update leave balance
    if (leaveStatus == 1) { // Only deduct if auto-approved
      await updateLeaveBalance(insertResult.insertId, decodedUserData.company_id);
    }

    // console.log("insertId:", insertResult.insertId);
    // console.log("RmIdValue:", RmIdValue);
    // // Send notifications
    // if (RmIdValue && leaveStatus == 0) {
    //   await sendNotification({
    //     employeeIds: [RmIdValue],
    //     title: "New Leave Request",
    //     message: `${EmployeeData[0].first_name} ${EmployeeData[0].last_name} has applied for ${leaveDays} days leave (${start_date} to ${end_date})`,
    //     date: start_date,
    //     notificationType: "leave_requests",
    //     type: "recent_notifications",
    //     leave_id: insertResult.insertId
    //   });
    // }



    return res.status(200).json({
      status: true,
      message: type == "admin" ? "Leave assigned successfully." : "Leave request submitted successfully.",
      id: insertResult.insertId,
      leave_days: leaveDays,
      remaining_balance: leaveBalance[0].remaining_leaves - (leaveStatus == 1 ? leaveDays : 0)
    });

  } catch (error) {
    console.error("Error processing leave request:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: process.env.NODE_ENV == 'development' ? error.message : 'Please try again later'
    });
  }
});




///////////  Soft Delete ////////////////
// web cheak A
router.post("/delete", (req, res) => {
  const { leave_id } = req.body;
  if (!leave_id) {
    return res.status(200).json({ message: "Leave ID is required." });
  }
  db.query(
    "UPDATE leaves SET deletestatus = 1 WHERE leave_id = ?",
    [leave_id],
    (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(200).json({
          status: false,
          message: "Error updating leave.",
          error: err.message
        });
      }
      if (results.affectedRows == 0) {
        return res.status(200).json({
          status: false,
          message: "Leave not found or no changes made."
        });
      }
      return res
        .status(200)
        .json({ status: true, message: "Data deleted successfully" });
    }
  );
});

///////  Fetch Leave Request Data //////////
// app cheak A / web cheak A
router.post("/LeaveRequest", async (req, res) => {
  const { leave_id } = req.body;
  if (!leave_id) {
    return res.status(200).json({
      status: false,
      message: "Leave ID is required"
    });
  }
  const query = `
    SELECT 
      l.leave_id, 
      l.leave_type, 
      l.start_date, 
      l.end_date, 
      l.status,
      l.rm_id,
      l.rm_remark,
      l.rm_status,
      l.admin_id,
      l.admin_status,
      l.admin_remark,
      DATEDIFF(l.end_date, l.start_date) + 1 AS leave_days,  -- Calculating leave days
      l.reason, 
      e.id,
      e.first_name AS employee_first_name, 
      e.last_name AS employee_last_name, 
      e.designation, 
      d.name AS department, 
      sd.name AS sub_department,  
      CONCAT(e.first_name, ' ', e.last_name) AS applied_by,
      a.first_name AS admin_first_name, 
      a.last_name AS admin_last_name,
      CONCAT(a.first_name, ' ', a.last_name) AS approved_by,
      l.created
    FROM 
      leaves AS l
    INNER JOIN 
      employees AS e ON l.employee_id = e.id -- Employee who applied for the leave
    LEFT JOIN 
      employees AS a ON l.admin_id = a.id -- Admin who approved the leave
    LEFT JOIN 
      departments AS d ON e.department = d.id
    LEFT JOIN 
      departments AS sd ON e.sub_department = sd.id
    WHERE 
      l.leave_id = ?`;

  const queryParams = [leave_id];

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching leave records:", err);
      return res.status(200).json({
        status: false,
        error: "Error fetching leave records"
      });
    }

    const recordsWithSrnu = results.map((record, index) => ({
      srnu: index + 1,
      ...record
    }));

    res.json({
      status: true,
      records: recordsWithSrnu
    });
  });
});


// // app cheak A / web cheak A -working but balance not update 


router.post("/api/ApprovalSubmit", async (req, res) => {
  const {
    userData,
    ApprovalRequests_id,
    Type,
    ApprovalStatus,
    reason
  } = req.body;

  let decodedUserData = null;

  // Decode userData
  if (userData) {
    try {
      decodedUserData = JSON.parse(
        Buffer.from(userData, "base64").toString("utf-8")
      );
    } catch {
      return res.status(400).json({
        status: false,
        message: "Invalid userData"
      });
    }
  }

  if (!decodedUserData?.company_id) {
    return res.status(400).json({
      status: false,
      message: "Company ID is required"
    });
  }

  const company_id = decodedUserData.company_id;

  let query, queryArray;

  if (Type == "Rm") {
    query = `
      UPDATE leaves 
      SET rm_status = ?, rm_remark = ? 
      WHERE leave_id = ? AND company_id = ?`;
    queryArray = [ApprovalStatus, reason, ApprovalRequests_id, company_id];
  } else {
    query = `
      UPDATE leaves 
      SET admin_status = ?, admin_remark = ?, admin_id = ? 
      WHERE leave_id = ? AND company_id = ?`;
    queryArray = [
      ApprovalStatus,
      reason,
      decodedUserData.id,
      ApprovalRequests_id,
      company_id
    ];
  }

  try {
    await queryDb(query, queryArray);

    // ⭐ Only when Admin approves leave
    if (Type != "Rm" && ApprovalStatus == "1") {
      await updateLeaveBalance(ApprovalRequests_id, company_id);
    }

    return res.status(200).json({
      status: true,
      message: "Approval updated successfully"
    });

  } catch (err) {
    return res.status(500).json({
      status: false,
      message: "Error processing request",
      error: err.message
    });
  }
});



// Generic function to execute database queries
function queryDb(query, params) {
  return new Promise((resolve, reject) => {
    db.query(query, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

module.exports = router;
