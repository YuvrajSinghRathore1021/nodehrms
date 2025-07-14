const express = require("express");
const router = express.Router();
const db = require("../../DB/ConnectionSql");
const { json } = require("body-parser");

///////////////////////////////////////////
////// Fetch Department Employee //////////
///////////////////////////////////////////

router.get("/fetch-department-employee", async (req, res) => {

  let decodedUserData = null;
  const { userData } = req.query;
  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(200).json({ status: false, error: "Invalid UserData" });
    }
  }
  const companyId = decodedUserData?.company_id;
  if (!companyId) {
    return res
      .status(200)
      .json({ status: false, message: "Company ID is required." });
  }
  const employeeQuery = `
    SELECT 
      e.id AS employee_id,
      e.first_name AS employee_name,
      e.employee_type,
      e.sub_department,
      e.leave_rule_id,
      e.department
    FROM 
      employees e
    WHERE
      e.company_id = ?                        
  `;
  console.log(decodedUserData)
  try {
    const [employees] = await db.promise().query(employeeQuery, [companyId]);
    if (employees.length === 0) {
      return res.status(200).json({
        status: false,
        message: "No employee data found."
      });
    }
    const dataWithDetails = [];
    for (const employee of employees) {
      // Fetch department name
      let departmentName = "";
      if (employee.department) {
        const [deptResult] = await db
          .promise()
          .query(`SELECT name FROM departments WHERE id = ?`, [
            employee.department
          ]);
        departmentName = deptResult[0].name;
      }
      // Fetch leave type
      let leaveType = [];
      if (employee.leave_rule_id) {
        const leaveRuleIds = employee.leave_rule_id.split(",").map((id) => id.trim());
        const [leaveResults] = await db.promise().query(`SELECT leave_type FROM leave_rules WHERE id IN (?)`, [leaveRuleIds]);
        leaveType = leaveResults.length > 0 ? leaveResults.map((result) => result.leave_type) : ["Unknown"];
      }
      // Fetch SUb-Department
      let sub_department = "";
      if (employee.sub_department) {
        const [sub_departmentResult] = await db
          .promise()
          .query(`SELECT name FROM departments WHERE id = ?`, [
            employee.sub_department
          ]);
        sub_department = sub_departmentResult[0].name;
      }
      // Add employee data with department and leave type to the result array
      dataWithDetails.push({
        ...employee,
        department: departmentName,
        leave_type: leaveType,
        sub_department: sub_department
      });
    }
    res.status(200).json({
      status: true,
      message: "Employee data fetched successfully.",
      data: dataWithDetails,
      totalRecords: employees.length
    });
  } catch (err) {
    console.error("SQL Error:", err.message);
    return res.status(200).json({
      status: false,
      message: "Error fetching department and employee data.",
      error: err.message
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
        apply_leaves_next_year = ?
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
      apply_leaves_next_year,
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
  const { UserId } = req.query;
  const query = `SELECT id, leave_type FROM leave_rules`;
  db.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching leave rules:", error);
      return res.status(200).send("Error fetching leave rules");
    }
    if (results.length > 0) {
      const sql = `SELECT id, leave_rule_id FROM employees WHERE id = ?`;
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

router.post("/update-leave-type", (req, res) => {
  const { employee_id, leave_rule_id, userData } = req.body;
  let decodedUserData = "";
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
  const company_id = decodedUserData.company_id;
  if (!employee_id || !leave_rule_id || !company_id) {
    return res.status(200).json({
      status: false,
      message: "Employee ID, leave_rule_id, and company ID are required."
    });
  }

  let leaveTypes;
  try {
    leaveTypes =
      typeof leave_rule_id === "string"
        ? JSON.parse(leave_rule_id)
        : leave_rule_id;
  } catch (err) {
    console.error("Invalid format for leave_rule_id:", err);
    return res.status(200).json({
      status: false,
      message:
        "Invalid format for leave_rule_id. It must be a valid JSON array."
    });
  }

  if (!Array.isArray(leaveTypes) || leaveTypes.length === 0) {
    return res.status(200).json({
      status: false,
      message: "leave_rule_id must be a non-empty array."
    });
  }

  const sql = `
    UPDATE employees
    SET leave_rule_id = ?
    WHERE id = ?
  `;

  const updatedLeaveRuleId = leaveTypes.join(",");
  db.query(sql, [updatedLeaveRuleId, employee_id], (err, results) => {
    if (err) {
      console.error("SQL Error:", err);
      return res.status(500).json({
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

//////////////////////////////////////////////
////////////  Rules Fetch  //////////////////
////////////////////////////////////////////

router.get("/rulesfetch", (req, res) => {
  const recordId = req.params.id;
  let decodedUserData = "";
  const userData = req.params.userData;
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
  const query = recordId
    ? `SELECT * FROM leave_rules WHERE company_id=? And id = ?`
    : `SELECT * FROM leave_rules Where company_id=?`;
  const values = recordId ? [decodedUserData.company_id, recordId] : [decodedUserData.company_id];
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
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  // Main query with LIMIT and OFFSET
  const query = `
   SELECT e.id,
    e.employee_id,
    e.first_name,
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
    l.leave_type IS NOT NULL  -- Ensuring we only fetch records where a leave type exists
GROUP BY 
    e.id, lr.id, lr.leave_type  -- Group by employee and leave type
ORDER BY 
    e.first_name, lr.leave_type
    LIMIT ${db.escape(parseInt(limit))} OFFSET ${db.escape(parseInt(offset))};
  `;

  // Execute the queries
  db.query(query, (err, results) => {
    if (err) {
      console.error("Database query failed:", err.message);
      return res
        .status(200)
        .json({ status: false, error: "Database query failed" });
    }
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

      // Add the leave type and its balance to the corresponding employee object
      result[key][item.leave_type] = item.monthly_balance_leave;
    });

    // Convert the result object back to an array
    const transformedData = Object.values(result);

    // console.log(transformedData);

    // Send the response
    return res.status(200).json({
      status: true,
      data: transformedData,
      // data: results,
      total: 100
    });
  });
});

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
  const { userData } = req.body;
  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      var decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({ status: false, error: "Invalid UserData" });
    }
  }
  const query = "SELECT leave_type FROM leaves Where company_id=?";

  db.query(query, [decodedUserData.company_id], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ status: false, error: "Database error" });
    }
    return res.status(200).json({
      status: true,
      data: result // Correctly referring to `result`
    });
  });
});

////////////////////////////////////////////
/////////// Rules Insert Api   ////////////
//////////////////////////////////////////



module.exports = router;
