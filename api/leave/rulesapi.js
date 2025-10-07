const express = require("express");
const router = express.Router();
const db = require("../../DB/ConnectionSql");
const { json } = require("body-parser");
const { AdminCheck } = require("../../model/functlity/AdminCheck");

////// Fetch Department Employee //////////

// router.get("/fetch-department-employee", async (req, res) => {
//   try {
//     const { userData, search ,page=1,limit=10} = req.query;
//     if (!userData) {
//       return res.status(400).json({ status: false, message: "UserData is required." });
//     }

//     let decodedUserData;
//     try {
//       const decodedString = Buffer.from(userData, "base64").toString("utf-8");
//       decodedUserData = JSON.parse(decodedString);
//     } catch (error) {
//       return res.status(400).json({ status: false, message: "Invalid UserData format." });
//     }

//     const companyId = decodedUserData?.company_id;
//     if (!companyId) {
//       return res.status(400).json({ status: false, message: "Company ID is required." });
//     }

//     const employeeQuery = `
//       SELECT 
//         e.id,
//         e.employee_id,
//         e.leave_rule_id ,
//         CONCAT(e.first_name, " ", e.last_name) AS employee_name,
//         e.employee_type,
//         COALESCE(d1.name, '') AS department,
//         COALESCE(d2.name, '') AS sub_department,
//         COALESCE(GROUP_CONCAT(lr.leave_type), 'Unknown') AS leave_type
//       FROM 
//         employees e
//       LEFT JOIN 
//         departments d1 ON e.department = d1.id
//       LEFT JOIN 
//         departments d2 ON e.sub_department = d2.id
//       LEFT JOIN 
//         leave_rules lr ON FIND_IN_SET(lr.id, e.leave_rule_id)
//       WHERE
//         e.employee_status = 1 AND 
//         e.status = 1 AND 
//         e.delete_status = 0 AND 
//         e.company_id = ?
//       GROUP BY 
//         e.id
//     `;

//     const [employees] = await db.promise().query(employeeQuery, [companyId]);

//     if (employees.length === 0) {
//       return res
//         .status(404)
//         .json({ status: false, message: "No employee data found." });
//     }

//     return res.status(200).json({
//       status: true,
//       message: "Employee data fetched successfully.",
//       data: employees,
//       totalRecords: employees.length
//     });
//   } catch (err) {
//     console.error("Error fetching data:", err.message);
//     return res.status(500).json({
//       status: false,
//       message: "Error fetching department and employee data.",
//       error: err.message
//     });
//   }
// });


router.get("/fetch-department-employee", async (req, res) => {
  try {
    const { userData, search = "", page = 1, limit = 10, departmentId = 0, subDepartmentid = 0, employeeStatus = 1 } = req.query;

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
    if (!companyId) {
      return res.status(400).json({ status: false, message: "Company ID is required." });
    }

    // Pagination calculations
    const pageNumber = parseInt(page, 10) || 1;
    const pageLimit = parseInt(limit, 10) || 10;
    const offset = (pageNumber - 1) * pageLimit;

    // Base query with search filter
    let searchCondition = "";
    let params = [companyId];

    if (search) {
      searchCondition = ` AND (e.employee_id LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ? OR d1.name LIKE ? OR d2.name LIKE ?) `;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (departmentId && departmentId != 0) {
      searchCondition += ` AND e.department = ?`;
      params.push(departmentId);
    } else if (subDepartmentid && subDepartmentid != 0) {
      searchCondition += ` AND e.sub_department = ?`;
      params.push(subDepartmentid);
    }
    if (employeeStatus && employeeStatus == 1) {
      searchCondition += ` AND e.employee_status=1 and e.status=1 and e.delete_status=0 `;
    } else {
      searchCondition += ` AND (e.employee_status=0 or e.status=0 or e.delete_status=1) `;
    }

    // Count total records (for pagination)
    const countQuery = `
      SELECT COUNT(DISTINCT e.id) as totalRecords
      FROM employees e
      LEFT JOIN departments d1 ON e.department = d1.id
      LEFT JOIN departments d2 ON e.sub_department = d2.id
      WHERE e.company_id = ?
        ${searchCondition}
    `;

    const [countResult] = await db.promise().query(countQuery, params);
    const totalRecords = countResult[0]?.totalRecords || 0;

    if (totalRecords === 0) {
      return res.status(404).json({ status: false, message: "No employee data found." });
    }

    // Main query with LIMIT + OFFSET
    const employeeQuery = `
      SELECT 
        e.id,
        e.employee_id,
        e.leave_rule_id,
        CONCAT(e.first_name, " ", e.last_name, "-",e.employee_id) AS employee_name,
        e.employee_type,
        COALESCE(d1.name, '') AS department,
        COALESCE(d2.name, '') AS sub_department,
        COALESCE(GROUP_CONCAT(lr.leave_type), 'Unknown') AS leave_type
      FROM employees e
      LEFT JOIN departments d1 ON e.department = d1.id
      LEFT JOIN departments d2 ON e.sub_department = d2.id
      LEFT JOIN leave_rules lr ON FIND_IN_SET(lr.id, e.leave_rule_id)
      WHERE e.company_id = ?
        ${searchCondition}
      GROUP BY e.id
      ORDER BY e.first_name ASC
      LIMIT ? OFFSET ?
    `;

    // Add pagination params
    params.push(pageLimit, offset);

    const [employees] = await db.promise().query(employeeQuery, params);

    return res.status(200).json({
      status: true,
      message: "Employee data fetched successfully.",
      data: employees,
      totalRecords,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalRecords / pageLimit),
    });
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return res.status(500).json({
      status: false,
      message: "Error fetching department and employee data.",
      error: err.message,
    });
  }
});



/////////////////////////////////////////////
////////////  Rules Update  /////////////////
////////////////////////////////////////////

router.post("/RulesUpdate", (req, res) => {
  const {
    id,
    company_id,
    leave_type,
    description,
    leaves_allowed_year,
    weekends_leave,
    holidays_leave,
    creditable,
    accrual_frequency,
    accrual_period,
    under_probation,
    notice_period,
    encash_enabled,
    carry_forward,
    remaining_leaves,
    max_leaves_month,
    continuous_leaves,
    negative_leaves,
    future_dated_leaves,
    future_dated_leaves_after,
    backdated_leaves,
    backdated_leaves_up_to,
    apply_leaves_next_year,
    auto_deduction, deduction_count, deduction_date, deduction_start_date, deduction_end_date,
    userData
  } = req.body;
  const recordId = id;
  let decodedUserData = null;
  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(200).json({ status: false, error: "Invalid UserData" });
    }
  }
  const companyId = decodedUserData.id || company_id;
  // Check if record exists before updating
  const checkQuery = `SELECT * FROM leave_rules WHERE id = ?`;
  db.query(checkQuery, [id], (err, results) => {
    if (err) {
      console.error("SQL Error:", err);
      return res.status(200).json({
        status: false,
        message: "Error checking leave record.",
        error: err.message
      });
    }
    if (results.length === 0) {
      return res.status(200).json({
        status: false,
        message: "Record not found."
      });
    }
    // Update query
    const query = `
      UPDATE leave_rules
      SET 
        leave_type = ?,
        description = ?,
        leaves_allowed_year = ?,
        weekends_leave = ?,
        holidays_leave = ?,
        creditable = ?,
        accrual_frequency = ?,
        accrual_period = ?,
        under_probation = ?,
        notice_period = ?,
        encash_enabled = ?,
        carry_forward = ?,
        remaining_leaves = ?,
        max_leaves_month = ?,
        continuous_leaves = ?,
        negative_leaves = ?,
        future_dated_leaves = ?,
        future_dated_leaves_after = ?,
        backdated_leaves = ?,
        backdated_leaves_up_to = ?,
        apply_leaves_next_year = ?,
        auto_deduction=?, deduction_count=?, deduction_date=?, deduction_start_date=?, deduction_end_date=?
      WHERE id = ?
    `;
    const values = [
      leave_type,
      description,
      leaves_allowed_year,
      weekends_leave,
      holidays_leave,
      creditable,
      accrual_frequency,
      accrual_period,
      under_probation,
      notice_period,
      encash_enabled,
      carry_forward,
      remaining_leaves,
      max_leaves_month,
      continuous_leaves,
      negative_leaves,
      future_dated_leaves,
      future_dated_leaves_after,
      backdated_leaves,
      backdated_leaves_up_to,
      apply_leaves_next_year, auto_deduction, deduction_count, deduction_date, deduction_start_date, deduction_end_date,
      id
    ];
    db.query(query, values, (err, results) => {
      if (err) {
        console.error("SQL Error:", err);
        return res.status(200).json({
          status: false,
          message: "Error updating leave record.",
          error: err.message
        });
      }
      if (results.affectedRows === 0) {
        return res.status(200).json({
          status: false,
          message:
            "No changes made. The data might be identical to the existing record."
        });
      }
      res.status(200).json({
        status: true,
        message: "Data updated successfully.",
        affectedRows: results.affectedRows
      });
    });
  });
});

/////////////////////////////////////////////
/////////// Assign Rules Fetch /////////////
////////////////////////////////////////////

router.get("/Assign_Rules", (req, res) => {
  const { UserId, userData } = req.query;

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

  if (!decodedUserData?.company_id || !decodedUserData?.id) {
    return res.status(400).json({ status: false, message: "Company ID and Employee ID are required." });
  }


  const query = `SELECT id, leave_type FROM leave_rules where company_id=?`;
  const values = [decodedUserData.company_id];
  db.query(query, values, (error, results) => {
    if (error) {
      console.error("Error fetching leave rules:", error);
      return res.status(200).send("Error fetching leave rules");
    }
    if (results.length > 0) {
      const sql = `SELECT id, leave_rule_id FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 and id = ?`;
      db.query(sql, [UserId], (error2, results2) => {
        if (error2) {
          console.error("Error fetching related data:", error2);
          return res.status(500).send("Error fetching related data");
        }
        if (results2.length > 0) {
          res.status(200).json({
            status: true,
            data: results,
            relatedData: results2,
            message: "Data found."
          });
        } else {
          res.status(200).json({
            status: false,
            data: results,
            relatedData: [],
            message: "No related data found."
          });
        }
      });
    } else {
      res.status(200).send("No leave rules found");
    }
  });
});

///////////////////////////////////////////
/////////// Rules Fetch Api //////////////
//////////////////////////////////////////

// router.post("/update-leave-type", (req, res) => {
//   const { id, leave_rule_id, userData } = req.body;
//   let decodedUserData = "";
//   if (userData) {
//     try {
//       const decodedString = Buffer.from(userData, "base64").toString("utf-8");
//       decodedUserData = JSON.parse(decodedString);
//     } catch (error) {
//       return res.status(200).json({ status: false, error: "Invalid userData" });
//     }
//   } else {
//     return res.status(200).json({ status: false, error: "Invalid userData" });
//   }
//   if (!decodedUserData || !decodedUserData.company_id) {
//     return res.status(200).json({ status: false, error: "ID is required" });
//   }
//   const company_id = decodedUserData.company_id;
//   if (!id || !leave_rule_id || !company_id) {
//     return res.status(200).json({
//       status: false,
//       message: "Employee ID, leave_rule_id, and company ID are required."
//     });
//   }

//   let leaveTypes;

//   try {
//     leaveTypes =
//       typeof leave_rule_id === "string"
//         ? JSON.parse(leave_rule_id)
//         : leave_rule_id;
//   } catch (err) {
//     console.error("Invalid format for leave_rule_id:", err);
//     return res.status(200).json({
//       status: false,
//       message:
//         "Invalid format for leave_rule_id. It must be a valid JSON array."
//     });
//   }

//   if (!Array.isArray(leaveTypes) || leaveTypes.length === 0) {
//     return res.status(200).json({
//       status: false,
//       message: "leave_rule_id must be a non-empty array."
//     });
//   }

//   const sql = `UPDATE employees SET leave_rule_id = ? WHERE id = ?`;

//   const updatedLeaveRuleId = leaveTypes.join(",");
//   console.log(updatedLeaveRuleId);
//   db.query(sql, [updatedLeaveRuleId, id], (err, results) => {
//     if (err) {
//       console.error("SQL Error:", err);
//       return res.status(500).json({
//         status: false,
//         message: "Error updating leave record.",
//         error: err.message
//       });
//     }

//     if (results.affectedRows == 0) {
//       return res.status(200).json({
//         status: false,
//         message:
//           "No changes made. The data might be identical to the existing record."
//       });
//     }

//     res.status(200).json({
//       status: true,
//       message: "Data updated successfully.",
//       affectedRows: results.affectedRows
//     });
//   });
// });

// router.post("/update-leave-type", (req, res) => {
//   const { id, leave_rule_id, userData } = req.body;
//   let decodedUserData = "";

//   if (userData) {
//     try {
//       const decodedString = Buffer.from(userData, "base64").toString("utf-8");
//       decodedUserData = JSON.parse(decodedString);
//     } catch (error) {
//       return res.status(200).json({ status: false, error: "Invalid userData" });
//     }
//   } else {
//     return res.status(200).json({ status: false, error: "Invalid userData" });
//   }

//   if (!decodedUserData || !decodedUserData.company_id) {
//     return res.status(200).json({ status: false, error: "ID is required" });
//   }

//   const company_id = decodedUserData.company_id;
//   if (!id || !leave_rule_id || !company_id) {
//     return res.status(200).json({
//       status: false,
//       message: "Employee ID, leave_rule_id, and company ID are required."
//     });
//   }

//   let leaveTypes;
//   try {
//     leaveTypes =
//       typeof leave_rule_id === "string"
//         ? JSON.parse(leave_rule_id)
//         : leave_rule_id;
//   } catch (err) {
//     console.error("Invalid format for leave_rule_id:", err);
//     return res.status(200).json({
//       status: false,
//       message:
//         "Invalid format for leave_rule_id. It must be a valid JSON array."
//     });
//   }

//   if (!Array.isArray(leaveTypes) || leaveTypes.length === 0) {
//     return res.status(200).json({
//       status: false,
//       message: "leave_rule_id must be a non-empty array."
//     });
//   }

//   const updatedLeaveRuleId = leaveTypes.join(",");

//   // Step 1: Update employee record
//   const sql = `UPDATE employees SET leave_rule_id = ? WHERE id = ?`;
//   db.query(sql, [updatedLeaveRuleId, id], (err, results) => {
//     if (err) {
//       console.error("SQL Error:", err);
//       return res.status(500).json({
//         status: false,
//         message: "Error updating leave record.",
//         error: err.message
//       });
//     }

//     if (results.affectedRows == 0) {
//       return res.status(200).json({
//         status: false,
//         message:
//           "No changes made. The data might be identical to the existing record."
//       });
//     }

//     // Step 2: Handle leave_balance for each assigned rule
//     const currentYear = new Date().getFullYear();

//     leaveTypes.forEach((ruleId) => {
//       // Fetch leave rule details
//       db.query(
//         "SELECT * FROM leave_rules WHERE id = ? AND company_id = ?",
//         [ruleId, company_id],
//         (err, ruleResults) => {
//           if (err || ruleResults.length === 0) return;
//           const rule = ruleResults[0];

//           // Check if leave_balance already exists
//           db.query(
//             "SELECT * FROM leave_balance WHERE employee_id = ? AND leave_rules_id = ? AND year = ?",
//             [id, ruleId, currentYear],
//             (err, balResults) => {
//               if (err) return;

//               if (balResults.length === 0) {
//                 // Insert new leave balance
//                 const insertQuery = `
//                   INSERT INTO leave_balance 
//                   (company_id, employee_id, leave_rules_id, year, total_leaves, used_leaves, remaining_leaves, assign_date, add_stamp, last_updated) 
//                   VALUES (?, ?, ?, ?, ?, 0, ?, NOW(), NOW(), NOW())
//                 `;
//                 db.query(
//                   insertQuery,
//                   [
//                     company_id,
//                     id,
//                     ruleId,
//                     currentYear,
//                     rule.leaves_allowed_year,
//                     rule.leaves_allowed_year
//                   ]
//                 );
//               } else {
//                 // Update existing balance (respect carry_forward or reset logic)
//                 const balance = balResults[0];
//                 let newRemaining = balance.remaining_leaves;

//                 if (!rule.carry_forward) {
//                   newRemaining = rule.leaves_allowed_year - balance.used_leaves;
//                   if (newRemaining < 0) newRemaining = 0;
//                 }

//                 const updateQuery = `
//                   UPDATE leave_balance 
//                   SET total_leaves = ?, remaining_leaves = ?, last_updated = NOW()
//                   WHERE id = ?
//                 `;
//                 db.query(updateQuery, [
//                   rule.leaves_allowed_year,
//                   newRemaining,
//                   balance.id
//                 ]);
//               }
//             }
//           );
//         }
//       );
//     });

//     res.status(200).json({
//       status: true,
//       message: "Leave rules assigned & leave balance updated successfully.",
//       affectedRows: results.affectedRows
//     });
//   });
// });


// router.post("/update-leave-type", (req, res) => {
//   const { id, leave_rule_id, userData, assign_date } = req.body;
//   let decodedUserData = "";

//   if (userData) {
//     try {
//       const decodedString = Buffer.from(userData, "base64").toString("utf-8");
//       decodedUserData = JSON.parse(decodedString);
//     } catch (error) {
//       return res.status(200).json({ status: false, error: "Invalid userData" });
//     }
//   } else {
//     return res.status(200).json({ status: false, error: "Invalid userData" });
//   }

//   if (!decodedUserData || !decodedUserData.company_id) {
//     return res.status(200).json({ status: false, error: "Company ID missing" });
//   }

//   const company_id = decodedUserData.company_id;
//   if (!id || !leave_rule_id || !company_id) {
//     return res.status(200).json({
//       status: false,
//       message: "Employee ID, leave_rule_id, and company ID are required."
//     });
//   }

//   let leaveTypes;
//   try {
//     leaveTypes = typeof leave_rule_id === "string" ? JSON.parse(leave_rule_id) : leave_rule_id;
//   } catch (err) {
//     return res.status(200).json({
//       status: false,
//       message: "leave_rule_id must be valid JSON array"
//     });
//   }

//   if (!Array.isArray(leaveTypes) || leaveTypes.length === 0) {
//     return res.status(200).json({
//       status: false,
//       message: "leave_rule_id must be a non-empty array."
//     });
//   }

//   const updatedLeaveRuleId = leaveTypes.join(",");

//   // Step 1: Update employee record
//   const sql = `UPDATE employees SET leave_rule_id = ? WHERE id = ?`;
//   db.query(sql, [updatedLeaveRuleId, id], (err, results) => {
//     if (err) {
//       return res.status(500).json({
//         status: false,
//         message: "Error updating leave record.",
//         error: err.message
//       });
//     }

//     if (results.affectedRows == 0) {
//       return res.status(200).json({
//         status: false,
//         message: "No changes made."
//       });
//     }

//     const currentYear = new Date().getFullYear();

//     // Fetch employee joining date
//     db.query("SELECT date_of_Joining FROM employees WHERE id = ?", [id], (err, empResults) => {
//       if (err || empResults.length === 0) return;

//       const joiningDate = new Date(empResults[0].date_of_Joining);
//       const effectiveAssignDate = assign_date ? new Date(assign_date) : joiningDate;
//       const startOfYear = new Date(currentYear, 0, 1);
//       const endOfYear = new Date(currentYear, 11, 31);

//       // Use whichever is later: joining date or assign date
//       const effectiveDate = effectiveAssignDate > joiningDate ? effectiveAssignDate : joiningDate;

//       leaveTypes.forEach((ruleId) => {
//         db.query(
//           "SELECT * FROM leave_rules WHERE id = ? AND company_id = ?",
//           [ruleId, company_id],
//           (err, ruleResults) => {
//             if (err || ruleResults.length === 0) return;
//             const rule = ruleResults[0];

//             db.query(
//               "SELECT * FROM leave_balance WHERE employee_id = ? AND leave_rules_id = ? AND year = ?",
//               [id, ruleId, currentYear],
//               (err, balResults) => {
//                 if (err) return;

//                 // Calculate prorated leaves
//                 const monthsRemaining = (endOfYear.getMonth() - effectiveDate.getMonth()) + 1;

//                 const proratedLeaves = Math.round((rule.leaves_allowed_year / 12) * monthsRemaining);

//                 if (balResults.length === 0) {
//                   // Insert prorated leave balance
//                   const insertQuery = `
//                     INSERT INTO leave_balance 
//                     (company_id, employee_id, leave_rules_id, year, total_leaves, used_leaves, remaining_leaves, assign_date, add_stamp, last_updated) 
//                     VALUES (?, ?, ?, ?, ?, 0, ?, ?, NOW(), NOW())
//                   `;
//                   db.query(insertQuery, [
//                     company_id,
//                     id,
//                     ruleId,
//                     currentYear,
//                     proratedLeaves,
//                     proratedLeaves,
//                     effectiveDate
//                   ]);
//                 } else {
//                   // Update existing balance
//                   const balance = balResults[0];
//                   let newRemaining = balance.remaining_leaves;

//                   if (!rule.carry_forward) {
//                     newRemaining = proratedLeaves - balance.used_leaves;
//                     if (newRemaining < 0) newRemaining = 0;
//                   }

//                   const updateQuery = `
//                     UPDATE leave_balance 
//                     SET total_leaves = ?, remaining_leaves = ?, assign_date=?, last_updated = NOW()
//                     WHERE id = ?
//                   `;
//                   db.query(updateQuery, [
//                     proratedLeaves,
//                     newRemaining,
//                     effectiveDate,
//                     balance.id
//                   ]);
//                 }
//               }
//             );
//           }
//         );
//       });
//     });

//     res.status(200).json({
//       status: true,
//       message: "Leave rules assigned & leave balance updated successfully.",
//       affectedRows: results.affectedRows
//     });
//   });
// });















router.post("/update-leave-type", (req, res) => {
  const { id, leave_rule_id, userData, assign_date } = req.body;
  let decodedUserData = "";

  // Decode userData
  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(200).json({ status: false, error: "Invalid userData" });
    }
  } else {
    return res.status(200).json({ status: false, error: "Invalid userData" });
  }

  if (!decodedUserData || !decodedUserData.company_id) {
    return res.status(200).json({ status: false, error: "Company ID missing" });
  }

  const company_id = decodedUserData.company_id;
  if (!id || !leave_rule_id || !company_id) {
    return res.status(200).json({
      status: false,
      message: "Employee ID, leave_rule_id, and company ID are required."
    });
  }

  // Parse leave rule id array
  let leaveTypes;
  try {
    leaveTypes = typeof leave_rule_id === "string" ? JSON.parse(leave_rule_id) : leave_rule_id;
  } catch (err) {
    return res.status(200).json({
      status: false,
      message: "leave_rule_id must be valid JSON array"
    });
  }

  if (!Array.isArray(leaveTypes) || leaveTypes.length === 0) {
    return res.status(200).json({
      status: false,
      message: "leave_rule_id must be a non-empty array."
    });
  }

  const updatedLeaveRuleId = leaveTypes.join(",");

  // Step 1: Update employee record with leave_rule_id
  const sql = `UPDATE employees SET leave_rule_id = ? WHERE id = ?`;
  db.query(sql, [updatedLeaveRuleId, id], (err, results) => {
    if (err) {
      return res.status(500).json({
        status: false,
        message: "Error updating employee record.",
        error: err.message
      });
    }

    if (results.affectedRows == 0) {
      return res.status(200).json({
        status: false,
        message: "No changes made."
      });
    }

    const currentYear = new Date().getFullYear();

    // Step 2: Get employee joining date
    db.query("SELECT date_of_Joining FROM employees WHERE id = ?", [id], (err, empResults) => {
      if (err || empResults.length === 0) {
        return res.status(500).json({ status: false, message: "Employee not found" });
      }

      const joiningDate = new Date(empResults[0].date_of_Joining);
      const effectiveAssignDate = assign_date ? new Date(assign_date) : joiningDate;

      leaveTypes.forEach((ruleId) => {
        db.query(
          "SELECT * FROM leave_rules WHERE id = ? AND company_id = ?",
          [ruleId, company_id],
          (err, ruleResults) => {
            if (err || ruleResults.length === 0) return;
            const rule = ruleResults[0];

            db.query(
              "SELECT * FROM leave_balance WHERE employee_id = ? AND leave_rules_id = ? AND year = ?",
              [id, ruleId, currentYear],
              (err, balResults) => {
                if (err) return;

                // ---- SESSION HANDLING ----
                const sessionStartMonth = rule.apply_leaves_next_year || 1; // default Jan
                let sessionStartDate = new Date(currentYear, sessionStartMonth - 1, 1);
                let sessionEndDate;

                if (sessionStartMonth === 1) {
                  // Jan-Dec session
                  sessionEndDate = new Date(currentYear, 11, 31);
                } else {
                  // Example: start April 2025 -> end March 2026
                  sessionEndDate = new Date(currentYear + 1, sessionStartMonth - 1, 0);
                }

                // Effective Date = max(joiningDate, assignDate, sessionStartDate)
                const effectiveDate = new Date(Math.max(
                  effectiveAssignDate.getTime(),
                  joiningDate.getTime(),
                  sessionStartDate.getTime()
                ));

                // ---- PRORATE CALCULATION ----
                const totalMonths =
                  (sessionEndDate.getFullYear() - effectiveDate.getFullYear()) * 12 +
                  (sessionEndDate.getMonth() - effectiveDate.getMonth()) + 1;

                const proratedLeaves = Math.round((rule.leaves_allowed_year / 12) * totalMonths);

                // ---- INSERT OR UPDATE BALANCE ----
                if (balResults.length === 0) {
                  const insertQuery = `
                    INSERT INTO leave_balance 
                    (company_id, employee_id, leave_rules_id, year, total_leaves, used_leaves, remaining_leaves, assign_date, add_stamp, last_updated) 
                    VALUES (?, ?, ?, ?, ?, 0, ?, ?, NOW(), NOW())
                  `;
                  db.query(insertQuery, [
                    company_id,
                    id,
                    ruleId,
                    currentYear,
                    proratedLeaves,
                    proratedLeaves,
                    effectiveDate
                  ]);
                } else {
                  const balance = balResults[0];
                  let newRemaining = balance.remaining_leaves;

                  if (!rule.carry_forward) {
                    newRemaining = proratedLeaves - balance.used_leaves;
                    if (newRemaining < 0) newRemaining = 0;
                  }

                  const updateQuery = `
                    UPDATE leave_balance 
                    SET total_leaves = ?, remaining_leaves = ?, assign_date=?, last_updated = NOW()
                    WHERE id = ?
                  `;
                  db.query(updateQuery, [
                    proratedLeaves,
                    newRemaining,
                    effectiveDate,
                    balance.id
                  ]);
                }
              }
            );
          }
        );
      });
    });

    res.status(200).json({
      status: true,
      message: "Leave rules assigned & leave balance updated successfully.",
      affectedRows: results.affectedRows
    });
  });
});



//////////////////////////////////////////////
////////////  Rules Fetch  //////////////////
////////////////////////////////////////////

router.get("/rulesfetch", (req, res) => {
  const userData = req.query.userData;
  let rule_id = req.query.rule_id;

  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(200).json({ status: false, error: "Invalid userData" });
    }
  } else {
    return res.status(200).json({ status: false, error: "Invalid userData" });
  }
  if (!decodedUserData || !decodedUserData.company_id) {
    return res.status(200).json({ status: false, error: "ID is required" });
  }
  const query = `SELECT * FROM leave_rules Where company_id=? and id=?`;
  const values = [decodedUserData.company_id, rule_id];
  db.query(query, values, (err, results) => {
    if (err) {
      console.error("SQL Error:", err);
      return res.status(200).json({
        status: false,
        message: "Error fetching leave records.",
        error: err.message
      });
    }
    res.status(200).json({
      status: true,
      message: "Data fetched successfully.",
      data: results
    });
  });
});

//////////////////////////////////////////
//////////// Leave Balance //////////////
////////////////////////////////////////

router.get("/Balance", (req, res) => {
  const { page = 1, limit = 10, userData, departmentId = 0, subDepartmentid = 0, employeeStatus = 1,search='' } = req.query;
  const offset = (page - 1) * limit;


  let decodedUserData = null;

  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({ status: false, error: "Invalid userData" });
    }
  }

  if (!decodedUserData.company_id) {
    return res
      .status(400)
      .json({ status: false, error: "Company ID is missing or invalid" });
  }
  let searchCondition = "";
  let params = [decodedUserData.company_id];

  if (search) {
    searchCondition = ` AND (e.employee_id LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ? ) `;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (departmentId && departmentId != 0) {
    searchCondition += ` AND e.department = ?`;
    params.push(departmentId);
  } else if (subDepartmentid && subDepartmentid != 0) {
    searchCondition += ` AND e.sub_department = ?`;
    params.push(subDepartmentid);
  }
  if (employeeStatus && employeeStatus == 1) {
    searchCondition += ` AND e.employee_status=1 and e.status=1 and e.delete_status=0 `;
  } else {
    searchCondition += ` AND (e.employee_status=0 or e.status=0 or e.delete_status=1) `;
  }

  let query = `
    SELECT e.id,
      e.employee_id,
     CONCAT(e.first_name, " ", e.last_name, "-",e.employee_id) AS first_name,
      lr.leave_type,
      -- Monthly balance leaves: Calculate balance per month
      CASE
          -- If no leaves are applied in the current month
          WHEN COALESCE(SUM(CASE 
                              WHEN l.leave_type = lr.leave_type 
                              AND YEAR(l.start_date) = YEAR(CURDATE()) 
                              AND MONTH(l.start_date) = MONTH(CURDATE()) 
                              THEN DATEDIFF(l.end_date, l.start_date) + 1
                              ELSE 0
                            END), 0) = 0 
          THEN lr.max_leaves_month  -- If no leaves applied, full max leaves for the month
          ELSE 
              -- If leaves are applied in the current month, subtract applied leave from max leaves per month
              lr.max_leaves_month - 
              COALESCE(SUM(CASE 
                            WHEN l.leave_type = lr.leave_type 
                            AND YEAR(l.start_date) = YEAR(CURDATE()) 
                            AND MONTH(l.start_date) = MONTH(CURDATE()) 
                            THEN DATEDIFF(l.end_date, l.start_date) + 1
                            ELSE 0
                          END), 0)
      END AS monthly_balance_leave
    FROM 
        employees e
    JOIN 
        leave_rules lr ON FIND_IN_SET(lr.id, e.leave_rule_id) > 0  -- Join to fetch the leave rules assigned to the employee
    LEFT JOIN 
        leaves l ON e.id = l.employee_id  -- Left join to get the applied leave details
    WHERE 
      e.company_id=? ${searchCondition}
    GROUP BY 
        e.id, lr.id, lr.leave_type  -- Group by employee and leave type
    ORDER BY 
        e.first_name, lr.leave_type
    LIMIT ${db.escape(parseInt(limit))} OFFSET ${db.escape(parseInt(offset))};
  `;

  // Query to count the total number of records (employees)
  let countQuery = `
    SELECT COUNT(DISTINCT e.id) AS total
    FROM employees e
    JOIN leave_rules lr ON FIND_IN_SET(lr.id, e.leave_rule_id) > 0
    LEFT JOIN leaves l ON e.id = l.employee_id
    WHERE e.company_id=? ${searchCondition} ;
  `;

  // Execute the queries
  db.query(query, params, (err, results) => {
    if (err) {
      console.error("Database query failed:", err.message);
      return res
        .status(500)
        .json({ status: false, error: "Database query failed" });
    }

    // Execute the count query to get the total number of employees
    db.query(countQuery, params, (err, countResults) => {
      if (err) {
        console.error("Count query failed:", err.message);
        return res
          .status(500)
          .json({ status: false, error: "Total count query failed" });
      }

      // Transform results into the desired format
      const result = {};
      results.forEach((item) => {
        // Create a unique key based on id and employee_id
        const key = `${item.id}-${item.employee_id}`;

        // Check if this key already exists in the result object
        if (!result[key]) {
          result[key] = {
            id: item.id,
            employee_id: item.employee_id,
            first_name: item.first_name
          };
        }

        result[key][item.leave_type] = item.monthly_balance_leave;
      });

      // Convert the result object back to an array
      const transformedData = Object.values(result);

      // Send the response with the transformed data and total count
      return res.status(200).json({
        status: true,
        data: transformedData,
        total: countResults[0].total // Use the total from the count query
      });
    });
  });
});

// router.get("/Balance", (req, res) => {
//   const {userData, page = 1, limit = 10 } = req.query;
//   const offset = (page - 1) * limit;

//   if (!userData) {
//     return res
//       .status(400)
//       .json({ status: false, message: "UserData is required." });
//   }
//   let decodedUserData;
//   try {
//     const decodedData = Buffer.from(userData, "base64").toString("utf-8");
//     decodedUserData = JSON.parse(decodedData);
//   } catch (error) {
//     return res
//       .status(400)
//       .json({ status: false, message: "Invalid UserData format." });
//   }
//   const companyId = decodedUserData?.company_id;
//   if (!companyId) {
//     return res
//       .status(400)
//       .json({ status: false, message: "Company ID is required." });
//   }
//   const query = `
//     SELECT
//         e.id,
//         e.employee_id,
//         e.first_name,
//         lr.leave_type,
//         CASE
//             WHEN COALESCE(SUM(CASE
//                                 WHEN l.leave_type = lr.leave_type
//                                 AND YEAR(l.start_date) = YEAR(CURDATE())
//                                 AND MONTH(l.start_date) = MONTH(CURDATE())
//                                 THEN DATEDIFF(l.end_date, l.start_date) + 1
//                                 ELSE 0
//                               END), 0) = 0
//             THEN lr.max_leaves_month
//             ELSE
//                 lr.max_leaves_month -
//                 COALESCE(SUM(CASE
//                               WHEN l.leave_type = lr.leave_type
//                               AND YEAR(l.start_date) = YEAR(CURDATE())
//                               AND MONTH(l.start_date) = MONTH(CURDATE())
//                               THEN DATEDIFF(l.end_date, l.start_date) + 1
//                               ELSE 0
//                             END), 0)
//         END AS monthly_balance_leave
//     FROM
//         employees e
//     JOIN
//         leave_rules lr ON FIND_IN_SET(lr.id, e.leave_rule_id) > 0
//     LEFT JOIN
//         leaves l ON e.id = l.employee_id
//     WHERE
//         e.employee_status = 1
//         AND e.status = 1
//         AND e.delete_status = 0
//         AND e.company_id = ${db.escape(companyId)} -- Filter by company ID
//     GROUP BY
//         e.id, lr.id, lr.leave_type
//     ORDER BY
//         e.first_name, lr.leave_type
//     LIMIT ${db.escape(parseInt(limit))} OFFSET ${db.escape(parseInt(offset))};
//   `;

//   db.query(query, (err, results) => {
//     if (err) {
//       console.error("Database query failed:", err.message);
//       return res
//         .status(500)
//         .json({ status: false, error: "Database query failed" });
//     }
//     const result = {};
//     results.forEach((item) => {
//       const key = item.employee_id;
//       if (!result[key]) {
//         result[key] = {
//           id: item.id,
//           employee_id: item.employee_id,
//           first_name: item.first_name,
//           leave_balances: [],
//         };
//       }
//       result[key].leave_balances.push({
//         leave_type: item.leave_type,
//         monthly_balance_leave: item.monthly_balance_leave,
//       });
//     });

//     const transformedData = Object.values(result);
//     return res.status(200).json({
//       status: true,
//       data: transformedData,
//       total: results.length, // Dynamic total for pagination
//     });
//   });
// });

// Balance route
// router.get("/Balance", (req, res) => {
//   const { userData, page = 1, limit = 10 } = req.query; // Default page=1 and limit=10

//   let decodedUserData;
//   if (userData) {
//     try {
//       const decodedString = Buffer.from(userData, "base64").toString("utf-8");
//       decodedUserData = JSON.parse(decodedString);
//     } catch (error) {
//       return res.status(400).json({ status: false, error: "Invalid userData" });
//     }
//   }
//   // Calculate OFFSET for pagination
//   const offset = (page - 1) * limit;
//   // Main query with LIMIT and OFFSET
//   const query = `
//     SELECT
//       e.employee_id,
//       e.first_name,
//       lr.leave_type,
//       lr.leaves_allowed_year AS totalleave,
//       lr.leaves_allowed_year - COALESCE(SUM(CASE
//                   WHEN l.leave_type = lr.leave_type THEN DATEDIFF(l.end_date, l.start_date) + 1
//                   ELSE 0
//                 END), 0) AS balance_leave,
//       COALESCE(SUM(CASE
//                   WHEN l.leave_type = lr.leave_type THEN DATEDIFF(l.end_date, l.start_date) + 1
//                   ELSE 0
//                 END), 0) AS apply_leave
//     FROM
//       employees e
//     JOIN
//       leave_rules lr ON FIND_IN_SET(lr.id, e.leave_rule_id) > 0
//     LEFT JOIN
//       leaves l ON e.id = l.employee_id
//     WHERE
//       1 = 1
//     GROUP BY
//       e.id, lr.id, lr.leave_type
//     ORDER BY
//       e.first_name
//     LIMIT ${db.escape(parseInt(limit))} OFFSET ${db.escape(parseInt(offset))};
//   `;
//   const countQuery = `
//     SELECT COUNT(*) AS total
//     FROM employees e
//     JOIN leave_rules lr ON FIND_IN_SET(lr.id, e.leave_rule_id) > 0
//     LEFT JOIN leaves l ON e.id = l.employee_id;
//   `;
//   // Execute the queries
//   db.query(query, (err, results) => {
//     if (err) {
//       console.error("Database query failed:", err.message);
//       return res
//         .status(500)
//         .json({ status: false, error: "Database query failed" });
//     }
//     db.query(countQuery, (countErr, countResults) => {
//       if (countErr) {
//         console.error("Count query failed:", countErr.message);
//         return res
//           .status(500)
//           .json({ status: false, error: "Count query failed" });
//       }
//       const totalRecords = countResults[0]?.total || 0;
//       // Add serial number (srnu) to each result
//       const data = results.map((record, index) => ({
//         srnu: offset + index + 1, // Serial number starts from 1
//         ...record
//       }));
//       // Send the response
//       return res.status(200).json({
//         status: true,
//         data, // Paginated data
//         total: totalRecords, // Total number of records
//         page: parseInt(page),
//         limit: parseInt(limit),
//         totalPages: Math.ceil(totalRecords / limit)
//       });
//     });
//   });
// });

////////////////////////////////////////////
///// GET LeavType For SelectBox //////////
///////////////////////////////////////////

router.get("/leavesTypes", (req, res) => {
  const { leave_type, userData } = req.query;

  if (!userData) {
    return res
      .status(400)
      .json({ status: false, message: "UserData is required." });
  }

  let decodedUserData = null;
  try {
    const decodedData = Buffer.from(userData, "base64").toString("utf-8");
    decodedUserData = JSON.parse(decodedData);
  } catch (error) {
    return res
      .status(400)
      .json({ status: false, message: "Invalid UserData format." });
  }

  const companyId = decodedUserData?.company_id;
  if (!companyId) {
    return res
      .status(400)
      .json({ status: false, message: "Company ID is required." });
  }

  const query = "SELECT leave_type FROM leave_rules WHERE company_id = ?";
  db.query(query, [companyId], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res
        .status(200)
        .json({ status: false, message: "Database error." });
    }

    return res.status(200).json({
      status: true,
      data: result
    });
  });
});

////////////////////////////////////////////
///////////  Rules Insert Api  ////////////
//////////////////////////////////////////

router.post("/rules", (req, res) => {
  const { leave_type, userData } = req.body;
  let decodedUserData = null;
  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({ status: false, error: "Invalid userData" });
    }
  }
  const query = "INSERT INTO leave_rules (leave_type,company_id) VALUES (?,?)";
  db.query(query, [leave_type, decodedUserData.company_id], (err, results) => {
    if (err) {
      // console.log(err);
      return res.status(200).json({ status: false, error: "Database error" });
    }
    return res.status(200).json({
      status: true,
      message: "Leave rule added successfully",
      data: results
    });
  });
});

router.get("/api/fetchType", async (req, res) => {
  const { userData, type, searchData = '' } = req.query;
  let decodedUserData = null;
  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({ status: false, error: "Invalid userData" });
    }
  }

  if (!decodedUserData || !decodedUserData.id) {
    return res
      .status(400)
      .json({ status: false, error: "Employee ID is required" });
  }
  const isAdmin = await AdminCheck(
    decodedUserData.id,
    decodedUserData.company_id
  );
  if (isAdmin === false) {
    return res.status(200).json({
      status: false,
      error: "You do not have access to this functionality",
      message: "You do not have access to this functionality"
    });
  }
  let query;
  let queryParams = "";
  queryParams = [decodedUserData.company_id];
  query = `SELECT id, leave_type FROM leave_rules WHERE company_id = ?`;
  if (searchData) {
    query += ` AND leave_type LIKE ?`;
    queryParams.push(`%${searchData}%`);
  }

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ status: false, status: false, error: "Server error" });
    }
    if (results.length === 0) {
      return res.status(200).json({ status: false, error: "No data found" });
    }
    res.json({
      data: results,
      status: true,
      message: "Data found"
    });
  });
});

// Deleteapi
router.post("/api/Deleteapi", (req, res) => {
  const { id, userData } = req.body;
  let decodedUserData = null;
  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({ status: false, error: "Invalid userData" });
    }
  }
  const company_id = decodedUserData.company_id;
  if (!id || !company_id) {
    return res.status(400).json({ status: false, message: "ID is required." });
  }
  db.query(
    "DELETE FROM leave_rules WHERE id = ? AND company_id= ? ",
    [id, company_id],
    (err, results) => {
      if (err) {
        return res.status(500).json({
          status: false,
          message: "Error updating leave.",
          error: err.message
        });
      }
      if (results.affectedRows === 0) {
        return res
          .status(200)
          .json({ status: false, message: "Not found or no changes made." });
      }
      return res
        .status(200)
        .json({ status: true, message: "Data deleted successfully" });
    }
  );
});

module.exports = router;