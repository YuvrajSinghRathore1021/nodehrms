const express = require("express");
const router = express.Router();
const db = require("../../DB/ConnectionSql");
const { sendNotification } = require('../../api/firebase/notificationComman');

// app cheak A / web cheak A
router.post("/leave", async (req, res) => {
  //   // leave_type in this come leave_rule_id
  const { leave_type, userData, start_date, end_date, reason, start_half, end_half, employeeId = 0 } = req.body;
  let type = "";
  // Basic validation to ensure required fields are provided
  if (!leave_type || !userData || !start_date || !end_date || !reason) {
    return res.status(400).json({
      status: false,
      message: "Missing required fields: leave_type, userData, start_date, end_date, or reason."
    });
  }

  // Parse dates and calculate leave days
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);

  // Validate that start_date is before end_date
  if (startDate > endDate) {
    return res.status(400).json({
      status: false,
      message: "Start date cannot be after end date."
    });
  } let decodedUserData = null;
  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({ status: false, error: "Invalid userData" });
    }
  } else {
    return res.status(400).json({ status: false, error: "Missing userData" });
  }
  const employeeIdNew = employeeId || decodedUserData?.id;

  if (employeeId != decodedUserData?.id && employeeId > 0) {
    type = "admin";
  }

  const EmployeeData = await db.promise().query('SELECT id, leave_rule_id, first_name, last_name, date_of_Joining, contact_number, probation_period, probation_status,notice_period FROM employees WHERE id=?', [employeeIdNew]);
  if (EmployeeData.length === 0) {
    return res.status(400).json({ status: false, message: 'Employee Not found' });
  }
  const [existingLeave] = await db.promise().query(
    "SELECT leave_id FROM leaves WHERE employee_id = ? AND company_id=? AND start_date = ? AND end_date = ? AND status != 3", // status != 3 means ignore cancelled leaves
    [employeeIdNew, decodedUserData.company_id, start_date, end_date]
  );

  if (existingLeave.length > 0) {
    return res.status(400).json({
      status: false,
      message: "Leave for this date range has already been applied."
    });
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

  let leaveDays = calculateLeaveDays(startDate, endDate, start_half, end_half);

  // Get leave type settings from the database
  const [leave_typeGet] = await db.promise().query("SELECT id, leave_type, max_leaves_month, continuous_leaves, future_dated_leaves, future_dated_leaves_after, negative_leaves, backdated_leaves, backdated_leaves_up_to, apply_leaves_next_year FROM leave_rules WHERE id = ?", [leave_type]);

  // Check if leave type exists
  if (!leave_typeGet || leave_typeGet.length === 0) {
    return res.status(400).json({
      status: false,
      message: "Invalid leave type."
    });
  }

  const currentDate = new Date();
  if (startDate >= currentDate && endDate >= currentDate) {
    // Future leave validation
    if (leave_typeGet[0]?.future_dated_leaves_after > 0) {
      const futureLeavesDateLimit = new Date(currentDate.getTime() + leave_typeGet[0].future_dated_leaves_after);
      if (startDate > futureLeavesDateLimit) {
        return res.status(400).json({
          status: false,
          message: `You can only take leave after ${futureLeavesDateLimit.toLocaleDateString()}.`
        });
      }
    }
    if (leave_typeGet[0].continuous_leaves <= leaveDays) {
      return res.status(400).json({
        status: false,
        message: `You cannot take continuous leaves for ${leaveDays} days. Only ${leave_typeGet[0].continuous_leaves} days are allowed.`
      });
    }
  } else if (startDate <= currentDate && endDate <= currentDate) {
    // Backdated leave validation
    if (leave_typeGet[0].negative_leaves == 0 && employeeId == decodedUserData?.id) {
      return res.status(400).json({
        status: false,
        message: "You cannot take backdated leaves."
      });
    }
    let currentDateValue = new Date(currentDate.getTime());

    // Convert the backdated limit into a Date by subtracting days
    const backdatedDays = leave_typeGet[0].backdated_leaves_up_to || 0;
    const backdatedLimit = new Date(currentDateValue.getTime() - (backdatedDays * 24 * 60 * 60 * 1000));

    if (new Date(startDate) < backdatedLimit && employeeId == decodedUserData?.id) {
      return res.status(400).json({
        status: false,
        message: `You can only take backdated leaves up to ${backdatedLimit.toLocaleDateString()}.`
      });
    }
    if (leave_typeGet[0].backdated_leaves < leaveDays && employeeId == decodedUserData?.id) {
      return res.status(400).json({
        status: false,
        message: `You cannot take backdated leaves for ${leaveDays} days. Only ${leave_typeGet[0].backdated_leaves} days are allowed.`
      });
    }
  }



  try {
    let RmIdValue = 0;
    // Step 1: Get the reporting manager ID if multi_level_approve is enabled
    const [settingResult] = await db
      .promise()
      .query(
        "SELECT multi_level_approve FROM settings WHERE type=? and company_id = ?",
        ["Leave_setting", decodedUserData.company_id]
      );

    if (settingResult.length > 0) {
      const multiLeaveApprove = settingResult[0].multi_level_approve;
      if (multiLeaveApprove == 1) {
        const [managerResults] = await db.promise().query(
          "SELECT reporting_manager FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 and id = ? AND company_id = ?",
          [employeeIdNew, decodedUserData.company_id]
        );
        if (managerResults.length === 0) {
          return res.status(200).json({
            status: false,
            error: "Employee not found",
            message: "Invalid employee ID or company ID"
          });
        }
        RmIdValue = managerResults[0].reporting_manager || 0;
      }
    }
    // Step 2: Insert leave record into the database
    let insertResult;
    if (type == "admin") {
      [insertResult] = await db.promise().query(
        "INSERT INTO leaves (company_id,employee_id,leave_type, leave_rule_id, start_date, end_date, status, reason,start_half,end_half,admin_status,admin_remark,admin_id) VALUES (?,?,?,?,?, ?, ?, ?, ?, ?,?,?,?)",
        [decodedUserData.company_id, employeeIdNew, leave_typeGet[0].leave_type, leave_type, start_date, end_date, 1, reason, start_half, end_half, 1, reason, decodedUserData.id]
      );

    } else {
      [insertResult] = await db.promise().query(
        "INSERT INTO leaves (company_id,employee_id,leave_type, leave_rule_id, start_date, end_date, status, reason,rm_id,start_half,end_half) VALUES (?,?,?,?, ?, ?, ?, ?, ?,?,?)",
        [decodedUserData.company_id, employeeIdNew, leave_typeGet[0].leave_type, leave_type, start_date, end_date, 1, reason, RmIdValue, start_half, end_half]
      );
      if (RmIdValue) {
        await sendNotification({
          employeeIds: RmIdValue ? [RmIdValue] : [],
          title: "New Leave Request",
          date: start_date,
          notificationType: "leave_requests",
          type: "recent_notifications",
        });
      }
    }


    return res.status(200).json({
      status: true,
      message: "Data inserted successfully.",
      id: insertResult.insertId
    });
  } catch (error) {
    console.error("Error processing leave request:", error);
    return res.status(200).json({
      status: false,
      message: "Internal server error",
      error: error.message
    });
  }
});


// **Helper Function to Calculate Leave Days Properly**
function calculateLeaveDays(startDate, endDate, startHalf, endHalf) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let totalDays = (end - start) / (1000 * 60 * 60 * 24) + 1;

  if (startHalf === "Second Half") {
    totalDays -= 0.5; // Deduct 0.5 day for second half leave start
  }
  if (endHalf === "First Half") {
    totalDays -= 0.5; // Deduct 0.5 day for first half leave end
  }

  return totalDays;
}



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
      if (results.affectedRows === 0) {
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


// app cheak A / web cheak A
router.post("/api/ApprovalSubmit", async (req, res) => {
  const {
    userData,
    ApprovalRequests_id,
    Type,
    ApprovalStatus,
    employee_id,
    reason
  } = req.body;
  let decodedUserData = null;
  // Decode and validate userData
  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({
        status: false,
        error: "Invalid userData",
        message: "Invalid userData"
      });
    }
  }

  // Validate company_id
  if (!decodedUserData || !decodedUserData.company_id) {
    return res.status(400).json({
      status: false,
      error: "Company ID is required",
      message: "Company ID is required"
    });
  }
  const company_id = decodedUserData.company_id;
  let query = "";
  let queryArray = [];
  // Update attendance request
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
    const updateResult = await queryDb(query, queryArray);
    if (Type != "Rm" && ApprovalStatus == "1") {
      // 1. Fetch leave request details
      const leaveDetails = await queryDb(
        `SELECT leave_id, employee_id, leave_rule_id, start_date, end_date, start_half, end_half 
         FROM leaves WHERE leave_id = ? AND company_id = ?`,
        [ApprovalRequests_id, company_id]
      );
      if (leaveDetails.length > 0) {

        const leave = leaveDetails[0];

        // 2. Calculate leave days

        let leaveDays = calculateLeaveDays(leave.start_date, leave.end_date, leave.start_half, leave.end_half);

        const currentYear = new Date(leave.start_date).getFullYear();
        // console.log(currentYear);
        // 3. Get employee leave balance
        const balanceResults = await queryDb(
          `SELECT * FROM leave_balance 
           WHERE employee_id = ? AND leave_rules_id = ? AND company_id = ? AND ? BETWEEN session_start AND session_end`,
          [leave.employee_id, leave.leave_rule_id, company_id, leave.start_date]
        );

        if (balanceResults.length > 0) {
          const balance = balanceResults[0];

          // let used = balance.used_leaves + leaveDays;
          // let remaining = balance.total_leaves - used;

          // console.log(balance.used_leaves, leaveDays);
          // console.log(used, remaining);



          // ////// Ensure numeric values
          const usedLeaves = parseFloat(balance.used_leaves) || 0;
          const totalLeaves = parseFloat(balance.total_leaves) || 0;
          const leaveDaysNum = parseFloat(leaveDays) || 0;

          let used = usedLeaves + leaveDaysNum;
          let remaining = totalLeaves - used;

          // console.log("usedLeaves:", usedLeaves, "leaveDays:", leaveDaysNum);
          // console.log("used:", used, "remaining:", remaining);
          // 
          // if (remaining < 0) remaining = 0; // handle negative leaves

          // 4. Update leave balance
          await queryDb(
            `UPDATE leave_balance 
             SET used_leaves = ?, remaining_leaves = ?, last_updated = NOW() 
             WHERE id = ?`,
            [used, remaining, balance.id]
          );
        }
      }
    }
    return res.status(200).json({
      status: true,
      message: "Approval updated successfully"
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while processing the request",
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
