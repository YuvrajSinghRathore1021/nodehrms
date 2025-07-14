const express = require("express");
const router = express.Router();
const db = require("../../DB/ConnectionSql");
const { json } = require("body-parser");


router.post("/FetchLeaveCount", (req, res) => {
  const { userData ,employee_Id=0} = req.body;

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
    return res.status(400).json({ status: false, message: "Company ID and Employee ID are required." });
  }

  const sql = `SELECT 
    e.id AS employee_id,                     
    e.leave_rule_id AS employee_leave_rules, 
    lr.id AS leave_rule_id,                
    lr.leave_type,                         
    l.admin_status,
    
    -- Used Leaves This Year
    SUM(
        CASE
            WHEN l.leave_rule_id = lr.id 
                 AND YEAR(l.start_date) = YEAR(CURDATE()) 
                 AND MONTH(l.start_date) = MONTH(CURDATE())
            THEN 
                (DATEDIFF(l.end_date, l.start_date) + 1) 
                - IF(l.start_half = 'Second Half', 0.5, 0) 
                - IF(l.end_half = 'First Half', 0.5, 0)
            ELSE 0
        END
    ) AS used_leaves,
    
    -- Unused Leaves Last Year (to carry forward if allowed)
    CASE
        WHEN lr.carry_forward = 1 THEN
            GREATEST(
                lr.max_leaves_month * 12 - COALESCE((
                    SELECT SUM(
                        (DATEDIFF(l2.end_date, l2.start_date) + 1) 
                        - IF(l2.start_half = 'Second Half', 0.5, 0) 
                        - IF(l2.end_half = 'First Half', 0.5, 0)
                    )
                    FROM leaves l2
                    WHERE 
                        l2.employee_id = e.id
                        AND l2.leave_rule_id = lr.id
                        AND YEAR(l2.start_date) = YEAR(CURDATE()) - 1
                ), 0), 0)
        ELSE 0
    END AS carried_forward_leaves,
    
    -- Monthly Available Leaves
    (lr.max_leaves_month - 
    COALESCE(
        SUM(
            CASE
                WHEN l.leave_rule_id = lr.id 
                     AND YEAR(l.start_date) = YEAR(CURDATE()) 
                     AND MONTH(l.start_date) = MONTH(CURDATE())
                THEN 
                    (DATEDIFF(l.end_date, l.start_date) + 1) 
                    - IF(l.start_half = 'Second Half', 0.5, 0) 
                    - IF(l.end_half = 'First Half', 0.5, 0)
                ELSE 0
            END
        ), 0)
    ) + 
    -- Add carried forward leaves only if we are in the assine_month
    CASE 
        WHEN lr.carry_forward = 1 AND MONTH(CURDATE()) = lr.apply_leaves_next_year THEN
            GREATEST(
                lr.max_leaves_month * 12 - COALESCE((
                    SELECT SUM(
                        (DATEDIFF(l3.end_date, l3.start_date) + 1) 
                        - IF(l3.start_half = 'Second Half', 0.5, 0) 
                        - IF(l3.end_half = 'First Half', 0.5, 0)
                    )
                    FROM leaves l3
                    WHERE 
                        l3.employee_id = e.id
                        AND l3.leave_rule_id = lr.id
                        AND YEAR(l3.start_date) = YEAR(CURDATE()) - 1
                ), 0), 0)
        ELSE 0
    END AS monthly_balance_leave

FROM 
    employees e
JOIN 
    leave_rules lr ON FIND_IN_SET(lr.id, e.leave_rule_id) > 0
LEFT JOIN 
    leaves l ON e.id = l.employee_id AND l.leave_rule_id = lr.id
WHERE 
    e.employee_status = 1 
    AND e.status = 1 
    AND e.delete_status = 0 
    AND e.company_id = ?  
    AND e.id = ?  
GROUP BY 
    e.id, lr.id, lr.leave_type
ORDER BY 
    e.first_name, lr.leave_type;
`;
 
//   const sql = `SELECT 
  //   e.id AS employee_id,
  //   e.leave_rule_id AS employee_leave_rules,
  //   lr.id AS leave_rule_id,
  //   lr.leave_type,
  //   lr.max_leaves_month,
  //   lr.carry_forward,
  //   lr.apply_leaves_next_year,
  //   l.admin_status,

  //   -- Calculate used leaves this month
  //   SUM(
  //     CASE
  //       WHEN l.leave_rule_id = lr.id 
  //            AND YEAR(l.start_date) = YEAR(CURDATE()) 
  //            AND MONTH(l.start_date) = MONTH(CURDATE())
  //       THEN 
  //           (DATEDIFF(l.end_date, l.start_date) + 1) 
  //           - IF(l.start_half = 'Second Half', 0.5, 0) 
  //           - IF(l.end_half = 'First Half', 0.5, 0)
  //       ELSE 0
  //     END
  //   ) AS used_leaves,

  //   -- Calculate carry forward leaves from previous year
  //   CASE 
  //     WHEN lr.carry_forward = 1 
  //          AND MONTH(CURDATE()) = 1
  //     THEN (
  //       lr.max_leaves_month * 12
  //       -
  //       COALESCE((
  //         SELECT SUM(
  //           (DATEDIFF(l2.end_date, l2.start_date) + 1)
  //           - IF(l2.start_half = 'Second Half', 0.5, 0)
  //           - IF(l2.end_half = 'First Half', 0.5, 0)
  //         )
  //         FROM leaves l2
  //         WHERE l2.leave_rule_id = lr.id
  //           AND l2.employee_id = e.id
  //           AND YEAR(l2.start_date) = YEAR(CURDATE()) - 1
  //           AND l2.admin_status != 2
  //       ), 0)
  //     )
  //     ELSE 0
  //   END AS carried_forward_leaves,

  //   -- Calculate available leaves this month (new + carry - used)
  //   (
  //     CASE 
  //       WHEN MONTH(CURDATE()) = lr.apply_leaves_next_year THEN lr.max_leaves_month
  //       ELSE 0
  //     END
  //     +
  //     CASE 
  //       WHEN lr.carry_forward = 1 
  //            AND MONTH(CURDATE()) = 1
  //       THEN (
  //         lr.max_leaves_month * 12
  //         -
  //         COALESCE((
  //           SELECT SUM(
  //             (DATEDIFF(l2.end_date, l2.start_date) + 1)
  //             - IF(l2.start_half = 'Second Half', 0.5, 0)
  //             - IF(l2.end_half = 'First Half', 0.5, 0)
  //           )
  //           FROM leaves l2
  //           WHERE l2.leave_rule_id = lr.id
  //             AND l2.employee_id = e.id
  //             AND YEAR(l2.start_date) = YEAR(CURDATE()) - 1
  //             AND l2.admin_status != 2
  //         ), 0)
  //       )
  //       ELSE 0
  //     END
  //     -
  //     SUM(
  //       CASE
  //         WHEN l.leave_rule_id = lr.id 
  //              AND YEAR(l.start_date) = YEAR(CURDATE()) 
  //              AND MONTH(l.start_date) = MONTH(CURDATE())
  //         THEN 
  //             (DATEDIFF(l.end_date, l.start_date) + 1) 
  //             - IF(l.start_half = 'Second Half', 0.5, 0) 
  //             - IF(l.end_half = 'First Half', 0.5, 0)
  //         ELSE 0
  //       END
  //     )
  //   ) AS monthly_balance_leave

  // FROM 
  //   employees e
  // JOIN 
  //   leave_rules lr 
  //   ON FIND_IN_SET(lr.id, e.leave_rule_id) > 0
  // LEFT JOIN 
  //   leaves l 
  //   ON e.id = l.employee_id
  // WHERE 
  //   e.employee_status = 1 
  //   AND e.status = 1 
  //   AND e.delete_status = 0 
  //   AND e.company_id = 6  
  //   AND e.id = 12  
  // GROUP BY 
  //   e.id, lr.id, lr.leave_type
  // ORDER BY 
  //   e.first_name, lr.leave_type

  //   `;

  // And l.admin_status !=2
  // And l.rm_status !=2
  
  db.execute(sql, [companyId, employeeId], (err, results) => {
    if (err) {
      console.error("Query execution error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    const processedResults = results.map((record) => ({
      ...record,
      Available: Number(record.monthly_balance_leave) != 0
    }));

    res.json({
      status: true,
      records: processedResults
    });
  });
});

// router.post("/FetchLeaveCount", (req, res) => {
//   const { userData } = req.body;

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
//   const employeeId = decodedUserData?.id;

//   if (!companyId || !employeeId) {
//     return res.status(400).json({ status: false, message: "Company ID and Employee ID are required." });
//   }

//   const sql = `SELECT 
//           e.id AS employee_id,                     
//           e.leave_rule_id AS employee_leave_rules, 
//           lr.id AS leave_rule_id,                
//           lr.leave_type,                         
//           l.admin_status,
//           SUM(
//               CASE
//                   WHEN l.leave_rule_id = lr.id 
//                        AND YEAR(l.start_date) = YEAR(CURDATE()) 
//                        AND MONTH(l.start_date) = MONTH(CURDATE())
//                   THEN 
//                       (DATEDIFF(l.end_date, l.start_date) + 1) 
//                       - IF(l.start_half = 'Second Half', 0.5, 0) 
//                       - IF(l.end_half = 'First Half', 0.5, 0)
//                   ELSE 0

//               END
//           ) AS used_leaves,
//           lr.max_leaves_month - 
//           COALESCE(
//               SUM(
//                   CASE
//                       WHEN l.leave_rule_id = lr.id 
//                            AND YEAR(l.start_date) = YEAR(CURDATE()) 
//                            AND MONTH(l.start_date) = MONTH(CURDATE())
//                       THEN 
//                           (DATEDIFF(l.end_date, l.start_date) + 1) 
//                           - IF(l.start_half = 'Second Half', 0.5, 0) 
//                           - IF(l.end_half = 'First Half', 0.5, 0)
//                       ELSE 0
//                   END
//               ), 0
//           ) AS monthly_balance_leave
//       FROM 
//           employees e
//       JOIN 
//           leave_rules lr 
//           ON FIND_IN_SET(lr.id, e.leave_rule_id) > 0
//       LEFT JOIN 
//           leaves l 
//           ON e.id = l.employee_id
//       WHERE 
//           e.employee_status = 1 
//           AND e.status = 1 
//           AND e.delete_status = 0 
//           AND e.company_id = ?  
//           AND e.id = ?  

//       GROUP BY 
//           e.id, lr.id, lr.leave_type
//       ORDER BY 
//           e.first_name, lr.leave_type`;

//   // And l.admin_status !=2
//   // And l.rm_status !=2
//   db.execute(sql, [companyId, employeeId], (err, results) => {
//     if (err) {
//       console.error("Query execution error:", err);
//       return res.status(500).json({ error: "Internal server error" });
//     }

//     const processedResults = results.map((record) => ({
//       ...record,
//       Available: Number(record.monthly_balance_leave) != 0
//     }));

//     res.json({
//       status: true,
//       records: processedResults
//     });
//   });
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

















// get 

// leaveBalanceRoute.js

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