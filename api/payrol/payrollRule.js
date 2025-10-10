// HomeApi.js 

const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');
const { AdminCheck } = require('../../model/functlity/AdminCheck');


router.post('/api/fetchDetails', async (req, res) => {
    const { Id, userData } = req.body;
    let decodedUserData = null;

    // Decode and validate userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    // Validate decoded userData
    if (!decodedUserData || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }

    try {
        // Check if the user is an admin
        const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
        // Query salary structure
        const query = `SELECT * FROM salary_structure WHERE structure_id=? AND company_id=?`;
        const queryParams = [Id, decodedUserData.company_id];
        db.query(query, queryParams, (err, results) => {
            if (err) {
                console.error('Error fetching salary structure:', err);
                return res.status(500).json({ status: false, error: 'Server error' });
            }
            if (results.length === 0) {
                return res.status(200).json({ status: false, error: 'No data found' });
            }
            // If the user is not an admin, fetch salary components
            const queryNew = `SELECT * FROM salary_component WHERE structure_id=? `;
            const queryParamsNew = [Id];

            db.query(queryNew, queryParamsNew, (errs, resultsValue) => {
                if (errs) {
                    console.error('Error fetching salary components:', errs);
                    return res.status(500).json({ status: false, error: 'Server error' });
                }
                return res.json({
                    data: results,
                    salary_component: resultsValue,
                    status: true,
                    isAdmin,
                    message: 'Data found'
                });
            });
        });
    } catch (error) {
        console.error('Error processing request:', error);
        return res.status(500).json({ status: false, error: 'Server error' });
    }
});


// done 
router.get('/api/fetchType', async (req, res) => {
    const { userData, type, searchData } = req.query;
    let decodedUserData = null;
    // Decode userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    // Validate decoded userData
    if (!decodedUserData || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }
    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
        });
    }
    // Determine the query based on type
    let query;
    let queryParams = '';
    queryParams = [decodedUserData.company_id];
    query = `SELECT * FROM salary_structure WHERE company_id = ?`;
    if (searchData) {
        query += ' AND structure_name LIKE ?';
        queryParams.push(`%${searchData}%`);
    }
    // oreder by structure_name asc 
    query += ' ORDER BY structure_name ASC';


    db.query(query, queryParams, (err, results) => {
        // db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ status: false, status: false, error: 'Server error' });
        }
        // Check if any results were found
        if (results.length === 0) {
            return res.status(200).json({ status: false, error: 'No data found' });
        }
        res.json({
            // data: results[0],
            data: results,
            status: true,
            message: 'Data found'
        });
    });
});
// done 
router.post('/api/AddType', async (req, res) => {
    const { name, userData } = req.body;
    let decodedUserData = null;

    // Decode userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    const company_id = decodedUserData.company_id;
    if (!name || !company_id) {
        return res.status(400).json({ status: false, error: 'Department name, company ID are required' });
    }

    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
        });
    }
    // Insert the new department into the database
    db.query(
        'INSERT INTO salary_structure (structure_Name, company_id) VALUES (?, ?)',
        [name, company_id],
        (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ status: false, error: 'Error while adding department' });
            }
            res.status(201).json({ status: true, message: 'Rule Type added successfully' });
        }
    );
});



// Deleteapi
router.post('/api/Deleteapi', (req, res) => {
    const { id, userData } = req.body;
    let decodedUserData = null;

    // Decode userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    const company_id = decodedUserData.company_id;

    if (!id || !company_id) {
        return res.status(400).json({ status: false, message: 'ID is required.' });
    }

    db.query(
        'DELETE FROM attendance_rules WHERE rule_id = ? AND company_id=?',
        [id, company_id],
        (err, results) => {
            if (err) {
                return res.status(500).json({ status: false, message: 'Error updating leave.', error: err.message });
            }
            if (results.affectedRows === 0) {
                return res.status(200).json({ status: false, message: 'Type not found or no changes made.' });
            }
            return res.status(200).json({ status: true, message: 'Data deleted successfully' });
        }
    );
});



router.post('/api/Submithandle', async (req, res) => {
    const { Id, userData, Formvalue, structureData } = req.body;
    // Decode and validate userData
    let decodedUserData;
    try {
        if (userData) {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        }
        if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
            throw new Error('Invalid user data. Employee ID and Company ID are required.');
        }
    } catch (error) {
        return res.status(400).json({ status: false, error: error.message });
    }

    try {
        // Parse input data
        const structureDataNew = JSON.parse(structureData);
        const formValueNew = JSON.parse(Formvalue);

        // Update salary_structure table
        const updateStructureQuery = `
            UPDATE salary_structure 
            SET structure_name = ?, description = ? 
            WHERE structure_id = ? AND company_id = ?`;
        const updateStructureValues = [
            structureDataNew.structure_name,
            structureDataNew.description,
            structureDataNew.structure_id,
            structureDataNew.company_id,
        ];

        await executeQuery(updateStructureQuery, updateStructureValues);

        // Process formValueNew
        for (const [key, value] of Object.entries(formValueNew)) {
            const checkComponentQuery = `
                SELECT component_id 
                FROM salary_component 
                WHERE component_name = ? AND company_id = ? AND structure_id = ?`;
            const checkComponentValues = [key, decodedUserData.company_id, Id];

            const existingComponents = await executeQuery(checkComponentQuery, checkComponentValues);

            if (existingComponents.length === 0) {
                let insertComponentQuery = '';
                let insertComponentValues = [];

                // Determine query and values based on calculation_method
                if (value.calculation_method === 'percentage') {
                    insertComponentQuery = `
                        INSERT INTO salary_component (
                            company_id, structure_id, component_name, component_type, calculation_method, percentage
                        ) VALUES (?, ?, ?, ?, ?, ?)`;
                    insertComponentValues = [
                        decodedUserData.company_id,
                        Id,
                        key,
                        value.component_type,
                        value.calculation_method,
                        value.percentage_or_Fixed,
                    ];
                } else {
                    insertComponentQuery = `
                        INSERT INTO salary_component (
                            company_id, structure_id, component_name, component_type, calculation_method, fixed_amount
                        ) VALUES (?, ?, ?, ?, ?, ?)`;
                    insertComponentValues = [
                        decodedUserData.company_id,
                        Id,
                        key,
                        value.component_type,
                        value.calculation_method,
                        value.percentage_or_Fixed,
                    ];
                }

                await executeQuery(insertComponentQuery, insertComponentValues);
            }
            else {
                // Update existing salary component
                let updateComponentQuery = '';
                let updateComponentValues = [];

                if (value.calculation_method == 'percentage') {
                    updateComponentQuery = `
                    UPDATE salary_component 
                    SET component_type = ?, calculation_method = ?, percentage = ?
                    WHERE component_name = ? AND structure_id = ? AND company_id = ?`;
                    updateComponentValues = [
                        value.component_type,
                        value.calculation_method,
                        value.percentage_or_Fixed,
                        key,
                        Id,
                        decodedUserData.company_id,
                    ];
                } else {
                    updateComponentQuery = `
                    UPDATE salary_component 
                    SET component_type = ?, calculation_method = ?, fixed_amount = ?
                    WHERE component_name = ? AND structure_id = ? AND company_id = ?`;
                    updateComponentValues = [
                        value.component_type,
                        value.calculation_method,
                        value.percentage_or_Fixed,
                        key,
                        Id,
                        decodedUserData.company_id,
                    ];

                }

                await executeQuery(updateComponentQuery, updateComponentValues);
            }
        }

        res.status(200).json({ status: true, message: 'Data submitted successfully.' });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ status: false, message: 'Internal server error.', error: error.message });
    }
});

// Helper function to handle database queries with Promises
function executeQuery(query, values) {
    return new Promise((resolve, reject) => {
        db.query(query, values, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}







// asine rules page API 

router.get('/api/data', async (req, res) => {
    const { userData, data, departmentId = 0, subDepartmentid = 0, employeeStatus = 1 } = req.query;
    let Search = null;
    if (data) { Search = data['Search'] ? data['Search'] : null; }
    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData format' });
        }
    }

    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
        });
    }

    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;
    const offset = (page - 1) * limit;

    if (!decodedUserData || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }

    // Build the base query
    let query = `
        SELECT CONCAT(a.first_name, " ", a.last_name) AS first_name, a.id, a.employee_id, SS.structure_name, SS.structure_id 
        FROM employees AS a
        LEFT JOIN salary_structure AS SS ON a.structure_id = SS.structure_id
        WHERE a.company_id = ?`;

    const queryParams = [decodedUserData.company_id];
    // Add Search filter if provided
    if (Search) {
        query += ' AND a.first_name LIKE ?';
        queryParams.push(`%${Search}%`); // Wildcard search
    }

    if (departmentId && departmentId != 0) {
        query += ` AND a.department = ?`;
        queryParams.push(departmentId);
    } else if (subDepartmentid && subDepartmentid != 0) {
        query += ` AND a.sub_department = ?`;
        queryParams.push(subDepartmentid);
    }
    if (employeeStatus && employeeStatus == 1) {
        query += ` AND a.employee_status=1 and a.status=1 and a.delete_status=0 `;
    } else {
        query += ` AND (a.employee_status=0 or a.status=0 or a.delete_status=1) `;
    }

    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    // Execute query
    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching data records:', err);
            return res.status(500).json({ status: false, error: 'Server error' });
        }

        // Add serial number (srno) to each result
        const dataWithSrno = results.map((item, index) => ({
            srno: offset + index + 1, // Generate serial number based on offset
            ...item
        }));

        // Get total count of records (for pagination)
        let countQuery = 'SELECT COUNT(id) AS total FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 and company_id = ?';
        let countQueryParams = [decodedUserData.company_id];

        if (Search) {
            countQuery += ' AND first_name LIKE ?';
            countQueryParams.push(`%${Search}%`);
        }

        db.query(countQuery, countQueryParams, (err, countResults) => {
            if (err) {
                console.error('Error counting data records:', err);
                return res.status(500).json({ status: false, error: 'Server error' });
            }
            const total = countResults[0].total;
            res.json({
                status: true,
                data: dataWithSrno,
                total,
                page,
                limit
            });
        });
    });
})

router.post('/api/GetCompanyRule', async (req, res) => {
    const { userData } = req.body;
    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    // console.log(decodedUserData);
    if (!decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
    }

    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);

    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
        });
    }
    db.query(
        'SELECT structure_id,structure_name FROM salary_structure WHERE company_id = ?',
        [decodedUserData.company_id],
        (err, results) => {
            if (err) {
                return res.status(500).json({
                    status: false,
                    message: 'Database error occurred while fetching department details',
                    error: err.message || err
                });
            }
            if (results.length === 0) {
                return res.status(200).json({ status: false, message: 'No Attendance Rules found for this company' });
            }
            res.json({
                status: true,
                data: results
            });
        }
    );
});

router.post('/api/Update', async (req, res) => {
    const { id, structure_id, userData } = req.body;
    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    } else {
        return res.status(400).json({ status: false, error: 'Invalid userData' });

    } const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
        });
    }
    // console.log(decodedUserData);
    if (!decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
    }

    if (!id) {
        return res.status(400).json({ status: false, message: 'Missing required fields: id' });
    }

    let query;
    let values;
    query = 'UPDATE employees SET structure_id=? WHERE id=? AND company_id=?';
    values = [structure_id, id, decodedUserData.company_id];

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error', error: err });
        }
        res.json({ status: true, message: 'Update successful', data: results });
    });
});





// router.get('/api/PayDetails', async (req, res) => {
//     const { userData, data, page = 1, limit = 10 } = req.query;
//     const month = data.month;
//     const year = data.year;
//     let search = data.search || "";

//     let decodedUserData = null;

//     if (!month || !year) {
//         return res.status(400).json({ status: false, error: 'Month and Year are required' });
//     }

//     // Decode userData
//     if (userData) {
//         try {
//             const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
//             decodedUserData = JSON.parse(decodedString);
//         } catch (error) {
//             return res.status(400).json({ status: false, error: 'Invalid userData format' });
//         }
//     }

//     if (!decodedUserData?.id || !decodedUserData?.company_id) {
//         return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
//     }

//     const startDate = new Date(year, month - 1, 1);
//     const endDate = new Date(year, month, 0);

//     try {
//         const searchQuery = `%${search}%`;

//         const [totalEmployees] = await db.promise().query(
//             `SELECT e.id, concat(e.first_name,'',e.last_name,'-',e.employee_id) as first_name,e.date_of_Joining, e.work_week_id, e.date_of_Joining, e.last_day 
//      FROM employees e
//      WHERE e.employee_status = 1 
//        AND e.status = 1 
//        AND e.delete_status = 0 
//        AND e.company_id = ?
//        AND (CAST(e.id AS CHAR) LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_id LIKE ?)
//        AND NOT EXISTS (
//            SELECT 1 
//            FROM employeesalarydetails s 
//            WHERE s.month = ? 
//              AND s.year = ? 
//              AND s.company_id = e.company_id 
//              AND s.employee_id = e.id
//        )
//      LIMIT ? OFFSET ?`,
//             [
//                 decodedUserData.company_id,
//                 searchQuery,
//                 searchQuery,
//                 searchQuery,
//                 searchQuery,
//                 month,
//                 year,
//                 parseInt(limit),
//                 (parseInt(page) - 1) * parseInt(limit)
//             ]
//         );


//         const [Employees] = await db.promise().query(
//             `SELECT id 
//      FROM employees 
//      WHERE employee_status = 1 
//        AND status = 1 
//        AND delete_status = 0 
//        AND company_id = ?
//        AND (CAST(id AS CHAR) LIKE ? OR first_name LIKE ?)
//        AND NOT EXISTS (
//            SELECT 1 
//            FROM employeesalarydetails 
//            WHERE month = ? 
//              AND year = ? 
//              AND company_id = employees.company_id 
//              AND employee_id = employees.id
//        )`,
//             [decodedUserData.company_id, searchQuery, searchQuery, month, year]
//         );

//         // Get holidays
//         const [holidayResults] = await db.promise().query(
//             `SELECT date FROM holiday 
//              WHERE status = 1 AND company_id = ? AND date BETWEEN ? AND ?`,
//             [decodedUserData.company_id, formatDate(startDate), formatDate(endDate)]
//         );
//         const allHolidays = holidayResults.map(h => new Date(h.date).toISOString().split('T')[0]);

//         const employeeAttendanceDetails = [];

//         for (const emp of totalEmployees) {
//             const [WorkWeek] = await db.promise().query(
//                 `SELECT * FROM work_week WHERE id = ? AND company_id = ?`,
//                 [emp.work_week_id, decodedUserData.company_id]
//             );
//             const workWeekData = WorkWeek.length > 0 ? WorkWeek[0] : null;

//             const doj = new Date(emp.date_of_Joining);
//             const lastDay = emp.last_day ? new Date(emp.last_day) : null;

//             // Skip if not active in selected month
//             if (doj > endDate || (lastDay && lastDay < startDate)) continue;

//             // Adjusted Dates
//             const adjustedStartDate = doj > startDate ? new Date(doj) : new Date(startDate);
//             const adjustedEndDate = lastDay && lastDay < endDate ? new Date(lastDay) : new Date(endDate);


//             // Normalize to midnight
//             adjustedStartDate.setHours(0, 0, 0, 0);
//             adjustedEndDate.setHours(0, 0, 0, 0);

//             const adjustedTotalDays = Math.floor((adjustedEndDate - adjustedStartDate) / (1000 * 60 * 60 * 24)) + 1;

//             let WO = 0, HF = 0, presentCount = 0, leaveCount = 0, leaveRequestCount = 0;

//             // Attendance
//             const [attendanceResults] = await db.promise().query(
//                 `SELECT status, attendance_date FROM attendance
//                  WHERE company_id = ? AND employee_id = ? 
//                  AND (attendance_status=1 OR approval_status=1) 
//                  AND attendance_date BETWEEN ? AND ?`,
//                 [decodedUserData.company_id, emp.id, formatDate(adjustedStartDate), formatDate(adjustedEndDate)]
//             );

//             attendanceResults.forEach(att => {
//                 const status = att.status?.toLowerCase();
//                 if (status === 'present') presentCount++;
//                 else if (status === 'half-day') HF++;
//             });

//             // Leaves
//             const [leaveResults] = await db.promise().query(
//                 `SELECT start_date, end_date, start_half, end_half 
//                  FROM leaves 
//                  WHERE deletestatus=0 AND status=1 AND admin_status=1 
//                  AND company_id=? AND employee_id=? 
//                  AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?))`,
//                 [decodedUserData.company_id, emp.id,
//                 formatDate(adjustedStartDate), formatDate(adjustedEndDate),
//                 formatDate(adjustedStartDate), formatDate(adjustedEndDate)]
//             );
//             console.log('leaveResults', leaveResults);

//             // leaveResults.forEach(leave => {
//             //     const leaveStart = new Date(leave.start_date);
//             //     const leaveEnd = new Date(leave.end_date);
//             //     const adjStart = leaveStart < adjustedStartDate ? adjustedStartDate : leaveStart;
//             //     const adjEnd = leaveEnd > adjustedEndDate ? adjustedEndDate : leaveEnd;
//             //     console.log('adjEnd =', adjEnd, 'adjStart =', adjStart);
//             //     let totalLeaveDays = (adjEnd - adjStart) / (1000 * 60 * 60 * 24) + 1;
//             //     console.log('totalLeaveDays', totalLeaveDays);
//             //     if (leave.start_half == 'Second Half') totalLeaveDays -= 0.5;
//             //     if (leave.end_half == 'First Half') totalLeaveDays -= 0.5;
//             //     console.log('totalLeaveDays', totalLeaveDays);
//             //     leaveCount += totalLeaveDays;
//             //     leaveRequestCount += totalLeaveDays;
//             // });

//             leaveResults.forEach(leave => {
//                 const leaveStart = normalizeDate(leave.start_date);
//                 const leaveEnd = normalizeDate(leave.end_date);
//                 const adjStart = leaveStart < adjustedStartDate ? adjustedStartDate : leaveStart;
//                 const adjEnd = leaveEnd > adjustedEndDate ? adjustedEndDate : leaveEnd;

//                 console.log('adjEnd =', adjEnd, 'adjStart =', adjStart);

//                 let totalLeaveDays = (adjEnd - adjStart) / (1000 * 60 * 60 * 24) + 1;

//                 if (leave.start_half === 'Second Half') totalLeaveDays -= 0.5;
//                 if (leave.end_half === 'First Half') totalLeaveDays -= 0.5;

//                 console.log('totalLeaveDays', totalLeaveDays);

//                 leaveCount += totalLeaveDays;
//                 leaveRequestCount += totalLeaveDays;
//             })

//             // // Weekly Off Count
//             for (let d = new Date(adjustedStartDate); d <= adjustedEndDate; d.setDate(d.getDate() + 1)) {
//                 const dateStr = d.toLocaleDateString("en-CA"); // ✅ local date, no UTC shift
//                 const isHoliday = allHolidays.includes(dateStr);

//                 const dayOfWeek = d.getDay(); // 0=Sun ... 6=Sat
//                 const weekKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayOfWeek] + Math.ceil(d.getDate() / 7);
//                 const isWeeklyOff = workWeekData && workWeekData[weekKey] === 3;

//                 if (!isHoliday && isWeeklyOff) {
//                     WO++;
//                 }
//             }


//             const holidayCount = allHolidays.filter(dateStr => {
//                 const date = new Date(dateStr);
//                 return date >= adjustedStartDate && date <= adjustedEndDate;
//             }).length;

//             const NewHF = HF / 2;


//             let absenteeCount = adjustedTotalDays - holidayCount - leaveCount - WO - NewHF - presentCount;
//             if (absenteeCount < 0) absenteeCount = 0;

//             employeeAttendanceDetails.push({
//                 employee_id: emp.id,
//                 first_name: emp.first_name,
//                 date_of_Joining: emp.date_of_Joining,
//                 WO,
//                 HF,
//                 absenteeCount,
//                 presentCount,
//                 holidayCount,
//                 leaveCount,
//                 leaveRequestCount
//             });
//         }

//         res.json({
//             status: true,
//             month,
//             year,
//             page: parseInt(page),
//             limit: parseInt(limit),
//             data: employeeAttendanceDetails,
//             total: Employees.length
//         });

//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).json({ status: false, error: 'Server error fetching PayDetails' });
//     }


// });



router.get('/api/PayDetails', async (req, res) => {
    const { userData, data, page = 1, limit = 10, departmentId = 0, subDepartmentid, employeeStatus = 1 } = req.query;
    const month = data.month;
    const year = data.year;
    let search = data.search || "";

    let decodedUserData = null;

    if (!month || !year) {
        return res.status(400).json({ status: false, error: 'Month and Year are required' });
    }

    // Decode userData
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

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    try {
        const searchQuery = `%${search}%`;
        let query = `SELECT e.id, concat(e.first_name,'',e.last_name,'-',e.employee_id) as first_name,e.date_of_Joining, e.work_week_id, e.date_of_Joining, e.last_day 
     FROM employees e
     WHERE e.company_id = ?
       AND (CAST(e.id AS CHAR) LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_id LIKE ?)
       AND NOT EXISTS (
           SELECT 1 FROM employeesalarydetails s 
           WHERE s.month = ?  AND s.year = ?  AND s.company_id = e.company_id  AND s.employee_id = e.id
       )
   `;
        let queryParams = [
            decodedUserData.company_id,
            searchQuery,
            searchQuery,
            searchQuery,
            searchQuery,
            month,
            year
        ]
        if (departmentId && departmentId != 0) {
            query += " AND e.department = ?";
            queryParams.push(departmentId);
        }

        if (subDepartmentid && subDepartmentid != 0) {
            query += " AND e.sub_department = ?";
            queryParams.push(subDepartmentid);
        }

        if (employeeStatus == 0) {
            // Fetch inactive/terminated employees
            query += " AND (e.employee_status = 0 OR e.status = 0 OR e.delete_status = 1)";
        } else {
            query += " AND e.employee_status = 1 AND e.status = 1 AND e.delete_status = 0";
        }

        // Order by employee name (ASC)
        query += " ORDER BY e.first_name ASC";

        // Add pagination
        query += " LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
        const [totalEmployees] = await db.promise().query(query, queryParams);


        let queryCount = `SELECT id FROM employees 
     WHERE company_id = ? AND (CAST(id AS CHAR) LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR employee_id LIKE ?)
       AND NOT EXISTS (
           SELECT 1 FROM employeesalarydetails 
           WHERE month = ? AND year = ? AND company_id = employees.company_id AND employee_id = employees.id
       )`;
        let queryCountParams = [decodedUserData.company_id, searchQuery, searchQuery, searchQuery, searchQuery, month, year]

        if (departmentId && departmentId != 0) {
            queryCount += " AND department = ?";
            queryCountParams.push(departmentId);
        }
        if (subDepartmentid && subDepartmentid != 0) {
            queryCount += " AND sub_department = ?";
            queryCountParams.push(subDepartmentid);
        }
        if (employeeStatus == 0) {
            // Fetch inactive/terminated employees
            queryCount += " AND (employee_status = 0 OR status = 0 OR delete_status = 1)";
        } else {
            queryCount += " AND employee_status = 1 AND status = 1 AND delete_status = 0";
        }

        const [Employees] = await db.promise().query(queryCount, queryCountParams);

        // Get holidays
        const [holidayResults] = await db.promise().query(
            `SELECT date FROM holiday 
             WHERE status = 1 AND company_id = ? AND date BETWEEN ? AND ?`,
            [decodedUserData.company_id, formatDate(startDate), formatDate(endDate)]
        );
        const allHolidays = holidayResults.map(h => new Date(h.date).toISOString().split('T')[0]);

        const employeeAttendanceDetails = [];

        for (const emp of totalEmployees) {
            const [WorkWeek] = await db.promise().query(
                `SELECT * FROM work_week WHERE id = ? AND company_id = ?`,
                [emp.work_week_id, decodedUserData.company_id]
            );
            const workWeekData = WorkWeek.length > 0 ? WorkWeek[0] : null;

            const doj = new Date(emp.date_of_Joining);
            const lastDay = emp.last_day ? new Date(emp.last_day) : null;

            // Skip if not active in selected month
            if (doj > endDate || (lastDay && lastDay < startDate)) continue;

            // Adjusted Dates
            const adjustedStartDate = doj > startDate ? new Date(doj) : new Date(startDate);
            const adjustedEndDate = lastDay && lastDay < endDate ? new Date(lastDay) : new Date(endDate);


            // Normalize to midnight
            adjustedStartDate.setHours(0, 0, 0, 0);
            adjustedEndDate.setHours(0, 0, 0, 0);

            const adjustedTotalDays = Math.floor((adjustedEndDate - adjustedStartDate) / (1000 * 60 * 60 * 24)) + 1;

            let WO = 0, HF = 0, presentCount = 0, leaveCount = 0, leaveRequestCount = 0;

            // Attendance
            const [attendanceResults] = await db.promise().query(
                `SELECT status, attendance_date FROM attendance
                 WHERE company_id = ? AND employee_id = ? 
                 AND (attendance_status=1 OR approval_status=1) 
                 AND attendance_date BETWEEN ? AND ?`,
                [decodedUserData.company_id, emp.id, formatDate(adjustedStartDate), formatDate(adjustedEndDate)]
            );

            attendanceResults.forEach(att => {
                const status = att.status?.toLowerCase();
                if (status === 'present') presentCount++;
                else if (status === 'half-day') HF++;
            });

            // Leaves
            const [leaveResults] = await db.promise().query(
                `SELECT start_date, end_date, start_half, end_half 
                 FROM leaves 
                 WHERE deletestatus=0 AND status=1 AND admin_status=1 
                 AND company_id=? AND employee_id=? 
                 AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?))`,
                [decodedUserData.company_id, emp.id,
                formatDate(adjustedStartDate), formatDate(adjustedEndDate),
                formatDate(adjustedStartDate), formatDate(adjustedEndDate)]
            );
            // console.log('leaveResults', leaveResults);

            // leaveResults.forEach(leave => {
            //     const leaveStart = new Date(leave.start_date);
            //     const leaveEnd = new Date(leave.end_date);
            //     const adjStart = leaveStart < adjustedStartDate ? adjustedStartDate : leaveStart;
            //     const adjEnd = leaveEnd > adjustedEndDate ? adjustedEndDate : leaveEnd;
            //     console.log('adjEnd =', adjEnd, 'adjStart =', adjStart);
            //     let totalLeaveDays = (adjEnd - adjStart) / (1000 * 60 * 60 * 24) + 1;
            //     console.log('totalLeaveDays', totalLeaveDays);
            //     if (leave.start_half == 'Second Half') totalLeaveDays -= 0.5;
            //     if (leave.end_half == 'First Half') totalLeaveDays -= 0.5;
            //     console.log('totalLeaveDays', totalLeaveDays);
            //     leaveCount += totalLeaveDays;
            //     leaveRequestCount += totalLeaveDays;
            // });

            leaveResults.forEach(leave => {
                const leaveStart = normalizeDate(leave.start_date);
                const leaveEnd = normalizeDate(leave.end_date);
                const adjStart = leaveStart < adjustedStartDate ? adjustedStartDate : leaveStart;
                const adjEnd = leaveEnd > adjustedEndDate ? adjustedEndDate : leaveEnd;

                // console.log('adjEnd =', adjEnd, 'adjStart =', adjStart);

                let totalLeaveDays = (adjEnd - adjStart) / (1000 * 60 * 60 * 24) + 1;

                if (leave.start_half === 'Second Half') totalLeaveDays -= 0.5;
                if (leave.end_half === 'First Half') totalLeaveDays -= 0.5;

                // console.log('totalLeaveDays', totalLeaveDays);

                leaveCount += totalLeaveDays;
                leaveRequestCount += totalLeaveDays;
            })

            // // Weekly Off Count
            for (let d = new Date(adjustedStartDate); d <= adjustedEndDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toLocaleDateString("en-CA"); // ✅ local date, no UTC shift
                const isHoliday = allHolidays.includes(dateStr);

                const dayOfWeek = d.getDay(); // 0=Sun ... 6=Sat
                const weekKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayOfWeek] + Math.ceil(d.getDate() / 7);
                const isWeeklyOff = workWeekData && workWeekData[weekKey] === 3;

                if (!isHoliday && isWeeklyOff) {
                    WO++;
                }
            }


            const holidayCount = allHolidays.filter(dateStr => {
                const date = new Date(dateStr);
                return date >= adjustedStartDate && date <= adjustedEndDate;
            }).length;

            const NewHF = HF / 2;


            let absenteeCount = adjustedTotalDays - holidayCount - leaveCount - WO - NewHF - presentCount;
            if (absenteeCount < 0) absenteeCount = 0;

            employeeAttendanceDetails.push({
                employee_id: emp.id,
                first_name: emp.first_name,
                date_of_Joining: emp.date_of_Joining,
                WO,
                HF,
                absenteeCount,
                presentCount,
                holidayCount,
                leaveCount,
                leaveRequestCount
            });
        }

        res.json({
            status: true,
            month,
            year,
            page: parseInt(page),
            limit: parseInt(limit),
            data: employeeAttendanceDetails,
            total: Employees.length
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ status: false, error: 'Server error fetching PayDetails' });
    }


});



function normalizeDate(dateStr) {
    // Create date and reset to local midnight
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// api 
router.post('/api/AddType', async (req, res) => {
    const { name, userData } = req.body;
    let decodedUserData = null;

    // Decode userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    const company_id = decodedUserData.company_id;
    if (!name || !company_id) {
        return res.status(400).json({ status: false, error: 'name, company ID are required' });
    }
    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
        });
    }
    // Insert the new department into the database
    db.query(
        'INSERT INTO salary_structure (salary_structure, company_id) VALUES (?, ?)',
        [name, company_id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ status: false, error: 'Error while adding department' });
            }
            res.status(201).json({ status: true, message: 'Salary Structure added successfully' });
        }
    );
});




// Deleteapi    
router.post('/api/deleteSalaryComponent', (req, res) => {
    const { componentId, userData } = req.body;
    let decodedUserData = null;

    // Decode userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    const company_id = decodedUserData.company_id;

    if (!componentId || !company_id) {
        return res.status(400).json({ status: false, message: 'ID is required.' });
    }

    db.query(
        'DELETE FROM salary_component WHERE component_id = ? AND company_id=?',
        [componentId, company_id],
        (err, results) => {
            if (err) {
                return res.status(500).json({ status: false, message: 'Error updating leave.', error: err.message });
            }
            if (results.affectedRows === 0) {
                return res.status(200).json({ status: false, message: 'Type not found or no changes made.' });
            }
            return res.status(200).json({ status: true, message: 'Data deleted successfully' });
        }
    );
});

// Export the router
module.exports = router;
