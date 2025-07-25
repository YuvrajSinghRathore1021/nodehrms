const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');

router.post('/api/Birthday', async (req, res) => {
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

    try {
        const Results = await new Promise((resolve, reject) => {
            const query = `
                SELECT id, profile_image,  concat(first_name,' ',last_name)as name, dob
                FROM employees
                WHERE company_id = ?
                AND (
                    (? IS NOT NULL AND DATE_FORMAT(dob, '%m-%d') = DATE_FORMAT(?, '%m-%d'))
                    OR
                    (? IS NULL AND DATE_FORMAT(dob, '%m-%d') BETWEEN DATE_FORMAT(CURDATE(), '%m-%d') AND DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 7 DAY), '%m-%d'))
                )
            `;
            db.query(query, [decodedUserData.company_id, date, date, date], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        // Add status like 'today', 'tomorrow', etc.
        const today = new Date();
        const responseData = Results.map(emp => {
            const dob = new Date(emp.dob);
            let birthdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());

            // If birthday has passed and no specific date provided, check for wrap-around
            if (birthdayThisYear < today && !date) {
                birthdayThisYear.setFullYear(today.getFullYear() + 1);
            }

            const diffInDays = Math.ceil((birthdayThisYear - today) / (1000 * 60 * 60 * 24));

            let statusText = '';
            if (date) {
                statusText = 'on selected date';
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

    try {
        const Results = await new Promise((resolve, reject) => {
            const query = `
                SELECT id,profile_image,  concat(first_name,' ',last_name)as name, date_of_Joining
                FROM employees
                WHERE company_id = ?
                AND (
                    (? IS NOT NULL AND DATE_FORMAT(date_of_Joining, '%m-%d') = DATE_FORMAT(?, '%m-%d'))
                    OR
                    (? IS NULL AND DATE_FORMAT(date_of_Joining, '%m-%d') BETWEEN DATE_FORMAT(CURDATE(), '%m-%d') AND DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 7 DAY), '%m-%d'))
                )
            `;
            db.query(query, [decodedUserData.company_id, date, date, date], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        // Add status like 'today', 'tomorrow', etc.
        const today = new Date();
        const responseData = Results.map(emp => {
            const joinDate = new Date(emp.date_of_Joining);
            const joinThisYear = new Date(today.getFullYear(), joinDate.getMonth(), joinDate.getDate());

            // Adjust if anniversary has passed and we're checking for future only
            if (joinThisYear < today && date === undefined) {
                joinThisYear.setFullYear(today.getFullYear() + 1); // handle wrap-around to next year
            }

            const diffInDays = Math.ceil((joinThisYear - today) / (1000 * 60 * 60 * 24));

            let statusText = '';
            if (date) {
                statusText = 'on selected date';
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

    try {
        const queryParams = [decodedUserData.company_id];
        let query = `
            SELECT id,profile_image,  concat(first_name,' ',last_name)as name, date_of_Joining
            FROM employees
            WHERE company_id = ?
        `;

        if (date) {
            query += ` AND DATE(date_of_Joining) = ?`;
            queryParams.push(date);
        } else {
            query += ` AND DATE(date_of_Joining) BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND CURDATE()`;
        }

        const Results = await new Promise((resolve, reject) => {
            db.query(query, queryParams, (err, results) =>
                err ? reject(err) : resolve(results)
            );
        });

        res.json({
            status: true,
            total: Results.length,
            message: 'New joiners fetched successfully',
            data: Results
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

        const totalEmployees = totalEmp[0]?.total || 0;
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


// router.post('/api/topArrivals', async (req, res) => {
//     const { userData, limit } = req.body;

//     let decodedUserData = null;
//     if (userData) {
//         try {
//             const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
//             decodedUserData = JSON.parse(decodedString);
//         } catch (error) {
//             return res.status(400).json({ status: false, error: 'Invalid userData format' });
//         }
//     }

//     if (!decodedUserData || !decodedUserData.company_id) {
//         return res.status(400).json({ status: false, error: 'Company ID is required' });
//     }

//     const topLimit = limit || 30;

//     try {
//         const [results] = await db.promise().query(`
//             SELECT 
//                 e.id,
//           profile_image,  concat(first_name,' ',last_name)as name,designation,
//                 COUNT(a.attendance_id) AS total_present_days,
//                 SUM(CASE WHEN TIME(a.check_in_time) <= '09:30:00' THEN 1 ELSE 0 END) AS on_time_days,
//                 ROUND((SUM(CASE WHEN TIME(a.check_in_time) <= '09:30:00' THEN 1 ELSE 0 END) / COUNT(a.attendance_id)) * 100, 2) AS on_time_percent
//             FROM attendance a
//             JOIN employees e ON e.id = a.employee_id
//             WHERE 
//                 a.company_id = ? 
//                 AND MONTH(a.attendance_date) = MONTH(CURDATE())
//                 AND YEAR(a.attendance_date) = YEAR(CURDATE())
//                 AND e.status = 1 AND e.delete_status = 0
//             GROUP BY a.employee_id
//             ORDER BY on_time_days DESC, total_present_days DESC
//             LIMIT ?
//         `, [decodedUserData.company_id, topLimit]);

//         res.json({
//             status: true,
//             message: `Top ${topLimit} employee arrivals of the month`,
//             data: results
//         });
//     } catch (error) {
//         console.error('Error fetching top arrivals:', error);
//         res.status(500).json({ status: false, error: 'Server error' });
//     }
// });


// router.post('/api/topArrivals', async (req, res) => {
//     const { userData, limit } = req.body;

//     let decodedUserData = null;
//     if (userData) {
//         try {
//             const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
//             decodedUserData = JSON.parse(decodedString);
//         } catch (error) {
//             return res.status(400).json({ status: false, error: 'Invalid userData format' });
//         }
//     }

//     if (!decodedUserData || !decodedUserData.company_id) {
//         return res.status(400).json({ status: false, error: 'Company ID is required' });
//     }

//     const topLimit = limit || 30;

//     try {
//         // Step 1: Get total working days in the month (distinct attendance dates)
//         const [workingDaysResult] = await db.promise().query(`
//             SELECT COUNT(DISTINCT attendance_date) AS working_days
//             FROM attendance
//             WHERE company_id = ?
//               AND MONTH(attendance_date) = MONTH(CURDATE())
//               AND YEAR(attendance_date) = YEAR(CURDATE())
//         `, [decodedUserData.company_id]);

//         const totalWorkingDays = workingDaysResult[0]?.working_days || 1; // Avoid divide by 0

//         // Step 2: Get employee attendance + on-time + percentages
//         const [results] = await db.promise().query(`
//             SELECT 
//                 e.id,
//                 e.profile_image,
//                 CONCAT(e.first_name, ' ', e.last_name) AS name,
//                 e.designation,
//                 COUNT(a.attendance_id) AS total_present_days,
//                 SUM(CASE WHEN TIME(a.check_in_time) <= '09:30:00' THEN 1 ELSE 0 END) AS on_time_days,
//                 ROUND(SUM(CASE WHEN TIME(a.check_in_time) <= '09:30:00' THEN 1 ELSE 0 END) / COUNT(a.attendance_id) * 100, 2) AS on_time_percent
//             FROM attendance a
//             JOIN employees e ON e.id = a.employee_id
//             WHERE 
//                 a.company_id = ?
//                 AND MONTH(a.attendance_date) = MONTH(CURDATE())
//                 AND YEAR(a.attendance_date) = YEAR(CURDATE())
//                 AND e.status = 1 AND e.delete_status = 0
//             GROUP BY a.employee_id
//             ORDER BY on_time_days DESC, total_present_days DESC
//             LIMIT ?
//         `, [decodedUserData.company_id, topLimit]);

//         // Step 3: Add attendance % and final %
//         const enrichedResults = results.map(emp => {
//             const attendancePercent = ((emp.total_present_days / totalWorkingDays) * 100).toFixed(2);
//             const onTimePercent = parseFloat(emp.on_time_percent).toFixed(2);
//             const finalPercent = ((parseFloat(attendancePercent) + parseFloat(onTimePercent)) / 2).toFixed(2);
            
// // const finalPercent = ((emp.total_present_days + emp.on_time_days/ totalWorkingDays+emp.total_present_days) * 100).toFixed(2);

//             return {
//                 ...emp,
//                 attendance_percent: attendancePercent,
//                 final_percent: finalPercent
//             };
//         });

//         res.json({
//             status: true,
//             message: `Top ${topLimit} employee arrivals of the month`,
//             data: enrichedResults
//         });
//     } catch (error) {
//         console.error('Error fetching top arrivals:', error);
//         res.status(500).json({ status: false, error: 'Server error' });
//     }
// });

router.post('/api/topArrivals', async (req, res) => {
    const { userData, limit } = req.body;

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

    const topLimit = limit || 30;

    try {
        // Step 1: Get total working days
        const [workingDaysResult] = await db.promise().query(`
            SELECT COUNT(DISTINCT attendance_date) AS working_days
            FROM attendance
            WHERE company_id = ?
              AND MONTH(attendance_date) = MONTH(CURDATE())
              AND YEAR(attendance_date) = YEAR(CURDATE())
        `, [decodedUserData.company_id]);

        const totalWorkingDays = workingDaysResult[0]?.working_days || 1;

        // Step 2: Get employee attendance stats
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
                AND MONTH(a.attendance_date) = MONTH(CURDATE())
                AND YEAR(a.attendance_date) = YEAR(CURDATE())
                AND e.status = 1 AND e.delete_status = 0
            GROUP BY a.employee_id
        `, [decodedUserData.company_id]);

        // Step 3: Calculate attendance %, final %, then sort
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

        // Sort by final_percent (high to low), fallback to present days
        enrichedResults.sort((a, b) => {
            const diff = parseFloat(b.final_percent) - parseFloat(a.final_percent);
            if (diff !== 0) return diff;
            return b.total_present_days - a.total_present_days;
        });

        // Limit the result
        const topResults = enrichedResults.slice(0, topLimit);

        res.json({
            status: true,
            message: `Top ${topLimit} employee arrivals of the month`,
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
module.exports = router;
