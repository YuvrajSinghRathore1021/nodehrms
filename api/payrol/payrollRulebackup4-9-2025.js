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
    const { userData, type } = req.query;
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



// router.post('/api/Submithandle', async (req, res) => {
//     const { Id, userData, Formvalue, structureData } = req.body;
//     let decodedUserData = null;
//     if (userData) {
//         try {
//             const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
//             decodedUserData = JSON.parse(decodedString);
//         } catch (error) {
//             return res.status(400).json({ status: false, error: 'Invalid userData' });
//         }
//     }
//     if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
//         return res.status(400).json({ status: false, error: 'Invalid user data. Employee ID and Company ID are required.' });
//     }

//     const formValueNew = JSON.parse(Formvalue);
//     const structureDataNew = JSON.parse(structureData);

//     let query = 'UPDATE salary_structure SET structure_name=?,description=? WHERE structure_id=? and company_id=?';
//     let values = [structureDataNew.structure_name, structureDataNew.description, structureDataNew.structure_id, structureDataNew.company_id];
//     db.query(query, values, (err, results) => {
//         if (err) {
//             return res.status(200).json({ status: true, message: 'Database error.', error: err.message });
//         }
//     });
//     for (const key in formValueNew) {
//         // console.log(`${key}: ${formValueNew[key]}`);

//         let salaryComponentQuery = 'SELECT component_id FROM salary_component WHERE component_name=? And company_id=? And structure_id=? ';
//         let salaryComponentValue = [key, formValueNew.company_id, Id];

//         db.query(salaryComponentQuery, salaryComponentValue, (err, salaryComponentValue) => {
//             if (err) {
//                 console.error('Database error:', err);
//                 return res.status(500).json({ status: false, message: 'Database error', error: err });
//             }
//             if (salaryComponentValue.length == 0) {
//                 let salaryComponentQueryInsert = 'INSERT INTO users (company_id, structure_id, component_name, component_type,) VALUES (?, ?,?,?)';
//                 let salaryComponentValueInsert = [formValueNew.company_id, formValueNew.structure_id, key, formValueNew[key]];
//                 db.query(salaryComponentQueryInsert, salaryComponentValueInsert, (err, results) => {
//                     if (err) {
//                         return res.status(200).json({ status: true, message: 'Database error.', error: err.message });
//                     }
//                     res.status(201).json({ status: true, message: 'User registered successfully.' });
//                 });
//             } else {
//                 let salaryComponentQueryUpdate = 'UPDATE salary_component SET component_type=? WHERE component_name=? and structure_id=? and company_id=?';
//                 let salaryComponentValueUpdate = [formValueNew[key], key, formValueNew.structure_id, formValueNew.company_id];
//                 db.query(salaryComponentQueryUpdate, salaryComponentValueUpdate, (err, results) => {
//                     if (err) {
//                         return res.status(200).json({ status: true, message: 'Database error.', error: err.message });
//                     }
//                 });
//             }

//         });

//     }

//     // res.status(200).json(
//     //     { status: true, message: 'User registered successfully.' }
//     // );
// });

// router.post('/api/Submithandle', async (req, res) => {
//     const { Id, userData, Formvalue, structureData } = req.body;

//     // Decode and validate userData
//     let decodedUserData = null;
//     try {
//         if (userData) {
//             const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
//             decodedUserData = JSON.parse(decodedString);
//         }

//         if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
//             throw new Error('Invalid user data. Employee ID and Company ID are required.');
//         }
//     } catch (error) {
//         return res.status(400).json({ status: false, error: error.message });
//     }



//     try {

//         const structureDataNew = JSON.parse(structureData);
//         const formValueNew = JSON.parse(Formvalue);
//         console.log(formValueNew);
//         // outputlike this ={
//         //     basic_pay: {
//         //       component_name: 'basic_pay',
//         //       component_type: 'fixed',
//         //       calculation_method: 'fixed_amount',
//         //       percentage_or_Fixed: '50000.00'
//         //     },
//         //     hra: {
//         //       component_name: 'hra',
//         //       component_type: 'variable',
//         //       calculation_method: 'percentage',
//         //       percentage_or_Fixed: '0.20'
//         //     }
//         //   }
//         // Update salary_structure
//         const updateStructureQuery = `
//             UPDATE salary_structure 
//             SET structure_name = ?, description = ? 
//             WHERE structure_id = ? AND company_id = ?`;
//         const updateStructureValues = [
//             structureDataNew.structure_name,
//             structureDataNew.description,
//             structureDataNew.structure_id,
//             structureDataNew.company_id,
//         ];

//         await executeQuery(updateStructureQuery, updateStructureValues);

//         // Process formValueNew
//         for (const [key, value] of Object.entries(formValueNew)) {
//             const checkComponentQuery = `
//                 SELECT component_id 
//                 FROM salary_component 
//                 WHERE component_name = ? AND company_id = ? AND structure_id = ?`;
//             const checkComponentValues = [key, decodedUserData.company_id, Id];

//             const existingComponents = await executeQuery(checkComponentQuery, checkComponentValues);

//             if (existingComponents.length === 0) {
//                 // Insert new salary component
//                 const insertComponentQuery = `
//                     INSERT INTO salary_component (company_id, structure_id, component_name, component_type,calculation_method,fixed_amount,percentage) 
//                     VALUES (?, ?, ?, ?)`;
//                 const insertComponentValues = [decodedUserData.company_id, Id, key, value];

//                 await executeQuery(insertComponentQuery, insertComponentValues);
//             } else {
//                 // Update existing salary component
//                 const updateComponentQuery = `
//                     UPDATE salary_component 
//                     SET  component_name=?, component_type=?,calculation_method=?,fixed_amount=?,percentage =?
//                     WHERE component_name = ? AND structure_id = ? AND company_id = ?`;
//                 const updateComponentValues = [value, key, Id, decodedUserData.company_id];

//                 await executeQuery(updateComponentQuery, updateComponentValues);
//             }
//         }

//         res.status(200).json({ status: true, message: 'Data submitted successfully.' });
//     } catch (error) {
//         console.error('Error processing request:', error);
//         res.status(500).json({ status: false, message: 'Internal server error.', error: error.message });
//     }
// });

// // Helper function to handle database queries with Promises
// function executeQuery(query, values) {
//     return new Promise((resolve, reject) => {
//         db.query(query, values, (err, results) => {
//             if (err) return reject(err);
//             resolve(results);
//         });
//     });
// }



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
    const { userData, data } = req.query;
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
        SELECT a.first_name, a.id, a.employee_id, SS.structure_name, SS.structure_id 
        FROM employees AS a
        LEFT JOIN salary_structure AS SS ON a.structure_id = SS.structure_id
        WHERE  a.employee_status=1 and a.status=1 and a.delete_status=0 and a.company_id = ?`;

    const queryParams = [decodedUserData.company_id];
    // Add Search filter if provided
    if (Search) {
        query += ' AND a.first_name LIKE ?';
        queryParams.push(`%${Search}%`); // Wildcard search
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
//     const { userData, data } = req.query;
//     const month = data.month;
//     const year = data.year;
//     let decodedUserData = null;

//     // Validate month and year
//     if (!month || !year) {
//         return res.status(400).json({ status: false, error: 'Month and Year are required' });
//     }

//     // Decode and validate userData
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

//     const startDate = new Date(year, month - 1, 1);
//     const endDate = new Date(year, month, 0);
//     const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1;

//     try {
//         // Fetch all active employees for the given company
//         const totalEmployees = await new Promise((resolve, reject) => {
//             const query = `
//                 SELECT id, first_name, work_week_id 
//                 FROM employees 
//                 WHERE employee_status=1 AND status=1 AND delete_status=0 AND company_id = ?`;
//             db.query(query, [decodedUserData.company_id], (err, results) => (err ? reject(err) : resolve(results)));
//         });

//         // Fetch attendance, leave, and holiday data for each employee
//         const employeeAttendanceDetails = await Promise.all(totalEmployees.map(async (employee) => {
//             const [attendanceResults] = await db.promise().query(`
//                 SELECT employee_id, status, check_in_time, check_out_time, attendance_date
//                 FROM attendance
//                 WHERE company_id = ? AND employee_id = ? AND (attendance_status=1 Or approval_status=1) AND attendance_date BETWEEN ? AND ?`,
//                 [decodedUserData.company_id, employee.id, formatDate(startDate), formatDate(endDate)]
//             );

//             const [holidayResults] = await db.promise().query(`
//                 SELECT date
//                 FROM holiday
//                 WHERE status = 1 AND company_id = ? AND date BETWEEN ? AND ?`,
//                 [decodedUserData.company_id, formatDate(startDate), formatDate(endDate)]
//             );
//             const holidays = new Set(holidayResults.map(holiday => new Date(holiday.date).toISOString().split('T')[0]));

//             const [WorkWeek] = await db.promise().query(`
//                  SELECT id, mon1, tue1, wed1, thu1, fri1, sat1, sun1, 
//                         mon2, tue2, wed2, thu2, fri2, sat2, sun2, 
//                         mon3, tue3, wed3, thu3, fri3, sat3, sun3, 
//                         mon4, tue4, wed4, thu4, fri4, sat4, sun4, 
//                         mon5, tue5, wed5, thu5, fri5, sat5, sun5 
//                  FROM work_week
//                  WHERE id = ? AND company_id = ?`,
//                 [employee.work_week_id, decodedUserData.company_id]
//             );

//             const workWeekData = WorkWeek.length > 0 ? WorkWeek[0] : null;

//             let WO = 0, WD = 0, HF = 0, absenteeCountNew = 0, presentCount = 0, holidayCount = holidays.size;

//             const daysInMonth = new Date(year, month, 0).getDate();

//             // Calculate total leave days
//             let leaveCount = 0;
//             const leaveResultsRequest = await new Promise((resolve, reject) => {
//                 const query = `SELECT employee_id, start_date, end_date, start_half, end_half
//                                 FROM leaves 
//                                 WHERE deletestatus=0 AND status=1 AND admin_status=1
//                                 AND company_id=? AND employee_id=? 
//                                 AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?))`;

//                 db.query(query, 
//                     [decodedUserData.company_id, employee.id, formatDate(startDate), formatDate(endDate), formatDate(startDate), formatDate(endDate)], 
//                     (err, results) => (err ? reject(err) : resolve(results))
//                 );
//             });

//             // Calculate total leave days
//             let leaveRequestCount = 0;

//             leaveResultsRequest.forEach(leave => {
//                 const leaveStart = new Date(leave.start_date);
//                 const leaveEnd = new Date(leave.end_date);

//                 // Adjust leave dates based on the given range
//                 const leaveStartAdjusted = leaveStart < startDate ? startDate : leaveStart;
//                 const leaveEndAdjusted = leaveEnd > endDate ? endDate : leaveEnd;

//                 // Calculate full leave days
//                 let totalDays = (leaveEndAdjusted - leaveStartAdjusted) / (1000 * 60 * 60 * 24) + 1;

//                 // Adjust for half-day scenarios
//                 if (leave.start_half === "Second Half") {
//                     totalDays -= 0.5; // If leave starts in the second half, count only half a day
//                 }
//                 if (leave.end_half === "First Half") {
//                     totalDays -= 0.5; // If leave ends in the first half, count only half a day
//                 }

//                 leaveRequestCount += totalDays;
//                 leaveCount += totalDays;
//             });

//             for (let dayNo = 1; dayNo <= daysInMonth; dayNo++) {
//                 const dateValue = new Date(year, month - 1, dayNo);
//                 const dateKey = dateValue.toISOString().split('T')[0];
//                 const isHoliday = holidays.has(dateKey);
//                 const dayOfWeek = dateValue.getDay();
//                 const workKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayOfWeek] + Math.ceil(dayNo / 7);
//                 const isWeeklyOff = workWeekData && workWeekData[workKey] === 3;
//                 const attendance = attendanceResults.find(a => new Date(a.attendance_date).toISOString().split('T')[0] === dateKey);

//                 if (isHoliday) {
//                     holidayCount++;
//                 } else if (isWeeklyOff) {
//                     WO++;
//                 } else if (attendance) {
//                     if (attendance.status.toLowerCase() == 'present') {
//                         presentCount++;
//                         const checkInTime = new Date(`1970-01-01T${attendance.check_in_time}Z`);
//                         const checkOutTime = attendance.check_out_time ? new Date(`1970-01-01T${attendance.check_out_time}Z`) : null;
//                         if (checkOutTime) {
//                             const workDuration = (checkOutTime - checkInTime) / (1000 * 60);
//                             if (workDuration < 510) {
//                                 WD++;
//                             }
//                         } else {
//                             WD++;
//                         }
//                     } else if (attendance.status.toLowerCase() == 'half-day') {
//                         HF++;
//                     } else {
//                         presentCount++;
//                     }
//                 } else {
//                     absenteeCountNew++;
//                 }
//             }

//             let NewHf = 0;
//             if (HF != 0) {
//                 NewHf = HF / 2;
//             }

//             let absenteeCount = totalDays - holidayCount - leaveCount - WO - NewHf - WD - presentCount;

//             return {
//                 employee_id: employee.id,
//                 first_name: employee.first_name,
//                 WO,
//                 WD,
//                 HF,
//                 absenteeCount,
//                 presentCount,
//                 holidayCount,
//                 leaveCount,
//                 leaveRequestCount
//             };
//         }));

//         res.json({
//             status: true,
//             month,
//             year,
//             data: employeeAttendanceDetails,
//             total: totalEmployees.length,
//         });
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).json({ status: false, error: 'Server error fetching PayDetails' });
//     }
// });


// router.get('/api/PayDetails', async (req, res) => {
//     const { userData, data,page,limit } = req.query;
//     let employeeIds = 33;
//     let WorkWeekId = 6;
//     const month = data.month;
//     const year = data.year;
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
//     const totalDays = endDate.getDate();

//     try {
//         const totalEmployees = await db.promise().query(
//             `SELECT id, first_name, work_week_id FROM employees 
//              WHERE employee_status=1 AND status=1 AND delete_status=0 AND company_id=?`,
//             [decodedUserData.company_id]
//         );

//         const [holidayResults] = await db.promise().query(
//             `SELECT date FROM holiday 
//              WHERE status = 1 AND company_id = ? AND date BETWEEN ? AND ?`,
//             [decodedUserData.company_id, formatDate(startDate), formatDate(endDate)]
//         );
//         const holidays = new Set(holidayResults.map(h => new Date(h.date).toISOString().split('T')[0]));

//         const [WorkWeek] = await db.promise().query(
//             `SELECT * FROM work_week WHERE id = ? AND company_id = ?`,
//             [WorkWeekId, decodedUserData.company_id]
//         );
//         const workWeekData = WorkWeek.length > 0 ? WorkWeek[0] : null;

//         const employeeIdArray = Array.isArray(employeeIds) ? employeeIds : [employeeIds];
//         const employeeAttendanceDetails = [];

//         for (const empId of employeeIdArray) {
//             let WO = 0, HF = 0, presentCount = 0;
//             let leaveRequestCount = 0, leaveCount = 0;
//             const [attendanceResults] = await db.promise().query(
//                 `SELECT employee_id, status, check_in_time, check_out_time, attendance_date
//                  FROM attendance
//                  WHERE company_id = ? AND employee_id = ? 
//                  AND (attendance_status=1 OR approval_status=1) 
//                  AND attendance_date BETWEEN ? AND ? AND status='Present'`,
//                 [decodedUserData.company_id, empId, formatDate(startDate), formatDate(endDate)]
//             );
//             const [attendanceHalfDay] = await db.promise().query(
//                 `SELECT employee_id, status, check_in_time, check_out_time, attendance_date
//                  FROM attendance
//                  WHERE company_id = ? AND employee_id = ? 
//                  AND (attendance_status=1 OR approval_status=1) 
//                  AND attendance_date BETWEEN ? AND ? AND status='half-day'`,
//                 [decodedUserData.company_id, empId, formatDate(startDate), formatDate(endDate)]
//             );
//             presentCount = attendanceResults.length;
//             HF = attendanceHalfDay.length;

//             const leaveResults = await db.promise().query(
//                 `SELECT employee_id, start_date, end_date, start_half, end_half 
//                  FROM leaves 
//                  WHERE deletestatus=0 AND status=1 AND admin_status=1 
//                  AND company_id=? AND employee_id=? 
//                  AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?))`,
//                 [decodedUserData.company_id, empId, formatDate(startDate), formatDate(endDate), formatDate(startDate), formatDate(endDate)]
//             );



//             // Count leave days
//             leaveResults[0].forEach(leave => {
//                 const leaveStart = new Date(leave.start_date);
//                 const leaveEnd = new Date(leave.end_date);
//                 const adjStart = leaveStart < startDate ? startDate : leaveStart;
//                 const adjEnd = leaveEnd > endDate ? endDate : leaveEnd;
//                 let totalLeaveDays = (adjEnd - adjStart) / (1000 * 60 * 60 * 24) + 1;

//                 if (leave.start_half === 'Second Half') totalLeaveDays -= 0.5;
//                 if (leave.end_half === 'First Half') totalLeaveDays -= 0.5;

//                 leaveCount += totalLeaveDays;
//                 leaveRequestCount += totalLeaveDays;
//             });

//             for (let dayNo = 1; dayNo <= totalDays; dayNo++) {
//                 const dateVal = new Date(year, month - 1, dayNo);
//                 const dateStr = dateVal.toISOString().split('T')[0];
//                 const isHoliday = holidays.has(dateStr);
//                 const dayOfWeek = dateVal.getDay();
//                 const weekKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayOfWeek] + Math.ceil(dayNo / 7);
//                 const isWeeklyOff = workWeekData && workWeekData[weekKey] === 3;

//                 if (isHoliday) {
//                     continue;
//                 } else if (isWeeklyOff) {
//                     WO++;
//                 }
//             }

//             const NewHF = HF / 2;
//             const absenteeCount = totalDays - holidays.size - leaveCount - WO - NewHF - presentCount;

//             const empInfo = totalEmployees[0].find(emp => emp.id == empId);
//             employeeAttendanceDetails.push({
//                 employee_id: empId,
//                 first_name: empInfo?.first_name || "",
//                 WO,
//                 HF,
//                 absenteeCount,
//                 presentCount,
//                 holidayCount: holidays.size,
//                 leaveCount,
//                 leaveRequestCount
//             });
//         }

//         res.json({
//             status: true,
//             month,
//             year,
//             data: employeeAttendanceDetails,
//             total: totalEmployees[0].length
//         });

//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).json({ status: false, error: 'Server error fetching PayDetails' });
//     }
// });


// router.get('/api/PayDetails', async (req, res) => {
//     const { userData, data, page = 1, limit = 10, search = "" } = req.query;
//     const WorkWeekId = 6;
//     const month = data.month;
//     const year = data.year;
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
//     const totalDays = endDate.getDate();

//     try {
//         const searchQuery = `%${search}%`;
//         const [totalEmployees] = await db.promise().query(
//             `SELECT id, first_name, work_week_id FROM employees 
//              WHERE employee_status=1 AND status=1 AND delete_status=0 AND company_id=?
//              AND (CAST(id AS CHAR) LIKE ? OR first_name LIKE ?)
//              LIMIT ? OFFSET ?`,
//             [
//                 decodedUserData.company_id,
//                 searchQuery,
//                 searchQuery,
//                 parseInt(limit),
//                 (parseInt(page) - 1) * parseInt(limit)
//             ]
//         );
//         const [Employees] = await db.promise().query(
//             `SELECT id, first_name, work_week_id FROM employees 
//              WHERE employee_status=1 AND status=1 AND delete_status=0 AND company_id=?
//              AND (CAST(id AS CHAR) LIKE ? OR first_name LIKE ?)`,
//             [
//                 decodedUserData.company_id,
//                 searchQuery,
//                 searchQuery,
//             ]
//         );

//         const [holidayResults] = await db.promise().query(
//             `SELECT date FROM holiday 
//              WHERE status = 1 AND company_id = ? AND date BETWEEN ? AND ?`,
//             [decodedUserData.company_id, formatDate(startDate), formatDate(endDate)]
//         );
//         const holidays = new Set(holidayResults.map(h => new Date(h.date).toISOString().split('T')[0]));

//         const [WorkWeek] = await db.promise().query(
//             `SELECT * FROM work_week WHERE id = ? AND company_id = ?`,
//             [WorkWeekId, decodedUserData.company_id]
//         );
//         const workWeekData = WorkWeek.length > 0 ? WorkWeek[0] : null;

//         const employeeAttendanceDetails = [];

//         for (const emp of totalEmployees) {
//             let WO = 0, HF = 0, presentCount = 0;
//             let leaveRequestCount = 0, leaveCount = 0;

//             const [attendanceResults] = await db.promise().query(
//                 `SELECT status, attendance_date FROM attendance
//                  WHERE company_id = ? AND employee_id = ? 
//                  AND (attendance_status=1 OR approval_status=1) 
//                  AND attendance_date BETWEEN ? AND ?`,
//                 [decodedUserData.company_id, emp.id, formatDate(startDate), formatDate(endDate)]
//             );

//             attendanceResults.forEach(att => {
//                 if (att.status.toLowerCase() === 'present') {
//                     presentCount++;
//                 } else if (att.status.toLowerCase() === 'half-day') {
//                     HF++;
//                 }
//             });

//             const [leaveResults] = await db.promise().query(
//                 `SELECT start_date, end_date, start_half, end_half 
//                  FROM leaves 
//                  WHERE deletestatus=0 AND status=1 AND admin_status=1 
//                  AND company_id=? AND employee_id=? 
//                  AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?))`,
//                 [decodedUserData.company_id, emp.id, formatDate(startDate), formatDate(endDate), formatDate(startDate), formatDate(endDate)]
//             );

//             leaveResults.forEach(leave => {
//                 const leaveStart = new Date(leave.start_date);
//                 const leaveEnd = new Date(leave.end_date);
//                 const adjStart = leaveStart < startDate ? startDate : leaveStart;
//                 const adjEnd = leaveEnd > endDate ? endDate : leaveEnd;
//                 let totalLeaveDays = (adjEnd - adjStart) / (1000 * 60 * 60 * 24) + 1;

//                 if (leave.start_half === 'Second Half') totalLeaveDays -= 0.5;
//                 if (leave.end_half === 'First Half') totalLeaveDays -= 0.5;

//                 leaveCount += totalLeaveDays;
//                 leaveRequestCount += totalLeaveDays;
//             });

//             for (let dayNo = 1; dayNo <= totalDays; dayNo++) {
//                 const dateVal = new Date(year, month - 1, dayNo);
//                 const dateStr = dateVal.toISOString().split('T')[0];
//                 const isHoliday = holidays.has(dateStr);
//                 const dayOfWeek = dateVal.getDay();
//                 const weekKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayOfWeek] + Math.ceil(dayNo / 7);
//                 const isWeeklyOff = workWeekData && workWeekData[weekKey] === 3;

//                 if (!isHoliday && isWeeklyOff) {
//                     WO++;
//                 }
//             }

//             const NewHF = HF / 2;
//             const absenteeCount = totalDays - holidays.size - leaveCount - WO - NewHF - presentCount;

//             employeeAttendanceDetails.push({
//                 employee_id: emp.id,
//                 first_name: emp.first_name,
//                 WO,
//                 HF,
//                 absenteeCount,
//                 presentCount,
//                 holidayCount: holidays.size,
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
    const { userData, data, page = 1, limit = 10 } = req.query;
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

        // Get total employees
        // const [totalEmployees] = await db.promise().query(
        //     `SELECT id, first_name, work_week_id, date_of_Joining, last_day 
        //      FROM employees 
        //      WHERE employee_status=1 AND status=1 AND delete_status=0 AND company_id=?
        //      AND (CAST(id AS CHAR) LIKE ? OR first_name LIKE ?)
        //      LIMIT ? OFFSET ?`,
        //     [decodedUserData.company_id, searchQuery, searchQuery, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]
        // );

        // // Count for pagination
        // const [Employees] = await db.promise().query(
        //     `SELECT id FROM employees 
        //      WHERE employee_status=1 AND status=1 AND delete_status=0 AND company_id=?
        //      AND (CAST(id AS CHAR) LIKE ? OR first_name LIKE ?)`,
        //     [decodedUserData.company_id, searchQuery, searchQuery]
        // );
        // Get total employees
        // const [totalEmployees] = await db.promise().query(
        //     `SELECT id, first_name, work_week_id, date_of_Joining, last_day 
        //      FROM employees 
        //      WHERE  employee_status=1 AND status=1 AND delete_status=0 AND company_id=?
        //      AND (CAST(id AS CHAR) LIKE ? OR first_name LIKE ?)
        //      LIMIT ? OFFSET ?`,
        //     [decodedUserData.company_id, searchQuery, searchQuery, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]
        // );

        const [totalEmployees] = await db.promise().query(
            `SELECT e.id, concat(e.first_name,'',e.last_name,'-',e.employee_id) as first_name,e.date_of_Joining, e.work_week_id, e.date_of_Joining, e.last_day 
     FROM employees e
     WHERE e.employee_status = 1 
       AND e.status = 1 
       AND e.delete_status = 0 
       AND e.company_id = ?
       AND (CAST(e.id AS CHAR) LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_id LIKE ?)
       AND NOT EXISTS (
           SELECT 1 
           FROM employeesalarydetails s 
           WHERE s.month = ? 
             AND s.year = ? 
             AND s.company_id = e.company_id 
             AND s.employee_id = e.id
       )
     LIMIT ? OFFSET ?`,
            [
                decodedUserData.company_id,
                searchQuery,
                searchQuery,
                searchQuery,
                searchQuery,
                month,
                year,
                parseInt(limit),
                (parseInt(page) - 1) * parseInt(limit)
            ]
        );

        // Count for pagination
        // const [Employees] = await db.promise().query(
        //     `SELECT id FROM employees 
        //      WHERE employee_status=1 AND status=1 AND delete_status=0 AND company_id=?
        //      AND (CAST(id AS CHAR) LIKE ? OR first_name LIKE ?)`,
        //     [decodedUserData.company_id, searchQuery, searchQuery]
        // );
        const [Employees] = await db.promise().query(
            `SELECT id 
     FROM employees 
     WHERE employee_status = 1 
       AND status = 1 
       AND delete_status = 0 
       AND company_id = ?
       AND (CAST(id AS CHAR) LIKE ? OR first_name LIKE ?)
       AND NOT EXISTS (
           SELECT 1 
           FROM employeesalarydetails 
           WHERE month = ? 
             AND year = ? 
             AND company_id = employees.company_id 
             AND employee_id = employees.id
       )`,
            [decodedUserData.company_id, searchQuery, searchQuery, month, year]
        );

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

            leaveResults.forEach(leave => {
                const leaveStart = new Date(leave.start_date);
                const leaveEnd = new Date(leave.end_date);
                const adjStart = leaveStart < adjustedStartDate ? adjustedStartDate : leaveStart;
                const adjEnd = leaveEnd > adjustedEndDate ? adjustedEndDate : leaveEnd;

                let totalLeaveDays = (adjEnd - adjStart) / (1000 * 60 * 60 * 24) + 1;

                if (leave.start_half === 'Second Half') totalLeaveDays -= 0.5;
                if (leave.end_half === 'First Half') totalLeaveDays -= 0.5;

                leaveCount += totalLeaveDays;
                leaveRequestCount += totalLeaveDays;
            });

            // Weekly Off Count
            for (let d = new Date(adjustedStartDate); d <= adjustedEndDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const isHoliday = allHolidays.includes(dateStr);
                const dayOfWeek = d.getDay();
                const weekKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayOfWeek] + Math.ceil(d.getDate() / 7);
                const isWeeklyOff = workWeekData && workWeekData[weekKey] === 3;

                if (!isHoliday && isWeeklyOff) WO++;
            }

            const holidayCount = allHolidays.filter(dateStr => {
                const date = new Date(dateStr);
                return date >= adjustedStartDate && date <= adjustedEndDate;
            }).length;

            const NewHF = HF / 2;
            const absenteeCount = adjustedTotalDays - holidayCount - leaveCount - WO - NewHF - presentCount;

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



// Export the router
module.exports = router;
