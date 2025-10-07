const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');


router.post('/api/Birthday', async (req, res) => {
    const { userData, startDate, endDate } = req.body;
    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData format' });
        }
    }

    if (!decodedUserData?.id || !decodedUserData?.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
    }

    try {
        const useCustomRange = startDate && endDate;

        // Build SQL and params
        let query = `
            SELECT id, profile_image, CONCAT(first_name, ' ', last_name) AS name, dob
            FROM employees
            WHERE company_id = ? AND employee_status = 1 AND status = 1 AND delete_status = 0 
            AND DATE_FORMAT(dob, '%m-%d') 
        `;
        const params = [decodedUserData.company_id];

        if (useCustomRange) {
            query += ` BETWEEN DATE_FORMAT(?, '%m-%d') AND DATE_FORMAT(?, '%m-%d')`;
            params.push(startDate, endDate);
        } else {
            query += ` BETWEEN DATE_FORMAT(CURDATE(), '%m-%d') AND DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 7 DAY), '%m-%d')`;
        }

        const Results = await new Promise((resolve, reject) => {
            db.query(query, params, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        const today = new Date();

        const responseData = Results.map(emp => {
            const dob = new Date(emp.dob);
            const birthdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());

            const diffInDays = Math.ceil((birthdayThisYear - today) / (1000 * 60 * 60 * 24));

            let statusText = '';
            if (useCustomRange) {
                statusText = 'in selected range';
            } else if (diffInDays === 0) {
                statusText = 'today';
            } else if (diffInDays === 1) {
                statusText = 'tomorrow';
            } else {
                statusText = `${diffInDays} days after`;
            }

            return {
                ...emp,
                status: statusText
            };
        });

        res.json({
            status: true,
            total: responseData.length,
            message: 'Birthdays fetched successfully',
            data: responseData
        });
    } catch (error) {
        console.error('Error fetching birthdays:', error);
        res.status(500).json({ status: false, error: 'Server error' });
    }
});


router.post('/api/workAnniversaries', async (req, res) => {
    const { userData, startDate, endDate } = req.body;

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData format' });
        }
    }

    if (!decodedUserData?.id || !decodedUserData?.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
    }

    try {
        const useCustomRange = startDate && endDate;

        // Build SQL query
        let query = `
            SELECT id, profile_image, CONCAT(first_name, ' ', last_name) AS name, date_of_Joining
            FROM employees
            WHERE company_id = ? AND employee_status = 1 AND status = 1 AND delete_status = 0 
            AND DATE_FORMAT(date_of_Joining, '%m-%d')
        `;
        const params = [decodedUserData.company_id];

        if (useCustomRange) {
            query += ` BETWEEN DATE_FORMAT(?, '%m-%d') AND DATE_FORMAT(?, '%m-%d')`;
            params.push(startDate, endDate);
        } else {
            query += ` BETWEEN DATE_FORMAT(CURDATE(), '%m-%d') AND DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 7 DAY), '%m-%d')`;
        }

        const Results = await new Promise((resolve, reject) => {
            db.query(query, params, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        const today = new Date();

        const responseData = Results.map(emp => {
            const joinDate = new Date(emp.date_of_Joining);
            const annivThisYear = new Date(today.getFullYear(), joinDate.getMonth(), joinDate.getDate());

            const diffInDays = Math.ceil((annivThisYear - today) / (1000 * 60 * 60 * 24));

            let statusText = '';
            if (useCustomRange) {
                statusText = 'in selected range';
            } else if (diffInDays === 0) {
                statusText = 'today';
            } else if (diffInDays === 1) {
                statusText = 'tomorrow';
            } else {
                statusText = `${diffInDays} days after`;
            }

            return {
                ...emp,
                status: statusText
            };
        });

        res.json({
            status: true,
            total: responseData.length,
            message: 'Work anniversaries fetched successfully',
            data: responseData
        });
    } catch (error) {
        console.error('Error fetching anniversaries:', error);
        res.status(500).json({ status: false, error: 'Server error' });
    }
});


router.post('/api/newJoiners', async (req, res) => {
    const { userData, startDate, endDate } = req.body;

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData format' });
        }
    }

    if (!decodedUserData?.id || !decodedUserData?.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
    }

    try {
        const useCustomRange = startDate && endDate;
        const queryParams = [decodedUserData.company_id];
        let query = `
            SELECT id, profile_image, CONCAT(first_name, ' ', last_name) AS name, date_of_Joining
            FROM employees
            WHERE company_id = ? AND employee_status = 1 AND status = 1 AND delete_status = 0 
        `;

        if (useCustomRange) {
            query += ` AND DATE(date_of_Joining) BETWEEN ? AND ?`;
            queryParams.push(startDate, endDate);
        } else {
            query += ` AND DATE(date_of_Joining) BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND CURDATE()`;
        }

        const Results = await new Promise((resolve, reject) => {
            db.query(query, queryParams, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        const today = new Date();
        const responseData = Results.map(emp => {
            const joinDate = new Date(emp.date_of_Joining);
            const diffInDays = Math.ceil((today - joinDate) / (1000 * 60 * 60 * 24));

            let statusText = '';
            if (useCustomRange) {
                statusText = 'in selected range';
            } else if (diffInDays === 0) {
                statusText = 'joined today';
            } else {
                statusText = `${diffInDays} days ago`;
            }

            return {
                ...emp,
                status: statusText
            };
        });

        res.json({
            status: true,
            total: responseData.length,
            message: 'New joiners fetched successfully',
            data: responseData
        });
    } catch (error) {
        console.error('Error fetching new joiners:', error);
        res.status(500).json({ status: false, error: 'Server error' });
    }
});


router.post('/api/attendanceSummary', async (req, res) => {
    const { userData, date } = req.body;
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

    const targetDate = date || new Date().toISOString().slice(0, 10); // yyyy-mm-dd

    try {
        // Total active employees
        const [totalEmp] = await db.promise().query(`
            SELECT COUNT(*) as total 
            FROM employees 
            WHERE company_id = ? AND status = 1 AND employee_status = 1 AND delete_status = 0
        `, [decodedUserData.company_id]);

        // Total employees marked present (attendance entry on given date)
        const [attended] = await db.promise().query(`
            SELECT COUNT(DISTINCT employee_id) as present 
            FROM attendance 
            WHERE company_id = ? AND attendance_date = ?
        `, [decodedUserData.company_id, targetDate]);

        // Employees who checked in on time (before 10:00 AM)
        const [onTime] = await db.promise().query(`
            SELECT COUNT(DISTINCT employee_id) as on_time 
            FROM attendance 
            WHERE company_id = ? AND attendance_date = ? AND TIME(check_in_time) <= '09:30:00'
        `, [decodedUserData.company_id, targetDate]);


        const [leaveData] = await db.promise().query(`
            SELECT COUNT(DISTINCT employee_id) as leave_count 
            FROM leaves 
            WHERE company_id = ? 
              AND deletestatus = 0 
              AND admin_status = 1 
              AND ? BETWEEN start_date AND end_date
        `, [decodedUserData.company_id, targetDate]);

        // SELECT `id`, `employee_id`, `company_id`, `date`, `holiday`, `status`, `add_stamp` FROM `holiday` WHERE 1


        const dateObj = new Date(targetDate);
        const yearH = dateObj.getFullYear();
        const monthH = dateObj.getMonth() + 1; // JS months are 0-indexed

        const [holidays] = await db.promise().query(`
    SELECT COUNT(id) as holiday_count 
    FROM holiday
    WHERE status = 1 
      AND company_id = ? 
      AND YEAR(date) = ? 
      AND MONTH(date) = ?
    ORDER BY date ASC
`, [decodedUserData.company_id, yearH, monthH]);

        const totalEmployees = totalEmp[0]?.total || 0;
        const totalholidays = holidays[0]?.holiday_count || 0;
        const presentCount = attended[0]?.present || 0;
        const presentCountPercent = totalEmployees > 0 ? ((presentCount / totalEmployees) * 100).toFixed(2) : "0.00";;
        const onTimeCount = onTime[0]?.on_time || 0;
        const onTimePercent = totalEmployees > 0 ? ((onTimeCount / totalEmployees) * 100).toFixed(2) : "0.00";
        const leaveCount = leaveData[0]?.leave_count || 0;
        const leavePercent = totalEmployees > 0 ? ((leaveCount / totalEmployees) * 100).toFixed(2) : "0.00";
        res.json({
            status: true,
            date: targetDate,
            totalEmployees,
            totalholidays,
            presentCount,
            onTimeCount,
            onTimePercent: `${onTimePercent}%`,
            presentCountPercent: `${presentCountPercent}%`,
            leaveCount: leaveCount,
            leavePercent: leavePercent,
        });
    } catch (error) {
        console.error('Error fetching attendance summary:', error);
        res.status(500).json({ status: false, error: 'Server error' });
    }
});

router.post('/api/employeeStatusSummary', async (req, res) => {
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

    if (!decodedUserData || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is required' });
    }

    try {
        // Get all employees for the company
        const [result] = await db.promise().query(`
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN status = 1 AND employee_status = 1 AND delete_status = 0 THEN 1 ELSE 0 END) AS active,
                SUM(CASE WHEN status = 0 or status = 2  OR employee_status = 0 OR delete_status = 1 THEN 1 ELSE 0 END) AS inactive
            FROM employees
            WHERE company_id = ?
        `, [decodedUserData.company_id]);

        res.json({
            status: true,
            message: 'Employee status summary fetched successfully',
            data: {
                total: result[0].total,
                active: result[0].active,
                inactive: result[0].inactive
            }
        });
    } catch (error) {
        console.error('Error fetching employee status summary:', error);
        res.status(500).json({ status: false, error: 'Server error' });
    }
});

router.post('/api/topArrivals', async (req, res) => {
    const { userData, limit, data } = req.body;
    // data = { month: 6, year: 2025 }

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData format' });
        }
    }

    if (!decodedUserData?.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is required' });
    }

    const topLimit = limit || 30;
    const selectedMonth = data?.month;
    const selectedYear = data?.year;

    // ⛔ Block future month/year
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // JS months are 0-based
    const currentYear = today.getFullYear();

    if (!selectedMonth || !selectedYear) {
        return res.status(400).json({ status: false, error: 'Month and Year are required' });
    }

    if (selectedYear > currentYear || (selectedYear == currentYear && selectedMonth > currentMonth)) {
        return res.status(400).json({ status: false, error: 'Future month not allowed' });
    }

    try {
        // Step 1: Get working days
        const [workingDaysResult] = await db.promise().query(`
            SELECT COUNT(DISTINCT attendance_date) AS working_days
            FROM attendance
            WHERE company_id = ?
              AND MONTH(attendance_date) = ?
              AND YEAR(attendance_date) = ?
        `, [decodedUserData.company_id, selectedMonth, selectedYear]);

        const totalWorkingDays = workingDaysResult[0]?.working_days || 1;

        // Step 2: Get attendance stats
        const [results] = await db.promise().query(`
            SELECT 
                e.id,
                e.profile_image,
                CONCAT(e.first_name, ' ', e.last_name) AS name,
                e.designation,
                COUNT(a.attendance_id) AS total_present_days,
                SUM(CASE WHEN TIME(a.check_in_time) <= '09:30:00' THEN 1 ELSE 0 END) AS on_time_days,
                ROUND(SUM(CASE WHEN TIME(a.check_in_time) <= '09:30:00' THEN 1 ELSE 0 END) / COUNT(a.attendance_id) * 100, 2) AS on_time_percent
            FROM attendance a
            JOIN employees e ON e.id = a.employee_id
            WHERE 
                a.company_id = ?
                AND MONTH(a.attendance_date) = ?
                AND YEAR(a.attendance_date) = ?
                AND e.status = 1 AND e.delete_status = 0
            GROUP BY a.employee_id
        `, [decodedUserData.company_id, selectedMonth, selectedYear]);

        // Step 3: Calculate percentages
        const enrichedResults = results.map(emp => {
            const attendancePercent = ((emp.total_present_days / totalWorkingDays) * 100).toFixed(2);
            const onTimePercent = parseFloat(emp.on_time_percent).toFixed(2);
            const finalPercent = ((parseFloat(attendancePercent) + parseFloat(onTimePercent)) / 2).toFixed(2);

            return {
                ...emp,
                attendance_percent: attendancePercent,
                final_percent: finalPercent
            };
        });

        // Step 4: Sort and limit
        enrichedResults.sort((a, b) => {
            const diff = parseFloat(b.final_percent) - parseFloat(a.final_percent);
            return diff !== 0 ? diff : b.total_present_days - a.total_present_days;
        });

        const topResults = enrichedResults.slice(0, topLimit);

        res.json({
            status: true,
            message: `Top ${topLimit} employee arrivals for ${selectedMonth}/${selectedYear}`,
            data: topResults
        });
    } catch (error) {
        console.error('Error fetching top arrivals:', error);
        res.status(500).json({ status: false, error: 'Server error' });
    }
});

router.post('/api/teamsStrength', async (req, res) => {
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

    if (!decodedUserData || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is required' });
    }

    try {
        const [results] = await db.promise().query(`
            SELECT 
                d.id AS department_id,
                d.name AS department_name,
                d.type,
                COUNT(e.id) AS strength
            FROM departments d
            INNER JOIN employees e 
                ON e.department = d.id 
                AND e.company_id = d.company_id 
                AND e.status = 1 
                AND e.employee_status = 1 
                AND e.delete_status = 0
            WHERE d.company_id = ?
            GROUP BY d.id, d.name, d.type
            ORDER BY strength DESC
        `, [decodedUserData.company_id]);

        res.json({
            status: true,
            message: 'Department strength fetched successfully',
            data: results
        });
    } catch (error) {
        console.error('Error fetching department strength:', error);
        res.status(500).json({ status: false, error: 'Server error' });
    }
})

const moment = require('moment');
router.post('/api/TotalEmployees', async (req, res) => {
    const { userData, filter } = req.body;
    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData format' });
        }
    }

    if (!decodedUserData || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is required' });
    }

    // Set date ranges based on filter
    let fromDate, toDate;
    const today = moment().startOf('day');

    switch (filter) {
        case 'last_month':
            fromDate = moment().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
            toDate = moment().subtract(1, 'month').endOf('month').format('YYYY-MM-DD');
            break;
        case 'last_year':
            fromDate = moment().subtract(1, 'year').startOf('year').format('YYYY-MM-DD');
            toDate = moment().subtract(1, 'year').endOf('year').format('YYYY-MM-DD');
            break;
        case 'last_7_days':
        default:
            fromDate = moment().subtract(7, 'days').format('YYYY-MM-DD');
            toDate = today.format('YYYY-MM-DD');
            break;
    }

    try {
        const companyId = decodedUserData.company_id;

        // Current active employees
        const [current] = await db.promise().query(`
            SELECT COUNT(id) AS total 
            FROM employees 
            WHERE company_id = ? 
              AND employee_status = 1 
              AND status = 1 
              AND delete_status = 0
        `, [companyId]);

        // Previous period active employees (joined during the time range)
        const [previous] = await db.promise().query(`
            SELECT COUNT(id) AS total 
            FROM employees 
            WHERE company_id = ? 
              AND employee_status = 1 
              AND status = 1 
              AND delete_status = 0 
              AND DATE(date_of_Joining) BETWEEN ? AND ?
        `, [companyId, fromDate, toDate]);

        const currentTotal = current[0].total;
        const previousTotal = previous[0].total;

        // Calculate growth/decrease %
        let growthRate = 0;
        let statusText = "No Change";

        if (previousTotal > 0) {
            growthRate = ((currentTotal - previousTotal) / previousTotal) * 100;
            statusText = growthRate >= 0 ? 'Increased' : 'Decreased';
        }

        res.json({
            status: true,
            message: 'Data fetched successfully',
            data: {
                total: currentTotal,
                growthRate: growthRate.toFixed(2) + '%',
                statusText
            }
        });

    } catch (error) {
        console.error('Error fetching total employees:', error);
        res.status(500).json({ status: false, error: 'Server error' });
    }
});

router.post('/api/NewEmployees', async (req, res) => {
    const { userData, filter } = req.body;
    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData format' });
        }
    }

    if (!decodedUserData || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is required' });
    }

    // Set date ranges for current and previous period
    let currentFrom, currentTo, previousFrom, previousTo;
    const today = moment().startOf('day');

    switch (filter) {
        case 'last_month':
            currentFrom = moment().subtract(1, 'month').startOf('month');
            currentTo = moment().subtract(1, 'month').endOf('month');
            previousFrom = moment().subtract(2, 'months').startOf('month');
            previousTo = moment().subtract(2, 'months').endOf('month');
            break;
        case 'last_year':
            currentFrom = moment().subtract(1, 'year').startOf('year');
            currentTo = moment().subtract(1, 'year').endOf('year');
            previousFrom = moment().subtract(2, 'years').startOf('year');
            previousTo = moment().subtract(2, 'years').endOf('year');
            break;
        case 'last_7_days':
        default:
            currentFrom = moment().subtract(7, 'days');
            currentTo = today;
            previousFrom = moment().subtract(14, 'days');
            previousTo = moment().subtract(7, 'days');
            break;
    }

    try {
        const companyId = decodedUserData.company_id;

        // Count current period new employees
        const [current] = await db.promise().query(`
            SELECT COUNT(id) AS total 
            FROM employees 
            WHERE company_id = ? 
              AND employee_status = 1 
              AND status = 1 
              AND delete_status = 0 
              AND DATE(date_of_Joining) BETWEEN ? AND ?
        `, [companyId, currentFrom.format('YYYY-MM-DD'), currentTo.format('YYYY-MM-DD')]);

        // Count previous period new employees
        const [previous] = await db.promise().query(`
            SELECT COUNT(id) AS total 
            FROM employees 
            WHERE company_id = ? 
              AND employee_status = 1 
              AND status = 1 
              AND delete_status = 0 
              AND DATE(date_of_Joining) BETWEEN ? AND ?
        `, [companyId, previousFrom.format('YYYY-MM-DD'), previousTo.format('YYYY-MM-DD')]);

        const currentTotal = current[0].total;
        const previousTotal = previous[0].total;

        // Calculate growth rate
        let growthRate = 0;
        let statusText = "No Change";

        if (previousTotal > 0) {
            growthRate = ((currentTotal - previousTotal) / previousTotal) * 100;
            statusText = growthRate >= 0 ? 'Increased' : 'Decreased';
        }

        res.json({
            status: true,
            message: 'New employees fetched successfully',
            data: {
                total: currentTotal,
                growthRate: growthRate.toFixed(2) + '%',
                statusText
            }
        });

    } catch (error) {
        console.error('Error fetching new employees:', error);
        res.status(500).json({ status: false, error: 'Server error' });
    }
});

router.post('/api/LeaveStats', async (req, res) => {
    const { userData, filter } = req.body;
    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData format' });
        }
    }

    if (!decodedUserData || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is required' });
    }

    // Date Ranges
    let currentFrom, currentTo, previousFrom, previousTo;
    const today = moment().startOf('day');

    switch (filter) {
        case 'last_month':
            currentFrom = moment().subtract(1, 'month').startOf('month');
            currentTo = moment().subtract(1, 'month').endOf('month');
            previousFrom = moment().subtract(2, 'months').startOf('month');
            previousTo = moment().subtract(2, 'months').endOf('month');
            break;
        case 'last_year':
            currentFrom = moment().subtract(1, 'year').startOf('year');
            currentTo = moment().subtract(1, 'year').endOf('year');
            previousFrom = moment().subtract(2, 'years').startOf('year');
            previousTo = moment().subtract(2, 'years').endOf('year');
            break;
        case 'last_7_days':
        default:
            currentFrom = moment().subtract(7, 'days');
            currentTo = today;
            previousFrom = moment().subtract(14, 'days');
            previousTo = moment().subtract(7, 'days');
            break;
    }

    try {
        const companyId = decodedUserData.company_id;

        // Current leave count
        const [current] = await db.promise().query(`
            SELECT COUNT(leave_id) AS total 
            FROM leaves 
            WHERE company_id = ? 
              AND deletestatus = 0 
              AND DATE(start_date) BETWEEN ? AND ?
        `, [companyId, currentFrom.format('YYYY-MM-DD'), currentTo.format('YYYY-MM-DD')]);

        // Previous leave count
        const [previous] = await db.promise().query(`
            SELECT COUNT(leave_id) AS total 
            FROM leaves 
            WHERE company_id = ? 
              AND deletestatus = 0 
              AND DATE(start_date) BETWEEN ? AND ?
        `, [companyId, previousFrom.format('YYYY-MM-DD'), previousTo.format('YYYY-MM-DD')]);

        const currentTotal = current[0].total;
        const previousTotal = previous[0].total;

        let growthRate = 0;
        let statusText = "No Change";

        if (previousTotal > 0) {
            growthRate = ((currentTotal - previousTotal) / previousTotal) * 100;
            statusText = growthRate >= 0 ? 'Increased' : 'Decreased';
        }

        res.json({
            status: true,
            message: 'Leave stats fetched successfully',
            data: {
                total: currentTotal,
                growthRate: growthRate.toFixed(2) + '%',
                statusText
            }
        });

    } catch (error) {
        console.error('Error fetching leave stats:', error);
        res.status(500).json({ status: false, error: 'Server error' });
    }
});

module.exports = router;
