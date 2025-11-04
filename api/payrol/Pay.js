// HomeApi.js 

const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');
const { AdminCheck } = require('../../model/functlity/AdminCheck');



router.post('/salary/submit', async (req, res) => {
    try {
        // Parse and validate input
        const salaryDetails = JSON.parse(req.body.Data);
        const { userData } = req.body;

        let decodedUserData = null;
        if (userData) {
            try {
                const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
                decodedUserData = JSON.parse(decodedString);
            } catch (error) {
                return res.status(400).json({ status: false, error: 'Invalid userData format' });
            }
        }

        if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
            return res.status(400).json({
                status: false,
                error: 'Employee ID and Company ID are required',
            });
        }

        const {
            month, year, employee_id, employee_name, presentCount, HF, absenteeCount, leaveCount,
            leaveRequestCount, holidayCount, WO, WD, ctc, monthly_salary, BasicPayAmount,
            proratedSalary, components,
        } = salaryDetails;

        // Check for existing salary details
        const checkDuplicateQuery = `
            SELECT id FROM employeesalarydetails
            WHERE company_id = ? AND employee_id = ? AND month = ? AND year = ?`;

        const checkDuplicateValues = [
            decodedUserData.company_id, employee_id, month, year,
        ];
        // console.log('checkDuplicateQuery', checkDuplicateQuery, checkDuplicateValues);

        db.query(checkDuplicateQuery, checkDuplicateValues, (err, duplicateResult) => {
            if (err) {
                console.error('Error checking for duplicate salary details:', err);
                return res.status(500).json({
                    status: false,
                    message: 'Failed to check duplicate salary details.',
                });
            }

            if (duplicateResult.length > 0) {
                return res.status(400).json({
                    status: false,
                    message: 'Salary details for this employee and period already exist.',
                });
            }


            // Insert salary details into the database
            const insertSalaryQuery = `
            INSERT INTO employeesalarydetails (
                company_id, month, year, employee_id, employee_name, present_days, half_days,
                absentee_days, leave_days, leave_requests, holidays, work_off, working_days,
                ctc_yearly, monthly_salary, basic_pay_amount, total_monthly_salary
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const salaryQueryValues = [
                decodedUserData.company_id, month, year, employee_id, employee_name,
                presentCount, HF, absenteeCount, leaveCount, leaveRequestCount, holidayCount,
                WO, WD, ctc, monthly_salary, BasicPayAmount, proratedSalary,
            ];

            db.query(insertSalaryQuery, salaryQueryValues, (err, salaryResult) => {
                if (err) {
                    console.error('Error inserting salary details:', err);
                    return res.status(500).json({
                        status: false,
                        message: 'Failed to insert salary details.',
                    });
                }

                const salaryDetailId = salaryResult.insertId;

                // Insert salary components into the database
                const insertComponentQuery = `
                INSERT INTO salarycomponents (
                    company_id, salary_detail_id, component_name, amount
                ) VALUES (?, ?, ?, ?)`;

                components.forEach((component) => {
                    const componentValues = [
                        decodedUserData.company_id, salaryDetailId,
                        component.component_name, component.amount,
                    ];

                    db.query(insertComponentQuery, componentValues, (err) => {
                        if (err) {
                            console.error('Error inserting salary component:', err);
                        }
                    });
                });

                // Respond with success
                res.status(200).json({
                    status: true,
                    message: 'Salary submitted successfully!',
                    data: {
                        month, year, employee_id, employee_name, proratedSalary,
                    },
                });
            });
        })
    } catch (error) {
        console.error('Error processing salary submission:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to process salary submission.',
        });
    }
});

function getDaysInMonth(month, year) {
    // JavaScript months are 0-based (January is 0, February is 1, etc.)
    return new Date(year, month, 0).getDate();
}





// working 100 %
// router.post('/api/GenerateSalary', (req, res) => {
//     const { employeeId, presentCount, HF, leaveCount, holidayCount, WO, month, year, PenaltyData, userData } = req.body;

//     let decodedUserData = null;
//     if (userData) {
//         try {
//             const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
//             decodedUserData = JSON.parse(decodedString);
//         } catch (error) {
//             return res.status(400).json({ status: false, error: 'Invalid userData format' });
//         }
//     }

//     if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
//         return res.status(400).json({
//             status: false,
//             error: 'Employee ID and Company ID are required',
//         });
//     }

//     // Validate required fields
//     if (!employeeId || !presentCount || !HF || !leaveCount || !holidayCount || !WO) {
//         return res.status(200).json({
//             status: false,
//             message: 'Missing required fields: employeeId, presentCount, HF, leaveCount, holidayCount, WO'
//         });
//     }

//     let PenaltieHF = 0;
//     let PenaltieLeave = 0;
//     let PenaltieAbsent = 0;
//     let PenaltieFixAmount = 0;
//     let PenaltieSandwichLeave = 0;
//     let PenaltyDatas = JSON.parse(PenaltyData);

//     if (PenaltyDatas) {
//         PenaltyDatas.forEach((penalty) => {
//             const { penalty_type, penalty_count, penalty_amount } = penalty;
//             if (penalty_type == "half-day") {
//                 PenaltieHF += penalty_count;
//             } else if (penalty_type == "leave") {
//                 PenaltieLeave += penalty_count;
//             }
//             else if (penalty_type == "absent") {
//                 PenaltieAbsent += penalty_count;
//             } else if (penalty_type == "fixamout") {
//                 PenaltieFixAmount += penalty_amount;
//             }
//             else if (penalty_type == "Sandwich Leave") {
//                 PenaltieSandwichLeave += penalty_count;

//             }
//         });
//     }

//     let NewPresentCount = parseInt(presentCount) - (parseInt(PenaltieHF, 10) / 2) - parseInt(PenaltieAbsent, 10);
//     let NewLeaveCount = parseInt(leaveCount) + parseInt(PenaltieLeave, 10);
//     let newHolidayCount = parseInt(holidayCount) - parseInt(PenaltieSandwichLeave, 10);

//     if (!month || !year) {
//         return res.status(200).json({
//             status: false,
//             message: 'Missing required fields: month,year'
//         });
//     }



//     // Query to fetch employee details
//     const employeeQuery = `SELECT company_id, first_name, last_name, email_id, ctc, structure_id FROM employees WHERE id = ?`;
//     db.query(employeeQuery, [employeeId], (err, employeeResults) => {
//         if (err) {
//             return res.status(500).json({
//                 status: false,
//                 message: 'Error fetching employee details',
//                 error: err
//             });
//         }
//         if (employeeResults.length === 0) {
//             return res.status(200).json({
//                 status: false,
//                 message: 'Employee not found'
//             });
//         }

//         const employee = employeeResults[0];
//         const ctc = employee.ctc;
//         // Calculate total working days
//         // const totalWorkingDays = parseInt(NewPresentCount, 10) + parseInt(newHolidayCount, 10) + parseInt(WO, 10) + parseInt(leaveCount, 10) + (parseInt(HF, 10) / 2);
//         // const totalWorkingDays = parseInt(NewPresentCount, 10) + parseInt(newHolidayCount, 10) + parseInt(WO, 10) + parseFloat(leaveCount) + (parseInt(HF, 10) / 2);
//         const totalWorkingDays = (parseFloat(NewPresentCount) || 0) + (parseFloat(newHolidayCount) || 0) + (parseFloat(WO) || 0) + (parseFloat(leaveCount) || 0) + ((parseFloat(HF) || 0) / 2);

//         // console.log("totalWorkingDays", totalWorkingDays)
//         // const dailySalary = ctc / 365;
//         const monthSalary = ctc / 12;
//         const daysInMonth = getDaysInMonth(month, year);
//         const dailySalary = monthSalary / daysInMonth
//         let proratedSalary = totalWorkingDays * dailySalary;
//         // PenaltieFixAmount
//         proratedSalary -= PenaltieFixAmount;

//         // Initial Basic Pay amount set to prorated salary
//         let BasicPayAmount = proratedSalary;

//         // Query to fetch salary structure
//         const structureQuery = `SELECT * FROM salary_structure WHERE structure_id = ?`;

//         db.query(structureQuery, [employee.structure_id], (err, structureResults) => {
//             if (err) {
//                 return res.status(500).json({
//                     status: false,
//                     message: 'Error fetching salary structure',
//                     error: err
//                 });
//             }

//             if (structureResults.length === 0) {
//                 return res.status(200).json({
//                     status: false,
//                     message: 'Salary structure not found'
//                 });
//             }

//             const salaryStructure = structureResults[0];
//             // Query to fetch salary components
//             const componentQuery = `SELECT component_id, company_id, structure_id, component_name, component_type, calculation_method, percentage, fixed_amount FROM salary_component WHERE structure_id = ?`;
//             db.query(componentQuery, [employee.structure_id], (err, componentResults) => {
//                 if (err) {
//                     return res.status(500).json({
//                         status: false,
//                         message: 'Error fetching salary components',
//                         error: err
//                     });
//                 }
//                 if (componentResults.length === 0) {
//                     return res.status(200).json({
//                         status: false,
//                         message: 'Salary components not found for the given structure'
//                     });
//                 }
//                 // Calculate salary breakdown based on components
//                 const salaryBreakdown = componentResults.map(component => {
//                     let amount = 0;
//                     // Handle calculation based on component type
//                     if (component.component_type != 'basic' && component.component_type != 'basic_pay') {
//                         if (component.calculation_method === 'percentage') {
//                             amount = (proratedSalary * component.percentage) / 100;
//                         } else if (component.calculation_method === 'fixed_amount') {
//                             amount = component.fixed_amount;
//                         }
//                         // Deduct from BasicPayAmount
//                         BasicPayAmount = BasicPayAmount - amount;
//                         return {
//                             component_name: component.component_name,
//                             amount: parseFloat(amount)
//                         };
//                     } else {
//                         return {
//                             component_name: component.component_name,
//                             amount: 0
//                         };
//                     }
//                 });
//                 // Send a well-structured response
//                 return res.json({
//                     status: true,
//                     data: {
//                         employee,
//                         salaryStructure,
//                         components: salaryBreakdown,
//                         ctc,
//                         proratedSalary: proratedSalary.toFixed(2),
//                         BasicPayAmount: BasicPayAmount.toFixed(2)
//                     }
//                 });
//             });
//         });
//     });
// });

const queryDb = (query, params) => {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

// test new way  work proper work after salary
// router.post('/api/GenerateSalary', async (req, res) => {
//     try {
//         const { employeeId, presentCount, HF, leaveCount, holidayCount, WO, month, year, PenaltyData, userData } = req.body;

//         // Decode userData
//         let decodedUserData = null;
//         if (userData) {
//             try {
//                 decodedUserData = JSON.parse(Buffer.from(userData, 'base64').toString('utf-8'));
//             } catch (error) {
//                 return res.status(400).json({ status: false, error: 'Invalid userData format' });
//             }
//         }

//         if (!decodedUserData?.id || !decodedUserData?.company_id) {
//             return res.status(400).json({
//                 status: false,
//                 error: 'Employee ID and Company ID are required',
//             });
//         }

//         // Validate required fields
//         if (!employeeId || !presentCount || !HF || !leaveCount || !holidayCount || !WO) {
//             return res.status(200).json({
//                 status: false,
//                 message: 'Missing required fields: employeeId, presentCount, HF, leaveCount, holidayCount, WO'
//             });
//         }

//         // Parse penalties
//         let PenaltieHF = 0, PenaltieLeave = 0, PenaltieAbsent = 0, PenaltieFixAmount = 0, PenaltieSandwichLeave = 0;
//         let PenaltyDatas = [];
//         try {
//             PenaltyDatas = JSON.parse(PenaltyData || "[]");
//         } catch {
//             return res.status(400).json({ status: false, message: "Invalid PenaltyData format" });
//         }

//         PenaltyDatas.forEach(({ penalty_type, penalty_count = 0, penalty_amount = 0 }) => {
//             if (penalty_type === "half-day") PenaltieHF += penalty_count;
//             else if (penalty_type === "leave") PenaltieLeave += penalty_count;
//             else if (penalty_type === "absent") PenaltieAbsent += penalty_count;
//             else if (penalty_type === "fixamout") PenaltieFixAmount += penalty_amount;
//             else if (penalty_type === "Sandwich Leave") PenaltieSandwichLeave += penalty_count;
//         });

//         let NewPresentCount = parseInt(presentCount) - (PenaltieHF / 2) - PenaltieAbsent;
//         let NewLeaveCount = parseInt(leaveCount) + PenaltieLeave;
//         let newHolidayCount = parseInt(holidayCount) - PenaltieSandwichLeave;

//         if (!month || !year) {
//             return res.status(200).json({
//                 status: false,
//                 message: 'Missing required fields: month,year'
//             });
//         }

//         // Fetch employee details
//         const employeeResults = await queryDb(
//             `SELECT company_id, first_name, last_name, email_id, ctc, structure_id FROM employees WHERE id = ?`,
//             [employeeId]
//         );

//         if (employeeResults.length === 0) {
//             return res.status(200).json({ status: false, message: 'Employee not found' });
//         }

//         const employee = employeeResults[0];
//         const ctc = employee.ctc;

//         // Salary calculation
//         const totalWorkingDays = NewPresentCount + newHolidayCount + parseInt(WO) + NewLeaveCount + (parseInt(HF) / 2);
//         const monthSalary = ctc / 12;

//         const daysInMonth = getDaysInMonth(month, year);
//         const dailySalary = monthSalary / daysInMonth;

//         let proratedSalary = (totalWorkingDays * dailySalary) - PenaltieFixAmount;
//         let BasicPayAmount = proratedSalary;

//         // Salary structure
//         const structureResults = await queryDb(
//             `SELECT * FROM salary_structure WHERE structure_id = ?`,
//             [employee.structure_id]
//         );

//         if (structureResults.length === 0) {
//             return res.status(200).json({ status: false, message: 'Salary structure not found' });
//         }

//         const salaryStructure = structureResults[0];

//         // Salary components
//         const componentResults = await queryDb(
//             `SELECT component_id, company_id, structure_id, component_name, component_type, calculation_method, percentage, fixed_amount 
//              FROM salary_component WHERE structure_id = ?`,
//             [employee.structure_id]
//         );
//         const expenses = await queryDb(
//             `SELECT e.id,e.employee_id,e.expense_type,e.amount,e.reason,e.expense_date,e.document,e.added_by,e.rm_id,e.admin_id,e.rm_status,e.admin_status,e.rm_remark,e.admin_remark,e.status,e.created_at,e.updated_at,
//         e.payment_status,e.scheduled_pay_date,e.is_auto_release,e.payment_released_at,
//         CONCAT(emp.first_name, ' ', emp.last_name) AS employee_name,
//         CONCAT(rm.first_name, ' ', rm.last_name) AS rm_name,
//         CONCAT(admin.first_name, ' ', admin.last_name) AS admin_name,
//         CONCAT(added.first_name, ' ', added.last_name) AS added_by_name
//     FROM expenses e 
//     LEFT JOIN employees emp ON e.employee_id = emp.id
//     LEFT JOIN employees rm ON e.rm_id = rm.id
//     LEFT JOIN employees admin ON e.admin_id = admin.id
//     LEFT JOIN employees added ON e.added_by = added.id
//     WHERE e.company_id = ? AND e.employee_id = ? and e.admin_status=1 and e.status=1`,
//             [decodedUserData?.company_id, employeeId]
//         );

//         if (componentResults.length === 0) {
//             return res.status(200).json({ status: false, message: 'Salary components not found for the given structure' });
//         }
//         let deductionAmount = 0;
//         // Calculate salary breakdown
//         const salaryBreakdown = componentResults.map(component => {
//             let amount = 0;
//             let amountDeduction = 0;
//             // // proper handal for basic and basic_pay and working change for 
//             // if (component.component_type !== 'basic' && component.component_type !== 'basic_pay') {
//             //     if (component.calculation_method === 'percentage') {
//             //         amount = (proratedSalary * component.percentage) / 100;
//             //     } else if (component.calculation_method === 'fixed_amount') {
//             //         amount = component.fixed_amount;
//             //     }
//             //     BasicPayAmount -= amount;
//             // }

//             if (component.component_type == 'expand') {
//                 if (component.component_name != 'basic' && component.component_name != 'basic_pay') {
//                     if (component.calculation_method === 'percentage') {
//                         amount = (proratedSalary * component.percentage) / 100;
//                     } else if (component.calculation_method === 'fixed_amount') {
//                         amount = component.fixed_amount;
//                     }
//                     BasicPayAmount -= amount;
//                 }
//             }
//             else if (component.component_type == 'deduction') {
//                 if (component.calculation_method === 'percentage') {
//                     amountDeduction = (proratedSalary * component.percentage) / 100;
//                     amount = (proratedSalary * component.percentage) / 100;
//                 } else if (component.calculation_method === 'fixed_amount') {
//                     amountDeduction = component.fixed_amount;
//                     amount = component.fixed_amount;
//                 }
//                 deductionAmount += amountDeduction;
//                 BasicPayAmount -= amount;
//             }

//             return {
//                 component_name: component.component_name,
//                 // amount: parseFloat(amount.toFixed(2))
//                 amount: parseFloat(parseFloat(amount).toFixed(2))

//             };
//         });
//         // deductionAmount
//         let NewproratedSalary = proratedSalary - deductionAmount;

//         return res.json({
//             status: true,
//             data: {
//                 employee,
//                 salaryStructure,
//                 components: salaryBreakdown,
//                 ctc,
//                 proratedSalary: NewproratedSalary.toFixed(2),
//                 BasicPayAmount: BasicPayAmount.toFixed(2),
//                 expenses: expenses
//             }
//         });

//     } catch (err) {
//         console.error("GenerateSalary Error:", err);
//         return res.status(500).json({ status: false, error: "Internal Server Error", details: err.message });
//     }
// });


////
router.post('/api/GenerateSalary', async (req, res) => {
    try {
        const { employeeId, presentCount, HF, leaveCount, holidayCount, WO, month, year, PenaltyData, userData } = req.body;

        // Decode userData
        let decodedUserData = null;
        if (userData) {
            try {
                decodedUserData = JSON.parse(Buffer.from(userData, 'base64').toString('utf-8'));
            } catch (error) {
                return res.status(400).json({ status: false, error: 'Invalid userData format' });
            }
        }

        if (!decodedUserData?.id || !decodedUserData?.company_id) {
            return res.status(400).json({
                status: false,
                error: 'Employee ID and Company ID are required',
            });
        }
        // console.log("presentCount", presentCount)
        // Validate required fields
        if (!employeeId || !presentCount || !HF || !leaveCount || !holidayCount || !WO) {
            return res.status(200).json({
                status: false,
                message: 'Missing required fields: employeeId, presentCount, HF, leaveCount, holidayCount, WO'
            });
        }

        // Parse penalties
        let PenaltieHF = 0, PenaltieLeave = 0, PenaltieAbsent = 0, PenaltieFixAmount = 0, PenaltieSandwichLeave = 0;
        let PenaltyDatas = [];
        try {
            PenaltyDatas = JSON.parse(PenaltyData || "[]");
        } catch {
            return res.status(400).json({ status: false, message: "Invalid PenaltyData format" });
        }

        PenaltyDatas.forEach(({ penalty_type, penalty_count = 0, penalty_amount = 0 }) => {
            if (penalty_type === "half-day") PenaltieHF += penalty_count;
            else if (penalty_type === "leave") PenaltieLeave += penalty_count;
            else if (penalty_type === "absent") PenaltieAbsent += penalty_count;
            else if (penalty_type === "fixamout") PenaltieFixAmount += penalty_amount;
            else if (penalty_type === "Sandwich Leave") PenaltieSandwichLeave += penalty_count;
        });
        // console.log("presentCount int", parseFloat(presentCount))
        let NewPresentCount = parseFloat(presentCount) - (PenaltieHF / 2) - PenaltieAbsent;
        let NewLeaveCount = parseFloat(leaveCount) + PenaltieLeave;
        let newHolidayCount = parseFloat(holidayCount) - PenaltieSandwichLeave;

        if (!month || !year) {
            return res.status(200).json({
                status: false,
                message: 'Missing required fields: month,year'
            });
        }

        // Fetch employee details
        const employeeResults = await queryDb(
            `SELECT company_id, first_name, last_name, email_id, ctc, structure_id FROM employees WHERE id = ?`,
            [employeeId]
        );

        if (employeeResults.length === 0) {
            return res.status(200).json({ status: false, message: 'Employee not found' });
        }

        const employee = employeeResults[0];
        const ctc = employee.ctc;

        // Salary calculation
        const totalWorkingDays = NewPresentCount + newHolidayCount + parseFloat(WO) + NewLeaveCount + (parseFloat(HF) / 2);
        // console.log("totalWorkingDays", totalWorkingDays)
        const monthSalary = ctc / 12;



        // Salary structure
        const structureResults = await queryDb(
            `SELECT * FROM salary_structure WHERE structure_id = ?`,
            [employee.structure_id]
        );

        if (structureResults.length === 0) {
            return res.status(200).json({ status: false, message: 'Salary structure not found' });
        }

        const salaryStructure = structureResults[0];

        // Salary components
        const componentResults = await queryDb(
            `SELECT component_id, company_id, structure_id, component_name, component_type, calculation_method, percentage, fixed_amount 
             FROM salary_component WHERE structure_id = ?`,
            [employee.structure_id]
        );
        const expenses = await queryDb(
            `SELECT e.id,e.employee_id,e.expense_type,e.amount,e.reason,e.expense_date,e.document,e.added_by,e.rm_id,e.admin_id,e.rm_status,e.admin_status,e.rm_remark,e.admin_remark,e.status,e.created_at,e.updated_at,
        e.payment_status,e.scheduled_pay_date,e.is_auto_release,e.payment_released_at,
        CONCAT(emp.first_name, ' ', emp.last_name) AS employee_name,
        CONCAT(rm.first_name, ' ', rm.last_name) AS rm_name,
        CONCAT(admin.first_name, ' ', admin.last_name) AS admin_name,
        CONCAT(added.first_name, ' ', added.last_name) AS added_by_name
    FROM expenses e 
    LEFT JOIN employees emp ON e.employee_id = emp.id
    LEFT JOIN employees rm ON e.rm_id = rm.id
    LEFT JOIN employees admin ON e.admin_id = admin.id
    LEFT JOIN employees added ON e.added_by = added.id
    WHERE e.company_id = ? AND e.employee_id = ? and e.admin_status=1 and e.status=1`,
            [decodedUserData?.company_id, employeeId]
        );

        if (componentResults.length === 0) {
            return res.status(200).json({ status: false, message: 'Salary components not found for the given structure' });
        }
        let deductionAmount = 0;
        // Calculate salary breakdown



        componentResults.forEach(component => {
            if (component.component_type === 'deduction') {
                let amountDeduction = 0;
                if (component.calculation_method === 'percentage') {
                    amountDeduction = (monthSalary * component.percentage) / 100;
                } else if (component.calculation_method === 'fixed_amount') {
                    amountDeduction = component.fixed_amount;
                }
                deductionAmount += amountDeduction;
            }
        });

        let monthSalaryAfterDeduction = monthSalary - deductionAmount;
        const daysInMonth = getDaysInMonth(month, year);
        const dailySalary = monthSalaryAfterDeduction / daysInMonth;

        let proratedSalary = (totalWorkingDays * dailySalary) - PenaltieFixAmount;
        let BasicPayAmount = proratedSalary;

        const salaryBreakdown = componentResults.map(component => {
            let amount = 0;
            let amountDeduction = 0;
            // // proper handal for basic and basic_pay and working change for 
            // if (component.component_type !== 'basic' && component.component_type !== 'basic_pay') {
            //     if (component.calculation_method === 'percentage') {
            //         amount = (proratedSalary * component.percentage) / 100;
            //     } else if (component.calculation_method === 'fixed_amount') {
            //         amount = component.fixed_amount;
            //     }
            //     BasicPayAmount -= amount;
            // }

            if (component.component_type == 'expand') {
                if (component.component_name != 'basic' && component.component_name != 'basic_pay') {
                    if (component.calculation_method === 'percentage') {
                        amount = (proratedSalary * component.percentage) / 100;
                    } else if (component.calculation_method === 'fixed_amount') {
                        amount = component.fixed_amount;
                    }
                    BasicPayAmount -= amount;
                }
            }
            else if (component.component_type == 'deduction') {
                if (component.calculation_method === 'percentage') {
                    // amountDeduction = (proratedSalary * component.percentage) / 100;
                    amount = (proratedSalary * component.percentage) / 100;
                } else if (component.calculation_method === 'fixed_amount') {
                    // amountDeduction = component.fixed_amount;
                    amount = component.fixed_amount;
                }
                // deductionAmount += amountDeduction;
                BasicPayAmount -= amount;
            }

            return {
                component_name: component.component_name,
                // amount: parseFloat(amount.toFixed(2))
                amount: parseFloat(parseFloat(amount).toFixed(2))

            };
        });
        // deductionAmount
        let NewproratedSalary = proratedSalary - deductionAmount;

        return res.json({
            status: true,
            data: {
                employee,
                salaryStructure,
                components: salaryBreakdown,
                ctc,
                proratedSalary: proratedSalary.toFixed(2),
                BasicPayAmount: BasicPayAmount.toFixed(2),
                expenses: expenses
            }
        });

    } catch (err) {
        console.error("GenerateSalary Error:", err);
        return res.status(500).json({ status: false, error: "Internal Server Error", details: err.message });
    }
});

router.get('/api/PayEmployeeSalaryDetails', async (req, res) => {
    const { userData, data, departmentId = 0, subDepartmentid = 0, employeeStatus = 1, salaryStatus } = req.query;
    let month = data.month;
    let year = data.year;
    let search = data.search || "";


    let decodedUserData = null;

    if (!month || !year) {
        return res.status(400).json({ status: false, error: 'Month and Year are required' });
    }

    // Decode and validate userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData format' });
        }
    }

    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
    }

    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
    const searchQuery = `%${search}%`;
    try {
        let query = `SELECT esd.id AS salary_detail_id,
                esd.employee_id,
                esd.id,
                esd.employee_name,
                esd.present_days,
                esd.month,
                esd.year,
                esd.half_days,
                esd.absentee_days,
                esd.leave_days,
                esd.leave_requests,
                esd.holidays,
                esd.work_off,
                esd.working_days,
                esd.ctc_yearly,
                esd.monthly_salary,
                esd.basic_pay_amount,
                esd.total_monthly_salary,
                esd.status,
                esd.add_stamp,
                sc.component_name,
                sc.amount
            FROM employeesalarydetails AS esd
            inner JOIN employees AS e ON esd.employee_id = e.id
            LEFT JOIN salarycomponents AS sc
            ON esd.id = sc.salary_detail_id WHERE esd.company_id = ? AND esd.month = ? AND esd.year = ?`;
        let values = [decodedUserData.company_id, month, year];

        if (isAdmin == false) {
            query += ` AND esd.employee_id=?`;
            values.push(decodedUserData.id);

        }
        if (search) {
            query += ` AND esd.employee_name LIKE ?`;
            values.push(searchQuery);
        }
        if (departmentId && departmentId != 0) {
            query += ` AND e.department = ?`;
            values.push(departmentId);
        } if (subDepartmentid && subDepartmentid != 0) {
            query += ` AND e.sub_department = ?`;
            values.push(subDepartmentid);
        }
        if (employeeStatus && employeeStatus == 1) {
            query += ` AND e.employee_status=1 and e.status=1 and e.delete_status=0 `;
        } else {
            query += ` AND (e.employee_status=0 or e.status=0 or e.delete_status=1) `;
        }

        // Approved, Pending
        if (salaryStatus == 'Approved') {
            query += ` AND esd.status=1 `;
        } else if (salaryStatus == 'Pending') {
            query += ` AND esd.status=0 `;
        }
        else if (salaryStatus == 'Hold') {
            query += ` AND esd.status=2 `;
        }



        db.query(query, values, (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ status: false, message: 'Database error', error: err });
            }
            // Group results by salary detail and attach components
            const groupedData = results.reduce((acc, row) => {

                if (!acc[row.salary_detail_id]) {
                    acc[row.salary_detail_id] = {
                        employee_id: row.employee_id,
                        employee_name: row.employee_name,
                        present_days: row.present_days,
                        month: row.month,
                        year: row.year,
                        half_days: row.half_days,
                        absentee_days: row.absentee_days,
                        leave_days: row.leave_days,
                        leave_requests: row.leave_requests,
                        holidays: row.holidays,
                        work_off: row.work_off,
                        working_days: row.working_days,
                        ctc_yearly: row.ctc_yearly,
                        monthly_salary: row.monthly_salary,
                        basic_pay_amount: row.basic_pay_amount,
                        total_monthly_salary: row.total_monthly_salary,
                        id: row.id,
                        status: row.status,
                        components: [],
                    };
                }
                if (row.component_name) {
                    acc[row.salary_detail_id].components.push({
                        component_name: row.component_name,
                        amount: row.amount,
                    });
                }
                return acc;
            }, {});

            res.json({
                status: true,
                month,
                year,
                data: Object.values(groupedData),
            });

        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ status: false, error: 'Server error fetching PayDetails' });
    }
});


router.post("/api/Upadate", (req, res) => {
    const { id, userData, paymentStatus = 1 } = req.body;
    let decodedUserData = null;

    // Decode and validate userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData format' });
        }
    }
    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
    }
    if (!id) {
        return res.status(200).json({ message: "ID is required." });
    }

    db.query(
        "UPDATE employeesalarydetails SET status = ? WHERE id = ? And company_id=?",
        [paymentStatus, id, decodedUserData.company_id],
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
                    message: "Value not found or no changes made."
                });
            }
            let massage = paymentStatus == 1 ? "Payment Done successfully" : paymentStatus == 2 ? "Payment Hold successfully" : "Payment status updated successfully";
            return res.status(200).json({ status: true, message: massage });
        }
    );
});


// late coming 
// Route handler to calculate penalties


// router.post('/calculate-penalties', async (req, res) => {
//     const { userData, month, year } = req.body;

//     let decodedUserData = null;
//     if (userData) {
//         try {
//             const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
//             decodedUserData = JSON.parse(decodedString);
//         } catch (error) {
//             return res.status(400).json({ status: false, error: 'Invalid userData format' });
//         }
//     }

//     if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
//         return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
//     }

//     let employeeId = decodedUserData.id;
//     if (!employeeId || !month || !year) {
//         return res.status(400).json({ message: 'Missing required parameters' });
//     }

//     // Calculate start and end date of the given month and year
//     const startDate = new Date(year, month - 1, 1);
//     const endDate = new Date(year, month, 0);

//     try {
//         db.query('SELECT id, attendance_rules_id FROM employees WHERE id=?', [employeeId], async (err, results) => {
//             if (err) {
//                 return res.status(500).json({ status: false, message: "Error retrieving employee data.", error: err.message });
//             }

//             if (results.length === 0) {
//                 return res.status(404).json({ status: false, message: "Employee not found." });
//             }

//             const attendanceRulesId = results[0].attendance_rules_id;
//             const penalties = await calculatePenalties(employeeId, attendanceRulesId, { startDate, endDate });

//             // Count penalties
//             let totalLateMorning = 0;
//             let totalPenaltyMorningCount = 0;
//             let penaltyMorningName = [];
//             let totalEarlyLeave = 0;
//             let totalPenaltyEarlyLeaveCount = 0;
//             let penaltyEarlyLeaveName = [];

//             penalties.forEach(penalty => {
//                 if (penalty.penalty_morning !== "No Penalty") {
//                     totalLateMorning++;
//                     totalPenaltyMorningCount += penalty.penalty_morning;
//                     penaltyMorningName.push(penalty.penalty_morning);
//                 }
//                 if (penalty.penalty_evening !== "No Penalty") {
//                     totalEarlyLeave++;
//                     totalPenaltyEarlyLeaveCount += penalty.penalty_evening;
//                     penaltyEarlyLeaveName.push(penalty.penalty_evening);
//                 }
//             });

//             return res.status(200).json({
//                 status: true,
//                 message: 'Penalties Data',
//                 totalLateMorning,
//                 totalPenaltyMorningCount,
//                 penaltyMorningName,
//                 totalEarlyLeave,
//                 totalPenaltyEarlyLeaveCount,
//                 penaltyEarlyLeaveName,
//             });
//         });
//     } catch (error) {
//         console.error('Error calculating penalties:', error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// });



router.post('/calculate-penalties', async (req, res) => {
    const { userData, month, year, UserEmployeeId } = req.body;

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData format' });
        }
    }

    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
    }

    let employeeId = UserEmployeeId || decodedUserData.id;
    if (!employeeId || !month || !year) {
        return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Calculate start and end date of the given month and year
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    try {
        db.query('SELECT id, attendance_rules_id FROM employees WHERE id=?', [employeeId], async (err, results) => {
            if (err) {
                return res.status(500).json({ status: false, message: "Error retrieving employee data.", error: err.message });
            }
            if (results.length === 0) {
                return res.status(404).json({ status: false, message: "Employee not found." });
            }
            const attendanceRulesId = results[0].attendance_rules_id;

            if (!attendanceRulesId) {
                return res.status(200).json({ status: false, message: "Attendance rules not found for this employee." });
            }
            const penalties = await calculatePenalties(employeeId, attendanceRulesId, { startDate, endDate });

            let Query = 'SELECT rule_id, company_id, rule_name, rule_description, in_time, out_time, max_working_hours, half_day, total_break_duration, overtime_rate, max_overtime_hours, leave_approval_required, created_at, penalty_rule_applied, late_coming_penalty, late_coming_allowed_days, in_grace_period_minutes, late_coming_penalty_type, early_leaving_penalty, early_leaving_allowed_days, out_grace_period_minutes, early_leaving_penalty_type,sandwich_leave_applied FROM attendance_rules WHERE rule_id=?';
            let ArrayData = [attendanceRulesId];

            db.query(Query, ArrayData, async (err, resultsData) => {
                if (err) {
                    return res.status(500).json({
                        status: false,
                        message: "Error retrieving data.",
                        error: err.message
                    });
                }
                if (resultsData.length === 0) {
                    return res.status(200).json({
                        status: false,
                        message: "Attendance rules not found."
                    });
                }
                // console.log("resultsData", resultsData);

                // Count penalties  
                let totalLateMorning = 0;
                let penaltyMorningName = resultsData[0].late_coming_penalty_type;
                let sandwich_leave_applied = resultsData[0].sandwich_leave_applied;

                let totalEarlyLeave = 0;
                let penaltyEarlyLeaveName = resultsData[0].early_leaving_penalty_type;


                let late_coming_allowed_days = resultsData[0].late_coming_allowed_days;
                let early_leaving_allowed_days = resultsData[0].early_leaving_allowed_days;

                penalties.forEach(penalty => {
                    if (penalty.penalty_morning !== "No Penalty") {
                        totalLateMorning++;
                    }
                    if (penalty.penalty_evening !== "No Penalty") {
                        totalEarlyLeave++;
                    }
                });

                return res.status(200).json({
                    status: true,
                    message: 'Penalties Data',
                    totalLateMorning,
                    penaltyMorningName,
                    totalEarlyLeave,
                    penaltyEarlyLeaveName,
                    late_coming_allowed_days,
                    early_leaving_allowed_days,
                    sandwich_leave_applied
                });
            })

        });
    } catch (error) {
        console.error('Error calculating penalties:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});







const calculatePenalties = (employeeId, attendanceRulesId, dateRange) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT a.attendance_id, a.employee_id, a.attendance_date, a.check_in_time, a.check_out_time,
                r.in_time, r.out_time, r.in_grace_period_minutes, r.out_grace_period_minutes,
                r.late_coming_penalty, r.early_leaving_penalty,
                r.late_coming_allowed_days, r.early_leaving_allowed_days, r.penalty_rule_applied,
                r.late_coming_penalty_type, r.early_leaving_penalty_type
            FROM attendance a
            JOIN attendance_rules r ON a.company_id = r.company_id
            WHERE r.rule_id=? AND a.attendance_date BETWEEN ? AND ? AND a.employee_id = ?`;

        db.query(query, [attendanceRulesId, dateRange.startDate, dateRange.endDate, employeeId], (err, results) => {
            if (err) {
                return reject(err);
            }
            let penaltyEvening = "";
            const penalties = results.map((row) => {
                // Prepare rowData for morning penalty calculation
                const rowData = { in_time: row.in_time, in_grace_period_minutes: row.in_grace_period_minutes };
                let updatedTime = addGracePeriod(rowData);

                // Convert check_in_time to Date object
                const [checkInHours, checkInMinutes, checkInSeconds] = row.check_in_time.split(':').map(Number);
                const checkInTimeDate = new Date();
                checkInTimeDate.setHours(checkInHours, checkInMinutes, checkInSeconds, 0);

                // Calculate morning penalty (late-coming)
                const penaltyMorning = (checkInTimeDate.getTime() > updatedTime.getTime() && row.penalty_rule_applied === 1)
                    ? row.late_coming_penalty
                    : 'No Penalty';

                // Calculate evening penalty (early-leaving)
                if (row.check_out_time != null && row.out_time != null) {
                    const [checkOutHours, checkOutMinutes, checkOutSeconds] = row.check_out_time.split(':').map(Number);
                    const checkOutDate = new Date();
                    checkOutDate.setHours(checkOutHours, checkOutMinutes, checkOutSeconds || 0, 0);

                    // Convert out_time (HH:mm) to a Date object
                    const [outHours, outMinutes] = row.out_time.split(':').map(Number);
                    const outTimeDate = new Date();
                    outTimeDate.setHours(outHours, outMinutes, 0, 0);

                    // Subtract the grace period (in milliseconds) from out_time
                    const earlyLeaveLimit = outTimeDate.getTime() - (row.out_grace_period_minutes * 60000);

                    // Check if the check_out_time is before the earlyLeaveLimit and apply penalty if rule is applied
                    penaltyEvening = (checkOutDate.getTime() < earlyLeaveLimit && row.penalty_rule_applied)
                        ? row.early_leaving_penalty
                        : 'No Penalty';
                }

                return {
                    attendance_id: row.attendance_id,
                    penalty_morning: penaltyMorning,
                    penalty_evening: penaltyEvening
                };

            });

            resolve(penalties);
        });
    });
};

const addGracePeriod = (rowData) => {
    // Convert 'in_time' (e.g., '09:30') into a Date object
    const [hours, minutes] = rowData.in_time.split(':').map(Number); // Splits '09:30' -> [9, 30]
    const inTimeDate = new Date();
    inTimeDate.setHours(hours, minutes, 0, 0); // Set the time to 09:30

    // Add the grace period (in minutes) to the 'in_time'
    const gracePeriodMilliseconds = rowData.in_grace_period_minutes * 60000; // Convert minutes to milliseconds
    const updatedTime = new Date(inTimeDate.getTime() + gracePeriodMilliseconds);

    return updatedTime;
};














// router.post('/calculate-Sandwichpenalties', async (req, res) => {
//     try {
//         const { userData, month, year, UserEmployeeId } = req.body;
//         let decodedUserData = null;

//         if (userData) {
//             try {
//                 const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
//                 decodedUserData = JSON.parse(decodedString);
//             } catch (error) {
//                 return res.status(400).json({ status: false, error: 'Invalid userData format' });
//             }
//         }

//         if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
//             return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
//         }

//         const employeeId = UserEmployeeId || decodedUserData.id;
//         const companyId = decodedUserData.company_id;

//         const startDate = new Date(`${year}-${month}-01`);
//         const endDate = new Date(year, month, 0);

//         const [EmployeeRows] = await db.promise().query(
//             `SELECT id, first_name, last_name, date_of_Joining, last_day FROM employees WHERE id = ? 
//             AND company_id = ?`, [employeeId, companyId]
//         );

//         if (!EmployeeRows.length) {
//             return res.status(404).json({ status: false, error: 'Employee not found' });
//         }

//         const employee = EmployeeRows[0];
//         const doj = new Date(employee.date_of_Joining);
//         const lastDay = employee.last_day ? new Date(employee.last_day) : null;

//         const effectiveStart = doj > startDate ? doj : startDate;
//         const effectiveEnd = lastDay && lastDay < endDate ? lastDay : endDate;

//         const dates = [];
//         let currentDate = new Date(effectiveStart);
//         while (currentDate <= effectiveEnd) {
//             dates.push(currentDate.toISOString().split('T')[0]);
//             currentDate.setDate(currentDate.getDate() + 1);
//         }

//         const [workWeekData] = await db.promise().query(
//             `SELECT ww.* FROM work_week ww JOIN employees e ON e.work_week_id = ww.id
//              WHERE e.id = ? AND e.company_id = ? AND e.status = 1 AND e.delete_status = 0`,
//             [employeeId, companyId]
//         );

//         const workWeek = workWeekData.length > 0 ? workWeekData[0] : null;

//         const [leaves] = await db.promise().query(
//             `SELECT start_date, end_date FROM leaves 
//              WHERE deletestatus = 0 AND status = 1 AND admin_status = 1 
//              AND employee_id = ? AND company_id = ?`,
//             [employeeId, companyId]
//         );

//         let penaltyCount = {
//             absentDays: 0,
//             sandwichLeaves: 0,
//             presentDays: 0,
//             leaves: 0,
//             holidays: 0,
//             weeklyOffs: 0
//         };

//         const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

//         for (let i = 0; i < dates.length; i++) {
//             const date = dates[i];
//             const dateObj = new Date(date);
//             const dayOfWeek = dateObj.getDay();
//             const weekNumber = Math.ceil(dateObj.getDate() / 7);
//             const dayKey = `${daysOfWeek[dayOfWeek]}${weekNumber}`;
//             let status = "Absent";

//             const isWeeklyOff = workWeek && workWeek[dayKey] === 3;
//             const isHolidayToday = (await checkHoliday(companyId, date)).length > 0;

//             const attendance = await getAttendanceData(companyId, employeeId, date);
//             if (attendance.length > 0 && attendance[0].status != 'Absent') {
//                 status = "Present";
//                 penaltyCount.presentDays++;
//                 continue;
//             }

//             const leave = leaves.find(lv => date >= lv.start_date.split('T')[0] && date <= lv.end_date.split('T')[0]);
//             if (leave) {
//                 status = "Leave";
//                 penaltyCount.leaves++;
//                 continue;
//             }

//             if (isHolidayToday) {
//                 status = "Holiday";
//                 penaltyCount.holidays++;
//             } else if (isWeeklyOff) {
//                 status = "WO";
//                 penaltyCount.weeklyOffs++;
//             }

//             const currentMonth = String(month).padStart(2, '0');
//             if ((isHolidayToday || isWeeklyOff) && i > 0 && i < dates.length - 1) {
//                 const prev = dates[i - 1];
//                 const next = dates[i + 1];

//                 // ✅ Only check sandwich logic if previous and next dates are in same month
//                 if (prev.split('-')[1] == currentMonth && next.split('-')[1] == currentMonth) {
//                     const prevAbsentOrLeave = await isAbsentOrLeave(prev, companyId, employeeId, leaves);
//                     const nextAbsentOrLeave = await isAbsentOrLeave(next, companyId, employeeId, leaves);

//                         console.log("prevAbsentOrLeave, nextAbsentOrLeave", prev, prevAbsentOrLeave, next, nextAbsentOrLeave);
//                         console.log("---------");
//                     // console.log("prevAbsentOrLeave", prevAbsentOrLeave);
//                     // console.log("nextAbsentOrLeave", nextAbsentOrLeave);

//                     if (prevAbsentOrLeave && nextAbsentOrLeave) {
//                         status = "Sandwich Leave";
//                         penaltyCount.sandwichLeaves++;
//                         continue;
//                     }
//                 }
//             }
//             if (status == "Absent") penaltyCount.absentDays++;
//         }

//         return res.status(200).json({
//             status: true,
//             message: 'Penalties calculated',
//             data: penaltyCount
//         });
//     } catch (err) {
//         return res.status(500).json({
//             status: false,
//             message: 'Error calculating penalties',
//             error: err.message || err
//         });
//     }
// });


// const checkHoliday = async (companyId, date) => {
//     try {
//         const [holidayData] = await db.promise().query(
//             `SELECT id FROM holiday 
//              WHERE company_id = ? 
//              AND DATE(date) = ? 
//              AND status = 1`,
//             [companyId, date]
//         );

//         return holidayData; // Returns an array of holiday records (empty if no holiday)
//     } catch (error) {
//         console.error('Error checking holiday:', error);
//         return [];
//     }
// };


// // Helper: check if day is Absent or on Leave
// async function isAbsentOrLeave(date, companyId, employeeId, leaveList) {
//     const attendance = await getAttendanceData(companyId, employeeId, date);
//     if (attendance.length > 0 && (attendance[0].status != 'Absent' || attendance[0].status != 'absent')) return false;

//     const isOnLeave = leaveList.some(leave =>
//         date >= leave.start_date.split('T')[0] && date <= leave.end_date.split('T')[0]
//     );
//     // console.log("isOnLeave", isOnLeave, attendance);
//     // console.log("attendance.length ", attendance.length );
//     return isOnLeave || attendance.length === 0;
// }

// const getAttendanceData = async (companyId, employeeId, date) => {
//     try {
//         const [rows] = await db.promise().query(
//             `SELECT attendance_id,status FROM attendance WHERE company_id = ? AND employee_id = ? AND 
//             DATE(attendance_date) = ? AND (attendance_status = 1 OR approval_status = 1)`,
//             [companyId, employeeId, date]
//         );
//         return rows;
//     } catch (error) {
//         console.error('Error fetching attendance data:', error);
//         return [];
//     }
// };



// ===============================
// ✅ Main Sandwich Penalty API
// ===============================
router.post("/calculate-Sandwichpenalties", async (req, res) => {
  try {
    const { userData, month, year, UserEmployeeId } = req.body;
    let decodedUserData = null;

    // Decode Base64 userData
    if (userData) {
      try {
        const decodedString = Buffer.from(userData, "base64").toString("utf-8");
        decodedUserData = JSON.parse(decodedString);
      } catch (error) {
        return res
          .status(400)
          .json({ status: false, error: "Invalid userData format" });
      }
    }

    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
      return res
        .status(400)
        .json({ status: false, error: "Employee ID and Company ID are required" });
    }

    const employeeId = UserEmployeeId || decodedUserData.id;
    const companyId = decodedUserData.company_id;

    // Calculate month range
    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(year, month, 0);

    // Fetch Employee Info
    const [EmployeeRows] = await db.promise().query(
      `SELECT id, first_name, last_name, date_of_Joining, last_day 
       FROM employees 
       WHERE id = ? AND company_id = ?`,
      [employeeId, companyId]
    );

    if (!EmployeeRows.length) {
      return res.status(404).json({ status: false, error: "Employee not found" });
    }

    const employee = EmployeeRows[0];
    const doj = new Date(employee.date_of_Joining);
    const lastDay = employee.last_day ? new Date(employee.last_day) : null;

    // Effective range based on DOJ and last working day
    const effectiveStart = doj > startDate ? doj : startDate;
    const effectiveEnd = lastDay && lastDay < endDate ? lastDay : endDate;

    // Generate all dates in range
    const dates = [];
    let currentDate = new Date(effectiveStart);
    while (currentDate <= effectiveEnd) {
      dates.push(currentDate.toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Fetch work week config
    const [workWeekData] = await db.promise().query(
      `SELECT ww.* FROM work_week ww 
       JOIN employees e ON e.work_week_id = ww.id
       WHERE e.id = ? AND e.company_id = ? 
       AND e.status = 1 AND e.delete_status = 0`,
      [employeeId, companyId]
    );
    const workWeek = workWeekData.length > 0 ? workWeekData[0] : null;

    // Fetch approved leaves
    const [leaves] = await db.promise().query(
      `SELECT start_date, end_date FROM leaves 
       WHERE deletestatus = 0 AND status = 1 AND admin_status = 1 
       AND employee_id = ? AND company_id = ?`,
      [employeeId, companyId]
    );

    // ===============================
    // Initialize counters
    // ===============================
    let penaltyCount = {
      absentDays: 0,
      sandwichLeaves: 0,
      presentDays: 0,
      leaves: 0,
      holidays: 0,
      weeklyOffs: 0,
    };

    const daysOfWeek = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

    // ===============================
    // Step 1: Count regular attendance, leaves, holidays, WOs
    // ===============================
    const holidayOrWO = [];

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay();
      const weekNumber = Math.ceil(dateObj.getDate() / 7);
      const dayKey = `${daysOfWeek[dayOfWeek]}${weekNumber}`;
      let status = "Absent";

      const isWeeklyOff = workWeek && workWeek[dayKey] === 3;
      const isHolidayToday = (await checkHoliday(companyId, date)).length > 0;

      // Check Attendance
      const attendance = await getAttendanceData(companyId, employeeId, date);
      if (attendance.length > 0 && attendance[0].status.toLowerCase() !== "absent") {
        status = "Present";
        penaltyCount.presentDays++;
        continue;
      }

      // Check Leave
      const leave = leaves.find(
        (lv) => date >= lv.start_date.split("T")[0] && date <= lv.end_date.split("T")[0]
      );
      if (leave) {
        status = "Leave";
        penaltyCount.leaves++;
        continue;
      }

      // Check Holiday or Weekly Off
      if (isHolidayToday) {
        status = "Holiday";
        penaltyCount.holidays++;
        holidayOrWO.push(date);
      } else if (isWeeklyOff) {
        status = "WO";
        penaltyCount.weeklyOffs++;
        holidayOrWO.push(date);
      } else {
        penaltyCount.absentDays++;
      }
    }

    // ===============================
    // Step 2: Group continuous holidays/weekoffs into blocks
    // ===============================
    const blocks = [];
    let currentBlock = [];

    for (let i = 0; i < holidayOrWO.length; i++) {
      if (currentBlock.length === 0) {
        currentBlock.push(holidayOrWO[i]);
      } else {
        const prev = new Date(holidayOrWO[i - 1]);
        const curr = new Date(holidayOrWO[i]);
        const diff = (curr - prev) / (1000 * 60 * 60 * 24);

        if (diff === 1) {
          currentBlock.push(holidayOrWO[i]);
        } else {
          blocks.push(currentBlock);
          currentBlock = [holidayOrWO[i]];
        }
      }
    }
    if (currentBlock.length > 0) blocks.push(currentBlock);

    // ===============================
    // Step 3: Check each block's before & after status
    // ===============================
    let sandwichCount = 0;

    for (const block of blocks) {
      const firstDate = block[0];
      const lastDate = block[block.length - 1];

      const prevDate = new Date(firstDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const prevStr = prevDate.toISOString().split("T")[0];
      const nextStr = nextDate.toISOString().split("T")[0];

      const prevAbsentOrLeave = await isAbsentOrLeave(prevStr, companyId, employeeId, leaves);
      const nextAbsentOrLeave = await isAbsentOrLeave(nextStr, companyId, employeeId, leaves);

      console.log(
        "Block check:",
        firstDate,
        "to",
        lastDate,
        "=>",
        prevStr,
        prevAbsentOrLeave,
        nextStr,
        nextAbsentOrLeave
      );

      // ✅ Only count if both sides are absent/leave
      if (prevAbsentOrLeave && nextAbsentOrLeave) {
        sandwichCount += block.length;
      }
    }

    penaltyCount.sandwichLeaves = sandwichCount;

    // ===============================
    // Final Response
    // ===============================
    return res.status(200).json({
      status: true,
      message: "Penalties calculated successfully",
      data: penaltyCount,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: "Error calculating penalties",
      error: err.message || err,
    });
  }
});

// ===============================
// ✅ Helper Functions
// ===============================

// Check if day is a company holiday
const checkHoliday = async (companyId, date) => {
  try {
    const [holidayData] = await db.promise().query(
      `SELECT id FROM holiday WHERE company_id = ? AND DATE(date) = ? AND status = 1`,
      [companyId, date]
    );
    return holidayData;
  } catch (error) {
    console.error("Error checking holiday:", error);
    return [];
  }
};

// Check if date is absent or on leave
async function isAbsentOrLeave(date, companyId, employeeId, leaveList) {
  const attendance = await getAttendanceData(companyId, employeeId, date);
  if (attendance.length > 0 && attendance[0].status.toLowerCase() !== "absent") {
    return false; // present day, not absent/leave
  }

  const isOnLeave = leaveList.some(
    (leave) =>
      date >= leave.start_date.split("T")[0] && date <= leave.end_date.split("T")[0]
  );

  return isOnLeave || attendance.length === 0;
}

// Fetch attendance record
const getAttendanceData = async (companyId, employeeId, date) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT attendance_id, status FROM attendance 
       WHERE company_id = ? AND employee_id = ? 
       AND DATE(attendance_date) = ? 
       AND (attendance_status = 1 OR approval_status = 1)`,
      [companyId, employeeId, date]
    );
    return rows;
  } catch (error) {
    console.error("Error fetching attendance data:", error);
    return [];
  }
};



module.exports = router;


