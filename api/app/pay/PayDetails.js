const express = require("express");
const router = express.Router();
const db = require("../../../DB/ConnectionSql");
const { AdminCheck } = require('../../../model/functlity/AdminCheck');


router.post('/api/PayEmployeeSalaryDetails', async (req, res) => {
    const { userData, month, year, Search } = req.body;
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
            LEFT JOIN SalaryComponents AS sc
            ON esd.id = sc.salary_detail_id WHERE esd.company_id = ? AND esd.month = ? AND esd.year = ?`;
        let values = [decodedUserData.company_id, month, year];

        if (isAdmin == false) {
            query += ` AND esd.employee_id=?`;
            values.push(decodedUserData.id);
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


module.exports = router;
