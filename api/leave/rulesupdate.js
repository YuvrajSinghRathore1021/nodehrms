const express = require("express");
const router = express.Router();
const db = require("../../DB/ConnectionSql");

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
        effective_from = null,///session_start or date
        effective_to = null, /// session_end or date 
        eligible_after_days = 0,
        monthlyLeaveStructure = null
    } = req.body;

    let monthlyLeaveStructurenew = null;
    if (!monthlyLeaveStructure) {
        monthlyLeaveStructurenew = generateMonthlyLeaveStructure(leaves_allowed_year, apply_leaves_next_year)
    }
    console.log(monthlyLeaveStructurenew);
    return;
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
        updated = NOW()
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
            updatedBy, change_reason, updatedBy, id
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

        if (changedFields.length > 0) {
            // Find all affected employees
            const [affectedEmployees] = await db.promise().query(
                `SELECT DISTINCT employee_id 
         FROM leave_balance 
         WHERE leave_rules_id = ? AND status = 1`,
                [id]
            );

            // Determine impact type

            if (changedFields.includes('leaves_allowed_year') ||
                changedFields.includes('carry_forward')) {
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
                        id,
                        companyId,
                        updatedBy,
                        oldRule.leaves_allowed_year,
                        leaves_allowed_year,
                        oldRule.carry_forward,
                        carry_forward,
                        oldRule.accrual_frequency,
                        accrual_frequency,
                        oldRule?.eligible_after_days || 0,
                        eligible_after_days || 0,
                        impactType
                    ]
                );
            }

            // Step 6: Recalculate balances for affected employees if needed
            if (changedFields.includes('leaves_allowed_year') ||
                changedFields.includes('accrual_frequency')) {



                await db.promise().query(
                    `UPDATE leave_balance lb
          INNER JOIN leave_rules lr ON lb.leave_rules_id = lr.id
           INNER JOIN employees e ON lb.employee_id = e.id
           SET lb.total_leaves = lr.leaves_allowed_year,
               lb.remaining_leaves = lb.total_leaves - lb.used_leaves,
               lb.rule_version_at_calc = lr.version,
               lb.last_calculated_at = NOW()
           WHERE lb.leave_rules_id = ? AND lb.status = 1`,
                    [id]
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
            `UPDATE employees 
       SET leave_rule_id = ?
       WHERE id = ? AND company_id = ?`,
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
                await db.promise().query(
                    `INSERT INTO leave_balance_archive 
           SELECT lb.*, NOW(), 'rule_removed', ? 
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










function generateMonthlyLeaveStructure(leaves_allowed_year, apply_leaves_next_year) {
    const totalMonths = 12;
    const monthlyLeaves = leaves_allowed_year / totalMonths;

    let structure = {};
    // Start from apply_leaves_next_year month
    let month = apply_leaves_next_year;
    for (let i = 0; i < totalMonths; i++) {
        structure[month] = parseFloat(monthlyLeaves.toFixed(2));
        month++;
        if (month > 12) {
            month = 1; // next year months
        }
    }
    return structure;
}

module.exports = router;