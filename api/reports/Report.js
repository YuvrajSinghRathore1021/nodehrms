
const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');

// Create a new record (Create)

router.post("/GetReport", async (req, res) => {
    const { userData, EmployeeId = '', StartMonth = '', StartYear = '', EndMonth = '', EndYear = '' } = req.body;

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, "base64").toString("utf-8");
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(200).json({ status: false, error: "Invalid UserData" });
        }
    }


    let whereClauses = [`e.company_id = ?`];
    // `esd.status = 1`
    let values = [decodedUserData.company_id];

    if (EmployeeId) {
        whereClauses.push(`e.id = ?`);
        values.push(EmployeeId);
    }

    if (StartMonth && StartYear && EndMonth && EndYear) {
        whereClauses.push(`(esd.year BETWEEN ? AND ?) AND (esd.month BETWEEN ? AND ?)`);
        values.push(StartYear, EndYear, StartMonth, EndMonth);
    }

    const whereString = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : '';

    const [employeesTotal] = await db.promise().query(
        "SELECT COUNT(id) AS Total FROM employees WHERE company_id=?",
        [decodedUserData.company_id]
    );

    const [totalSalary] = await db.promise().query(
        `SELECT SUM(esd.total_monthly_salary) as totalSalary 
         FROM employeesalarydetails as esd 
         JOIN employees as e ON e.id = esd.employee_id 
         ${whereString}`, values
    );


    const [employees] = await db.promise().query(
        `SELECT e.id, e.first_name, e.last_name, SUM(esd.total_monthly_salary) as totalsalary 
         FROM employees as e 
         LEFT JOIN employeesalarydetails as esd ON esd.employee_id = e.id 
         ${whereString} 
         GROUP BY e.id`, values
    );

    return res.status(200).json({
        status: true,
        message: "Data fetched successfully.",
        data: {
            employeesTotal: employeesTotal[0].Total,
            totalSalary: totalSalary[0].totalSalary || 0,
            employees,
        }
    });
});

router.post("/SalaryGraph", async (req, res) => {
    const { userData } = req.body;

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, "base64").toString("utf-8");
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(200).json({ status: false, error: "Invalid UserData" });
        }
    }

    try {
        const [rows] = await db.promise().query(
            `SELECT month, year, SUM(total_monthly_salary) AS total_salary 
             FROM employeesalarydetails 
             WHERE company_id = ? 
             GROUP BY year, month 
             ORDER BY year ASC, month ASC`,
            [decodedUserData.company_id]
        );

        return res.status(200).json({
            status: true,
            message: "Graph data fetched",
            data: rows,
        });
    } catch (error) {
        console.error("Error fetching salary graph data:", error);
        return res.status(500).json({
            status: false,
            message: "Server Error",
        });
    }
});



// In your Node.js backend (Reports.js or wherever your report APIs are)

router.post("/DepartmentSalaryGraph", async (req, res) => {
    const { userData } = req.body;

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, "base64").toString("utf-8");
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(200).json({ status: false, error: "Invalid UserData" });
        }
    }

    try {
        const [result] = await db.promise().query(`
            SELECT e.department,SUM(esd.total_monthly_salary) AS total_salary 
            FROM employees e
            LEFT JOIN employeesalarydetails esd ON e.id = esd.employee_id
            WHERE e.company_id = ? 
            GROUP BY e.department
        `, [decodedUserData.company_id]);
        // AND esd.status = 1

        return res.status(200).json({
            status: true,
            message: "Department wise salary fetched",
            // data: result
            data: [
                { "department": "HR", "total_salary": 400000 },
                { "department": "IT", "total_salary": 800000 },
                { "department": "Finance", "total_salary": 300000 },
                { "department": "Marketing", "total_salary": 500000 }
            ]
        });

    } catch (error) {
        console.error("Department salary fetch error:", error);
        return res.status(500).json({ status: false, message: "Server Error" });
    }
});

// Export the router
module.exports = router;
