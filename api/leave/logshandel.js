const express = require("express");
const router = express.Router();
const db = require("../../DB/ConnectionSql");
const { json } = require("body-parser");

////// working code 
/////////show all 

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
    // fetch balances for current year
    const sql = `
      SELECT 
        lb.employee_id,
        lb.leave_rules_id AS leave_rule_id,
        lr.leave_type,
        lb.used_leaves,
        lb.remaining_leaves AS monthly_balance_leave
      FROM leave_balance lb
      JOIN leave_rules lr ON lr.id = lb.leave_rules_id
      WHERE lb.company_id = ?
        AND lb.employee_id = ?
        AND lb.year = YEAR(CURDATE())
    `;

    db.execute(sql, [companyId, employeeId], (err, results) => {
      if (err) {
        console.error("Query execution error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }

      const processedResults = results.map((record) => ({
        employee_id: record.employee_id,
        leave_rule_id: record.leave_rule_id,
        leave_type: record.leave_type,
        used_leaves: record.used_leaves.toString(),
        monthly_balance_leave: record.monthly_balance_leave.toString(),
        Available: Number(record.monthly_balance_leave) > 0
      }));

      res.json({
        status: true,
        records: processedResults
      });

    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: "An error occurred while fetching leave balances",
      error: err.message
    });
  }
});
/////test 
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
//     // ---- Step 1: Fetch employee details (joining date etc.)
//     const [employee] = await db
//       .promise()
//       .query("SELECT date_of_Joining FROM employees WHERE id = ?", [employeeId]);

//     if (!employee.length) {
//       return res.status(404).json({ status: false, message: "Employee not found" });
//     }
//     const joiningDate = new Date(employee[0].date_of_Joining);

//     // ---- Step 2: Fetch leave rules linked to employee
//     const [rules] = await db.promise().query(
//       `SELECT lr.*, lb.id as balance_id, lb.total_leaves, lb.used_leaves, lb.remaining_leaves, lb.assign_date 
//        FROM leave_rules lr
//        LEFT JOIN leave_balance lb 
//          ON lr.id = lb.leave_rules_id 
//         AND lb.employee_id = ? 
//         AND lb.company_id = ? 
//         AND lb.year = YEAR(CURDATE())
//        WHERE lr.company_id = ?`,
//       [employeeId, companyId, companyId]
//     );

//     const today = new Date();
//     const results = [];

//     for (const rule of rules) {
//       // --- Eligibility Check ---
//       const eligibleDate = new Date(joiningDate);
//       eligibleDate.setDate(eligibleDate.getDate() + (rule.eligible_after_days || 0));
//       if (today < eligibleDate) {
//         results.push({
//           employee_id: employeeId,
//           leave_rule_id: rule.id,
//           leave_type: rule.leave_type,
//           used_leaves: "0",
//           monthly_balance_leave: "0",
//           Available: false,
//           note: "Not eligible yet"
//         });
//         continue;
//       }

//       // --- Determine accrual frequency ---
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
//         case "yearly":
//         default:
//           periodsPerYear = 1;
//           break;
//       }

//       const leavesPerPeriod = rule.leaves_allowed_year / periodsPerYear;

//       // --- Calculate credited till today ---
//       const monthDiff =
//         (today.getFullYear() - joiningDate.getFullYear()) * 12 +
//         (today.getMonth() - joiningDate.getMonth());

//       let creditedPeriods = 0;
//       if (rule.accrual_frequency === "monthly") {
//         creditedPeriods = monthDiff + 1;
//       } else if (rule.accrual_frequency === "quarterly") {
//         creditedPeriods = Math.floor(monthDiff / 3) + 1;
//       } else if (rule.accrual_frequency === "half-yearly") {
//         creditedPeriods = Math.floor(monthDiff / 6) + 1;
//       } else {
//         creditedPeriods = today.getFullYear() > joiningDate.getFullYear() ? 1 : 0;
//       }

//       if (creditedPeriods > periodsPerYear) creditedPeriods = periodsPerYear;

//       const totalCreditedLeaves = Math.round(leavesPerPeriod * creditedPeriods);

//       // --- Update leave_balance if needed ---
//       if (!rule.balance_id) {
//         // Insert new balance record
//         await db.promise().query(
//           `INSERT INTO leave_balance 
//            (company_id, employee_id, leave_rules_id, year, total_leaves, used_leaves, remaining_leaves, assign_date, add_stamp, last_updated) 
//            VALUES (?, ?, ?, YEAR(CURDATE()), ?, 0, ?, NOW(), NOW(), NOW())`,
//           [
//             companyId,
//             employeeId,
//             rule.id,
//             totalCreditedLeaves,
//             totalCreditedLeaves
//           ]
//         );
//       } else {
//         // Update existing balance
//         let newRemaining = totalCreditedLeaves - rule.used_leaves;
//         if (newRemaining < 0) newRemaining = 0;

//         await db.promise().query(
//           `UPDATE leave_balance 
//            SET total_leaves=?, remaining_leaves=?, last_updated=NOW() 
//            WHERE id=?`,
//           [totalCreditedLeaves, newRemaining, rule.balance_id]
//         );
//       }

//       results.push({
//         employee_id: employeeId,
//         leave_rule_id: rule.id,
//         leave_type: rule.leave_type,
//         used_leaves: rule.used_leaves ? rule.used_leaves.toString() : "0",
//         monthly_balance_leave: (totalCreditedLeaves - (rule.used_leaves || 0)).toString(),
//         Available: totalCreditedLeaves - (rule.used_leaves || 0) > 0
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
 

////net test
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
//     // ---- Step 1: Fetch employee (for joining date, eligibility)
//     const [empRows] = await db
//       .promise()
//       .query("SELECT date_of_Joining FROM employees WHERE id=? AND company_id=?", [
//         employeeId,
//         companyId
//       ]);
//     if (!empRows.length) {
//       return res.status(404).json({ status: false, message: "Employee not found" });
//     }
//     const joiningDate = new Date(empRows[0].date_of_Joining);

//     // ---- Step 2: Fetch rules + balance for employee
//     const [rules] = await db.promise().query(
//       `SELECT lr.*, lb.used_leaves, lb.remaining_leaves, lb.total_leaves, lb.assign_date 
//        FROM leave_rules lr
//        LEFT JOIN leave_balance lb 
//          ON lr.id = lb.leave_rules_id 
//         AND lb.employee_id = ? 
//         AND lb.company_id = ? 
//         AND lb.year = YEAR(CURDATE())
//        WHERE lr.company_id = ?`,
//       [employeeId, companyId, companyId]
//     );

//     const today = new Date();
//     const results = [];

//     for (const rule of rules) {
//       // --- Eligibility Check ---
//       const eligibleDate = new Date(joiningDate);
//       eligibleDate.setDate(eligibleDate.getDate() + (rule.eligible_after_days || 0));

//       if (today < eligibleDate) {
//         results.push({
//           employee_id: employeeId,
//           leave_rule_id: rule.id,
//           leave_type: rule.leave_type,
//           used_leaves: "0",
//           available_leaves: "0",
//           Available: false,
//           note: "Not eligible yet"
//         });
//         continue;
//       }

//       // --- Accrual frequency handling ---
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
//         case "yearly":
//         default:
//           periodsPerYear = 1;
//       }

//       const leavesPerPeriod = rule.leaves_allowed_year / periodsPerYear;

//       // How many periods completed till today since joining
//       const monthDiff =
//         (today.getFullYear() - joiningDate.getFullYear()) * 12 +
//         (today.getMonth() - joiningDate.getMonth());

//       let creditedPeriods = 0;
//       if (rule.accrual_frequency === "monthly") {
//         creditedPeriods = monthDiff + 1;
//       } else if (rule.accrual_frequency === "quarterly") {
//         creditedPeriods = Math.floor(monthDiff / 3) + 1;
//       } else if (rule.accrual_frequency === "half-yearly") {
//         creditedPeriods = Math.floor(monthDiff / 6) + 1;
//       } else {
//         creditedPeriods = today.getFullYear() > joiningDate.getFullYear() ? 1 : 0;
//       }
//       if (creditedPeriods > periodsPerYear) creditedPeriods = periodsPerYear;

//       const totalCredited = Math.round(leavesPerPeriod * creditedPeriods);

//       // --- Use leave_balance if exists, otherwise assume 0 used ---
//       const used = rule.used_leaves || 0;
//       let available = totalCredited - used;
//       if (available < 0) available = 0;

//       results.push({
//         employee_id: employeeId,
//         leave_rule_id: rule.id,
//         leave_type: rule.leave_type,
//         used_leaves: used.toString(),
//         available_leaves: available.toString(),
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

router.post("/FetchRules", (req, res) => {
  const { userData, id } = req.body;
  if (!userData) {
    return res.status(400).json({ status: false, message: "UserData is required." });
  }
  let decodedUserData;
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

  const sql = `SELECT id,continuous_leaves,negative_leaves,future_dated_leaves,future_dated_leaves_after,backdated_leaves,backdated_leaves_up_to FROM leave_rules WHERE id = ? AND company_id = ?`;
  db.execute(sql, [id, companyId], (err, results) => {
    if (err) {
      console.error("Query execution error:", err);
      return res.status(200).json({
        status: false,
        message: "Internal Server Error",
        error: err
      });
    }
    if (results.length > 0) {
      return res.status(200).json({
        status: true,
        message: "Leave rules fetched successfully.",
        records: results
      });
    } else {
      return res.status(200).json({
        status: false,
        message: "No leave rules found for the provided IDs."
      });
    }
  });
});

// get   // leaveBalanceRoute.js
router.post('/leave-balance', async (req, res) => {
  const { userData } = req.body;
  if (!userData) {
    return res.status(400).json({ status: false, message: "UserData is required." });
  }
  let decodedUserData;
  try {
    const decodedData = Buffer.from(userData, "base64").toString("utf-8");
    decodedUserData = JSON.parse(decodedData);
  } catch (error) {
    return res.status(400).json({ status: false, message: "Invalid UserData format." });
  }
  const companyId = decodedUserData?.company_id;
  if (!companyId) {
    return res.status(400).json({ status: false, message: "Company ID is required." });
  }
  try {
    // 1. Get employee info
    const [employee] = await db.query(
      'SELECT * FROM employees WHERE id = ? AND company_id = ?',
      [decodedUserData?.id, decodedUserData?.company_id]
    );

    if (!employee.length) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const emp = employee[0];

    // 2. Get all leave rules assigned to this employee
    const [leaveRules] = await db.query(
      'SELECT * FROM leave_rules WHERE FIND_IN_SET(id, ?) AND company_id = ?',
      [emp.leave_rule_id, decodedUserData?.company_id]
    );

    const leaveBalance = [];

    for (const rule of leaveRules) {
      // 3. Count used leaves from leaves table
      const [usedLeavesData] = await db.query(
        `SELECT COUNT(id) AS used FROM leaves 
         WHERE employee_id = ? AND company_id = ? AND leave_rule_id = ? And admin_status !=2 And rm_status !=2  And deletestatus=0`,
        [decodedUserData?.id, decodedUserData?.company_id, rule.id]
      );

      const used = usedLeavesData[0].used || 0;
      const total = rule.leaves_allowed_year || 0;
      const balance = total - used;

      leaveBalance.push({
        leave_type: rule.leave_type,
        total,
        used,
        balance
      });
    }

    // 4. Get penalty leaves
    const [penalties] = await db.query(
      `SELECT * FROM penalties WHERE employee_id = ? AND company_id = ? AND penalty_type = 'leave'and status != 3`,
      [employeeId, decodedUserData?.company_id]
    );

    const penaltyLeaves = penalties.map((penalty) => ({
      leave_rule_id: penalty.penalty_name,
      penalty_count: penalty.penalty_count,
      penalty_date: penalty.penalty_date
    }));

    res.json({
      employee_id: employeeId,
      leave_balance: leaveBalance,
      penalty_leaves: penaltyLeaves
    });
  } catch (error) {
    console.error('Error getting leave balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;