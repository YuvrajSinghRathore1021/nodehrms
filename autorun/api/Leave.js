const express = require("express");
const router = express.Router();
const db = require("../../DB/ConnectionSql");
const { json } = require("body-parser");

////// working code 
/////////show all 

// router.post("/autoDeduction", async (req, res) => {
//     const companyId = 10;
//     try {
//         const [leaveRules] = await db.promise().query(
//             `SELECT id, company_id, leave_type, auto_deduction, deduction_count, deduction_date, deduction_start_date, deduction_end_date FROM leave_rules WHERE company_id = ? and auto_deduction=1 `,
//             [companyId]
//         );
//         if (leaveRules.length > 0) {
//             for (const rule of leaveRules) {


//             }
//         }

//     } catch (err) {
//         res.status(500).json({
//             status: false,
//             message: "Error while fetching leave balances",
//             error: err.message
//         });
//     }
// });


router.get("/autoDeduction", async (req, res) => {
    const companyId = 10;
    const today = new Date();

    try {
        const [leaveRules] = await db.promise().query(
            `SELECT id, company_id, leave_type, auto_deduction, deduction_count, deduction_date, deduction_start_date, deduction_end_date 
             FROM leave_rules WHERE company_id = ? AND auto_deduction=1`,
            [companyId]
        );

        if (leaveRules.length > 0) {
            for (const rule of leaveRules) {
                const ruleId = rule.id;
                const deductionDate = rule.deduction_date; // e.g. 1, 31

                // Check if today is deduction day
                if (today.getDate() !== deductionDate) {
                    continue; // skip until correct date
                }

                const startDate = rule.deduction_start_date;
                const endDate = rule.deduction_end_date;

                // Get all employees of this company
                const [employees] = await db.promise().query(
                    `SELECT id FROM employees WHERE employee_status=1 and status=1 and delete_status=0 and company_id = ?`,
                    [companyId]
                );

                for (const emp of employees) {
                    const empId = emp.id;

                    // Count applied leaves for this employee in given period
                    const [appliedLeaves] = await db.promise().query(
                        `SELECT COUNT(*) as leaveCount 
                         FROM leaves 
                         WHERE employee_id = ? AND company_id = ? AND leave_rule_id = ? AND status = 1 AND start_date >= ? AND end_date <= ?`,
                        [empId, companyId, ruleId, startDate, endDate]
                    );

                    const applied = appliedLeaves[0].leaveCount || 0;
                    let toDeduct = rule.deduction_count - applied;

                    if (toDeduct > 0) {
                        // Deduct from balance
                        await db.promise().query(
                            `UPDATE leave_balance 
                             SET used_leaves = used_leaves + ?, 
                                 remaining_leaves = GREATEST(remaining_leaves - ?, 0), 
                                 last_updated = NOW()
                             WHERE employee_id = ? 
                               AND company_id = ? 
                               AND leave_rules_id = ?`,
                            [toDeduct, toDeduct, empId, companyId, ruleId]
                        );

                        // console.log(`Deducted ${toDeduct} leaves from employee ${empId}`);
                    }
                }
            }
        }

        res.json({ status: true, message: "Auto deduction completed" });

    } catch (err) {
        res.status(500).json({
            status: false,
            message: "Error while processing auto deduction",
            error: err.message
        });
    }
});


module.exports = router;