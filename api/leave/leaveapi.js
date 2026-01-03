const express = require("express");
const router = express.Router();
const db = require("../../DB/ConnectionSql");

///////// leaveapi.js///////////////

// router.post("/leave", async (req, res) => {
//   //   // leave_type in this come leave_rule_id
//   const { leave_type, userData, start_date, end_date, reason, start_half, end_half ,} = req.body;

//   // Basic validation to ensure required fields are provided
//   if (!leave_type || !userData || !start_date || !end_date || !reason) {
//     return res.status(400).json({
//       status: false,
//       message: "Missing required fields: leave_type, userData, start_date, end_date, or reason."
//     });
//   }

//   // Parse dates and calculate leave days
//   const startDate = new Date(start_date);
//   const endDate = new Date(end_date);

//   // Validate that start_date is before end_date
//   if (startDate > endDate) {
//     return res.status(400).json({
//       status: false,
//       message: "Start date cannot be after end date."
//     });
//   } let decodedUserData = null;
//   if (userData) {
//     try {
//       const decodedString = Buffer.from(userData, "base64").toString("utf-8");
//       decodedUserData = JSON.parse(decodedString);
//     } catch (error) {
//       return res.status(400).json({ status: false, error: "Invalid userData" });
//     }
//   } else {
//     return res.status(400).json({ status: false, error: "Missing userData" });
//   }
//   const employeeId = decodedUserData?.id;

//   const EmployeeData = await db.promise().query('SELECT id, leave_rule_id, first_name, last_name, date_of_Joining, contact_number, probation_period, probation_status,notice_period FROM employees WHERE id=?', [employeeId]);
//   if (EmployeeData.length === 0) {
//     return res.status(400).json({ status: false, message: 'Employee Not found' });
//   }
//   const [existingLeave] = await db.promise().query(
//     "SELECT leave_id FROM leaves WHERE employee_id = ? AND company_id=? AND start_date = ? AND end_date = ? AND status != 3", // status != 3 means ignore cancelled leaves
//     [decodedUserData.id, decodedUserData.company_id, start_date, end_date]
//   );

//   if (existingLeave.length > 0) {
//     return res.status(400).json({
//       status: false,
//       message: "Leave for this date range has already been applied."
//     });
//   }
//   const [LeaveRuleDataGet] = await db.promise().query("SELECT id, company_id, leave_type, description, leaves_allowed_year, weekends_leave, holidays_leave, creditable, accrual_frequency, accrual_period, under_probation, notice_period, encash_enabled, carry_forward, remaining_leaves, max_leaves_month, continuous_leaves, negative_leaves, future_dated_leaves, future_dated_leaves_after, backdated_leaves, backdated_leaves_up_to, apply_leaves_next_year FROM leave_rules WHERE id = ?", [leave_type]);
//   // Check if leave type exists
//   if (!LeaveRuleDataGet || LeaveRuleDataGet.length === 0) {
//     return res.status(400).json({
//       status: false,
//       message: "Invalid leave type."
//     });
//   }

//   if (LeaveRuleDataGet[0].under_probation == 0 && EmployeeData[0].probation_status == 1) {
//     return res.status(400).json({
//       status: false,
//       message: "You are under probation period."
//     });
//   }
//   if (LeaveRuleDataGet[0].notice_period == 0 && EmployeeData[0].notice_period == 1) {
//     return res.status(400).json({
//       status: false,
//       message: "You are under notice period."
//     });
//   }

//   let leaveDays = calculateLeaveDays(startDate, endDate, start_half, end_half);

//   // Get leave type settings from the database
//   const [leave_typeGet] = await db.promise().query("SELECT id, leave_type, max_leaves_month, continuous_leaves, future_dated_leaves, future_dated_leaves_after, negative_leaves, backdated_leaves, backdated_leaves_up_to, apply_leaves_next_year FROM leave_rules WHERE id = ?", [leave_type]);

//   // Check if leave type exists
//   if (!leave_typeGet || leave_typeGet.length === 0) {
//     return res.status(400).json({
//       status: false,
//       message: "Invalid leave type."
//     });
//   }

//   const currentDate = new Date();

//   if (startDate >= currentDate && endDate >= currentDate) {
//     // Future leave validation
//     if (leave_typeGet[0].future_dated_leaves_after > 0) {
//       const futureLeavesDateLimit = new Date(currentDate.getTime() + leave_typeGet[0].future_dated_leaves_after);
//       if (startDate > futureLeavesDateLimit) {
//         return res.status(400).json({
//           status: false,
//           message: `You can only take leave after ${futureLeavesDateLimit.toLocaleDateString()}.`
//         });
//       }
//     }
//     if (leave_typeGet[0].continuous_leaves <= leaveDays) {
//       return res.status(400).json({
//         status: false,
//         message: `You cannot take continuous leaves for ${leaveDays} days. Only ${leave_typeGet[0].continuous_leaves} days are allowed.`
//       });
//     }
//   } else if (startDate <= currentDate && endDate <= currentDate) {
//     // Backdated leave validation
//     if (leave_typeGet[0].negative_leaves == 0) {
//       return res.status(400).json({
//         status: false,
//         message: "You cannot take backdated leaves."
//       });
//     }
//     let currentDateValue = new Date(currentDate.getTime());

//     // Convert the backdated limit into a Date by subtracting days
//     const backdatedDays = leave_typeGet[0].backdated_leaves_up_to || 0; // fallback in case it's undefined
//     const backdatedLimit = new Date(currentDateValue.getTime() - (backdatedDays * 24 * 60 * 60 * 1000));

//     if (new Date(startDate) < backdatedLimit) {
//       return res.status(400).json({
//         status: false,
//         message: `You can only take backdated leaves up to ${backdatedLimit.toLocaleDateString()}.`
//       });
//     }
//     if (leave_typeGet[0].backdated_leaves < leaveDays) {
//       return res.status(400).json({
//         status: false,
//         message: `You cannot take backdated leaves for ${leaveDays} days. Only ${leave_typeGet[0].backdated_leaves} days are allowed.`
//       });
//     }
//   }



//   try {
//     let RmIdValue = 0;
//     // Step 1: Get the reporting manager ID if multi_level_approve is enabled
//     const [settingResult] = await db
//       .promise()
//       .query(
//         "SELECT multi_level_approve FROM settings WHERE type=? and company_id = ?",
//         ["Leave_setting", decodedUserData.company_id]
//       );

//     if (settingResult.length > 0) {
//       const multiLeaveApprove = settingResult[0].multi_level_approve;
//       if (multiLeaveApprove == 1) {
//         const [managerResults] = await db.promise().query(
//           "SELECT reporting_manager FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 and id = ? AND company_id = ?",
//           [decodedUserData.id, decodedUserData.company_id]
//         );
//         if (managerResults.length === 0) {
//           return res.status(200).json({
//             status: false,
//             error: "Employee not found",
//             message: "Invalid employee ID or company ID"
//           });
//         }
//         RmIdValue = managerResults[0].reporting_manager || 0;
//       }
//     }
//     // Step 2: Insert leave record into the database

//     const [insertResult] = await db.promise().query(
//       "INSERT INTO leaves (company_id,employee_id,leave_type, leave_rule_id, start_date, end_date, status, reason,rm_id,start_half,end_half) VALUES (?,?,?,?, ?, ?, ?, ?, ?,?,?)",
//       [decodedUserData.company_id, decodedUserData.id, leave_typeGet[0].leave_type, leave_type, start_date, end_date, 1, reason, RmIdValue, start_half, end_half]
//     );
//     return res.status(200).json({
//       status: true,
//       message: "Data inserted successfully.",
//       id: insertResult.insertId
//     });
//   } catch (error) {
//     console.error("Error processing leave request:", error);
//     return res.status(200).json({
//       status: false,
//       message: "Internal server error",
//       error: error.message
//     });
//   }
// });


router.post("/leave", async (req, res) => {
  //   // leave_type in this come leave_rule_id
  const { leave_type, userData, start_date, end_date, reason, start_half, end_half, employeeId } = req.body;
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

  if (employeeId != decodedUserData?.id) {
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



router.get("/fetchleave", (req, res) => {
  const { userData } = req.query;
  let decodedUserData = null;

  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      console.error("Error decoding userData:", error);
      return res.status(400).json({ status: false, error: "Invalid userData format" });
    }
  }

  if (!decodedUserData) {
    return res.status(400).json({ status: false, error: "User data is required" });
  }

  const { id } = decodedUserData;
  const limit = parseInt(req.query.limit, 10) || 10;
  const page = parseInt(req.query.page, 10) || 1;
  const offset = (page - 1) * limit;

  // Fetch the reporting manager
  const query = `
      SELECT reporting_manager
      FROM employees
      WHERE employee_status = 1 AND status = 1 AND delete_status = 0 AND id = ?
  `;
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("Error fetching reporting manager:", err);
      return res.status(500).json({ status: false, error: "Error fetching reporting manager" });
    }
    if (!result || result.length === 0) {
      return res.status(404).json({ status: false, error: "Employee not found" });
    }

    const reportingManagerId = result[0].reporting_manager;

    // Fetch leave records
    let leaveQuery = `
          SELECT 
              e.employee_id, 
              e.first_name, 
              e.last_name,
              e.type, 
              e.reporting_manager,
              a.leave_type, 
              a.status, 
              a.leave_rule_id,
              a.start_date, 
              a.end_date, 
              a.leave_id,
              a.start_half, 
              a.end_half
          FROM 
              employees e
          INNER JOIN 
              leaves a ON e.id = a.employee_id
          WHERE 
              e.employee_status = 1 AND e.status = 1 AND e.delete_status = 0 AND a.deletestatus = 0
              AND a.employee_id = ?
          ORDER BY 
              a.leave_id DESC 
          LIMIT ? OFFSET ?
      `;

    db.query(leaveQuery, [id, limit, offset], (err, results) => {
      if (err) {
        console.error("Error fetching leave records:", err);
        return res.status(500).json({ status: false, error: "Error fetching leave records" });
      }

      // **Processing leave days count with half-day logic**
      const processedRecords = results.map((record) => {
        let leaveDays = calculateLeaveDays(record.start_date, record.end_date, record.start_half, record.end_half);
        return { ...record, leave_days: leaveDays };
      });

      // Count query for pagination
      let countQuery = `
              SELECT COUNT(a.leave_id) AS total 
              FROM employees e 
              INNER JOIN leaves a ON e.id = a.employee_id
              WHERE e.employee_status = 1 AND e.status = 1 AND e.delete_status = 0 AND a.deletestatus = 0 
              AND a.employee_id = ?
          `;

      db.query(countQuery, [id], (err, countResults) => {
        if (err) {
          console.error("Error counting leave records:", err);
          return res.status(500).json({ status: false, error: "Error counting leave records" });
        }

        const total = countResults[0]?.total || 0;

        res.json({
          status: true,
          records: processedRecords,
          total,
          page,
          limit
        });
      });
    });
  });
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

//////////// Fetch leaveTypes ////////////

router.post("/FetchLeaveType", (req, res) => {
  const { userData } = req.body;
  if (!userData) {
    return res.status(200).json({ status: false, error: "Missing UserData" });
  }
  let decodedUserData;
  try {
    const decodedString = Buffer.from(userData, "base64").toString("utf-8");
    decodedUserData = JSON.parse(decodedString);
  } catch (error) {
    return res
      .status(200)
      .json({ status: false, error: "Invalid UserData format" });
  }
  const employeeId = decodedUserData.id;
  if (!employeeId) {
    return res
      .status(200)
      .json({ status: false, error: "Employee ID is missing" });
  }
  // Query to fetch employee leave_rule_id
  const fetchLeaveRuleIdsQuery = `
    SELECT leave_rule_id 
    FROM employees 
    WHERE  employee_status=1 and status=1 and delete_status=0 and id = ?`;
  db.query(fetchLeaveRuleIdsQuery, [employeeId], (err, employeeResult) => {
    if (err) {
      console.error("Database query error:", err);
      return res
        .status(200)
        .json({ status: false, error: "Database query failed" });
    }
    if (employeeResult.length === 0 || !employeeResult[0].leave_rule_id) {
      return res.status(200).json({
        status: false,
        error: "Employee not found or no leave rules assigned"
      });
    }

    if (
      !employeeResult[0].leave_rule_id ||
      employeeResult[0].leave_rule_id == "" ||
      employeeResult[0].leave_rule_id == 0
    ) {
      return res.status(200).json({
        status: false,
        error: "no leave rules assigned"
      });
    }

    // Ensure leave_rule_id is always treated as an array
    let leaveRuleIds;
    if (typeof employeeResult[0].leave_rule_id === "string") {
      leaveRuleIds = employeeResult[0].leave_rule_id.split(",");
    } else {
      leaveRuleIds = [employeeResult[0].leave_rule_id.toString()];
    }

    // Query to fetch leave types
    const fetchLeaveTypesQuery = `
      SELECT leave_type 
      FROM leave_rules 
      WHERE id IN (?)`;
    db.query(fetchLeaveTypesQuery, [leaveRuleIds], (err, leaveTypesResult) => {
      if (err) {
        console.error("Database query error:", err);
        return res
          .status(200)
          .json({ status: false, error: "Database query failed" });
      }
      if (leaveTypesResult.length === 0) {
        return res.status(200).json({
          status: false,
          error: "No leave types found for the given leave rules"
        });
      }
      return res.status(200).json({ status: true, result: leaveTypesResult });
    });
  });
});

//////// Leave Cancel //////////////

router.post("/LeaveCancel", (req, res) => {
  const { leave_id, status, userData } = req.body;
  let decodedUserData = null;
  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      console.error("Error decoding userData:", error);
      return res.status(200).json({
        status: false,
        message: "Invalid userData format."
      });
    }
  }
  // Validate leave_id
  if (!leave_id || isNaN(leave_id)) {
    return res.status(200).json({
      status: false,
      message: "Valid leave ID is required."
    });
  }
  // Update the leave record
  db.query(
    "UPDATE leaves SET status = 0 WHERE leave_id = ?",
    [leave_id],
    (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(200).json({
          status: false,
          message: "Error updating leave.",
          error: err.message
        });
      }
      if (result.affectedRows === 0) {
        return res.status(200).json({
          status: false,
          message: "Leave not found or no changes made."
        });
      }
      return res.status(200).json({
        status: true,
        message:
          status === 0
            ? "Leave canceled successfully. Status set to 0."
            : "Status updated to 1."
      });
    }
  );
});

// yuvraj code new
const decodeUserData = (userData) => {
  try {
    const decodedString = Buffer.from(userData, "base64").toString("utf-8");
    return JSON.parse(decodedString);
  } catch (error) {
    return null;
  }
};

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

router.get("/api/leaveApprovalLog", async (req, res) => {
  try {
    const { data, userData } = req.query;
    let decodedUserData = null;
    if (userData) {
      decodedUserData = decodeUserData(userData);
      if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({
          status: false,
          message: "Invalid userData",
          error: "Invalid userData"
        });
      }
    } else {
      return res
        .status(400)
        .json({
          status: false,
          message: "userData is required",
          error: "Missing userData"
        });
    }

    // Parse filters
    let startDate = data?.startDate || formatDate(new Date());
    let endDate = data?.endDate || formatDate(new Date());
    let searchData = data?.searchData || null;
    let EmployeeId = data?.EmployeeId || null;

    // Query to fetch attendance requests
    const query = `
   SELECT 
      l.leave_id,
      l.employee_id, 
      l.company_id, 
      l.rm_status, 
      l.rm_id, 
      l.rm_remark, 
      l.admin_id, 
      l.admin_status, 
      l.admin_remark,   
      l.status, 
      l.reason, 
      l.created,
      l.start_half,
      l.end_half,
    l.leave_type,  
           l.start_date, 
           l.end_date, 
          DATEDIFF( l.end_date,  l.start_date) + 1 AS leave_days,

        Emp.employee_id, 
          Emp.first_name, 
          Emp.last_name,
          Emp.type, 
          Emp.reporting_manager
  FROM 
      leaves AS l
  INNER JOIN 
      employees AS Emp 
      ON Emp.id = l.employee_id
  WHERE 
      l.employee_id = ? 
      AND (
          -- Case 1: Manager's requests
          l.rm_id = ? 
          -- Case 2: admin/CEO/HR with no RM assigned
          OR (
              EXISTS (
                  SELECT 1 
                  FROM employees 
                  WHERE 
                      id = ? 
                      AND company_id = ? 
                      AND FIND_IN_SET(type, 'admin,ceo,hr') > 0
              ) 
              AND l.rm_id = 0
          )
          
          -- Case 3: Admin/CEO/HR with RM assigned and approved
          OR (
              EXISTS (
                  SELECT 1 
                  FROM employees 
                  WHERE 
                      id = ? 
                      AND company_id = ? 
                      AND FIND_IN_SET(type, 'admin,ceo,hr') > 0
              ) 
              AND l.rm_id != 0 
              AND l.rm_status = 1
          )
      )
  ORDER BY 
      l.leave_id DESC;
`;

    const queryParams = [
      EmployeeId,
      decodedUserData.id,
      decodedUserData.id,
      decodedUserData.company_id,
      decodedUserData.id,
      decodedUserData.company_id
    ];

    // Execute the query
    const [results] = await db.promise().query(query, queryParams);

    // Count total records for pagination
    const countQuery =
      "SELECT COUNT(leave_id) AS total FROM leaves WHERE 1 = 1";
    const [countResults] = await db.promise().query(countQuery);

    const total = countResults[0]?.total || 0;

    // Add serial number (srnu) to each result
    const requestsWithSrnu = results.map((request, index) => ({
      srnu: index + 1,
      ...request
    }));

    res.json({
      status: true,
      requests: requestsWithSrnu,
      total
    });
  } catch (err) {
    console.error("Error fetching attendance approval log:", err);
    res
      .status(500)
      .json({ status: false, error: "Server error", message: err.message });
  }
});


router.post("/api/ChackViewDetails", (req, res) => {
  const { userData, Logid } = req.body;
  let decodedUserData = null;
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
  if (!decodedUserData || !decodedUserData.company_id) {
    return res.status(400).json({
      status: false,
      error: "ID is required",
      message: "ID is required"
    });
  }
  const company_id = decodedUserData.company_id;
  if (!company_id) {
    return res.status(400).json({
      status: false,
      error: "Company ID is missing or invalid",
      message: "Company ID is missing or invalid"
    });
  }

  const query = `SELECT AR.rm_status,Ar.id, AR.rm_id,AR.employee_id, AR.admin_id, AR.admin_status, AR.request_type,AR.rm_remark,AR.admin_remark, AR.request_date, AR.in_time, AR.out_time, AR.status, AR.reason, AR.created, e.first_name AS employee_first_name, e.employee_id, d.name AS department_name, em.first_name AS Rm FROM attendance_requests AS AR INNER JOIN employees AS e ON e.id = AR.employee_id LEFT JOIN departments AS d ON e.department = d.id LEFT JOIN employees AS em ON e.reporting_manager = em.id WHERE AR.company_id = ? AND AR.id=?`;

  db.query(query, [company_id, Logid], (err, results) => {
    if (err) {
      return res.status(500).json({
        status: false,
        message: "Database error occurred while fetching employees",
        error: err.message || err
      });
    }
    if (results.length === 0) {
      return res.status(200).json({
        status: false,
        message: "No employees found for this company"
      });
    }

    res.json({
      status: true,
      data: results[0],
      message: "Data found successfully"
    });
  });
});

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
