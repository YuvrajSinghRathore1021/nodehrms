const express = require("express");
const router = express.Router();
const db = require("../../DB/ConnectionSql");
const { json } = require("body-parser");
const { AdminCheck } = require("../../model/functlity/AdminCheck");
const calculateLeaveDays = require("../../utils/calculateLeaveDays");
const leaveconversion = require("../../utils/leave/leaveconversion");
////// Fetch Department Employee //////////

// web cheak A
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
    } if (subDepartmentid && subDepartmentid != 0) {
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

////////////  Rules Update  /////////////////

// /////web cheak A -working proper - old 
// router.post("/RulesUpdate", (req, res) => {
//   const {
//     id,
//     company_id,
//     leave_type,
//     description,
//     leaves_allowed_year,
//     weekends_leave,
//     holidays_leave,
//     creditable,
//     accrual_frequency,
//     accrual_period,
//     under_probation,
//     notice_period,
//     encash_enabled,
//     carry_forward,
//     remaining_leaves,
//     max_leaves_month,
//     continuous_leaves,
//     negative_leaves,
//     future_dated_leaves,
//     future_dated_leaves_after,
//     backdated_leaves,
//     backdated_leaves_up_to,
//     apply_leaves_next_year,
//     auto_deduction, deduction_count, deduction_date, deduction_start_date, deduction_end_date,

//     userData, leave_number_hide = 0, max_negative_leaves = 0
//   } = req.body;
//   const recordId = id;
//   let decodedUserData = null;
//   if (userData) {
//     try {
//       const decodedString = Buffer.from(userData, "base64").toString("utf-8");
//       decodedUserData = JSON.parse(decodedString);
//     } catch (error) {
//       return res.status(200).json({ status: false, error: "Invalid UserData" });
//     }
//   }
//   const companyId = decodedUserData.id || company_id;
//   // Check if record exists before updating
//   const checkQuery = `SELECT * FROM leave_rules WHERE id = ?`;
//   db.query(checkQuery, [id], (err, results) => {
//     if (err) {
//       // console.error("SQL Error:", err);
//       return res.status(200).json({
//         status: false,
//         message: "Error checking leave record.",
//         error: err.message
//       });
//     }
//     if (results.length === 0) {
//       return res.status(200).json({
//         status: false,
//         message: "Record not found."
//       });
//     }
//     // Update query
//     const query = `
//       UPDATE leave_rules
//       SET 
//         leave_type = ?,
//         description = ?,
//         leaves_allowed_year = ?,
//         weekends_leave = ?,
//         holidays_leave = ?,
//         creditable = ?,
//         accrual_frequency = ?,
//         accrual_period = ?,
//         under_probation = ?,
//         notice_period = ?,
//         encash_enabled = ?,
//         carry_forward = ?,
//         remaining_leaves = ?,
//         max_leaves_month = ?,
//         continuous_leaves = ?,
//         negative_leaves = ?,
//         max_negative_leaves=?,
//         future_dated_leaves = ?,
//         future_dated_leaves_after = ?,
//         backdated_leaves = ?,
//         backdated_leaves_up_to = ?,
//         apply_leaves_next_year = ?,
//         auto_deduction=?, deduction_count=?, deduction_date=?, deduction_start_date=?, deduction_end_date=?,leave_number_hide=?
//       WHERE id = ?
//     `;
//     const values = [
//       leave_type,
//       description,
//       leaves_allowed_year,
//       weekends_leave,
//       holidays_leave,
//       creditable,
//       accrual_frequency,
//       accrual_period,
//       under_probation,
//       notice_period,
//       encash_enabled,
//       carry_forward,
//       remaining_leaves,
//       max_leaves_month,
//       continuous_leaves,
//       negative_leaves,
//       max_negative_leaves,
//       future_dated_leaves,
//       future_dated_leaves_after,
//       backdated_leaves,
//       backdated_leaves_up_to,
//       apply_leaves_next_year, auto_deduction, deduction_count, deduction_date, deduction_start_date, deduction_end_date,
//       leave_number_hide, id
//     ];
//     db.query(query, values, (err, results) => {
//       if (err) {
//         console.error("SQL Error:", err);
//         return res.status(200).json({
//           status: false,
//           message: "Error updating leave record.",
//           error: err.message
//         });
//       }
//       if (results.affectedRows === 0) {
//         return res.status(200).json({
//           status: false,
//           message:
//             "No changes made. The data might be identical to the existing record."
//         });
//       }
//       res.status(200).json({
//         status: true,
//         message: "Data updated successfully.",
//         affectedRows: results.affectedRows
//       });
//     });
//   });
// });

router.post("/RulesUpdate", async (req, res) => {
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
    auto_deduction,
    deduction_count,
    deduction_date,
    deduction_start_date,
    deduction_end_date,
    userData,
    leave_number_hide = 0,
    max_negative_leaves = 0,
    rule_category = 'regular',
    max_carry_forward = null,
    requires_approval = 1,
    approval_levels = 1,
    change_reason = '',
    effective_from = null,
    effective_to = null,
    eligible_after_days = 0
  } = req.body;

  let monthlyLeaveStructurenew = generateMonthlyLeaveStructure(leaves_allowed_year, apply_leaves_next_year)
  let monthlyLeaveJSON = JSON.stringify(monthlyLeaveStructurenew);



  let decodedUserData = null;
  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(200).json({ status: false, error: "Invalid UserData" });
    }
  }

  const companyId = decodedUserData?.company_id || company_id;
  const updatedBy = decodedUserData?.id || 0;

  if (!id || !companyId) {
    return res.status(200).json({
      status: false,
      message: "Rule ID and Company ID are required."
    });
  }

  try {
    let impactType = 'minor';
    // Step 1: Get current rule data
    const [currentRules] = await db.promise().query(
      `SELECT * FROM leave_rules WHERE id = ? AND company_id = ?`,
      [id, companyId]
    );

    if (currentRules.length === 0) {
      return res.status(200).json({
        status: false,
        message: "Leave rule not found."
      });
    }

    const oldRule = currentRules[0];

    // Step 2: Archive current version to history table
    await db.promise().query(
      `INSERT INTO leave_rules_history 
       (rule_id, company_id, leave_type, description, leave_number_hide,
        leaves_allowed_year, weekends_leave, holidays_leave, creditable,
        accrual_frequency, accrual_period, under_probation, notice_period,
        encash_enabled, forward_enabled, carry_forward, remaining_leaves,
        max_leaves_month, continuous_leaves, negative_leaves, max_negative_leaves,
        future_dated_leaves, future_dated_leaves_after, backdated_leaves,
        backdated_leaves_up_to, apply_leaves_next_year, eligible_after_days,
        auto_deduction, deduction_count, deduction_date, deduction_start_date,
        deduction_end_date, version, changed_by, changed_at, change_reason)
       VALUES (?, ?, ?, ?, ?, ?,  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        oldRule.id, oldRule.company_id, oldRule.leave_type, oldRule.description,
        oldRule.leave_number_hide, oldRule.leaves_allowed_year,
        oldRule.weekends_leave, oldRule.holidays_leave, oldRule.creditable,
        oldRule.accrual_frequency, oldRule.accrual_period, oldRule.under_probation,
        oldRule.notice_period, oldRule.encash_enabled, oldRule.forward_enabled,
        oldRule.carry_forward, oldRule.remaining_leaves, oldRule.max_leaves_month,
        oldRule.continuous_leaves, oldRule.negative_leaves, oldRule.max_negative_leaves,
        oldRule.future_dated_leaves, oldRule.future_dated_leaves_after,
        oldRule.backdated_leaves, oldRule.backdated_leaves_up_to,
        oldRule.apply_leaves_next_year, oldRule?.eligible_after_days || 0,
        oldRule.auto_deduction, oldRule.deduction_count, oldRule.deduction_date,
        oldRule.deduction_start_date, oldRule.deduction_end_date,
        oldRule.version || 1, updatedBy, change_reason || 'Rule updated'
      ]
    );

    // Step 3: Update the rule with new values and increment version
    const updateQuery = `
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
        max_negative_leaves = ?,
        future_dated_leaves = ?,
        future_dated_leaves_after = ?,
        backdated_leaves = ?,
        backdated_leaves_up_to = ?,
        apply_leaves_next_year = ?,
        auto_deduction = ?,
        deduction_count = ?,
        deduction_date = ?,
        deduction_start_date = ?,
        deduction_end_date = ?,
        leave_number_hide = ?,
        rule_category = ?,
        max_carry_forward = ?,
        requires_approval = ?,
        approval_levels = ?,
        effective_from = ?,
        effective_to = ?,
        version = version + 1,
        changed_by = ?,
        changed_at = NOW(),
        change_reason = ?,
        updated_by = ?,
        updated = NOW(),
        monthly_leave_structure=?
      WHERE id = ?
    `;

    const updateValues = [
      leave_type, description, leaves_allowed_year, weekends_leave,
      holidays_leave, creditable, accrual_frequency, accrual_period,
      under_probation, notice_period, encash_enabled, carry_forward,
      remaining_leaves, max_leaves_month, continuous_leaves, negative_leaves,
      max_negative_leaves, future_dated_leaves, future_dated_leaves_after,
      backdated_leaves, backdated_leaves_up_to, apply_leaves_next_year,
      auto_deduction, deduction_count, deduction_date, deduction_start_date,
      deduction_end_date, leave_number_hide, rule_category, max_carry_forward,
      requires_approval, approval_levels, effective_from, effective_to,
      updatedBy, change_reason, updatedBy, monthlyLeaveJSON, id
    ];

    const [updateResult] = await db.promise().query(updateQuery, updateValues);

    if (updateResult.affectedRows === 0) {
      return res.status(200).json({
        status: false,
        message: "No changes made. The data might be identical to the existing record."
      });
    }

    // Step 4: Log to audit table
    await db.promise().query(
      `INSERT INTO leave_audit_log 
       (action_type, reference_id, rule_id, company_id, performed_by, old_value, new_value, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'rule_updated',
        id,
        id,
        companyId,
        updatedBy,
        JSON.stringify({
          leaves_allowed_year: oldRule.leaves_allowed_year,
          carry_forward: oldRule.carry_forward,
          accrual_frequency: oldRule.accrual_frequency,
          negative_leaves: oldRule.negative_leaves
        }),
        JSON.stringify({
          leaves_allowed_year,
          carry_forward,
          accrual_frequency,
          negative_leaves
        }),
        change_reason || 'Rule updated'
      ]
    );

    // Step 5: Check if critical fields changed and track impact
    const criticalFields = ['leaves_allowed_year', 'carry_forward', 'accrual_frequency',
      'negative_leaves', 'max_negative_leaves', 'eligible_after_days'];

    const changedFields = [];
    for (const field of criticalFields) {
      if (JSON.stringify(oldRule[field]) !== JSON.stringify(eval(field))) {
        changedFields.push(field);
      }
    }
    let date = new Date()
    const { sessionStartDate, sessionEndDate } = getSessionDates(
      date,
      apply_leaves_next_year || 1
    );


    if (changedFields.length > 0) {
      // Find all affected employees
      const [affectedEmployees] = await db.promise().query(
        `SELECT DISTINCT employee_id 
         FROM leave_balance 
         WHERE leave_rules_id = ? AND status = 1`, [id]
      );

      // Determine impact type

      if (changedFields.includes('leaves_allowed_year') || changedFields.includes('carry_forward')) {
        impactType = 'major';
      } else if (changedFields.includes('accrual_frequency')) {
        impactType = 'moderate';
      }

      // Track impact for each employee
      for (const emp of affectedEmployees) {
        await db.promise().query(
          `INSERT INTO rule_impact_tracking 
           (employee_id, rule_id, company_id, changed_by, changed_at,
            old_total_leaves, new_total_leaves, old_carry_forward, new_carry_forward,
            old_accrual_frequency, new_accrual_frequency, old_eligible_after_days,
            new_eligible_after_days, impact_type)
           VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            emp.employee_id,
            id, companyId, updatedBy, oldRule.leaves_allowed_year,
            leaves_allowed_year, oldRule.carry_forward, carry_forward, oldRule.accrual_frequency,
            accrual_frequency, oldRule?.eligible_after_days || 0, eligible_after_days || 0, impactType
          ]
        );
      }

      // Step 6: Recalculate balances for affected employees if needed
      if (changedFields.includes('leaves_allowed_year') || changedFields.includes('accrual_frequency')) {
        await db.promise().query(
          `UPDATE leave_balance lb
          INNER JOIN leave_rules lr ON lb.leave_rules_id = lr.id
           INNER JOIN employees e ON lb.employee_id = e.id
           SET lb.total_leaves = lr.leaves_allowed_year,
               lb.remaining_leaves = lb.total_leaves - lb.used_leaves,
               lb.rule_version_at_calc = lr.version,
               lb.last_calculated_at = NOW(),
               lb.session_start=?, lb.session_end=?
                WHERE lb.leave_rules_id = ? AND lb.status = 1`,
          [sessionStartDate, sessionEndDate, id]
        );

      }
    }



    // Prepare response with impact summary
    const response = {
      status: true,
      message: "Rule updated successfully.",
      affectedRows: updateResult.affectedRows,
      new_version: (oldRule.version || 0) + 1,
      changes_made: {
        fields_updated: Object.keys(req.body).filter(k =>
          !['id', 'userData', 'change_reason'].includes(k)
        ),
        critical_changes: changedFields
      }
    };

    if (changedFields.length > 0) {
      response.impact = {
        type: impactType,
        // affected_employees_count: affectedEmployees?.length || 0,
        requires_recalculation: true,
        note: `${changedFields.join(', ')} changed - balances may need review`
      };
    }

    res.status(200).json(response);

  } catch (err) {
    // Rollback transaction on error

    console.error("RulesUpdate error:", err);

    // Log error
    try {
      await db.promise().query(
        `INSERT INTO leave_audit_log 
         (action_type, reference_id, company_id, notes)
         VALUES (?, ?, ?, ?)`,
        ['rule_updated', id, companyId, 'Error: ' + err.message]
      );
    } catch (logErr) {
      console.error("Error logging to audit:", logErr);
    }

    res.status(500).json({
      status: false,
      message: "Error updating leave rule.",
      error: err.message
    });
  }
});

/////////// Assign Rules Fetch /////////////

// web cheak A
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
      // console.error("Error fetching leave rules:", error);
      return res.status(200).send("Error fetching leave rules");
    }
    if (results.length > 0) {
      const sql = `SELECT id, leave_rule_id FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 and id = ?`;
      db.query(sql, [UserId], (error2, results2) => {
        if (error2) {
          // console.error("Error fetching related data:", error2);
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

// // web cheak A // proper working old --
// router.post("/update-leave-type", (req, res) => {
//   const { id, leave_rule_id, userData, assign_date } = req.body;
//   let decodedUserData = "";

//   // Decode userData
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

//   // Parse leave rule id array
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
//   db.query('SELECT leave_rule_id FROM employees WHERE id =? ', [id], (err, oldLeaveRuleidData) => {
//     if (err) {
//       console.error('Error fetching old leave_rule_id:', err);
//       return res.status(500).json({ error: 'Database error' });
//     }

//     const oldLeaveRuleid = oldLeaveRuleidData[0]?.leave_rule_id || "";

//     // Combine old and new leave_rule_ids (avoid duplicates)
//     let mergedLeaveRules = [];
//     if (oldLeaveRuleid) {
//       mergedLeaveRules = [
//         ...new Set([...oldLeaveRuleid.split(','), ...leaveTypes.map(String)])
//       ];
//     } else {
//       mergedLeaveRules = [...new Set(leaveTypes.map(String))];
//     }

//     const finalLeaveRuleId = mergedLeaveRules.join(",");
//     // Step 1: Update employee record with leave_rule_id
//     const sql = `UPDATE employees SET leave_rule_id = ? WHERE id = ?`;
//     db.query(sql, [finalLeaveRuleId, id], (err, results) => {
//       if (err) {
//         return res.status(500).json({
//           status: false,
//           message: "Error updating employee record.",
//           error: err.message
//         });
//       }

//       if (results.affectedRows == 0) {
//         return res.status(200).json({
//           status: false,
//           message: "No changes made."
//         });
//       }

//       const currentYear = new Date(assign_date).getFullYear();

//       // Step 2: Get employee joining date
//       db.query("SELECT date_of_Joining FROM employees WHERE id = ?", [id], (err, empResults) => {
//         if (err || empResults.length === 0) {
//           return res.status(500).json({ status: false, message: "Employee not found" });
//         }

//         const joiningDate = new Date(empResults[0].date_of_Joining);
//         const effectiveAssignDate = assign_date ? new Date(assign_date) : joiningDate;

//         leaveTypes.forEach((ruleId) => {
//           db.query(
//             "SELECT * FROM leave_rules WHERE id = ? AND company_id = ?",
//             [ruleId, company_id],
//             (err, ruleResults) => {
//               if (err || ruleResults.length === 0) return;
//               const rule = ruleResults[0];

//               db.query(
//                 "SELECT * FROM leave_balance WHERE employee_id = ? AND leave_rules_id = ? AND CURDATE() BETWEEN session_start AND session_end",
//                 [id, ruleId],
//                 (err, balResults) => {
//                   if (err) return;

//                   // ---- SESSION HANDLING ----
//                   const sessionStartMonth = rule.apply_leaves_next_year || 1; // default Jan
//                   let sessionStartDate = new Date(currentYear, sessionStartMonth - 1, 1);
//                   let sessionEndDate;

//                   if (sessionStartMonth === 1) {
//                     // Jan-Dec session
//                     sessionEndDate = new Date(currentYear, 11, 31);
//                   } else {
//                     // Example: start April 2025 -> end March 2026
//                     sessionEndDate = new Date(currentYear + 1, sessionStartMonth - 1, 0);
//                   }

//                   //// Effective Date = max(joiningDate, assignDate, sessionStartDate)
//                   // const effectiveDate = new Date(Math.max(
//                   //   effectiveAssignDate.getTime(),
//                   //   joiningDate.getTime(),
//                   //   sessionStartDate.getTime()
//                   // ));
//                   const effectiveDate = new Date(Math.max(
//                     effectiveAssignDate.getTime(),
//                     joiningDate.getTime()
//                   ));
//                   // console.log("assign_date=", assign_date)
//                   // console.log("effectiveAssignDate=", effectiveAssignDate)
//                   // console.log("effectiveDate=", effectiveDate)
//                   // console.log("sessionStartDate=", sessionStartDate)
//                   // console.log("sessionEndDate=", sessionEndDate)

//                   // ---- PRORATE CALCULATION ----
//                   const totalMonths =
//                     (sessionEndDate.getFullYear() - effectiveDate.getFullYear()) * 12 +
//                     (sessionEndDate.getMonth() - effectiveDate.getMonth()) + 1;

//                   const proratedLeaves = Math.round((rule.leaves_allowed_year / 12) * totalMonths);

//                   // ---- INSERT OR UPDATE BALANCE ----
//                   if (balResults.length === 0) {
//                     // rule?.apply_leaves_next_year
//                     // console.log(effectiveDate, rule?.apply_leaves_next_year)
//                     const { sessionStartDate, sessionEndDate } = getSessionDates(effectiveDate, rule?.apply_leaves_next_year);
//                     // console.log("sessionStartDate=", sessionStartDate, "sessionEndDate=", sessionEndDate)

//                     let session_start = sessionStartDate.toISOString().split('T')[0];
//                     let session_end = sessionEndDate.toISOString().split('T')[0];

//                     const insertQuery = `
//                     INSERT INTO leave_balance 
//                     (company_id, employee_id, leave_rules_id,  total_leaves, used_leaves, remaining_leaves, assign_date, add_stamp, last_updated, session_start, session_end) 
//                     VALUES (?, ?,  ?, ?, 0, ?, ?, NOW(), NOW(), ?, ?)
//                   `;
//                     db.query(insertQuery, [
//                       company_id,
//                       id,
//                       ruleId,
//                       proratedLeaves,
//                       proratedLeaves,
//                       effectiveDate,
//                       session_start, session_end
//                     ]);
//                   } else {
//                     const balance = balResults[0];
//                     let newRemaining = balance.remaining_leaves;

//                     if (!rule.carry_forward) {
//                       newRemaining = proratedLeaves - balance.used_leaves;
//                       if (newRemaining < 0) newRemaining = 0;
//                     }

//                     const updateQuery = `
//                     UPDATE leave_balance 
//                     SET total_leaves = ?, remaining_leaves = ?, assign_date=?, last_updated = NOW()
//                     WHERE id = ?
//                   `;
//                     db.query(updateQuery, [
//                       proratedLeaves,
//                       newRemaining,
//                       effectiveDate,
//                       balance.id
//                     ]);
//                   }
//                 }
//               );
//             }
//           );
//         });
//       });

//       res.status(200).json({
//         status: true,
//         message: "Leave rules assigned & leave balance updated successfully.",
//         affectedRows: results.affectedRows
//       });
//     });

//     // .../
//   });
// });

// function getSessionDates(referenceDate, resetMonth = 1) {
//   const refDate = new Date(referenceDate);

//   const year = refDate.getFullYear();
//   const month = refDate.getMonth() + 1;

//   let sessionStartDate, sessionEndDate;

//   if (month >= resetMonth) {
//     sessionStartDate = new Date(year, resetMonth - 1, 1, 12, 0, 0);
//     sessionEndDate = new Date(year + 1, resetMonth - 1, 0, 12, 0, 0);
//   } else {
//     sessionStartDate = new Date(year - 1, resetMonth - 1, 1, 12, 0, 0);
//     sessionEndDate = new Date(year, resetMonth - 1, 0, 12, 0, 0);
//   }

//   return { sessionStartDate, sessionEndDate };
// }

// new 

// web check A
router.post("/update-leave-type", async (req, res) => {
  const { id, leave_rule_id, userData, assign_date, change_reason = "Leave rules assigned" } = req.body;
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
  const performed_by = decodedUserData.id || 0;

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


  try {

    // Get current employee data
    const [empData] = await db.promise().query(
      `SELECT leave_rule_id, date_of_Joining, first_name, last_name 
       FROM employees WHERE id = ? AND company_id = ?`,
      [id, company_id]
    );

    if (empData.length === 0) {
      return res.status(404).json({ status: false, message: "Employee not found" });
    }

    const oldLeaveRuleId = empData[0].leave_rule_id || "";
    const joiningDate = new Date(empData[0].date_of_Joining);
    const effectiveAssignDate = assign_date ? new Date(assign_date) : joiningDate;

    // Get old rule IDs as array
    const oldRuleIds = oldLeaveRuleId ? oldLeaveRuleId.split(',').filter(id => id) : [];

    // Combine old and new leave_rule_ids (avoid duplicates)
    const mergedLeaveRules = [...new Set([...oldRuleIds, ...leaveTypes.map(String)])];
    const finalLeaveRuleId = mergedLeaveRules.join(",");

    // Step 1: Update employee record with leave_rule_id
    const [updateResult] = await db.promise().query(
      `UPDATE employees SET leave_rule_id = ? WHERE id = ? AND company_id = ?`,
      [finalLeaveRuleId, id, company_id]
    );

    if (updateResult.affectedRows === 0) {

      return res.status(200).json({
        status: false,
        message: "No changes made to employee record."
      });
    }

    // Log rule assignment in rule_assignment_log
    await db.promise().query(
      `INSERT INTO rule_assignment_log 
       (employee_id, rule_id, action, effective_date, total_leaves_assigned, performed_by, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        finalLeaveRuleId,
        'assigned',
        effectiveAssignDate,
        null,
        performed_by,
        change_reason
      ]
    );

    // Track added and removed rules
    const addedRules = leaveTypes.filter(ruleId => !oldRuleIds.includes(String(ruleId)));
    const removedRules = oldRuleIds.filter(ruleId => !leaveTypes.includes(Number(ruleId)));

    // Process each new rule
    const balanceResults = [];

    for (const ruleId of leaveTypes) {
      // Get rule details
      const [ruleResults] = await db.promise().query(
        `SELECT * FROM leave_rules WHERE id = ? AND company_id = ?`,
        [ruleId, company_id]
      );

      if (ruleResults.length === 0) {
        console.log(`Rule ID ${ruleId} not found, skipping...`);
        continue;
      }

      const rule = ruleResults[0];

      // Check if rule has effective date restrictions
      if (rule.effective_from && new Date(rule.effective_from) > new Date()) {
        console.log(`Rule ID ${ruleId} not effective yet, skipping...`);
        continue;
      }

      if (rule.effective_to && new Date(rule.effective_to) < new Date()) {
        console.log(`Rule ID ${ruleId} has expired, skipping...`);
        continue;
      }

      // Check existing balance
      const [balResults] = await db.promise().query(
        `SELECT * FROM leave_balance 
         WHERE employee_id = ? AND leave_rules_id = ? 
         AND CURDATE() BETWEEN session_start AND session_end`,
        [id, ruleId]
      );

      // Get session dates based on rule
      const { sessionStartDate, sessionEndDate } = getSessionDates(
        effectiveAssignDate,
        rule.apply_leaves_next_year || 1
      );

      // Calculate prorated leaves
      const proratedLeaves = calculateProratedLeaves(
        rule,
        joiningDate,
        effectiveAssignDate,
        sessionStartDate,
        sessionEndDate
      );

      if (balResults.length === 0) {
        // Insert new balance
        const [insertResult] = await db.promise().query(
          `INSERT INTO leave_balance 
           (company_id, employee_id, leave_rules_id, year, total_leaves, used_leaves, 
            remaining_leaves, old_balance, assign_date, session_start, session_end, 
            rule_version_at_calc, add_stamp, last_updated, status) 
           VALUES (?, ?, ?, YEAR(?), ?, 0, ?, 0, ?, ?, ?, ?, NOW(), NOW(), 1)`,
          [
            company_id,
            id,
            ruleId,
            sessionStartDate,
            proratedLeaves,
            proratedLeaves,
            effectiveAssignDate,
            sessionStartDate,
            sessionEndDate,
            rule.version || 1
          ]
        );

        balanceResults.push({
          rule_id: ruleId,
          action: 'inserted',
          total_leaves: proratedLeaves
        });
      } else {
        const balance = balResults[0];
        let newRemaining = balance.remaining_leaves;

        // Handle carry forward based on rule
        if (rule.carry_forward) {
          // Keep existing remaining leaves (carry forward)
          newRemaining = balance.remaining_leaves;
        } else {
          // Recalculate based on new rule
          newRemaining = proratedLeaves - balance.used_leaves;
          if (newRemaining < 0 && !rule.negative_leaves) {
            newRemaining = 0;
          }
        }

        // Update existing balance
        const [updateBalResult] = await db.promise().query(
          `UPDATE leave_balance 
           SET total_leaves = ?, 
               remaining_leaves = ?, 
               assign_date = ?, 
               rule_version_at_calc = ?,
               last_updated = NOW()
           WHERE id = ?`,
          [
            proratedLeaves,
            newRemaining,
            effectiveAssignDate,
            rule.version || 1,
            balance.id
          ]
        );

        balanceResults.push({
          rule_id: ruleId,
          action: 'updated',
          total_leaves: proratedLeaves,
          old_remaining: balance.remaining_leaves,
          new_remaining: newRemaining
        });
      }

      // Log to audit table
      await db.promise().query(
        `INSERT INTO leave_audit_log 
         (action_type, reference_id, employee_id, rule_id, company_id, performed_by, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'rule_assigned', id, id, ruleId, company_id, performed_by,
          `Assigned with ${proratedLeaves} leaves effective ${effectiveAssignDate.toISOString().split('T')[0]}`
        ]
      );
    }

    // Handle removed rules - archive their balances
    for (const ruleId of removedRules) {
      const [oldBalances] = await db.promise().query(
        `SELECT * FROM leave_balance 
         WHERE employee_id = ? AND leave_rules_id = ? AND status = 1`,
        [id, ruleId]
      );

      for (const balance of oldBalances) {
        // Archive the balance
        // await db.promise().query(
        //   `INSERT INTO leave_balance_archive 
        //    SELECT lb.*, NOW(), 'rule_removed', ? 
        //    FROM leave_balance lb 
        //    WHERE lb.id = ?`,
        //   [performed_by, balance.id]
        // );
        await db.promise().query(
          `INSERT INTO leave_balance_archive (
      id,
      company_id,
      employee_id,
      leave_rules_id,
      year,
      session_start,
      session_end,
      total_leaves,
      used_leaves,
      remaining_leaves,
      old_balance,
      status,
      assign_date,
      add_stamp,
      last_updated,
      archived_at,
      archive_reason,
      archived_by
  )
  SELECT 
      lb.id,
      lb.company_id,
      lb.employee_id,
      lb.leave_rules_id,
      lb.year,
      lb.session_start,
      lb.session_end,
      lb.total_leaves,
      lb.used_leaves,
      lb.remaining_leaves,
      lb.old_balance,
      lb.status,
      lb.assign_date,
      lb.add_stamp,
      lb.last_updated,
      NOW(),
      'rule_removed',
      ?
  FROM leave_balance lb
  WHERE lb.id = ?`,
          [performed_by, balance.id]
        );

        // Mark as inactive
        await db.promise().query(
          `UPDATE leave_balance SET status = 0, last_updated = NOW() WHERE id = ?`,
          [balance.id]
        );

        // Log removal
        await db.promise().query(
          `INSERT INTO leave_audit_log 
           (action_type, reference_id, employee_id, rule_id, company_id, performed_by, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            'rule_removed',
            id,
            id,
            ruleId,
            company_id,
            performed_by,
            `Rule removed, balance archived`
          ]
        );
      }
    }

    // Prepare response
    const response = {
      status: true,
      message: "Leave rules assigned & leave balance updated successfully.",
      affectedRows: updateResult.affectedRows,
      details: {
        employee_id: id,
        employee_name: `${empData[0].first_name || ''} ${empData[0].last_name || ''}`.trim(),
        old_rules: oldRuleIds,
        new_rules: leaveTypes,
        added_rules: addedRules,
        removed_rules: removedRules,
        final_rules: mergedLeaveRules,
        effective_date: effectiveAssignDate.toISOString().split('T')[0],
        balances_updated: balanceResults
      }
    };

    // If there were critical changes, note impact
    if (addedRules.length > 0 || removedRules.length > 0) {
      response.impact = {
        type: addedRules.length > 0 ? 'major' : 'moderate',
        note: `${addedRules.length} rules added, ${removedRules.length} rules removed`,
        requires_review: true
      };
    }
    res.status(200).json(response);
  } catch (err) {
    console.error("Update leave type error:", err);

    // Log error
    try {
      await db.promise().query(
        `INSERT INTO leave_audit_log 
         (action_type, employee_id, company_id, performed_by, notes)
         VALUES (?, ?, ?, ?, ?)`,
        ['rule_assigned', id, company_id, performed_by, 'Error: ' + err.message]
      );
    } catch (logErr) {
      console.error("Error logging to audit:", logErr);
    }

    res.status(500).json({
      status: false,
      message: "Error updating employee leave rules.",
      error: err.message
    });
  }
});

// Helper function to calculate prorated leaves
function calculateProratedLeaves(rule, joiningDate, assignDate, sessionStart, sessionEnd) {
  const effectiveDate = new Date(Math.max(
    assignDate.getTime(),
    joiningDate.getTime(),
    sessionStart.getTime()
  ));

  // If effective date is after session end, return 0
  if (effectiveDate > sessionEnd) {
    return 0;
  }

  // Calculate months in session
  const totalMonths = (sessionEnd.getFullYear() - effectiveDate.getFullYear()) * 12 +
    (sessionEnd.getMonth() - effectiveDate.getMonth()) + 1;

  // Calculate based on accrual frequency
  let proratedLeaves = 0;

  switch (rule.accrual_frequency) {
    case 'monthly':
      proratedLeaves = (rule.leaves_allowed_year / 12) * totalMonths;
      break;
    case 'quarterly':
      const quarters = Math.floor(totalMonths / 3);
      proratedLeaves = (rule.leaves_allowed_year / 4) * quarters;
      break;
    case 'half-yearly':
      const halfYears = Math.floor(totalMonths / 6);
      proratedLeaves = (rule.leaves_allowed_year / 2) * halfYears;
      break;
    default: // yearly
      proratedLeaves = rule.leaves_allowed_year;
  }

  // Apply max carry forward if applicable
  if (rule.max_carry_forward && proratedLeaves > rule.max_carry_forward) {
    proratedLeaves = rule.max_carry_forward;
  }

  // Round to 1 decimal
  return Math.round(proratedLeaves * 10) / 10;
}

// Enhanced session dates function
function getSessionDates(referenceDate, resetMonth = 1) {
  const refDate = new Date(referenceDate);
  const year = refDate.getFullYear();
  const month = refDate.getMonth() + 1;

  let sessionStartDate, sessionEndDate;

  if (month >= resetMonth) {
    // Current session started this year
    sessionStartDate = new Date(year, resetMonth - 1, 1);
    // End next year on resetMonth - 1 last day
    sessionEndDate = new Date(year + 1, resetMonth - 1, 0);
  } else {
    // Current session started last year
    sessionStartDate = new Date(year - 1, resetMonth - 1, 1);
    // End this year on resetMonth - 1 last day
    sessionEndDate = new Date(year, resetMonth - 1, 0);
  }

  // Set to end of day for session end
  sessionEndDate.setHours(23, 59, 59, 999);

  return {
    sessionStartDate,
    sessionEndDate,
    sessionName: `${sessionStartDate.getFullYear()}-${sessionEndDate.getFullYear()}`
  };
}
////////////  Rules Fetch  //////////////////

// web cheak A
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

///////////  Rules Insert Api  ////////////

// web cheak A
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

// web cheak A
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
// web cheak A
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




//////////// Leave Balance //////////////

//// workig fine //
// router.get("/Balance", (req, res) => {
//   const { page = 1, limit = 10, userData, departmentId = 0, subDepartmentid = 0, employeeStatus = 1, search = '' } = req.query;
//   const offset = (page - 1) * limit;


//   let decodedUserData = null;

//   if (userData) {
//     try {
//       const decodedString = Buffer.from(userData, "base64").toString("utf-8");
//       decodedUserData = JSON.parse(decodedString);
//     } catch (error) {
//       return res.status(400).json({ status: false, error: "Invalid userData" });
//     }
//   }

//   if (!decodedUserData.company_id) {
//     return res
//       .status(400)
//       .json({ status: false, error: "Company ID is missing or invalid" });
//   }
//   let searchCondition = "";
//   let params = [decodedUserData.company_id];

//   if (search) {
//     searchCondition = ` AND (e.employee_id LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ? ) `;
//     params.push(`%${search}%`, `%${search}%`, `%${search}%`);
//   }

//   if (departmentId && departmentId != 0) {
//     searchCondition += ` AND e.department = ?`;
//     params.push(departmentId);
//   }  if (subDepartmentid && subDepartmentid != 0) {
//     searchCondition += ` AND e.sub_department = ?`;
//     params.push(subDepartmentid);
//   }
//   if (employeeStatus && employeeStatus == 1) {
//     searchCondition += ` AND e.employee_status=1 and e.status=1 and e.delete_status=0 `;
//   } else {
//     searchCondition += ` AND (e.employee_status=0 or e.status=0 or e.delete_status=1) `;
//   }

//   let query = `
//       SELECT e.id,
//         e.employee_id,
//       CONCAT(e.first_name, " ", e.last_name, "-",e.employee_id) AS first_name,
//         lr.leave_type,
//         -- Monthly balance leaves: Calculate balance per month
//         CASE
//             -- If no leaves are applied in the current month
//             WHEN COALESCE(SUM(CASE 
//                                 WHEN l.leave_type = lr.leave_type 
//                                 AND YEAR(l.start_date) = YEAR(CURDATE()) 
//                                 AND MONTH(l.start_date) = MONTH(CURDATE()) 
//                                 THEN DATEDIFF(l.end_date, l.start_date) + 1
//                                 ELSE 0
//                               END), 0) = 0 
//             THEN lr.max_leaves_month  -- If no leaves applied, full max leaves for the month
//             ELSE 
//                 -- If leaves are applied in the current month, subtract applied leave from max leaves per month
//                 lr.max_leaves_month - 
//                 COALESCE(SUM(CASE 
//                               WHEN l.leave_type = lr.leave_type 
//                               AND YEAR(l.start_date) = YEAR(CURDATE()) 
//                               AND MONTH(l.start_date) = MONTH(CURDATE()) 
//                               THEN DATEDIFF(l.end_date, l.start_date) + 1
//                               ELSE 0
//                             END), 0)
//         END AS monthly_balance_leave
//       FROM 
//           employees e
//       JOIN 
//           leave_rules lr ON FIND_IN_SET(lr.id, e.leave_rule_id) > 0  -- Join to fetch the leave rules assigned to the employee
//       LEFT JOIN 
//           leaves l ON e.id = l.employee_id  -- Left join to get the applied leave details
//       WHERE 
//         e.company_id=? ${searchCondition}
//       GROUP BY 
//           e.id, lr.id, lr.leave_type  -- Group by employee and leave type
//       ORDER BY 
//           e.first_name, lr.leave_type
//       LIMIT ${db.escape(parseInt(limit))} OFFSET ${db.escape(parseInt(offset))};
//   `;

//   // Query to count the total number of records (employees)
//   let countQuery = `
//     SELECT COUNT(DISTINCT e.id) AS total
//     FROM employees e
//     JOIN leave_rules lr ON FIND_IN_SET(lr.id, e.leave_rule_id) > 0
//     LEFT JOIN leaves l ON e.id = l.employee_id
//     WHERE e.company_id=? ${searchCondition} ;
//   `;

//   // Execute the queries
//   db.query(query, params, (err, results) => {
//     if (err) {
//       console.error("Database query failed:", err.message);
//       return res
//         .status(500)
//         .json({ status: false, error: "Database query failed" });
//     }

//     // Execute the count query to get the total number of employees
//     db.query(countQuery, params, (err, countResults) => {
//       if (err) {
//         console.error("Count query failed:", err.message);
//         return res
//           .status(500)
//           .json({ status: false, error: "Total count query failed" });
//       }

//       // Transform results into the desired format
//       const result = {};
//       results.forEach((item) => {
//         // Create a unique key based on id and employee_id
//         const key = `${item.id}-${item.employee_id}`;

//         // Check if this key already exists in the result object
//         if (!result[key]) {
//           result[key] = {
//             id: item.id,
//             employee_id: item.employee_id,
//             first_name: item.first_name
//           };
//         }

//         result[key][item.leave_type] = item.monthly_balance_leave;
//       });

//       // Convert the result object back to an array
//       const transformedData = Object.values(result);

//       // Send the response with the transformed data and total count
//       return res.status(200).json({
//         status: true,
//         data: transformedData,
//         total: countResults[0].total // Use the total from the count query
//       });
//     });
//   });
// });


// web cheak A
router.post("/leaveBalanceUpdate", (req, res) => {
  const { employee_id, leave_rule_id, deductionValue, type, userData } = req.body;
  let decodedUserData = null;

  try {
    if (userData) {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    }
  } catch (error) {
    return res.status(400).json({ status: false, error: "Invalid userData" });
  }

  if (!decodedUserData?.company_id) {
    return res.status(400).json({ status: false, error: "Company ID is missing or invalid" });
  }

  if (!employee_id || !leave_rule_id || deductionValue === undefined || !type) {
    return res.status(400).json({ status: false, message: "All fields are required." });
  }

  const currentYear = new Date().getFullYear();

  const fetchQuery = `
    SELECT id, old_balance 
    FROM leave_balance
    WHERE employee_id = ? AND leave_rules_id = ? AND ? BETWEEN session_start AND session_end
  `;

  db.query(fetchQuery, [employee_id, leave_rule_id, new Date()], (err, results) => {
    if (err) {
      console.error("Error fetching leave balance:", err);
      return res.status(500).json({ status: false, message: "Database error while fetching leave balance." });
    }

    if (results.length === 0) {
      return res.status(404).json({ status: false, message: "Leave balance record not found." });
    }

    const balanceRecord = results[0];
    const currentBalance = parseFloat(balanceRecord.old_balance) || 0;
    const value = parseFloat(deductionValue) || 0;
    let newBalance = currentBalance;

    if (type === "Increase") {
      newBalance = currentBalance + value;
    } else if (type === "Decrease") {
      newBalance = currentBalance - value;
    } else {
      return res.status(400).json({ status: false, message: "Invalid type. Must be 'Increase' or 'Decrease'." });
    }

    // Round to 1 decimal place for DECIMAL(10,1)
    newBalance = parseFloat(newBalance.toFixed(1));

    const updateQuery = `
      UPDATE leave_balance
      SET old_balance = ?, last_updated = NOW()
      WHERE id = ?
    `;

    db.query(updateQuery, [newBalance, balanceRecord.id], (err, updateResults) => {
      if (err) {
        console.error("Error updating leave balance:", err);
        return res.status(500).json({ status: false, message: "Database error while updating leave balance." });
      }

      return res.status(200).json({
        status: true,
        message: "Leave balance updated successfully.",
        newBalance,
      });
    });
  });
});



// web cheak A
router.get("/Balance", async (req, res) => {
  try {
    const { page = 1, limit = 10, userData, departmentId = 0, subDepartmentid = 0, employeeStatus = 1, search = '' } = req.query;
    const offset = (page - 1) * limit;

    if (!userData) {
      return res.status(400).json({ status: false, message: "userData is required" });
    }

    // --- Decode userData
    let decodedUserData;
    try {
      decodedUserData = JSON.parse(Buffer.from(userData, "base64").toString("utf-8"));
    } catch {
      return res.status(400).json({ status: false, message: "Invalid userData" });
    }

    if (!decodedUserData.company_id) {
      return res.status(400).json({ status: false, message: "Invalid company_id" });
    }

    let whereCond = ` WHERE e.company_id=? `;
    const params = [decodedUserData.company_id];

    if (search) {
      whereCond += ` AND (e.employee_id LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ?) `;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (departmentId && departmentId != 0) {
      whereCond += ` AND e.department=? `;
      params.push(departmentId);
    } if (subDepartmentid && subDepartmentid != 0) {
      whereCond += ` AND e.sub_department=? `;
      params.push(subDepartmentid);
    }

    if (employeeStatus && employeeStatus == 1) {
      whereCond += ` AND e.employee_status=1 AND e.status=1 AND e.delete_status=0 `;
    } else {
      whereCond += ` AND (e.employee_status=0 OR e.status=0 OR e.delete_status=1) `;
    }

    // --- Get paginated employee list
    const [employees] = await db.promise().query(`
      SELECT e.id, e.employee_id, CONCAT(e.first_name, ' ', e.last_name, '-', e.employee_id) AS employee_name
      FROM employees e
      ${whereCond}
      ORDER BY e.first_name ASC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)};
    `, params);

    // --- Get total employees count
    const [countRows] = await db.promise().query(`
      SELECT COUNT(DISTINCT e.id) AS total
      FROM employees e
      ${whereCond};
    `, params);

    // --- Prepare final data
    // --- Prepare final data
    const finalResult = [];
    const leaveTypeSet = new Set(); // to collect leave types

    for (const emp of employees) {

      const [rules] = await db.promise().query(`
    SELECT lr.id AS leave_rule_id, lr.leave_type, lr.leaves_allowed_year,
           lr.accrual_frequency, lr.eligible_after_days,
           lb.used_leaves, lb.old_balance, lb.assign_date
    FROM leave_rules lr
    INNER JOIN leave_balance lb ON lr.id = lb.leave_rules_id 
    WHERE lb.employee_id=? AND lb.company_id=? 
      AND CURDATE() BETWEEN lb.session_start AND lb.session_end
  `, [emp.id, decodedUserData.company_id]);

      const [pendingLeaves] = await db.promise().query(`
    SELECT leave_rule_id, start_date, end_date, start_half, end_half
    FROM leaves
    WHERE employee_id=? 
      AND company_id=? 
      AND admin_status=0 
      AND deletestatus=0
  `, [emp.id, decodedUserData.company_id]);

      // --- pending days by rule
      const pendingByRule = {};
      for (const lv of pendingLeaves) {
        const days = calculateLeaveDays(
          lv.start_date,
          lv.end_date,
          lv.start_half,
          lv.end_half
        );
        pendingByRule[lv.leave_rule_id] = (pendingByRule[lv.leave_rule_id] || 0) + days;
      }

      const empData = {
        id: emp.id,
        employee_id: emp.employee_id,
        first_name: emp.employee_name,
        leave_balances: {}
      };

      for (const rule of rules) {
        leaveTypeSet.add(rule.leave_type);

        const today = new Date();
        const assignDate = new Date(rule.assign_date || today);

        // eligibility check
        const eligibleDate = new Date(assignDate);
        eligibleDate.setDate(
          eligibleDate.getDate() + (rule?.eligible_after_days || 0)
        );

        if (today < eligibleDate) {
          empData.leave_balances[rule.leave_type] = {
            total: 0,
            used: 0,
            old: 0,
            balance: 0
          };
          continue;
        }

        let periodsPerYear = 1;
        if (rule.accrual_frequency === "monthly") periodsPerYear = 12;
        else if (rule.accrual_frequency === "quarterly") periodsPerYear = 4;
        else if (rule.accrual_frequency === "half-yearly") periodsPerYear = 2;

        const leavesPerPeriod = rule.leaves_allowed_year / periodsPerYear;

        const monthsDiff =
          (today.getFullYear() - assignDate.getFullYear()) * 12 +
          (today.getMonth() - assignDate.getMonth());

        let creditedPeriods = 1;
        if (rule.accrual_frequency === "monthly")
          creditedPeriods = monthsDiff + 1;
        else if (rule.accrual_frequency === "quarterly")
          creditedPeriods = Math.floor(monthsDiff / 3) + 1;
        else if (rule.accrual_frequency === "half-yearly")
          creditedPeriods = Math.floor(monthsDiff / 6) + 1;

        creditedPeriods = Math.min(creditedPeriods, periodsPerYear);

        const totalCredited = leavesPerPeriod * creditedPeriods;
        const used = Number(rule.used_leaves || 0);
        const old = Number(rule.old_balance || 0);
        const pending = Number(pendingByRule[rule.leave_rule_id] || 0);

        const leavecount = await leaveconversion(emp.employee_id, rule.leave_rule_id);
        const balance = Number((totalCredited + old + leavecount - used - pending).toFixed(1));

        empData.leave_balances[rule.leave_type] = {
          total: Number(totalCredited.toFixed(1)),
          used,
          old,
          balance
        };
      }

      finalResult.push(empData);
    }

    // --- FINAL RESPONSE
    return res.status(200).json({
      status: true,
      total: countRows[0]?.total || 0,
      leave_types: Array.from(leaveTypeSet),
      data: finalResult
    });


  } catch (error) {
    console.error("Error in /Balance:", error);
    return res.status(500).json({ status: false, error: error.message });
  }
});


// web cheak A
router.post("/deleteAssignedLeave", async (req, res) => {
  const { userData, employee_id = 0, type, leave_rule_id } = req.body;

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
  const employeeId = employee_id || decodedUserData?.id;

  if (!companyId || !employeeId || !leave_rule_id) {
    return res.status(400).json({
      status: false,
      message: "Company ID, Employee ID, and Leave ID are required.",
    });
  }

  try {
    // ✅ Step 1: Fetch employee's assigned leave_rule_id
    const [empRows] = await db
      .promise()
      .query("SELECT leave_rule_id FROM employees WHERE id = ? AND company_id = ?", [employeeId, companyId]);

    if (!empRows.length) {
      return res.status(404).json({ status: false, message: "Employee not found." });
    }

    const leaveRules = empRows[0].leave_rule_id
      ? empRows[0].leave_rule_id.split(",").map((id) => id.trim()) : [];

    // ✅ Step 2: Remove the selected leave_rule_id 
    const updatedRules = leaveRules.filter((id) => id !== leave_rule_id.toString());
    const updatedRuleString = updatedRules.join(",");

    // ✅ Step 3: Update the employee record
    await db.promise().query("UPDATE employees SET leave_rule_id = ? WHERE id = ? AND company_id = ?",
      [updatedRuleString, employeeId, companyId]);

    // ✅ Step 4: Optionally delete leave balance if requested
    if (type == "removeAssignWithBalance") {
      await db.promise().query("DELETE FROM leave_balance WHERE employee_id = ? AND leave_rules_id = ? AND company_id = ?",
        [employeeId, leave_rule_id, companyId]
      );
    }

    return res.json({
      status: true,
      message: type == "removeAssignWithBalance" ? "Leave rule and its balance removed successfully."
        : "Leave rule removed successfully.",
      updatedRules,
    });
  } catch (err) {
    console.error("deleteAssignedLeave error:", err);
    res.status(500).json({
      status: false,
      message: "Error while deleting assigned leave rule.",
      error: err.message,
    });
  }
});




// ////newwwwww 
function generateMonthlyLeaveStructure(leaves_allowed_year, apply_leaves_next_year) {
  const totalMonths = 12;
  const monthlyLeaves = leaves_allowed_year / totalMonths;

  let structure = [];
  let month = apply_leaves_next_year;

  for (let i = 0; i < totalMonths; i++) {

    structure.push({
      [month]: monthlyLeaves
    });

    month++;
    if (month > 12) month = 1;
  }

  return structure;
}

module.exports = router;