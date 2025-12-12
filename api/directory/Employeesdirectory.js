const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const db = require('../../DB/ConnectionSql');
router.use(cors());

const uploadsDir = path.join(__dirname, 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// File type filtering
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error(`Error: File upload only supports the following file types - ${filetypes}`));
    }
});

// Route to handle company submissions


router.post('/api/Add', async (req, res) => {

    const { employee_id, userData, ctc, first_name, last_name, email, date_of_joining, phone_number, dob, gender, reporting_manager, platformType,
        official_email_id, date_of_Joining, marital_status, blood_group, email_id, contact_number, current_address, permanent_address, probation_status, experience, job_title, work_location, department, sub_department, designation, employee_type, probation_period, emergency_contact_name, emergency_contact_number, alternate_phone, bank, branch, city, ifsc, account_number } = req.body;

    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Invalid user data. Employee ID and Company ID are required.' });
    }

    // Check for required fields    
    if (!employee_id || !first_name || !last_name || !email || !date_of_joining || !phone_number || !dob || !gender) {
        return res.status(200).json({ status: false, message: 'All fields are required.' });
    }

    db.query('SELECT COUNT(id) AS total FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 and company_id=?', [decodedUserData.company_id], (err, resultsMemberCount) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: 'Database error.',
                error: err
            });
        }
        db.query('SELECT member FROM companies WHERE  id=?', [decodedUserData.company_id], (err, results1) => {
            if (err) {
                return res.status(500).json({
                    status: false,
                    message: 'Database error.',
                    error: err
                });
            }
            if (results1[0].member <= resultsMemberCount[0].total) {
                return res.status(200).json({
                    status: false,
                    message: 'your employees limit already complity.'
                });
            }

            // Check if the phone number already exists
            db.query('SELECT id FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 and contact_number = ? OR email_id=? OR official_email_id=?', [phone_number, email, email], (err, results) => {
                if (err) {
                    return res.status(500).json({
                        status: false,
                        message: 'Database error.',
                        error: err
                    });
                }

                if (results.length === 0) {
                    if (platformType == 'ios' || platformType == 'android') {
                        db.query('INSERT INTO employees (company_id,employee_id,first_name,last_name,official_email_id,date_of_Joining,marital_status,blood_group,email_id,contact_number,current_address,permanent_address,probation_status,experience,job_title,dob,gender,work_location,department,sub_department,designation,employee_type,probation_period,reporting_manager,ctc,emergency_contact_name,emergency_contact_number,alternate_phone,bank,branch,city,ifsc,account_number) VALUES (?,?, ?, ?, ?, ?, ?, ?,?, ?, ?, ?, ?,?,?, ?, ?, ?, ?,?,?, ?, ?, ?, ?,?,?, ?, ?, ?, ?,?,?)',
                            [decodedUserData.company_id, employee_id, first_name, last_name, official_email_id, date_of_Joining, marital_status, blood_group, email_id, contact_number, current_address, permanent_address, probation_status, experience, job_title, dob, gender, work_location, department, sub_department, designation, employee_type, probation_period, reporting_manager, ctc, emergency_contact_name, emergency_contact_number, alternate_phone, bank, branch, city, ifsc, account_number,],
                            (err) => {
                                if (err) {
                                    return res.status(500).json({
                                        status: false,
                                        message: 'Failed to add company.',
                                        error: err
                                    });
                                }
                                return res.status(200).json({
                                    status: true,
                                    message: 'Employee Add successfully.'
                                });
                            }
                        );
                    } else {
                        db.query('INSERT INTO employees (reporting_manager,ctc,company_id,employee_id,first_name,last_name,email_id,date_of_Joining,contact_number,dob,gender) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?,?)',
                            [reporting_manager, ctc, decodedUserData.company_id, employee_id, first_name, last_name, email, date_of_joining, phone_number, dob, gender],
                            (err) => {
                                if (err) {
                                    return res.status(500).json({
                                        status: false,
                                        message: 'Failed to add company.',
                                        error: err
                                    });
                                }
                                return res.status(200).json({
                                    status: true,
                                    message: 'Employee Add successfully.'
                                });
                            }
                        );
                    }


                } else {
                    return res.status(200).json({
                        status: false,
                        message: 'Employee with this phone number or email already exists.'
                    });
                }
            });
        })
    });
});





// router.post('/api/Employeesdirectory', async (req, res) => {
//     const { userData, id, platformType, type, limit = 10, page = 1, search = "" } = req.body;

//     let decodedUserData = null;

//     // Decode base64 userData
//     if (userData) {
//         try {
//             const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
//             decodedUserData = JSON.parse(decodedString);
//         } catch (error) {
//             return res.status(400).json({ status: false, error: 'Invalid userData format' });
//         }
//     }

//     // Validate required userData fields
//     if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
//         return res.status(400).json({ status: false, error: 'Invalid or missing employee credentials' });
//     }

//     const parsedLimit = parseInt(limit, 10);
//     const parsedPage = parseInt(page, 10);
//     const offset = (parsedPage - 1) * parsedLimit;

//     let query = '';
//     let queryParams = [decodedUserData.company_id];
//     if(search)

//     // Case 1: Mobile (iOS/Android) directory list
//     if ((platformType == 'ios' || platformType == 'android') && id == '') {
//         query = `
//             SELECT 
//                 a.id, a.employee_id, a.first_name, a.last_name, a.designation, a.employee_status,a.email_id,
//                 CONCAT(a.first_name, " ", a.last_name) AS reporting_manager_name
//             FROM employees AS a
//             WHERE a.company_id = ? AND a.employee_status = 1 AND a.delete_status = 0
//             ORDER BY a.first_name asc LIMIT ? OFFSET ?`;
//         queryParams.push(parsedLimit, offset);
//     }
//     // Case 2: Mobile (iOS/Android) view employee details
//     else if ((platformType == 'ios' || platformType == 'android') && id && type == 'view') {
//         query = `
//             SELECT 
//                 a.id, a.employee_id,a.login_status, a.first_name, a.last_name, a.official_email_id, a.date_of_Joining,a.marital_status,a.blood_group,a.email_id,a.contact_number,a.current_address,a.permanent_address,a.social_profile_link,a.probation_status,a.experience,a.job_title,
//                 a.contact_number, a.password, a.old_password, a.dob, a.gender, a.work_location,
//                 a.department, a.sub_department, a.designation, a.employee_status, a.employee_type,
//                 a.probation_period, a.grade, a.reporting_manager, a.ctc, a.aadhaar_card, a.pan_card,
//                 a.emergency_contact_name, a.alternate_phone, a.emergency_contact_number, a.otp,
//                 a.last_login, a.profile_image,  a.bank, a.branch, a.city, a.ifsc,
//                 a.account_number, a.status,
//                 meenD.name AS departmentName, subD.name AS sub_departmentName,
//                 CONCAT(e.first_name, " ", e.last_name) AS reporting_manager_name
//             FROM employees AS a
//             LEFT JOIN employees AS e ON e.id = a.reporting_manager
//             LEFT JOIN departments AS meenD ON meenD.id = a.department
//             LEFT JOIN departments AS subD ON subD.id = a.sub_department
//             WHERE a.company_id = ? AND a.id = ? AND a.employee_status = 1 AND a.status = 1 AND a.delete_status = 0
//             ORDER BY a.first_name asc LIMIT ? OFFSET ?`;
//         queryParams.push(id, parsedLimit, offset);
//     }
//     // Case 3: Default full employee list (web)
//     else {
//         query = `
//             SELECT 
//                 a.id, a.employee_id, a.first_name,a.login_status, a.last_name, a.official_email_id,a.email_id, a.date_of_Joining,
//                 a.contact_number, a.password, a.old_password, a.dob, a.gender, a.work_location,
//                 a.department, a.sub_department, a.designation, a.employee_status, a.employee_type,
//                 a.probation_period, a.grade, a.reporting_manager, a.ctc, a.aadhaar_card, a.pan_card,
//                 a.emergency_contact_name, a.alternate_phone, a.emergency_contact_number, a.otp,
//                 a.last_login, a.profile_image,  a.bank, a.branch, a.city, a.ifsc,
//                 a.account_number, a.status,
//                 meenD.name AS departmentName, subD.name AS sub_departmentName,
//                 CONCAT(e.first_name, " ", e.last_name) AS reporting_manager_name
//             FROM employees AS a
//             LEFT JOIN employees AS e ON e.id = a.reporting_manager
//             LEFT JOIN departments AS meenD ON meenD.id = a.department
//             LEFT JOIN departments AS subD ON subD.id = a.sub_department
//             WHERE a.company_id = ? AND a.employee_status = 1 AND a.status = 1 AND a.delete_status = 0
//             ORDER BY a.first_name asc LIMIT ? OFFSET ?`;
//         queryParams.push(parsedLimit, offset);
//     }

//     // Execute main query
//     // db.query(query, queryParams, (err, results) => {
//     //     if (err) {
//     //         console.error('Error fetching employees:', err);
//     //         return res.status(500).json({ status: false, error: 'Database query error' });
//     //     }

//     //     // Count total employees
//     //     const countQuery = `
//     //         SELECT COUNT(id) AS total
//     //         FROM employees
//     //         WHERE company_id = ? AND employee_status = 1 AND status = 1 AND delete_status = 0`;
//     //     let socialProfile = [];

//     //     if ((platformType == 'ios' || platformType == 'android') && id && type == 'view') {
//     //         socialProfile = db.promise().query(
//     //             `SELECT instagram, facebook, linkedin FROM social_profile WHERE employee_id=? AND company_id=? And type='Employee_Profile'`,
//     //             [id, decodedUserData.company_id]
//     //         );
//     //     }

//     //     db.query(countQuery, [decodedUserData.company_id], (countErr, countResults) => {
//     //         if (countErr) {
//     //             console.error('Error counting employees:', countErr);
//     //             return res.status(500).json({ status: false, error: 'Database count error' });
//     //         }

//     //         const total = countResults[0]?.total || 0;

//     //         const employeesWithSrnu = results.map((employee, index) => ({
//     //             srnu: offset + index + 1,
//     //             socialProfile: socialProfile,
//     //             ...employee
//     //         }));

//     //         return res.json({
//     //             status: true,
//     //             employees: employeesWithSrnu,
//     //             total,
//     //             page: parsedPage,
//     //             limit: parsedLimit
//     //         });
//     //     });
//     // });

//     try {
//         // Fetch main employee(s)
//         const [results] = await db.promise().query(query, queryParams);

//         // Get total count
//         const [countResults] = await db.promise().query(
//             `SELECT COUNT(id) AS total FROM employees WHERE company_id = ? AND employee_status = 1 AND status = 1 AND delete_status = 0`,
//             [decodedUserData.company_id]
//         );

//         const total = countResults[0]?.total || 0;

//         let employeesWithSrnu = results.map((employee, index) => ({
//             srnu: offset + index + 1,
//             ...employee
//         }));

//         // If viewing a single employee, add socialProfile
//         if ((platformType == 'ios' || platformType == 'android') && id && type == 'view') {
//             const [socialProfileRows] = await db.promise().query(
//                 `SELECT instagram, facebook, linkedin FROM social_profile WHERE employee_id=? AND company_id=? AND type='Employee_Profile'`,
//                 [id, decodedUserData.company_id]
//             );

//             employeesWithSrnu[0].socialProfile = socialProfileRows.length > 0 ? socialProfileRows[0] : {};
//         }

//         return res.json({
//             status: true,
//             employees: employeesWithSrnu,
//             total,
//             page: parsedPage,
//             limit: parsedLimit
//         });

//     } catch (error) {
//         console.error('Error:', error);
//         return res.status(500).json({ status: false, error: 'Server error' });
//     }

// });



router.post('/api/Employeesdirectory', async (req, res) => {
    const { userData, id, platformType, type, limit = 10, page = 1, searchData = "", company_id, departmentId = 0, subDepartmentid = 0, employeeStatus = 1 } = req.body;
    let search = searchData;

    let decodedUserData = null;

    // Decode base64 userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData format' });
        }
    }

    // Validate required userData fields
    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Invalid or missing employee credentials' });
    }

    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    const offset = (parsedPage - 1) * parsedLimit;
    let company_idMeen = company_id || decodedUserData.company_id;
    let query = '';
    let queryParams = [company_idMeen];
    let searchClause = '';

    if (search && search.trim() != '') {
        searchClause = ` AND (a.first_name LIKE ? OR a.last_name LIKE ? OR a.employee_id LIKE ? OR a.email_id LIKE ? OR a.contact_number LIKE ?)`;
        const searchValue = `%${search}%`;
        queryParams.push(searchValue, searchValue, searchValue, searchValue, searchValue);
    }
    if (departmentId && departmentId != 0) {
        searchClause += ` AND a.department = ?`;
        queryParams.push(departmentId);
    }  if (subDepartmentid && subDepartmentid != 0) {
        searchClause += ` AND a.sub_department = ?`;
        queryParams.push(subDepartmentid);
    }
    if (employeeStatus && employeeStatus == 1) {
        searchClause += ` AND a.employee_status=1 and a.status=1 and a.delete_status=0 `;
    } else {
        searchClause += ` AND (a.employee_status=0 or a.status=0 or a.delete_status=1) `;
    }




    // Case 1: Mobile (iOS/Android) directory list
    if ((platformType == 'ios' || platformType == 'android') && id == '') {
        query = `
            SELECT 
                a.id, a.employee_id, a.first_name, a.last_name, a.designation, a.employee_status,a.email_id,
                CONCAT(a.first_name, " ", a.last_name) AS reporting_manager_name
            FROM employees AS a
            WHERE a.company_id = ? ${searchClause}
            ORDER BY a.first_name asc LIMIT ? OFFSET ?`;
        queryParams.push(parsedLimit, offset);
    }
    // Case 2: Mobile (iOS/Android) view employee details
    else if ((platformType == 'ios' || platformType == 'android') && id && type == 'view') {
        query = `
            SELECT 
                a.id, a.employee_id,a.login_status, a.first_name, a.last_name, a.official_email_id, a.date_of_Joining,a.marital_status,a.blood_group,a.email_id,a.contact_number,a.current_address,a.permanent_address,a.social_profile_link,a.probation_status,a.experience,a.job_title,
                a.contact_number, a.password, a.old_password, a.dob, a.gender, a.work_location,
                a.department, a.sub_department, a.designation, a.employee_status, a.employee_type,
                a.probation_period, a.grade, a.reporting_manager, a.ctc, a.aadhaar_card, a.pan_card,
                a.emergency_contact_name, a.alternate_phone, a.emergency_contact_number, a.otp,
                a.last_login, a.profile_image,  a.bank, a.branch, a.city, a.ifsc,
                a.account_number, a.status,
                meenD.name AS departmentName, subD.name AS sub_departmentName,
                CONCAT(e.first_name, " ", e.last_name) AS reporting_manager_name
            FROM employees AS a
            LEFT JOIN employees AS e ON e.id = a.reporting_manager
            LEFT JOIN departments AS meenD ON meenD.id = a.department
            LEFT JOIN departments AS subD ON subD.id = a.sub_department
            WHERE a.company_id = ? AND a.id = ? AND a.employee_status = 1 AND a.status = 1 AND a.delete_status = 0
            ORDER BY a.first_name asc LIMIT ? OFFSET ?`;
        queryParams.push(id, parsedLimit, offset);
    }
    // Case 3: Default full employee list (web)
    else {
        query = `
            SELECT 
                a.id, a.employee_id, a.first_name,a.login_status, a.last_name, a.official_email_id,a.email_id, a.date_of_Joining,
                a.contact_number, a.password, a.old_password, a.dob, a.gender, a.work_location,
                a.department, a.sub_department, a.designation, a.employee_status, a.employee_type,
                a.probation_period, a.grade, a.reporting_manager, a.ctc, a.aadhaar_card, a.pan_card,
                a.emergency_contact_name, a.alternate_phone, a.emergency_contact_number, a.otp,
                a.last_login, a.profile_image,  a.bank, a.branch, a.city, a.ifsc,
                a.account_number, a.status,
                meenD.name AS departmentName, subD.name AS sub_departmentName,
                CONCAT(e.first_name, " ", e.last_name) AS reporting_manager_name
            FROM employees AS a
            LEFT JOIN employees AS e ON e.id = a.reporting_manager
            LEFT JOIN departments AS meenD ON meenD.id = a.department
            LEFT JOIN departments AS subD ON subD.id = a.sub_department
            WHERE a.company_id = ? ${searchClause}
            ORDER BY a.first_name asc LIMIT ? OFFSET ?`;
        queryParams.push(parsedLimit, offset);
    }

    try {
        // Fetch main employee(s)
        const [results] = await db.promise().query(query, queryParams);

        // Get total count with search
        let countQuery = `SELECT COUNT(id) AS total FROM employees a WHERE a.company_id = ? ${searchClause}`;
        let countParams = [company_idMeen];
        if (search && search.trim() !== '') {
            const searchValue = `%${search}%`;
            countParams.push(searchValue, searchValue, searchValue, searchValue, searchValue);
        } 
        if (departmentId && departmentId != 0) {
            countParams.push(departmentId);
        }  if (subDepartmentid && subDepartmentid != 0) {
            countParams.push(subDepartmentid);
        }
        


        const [countResults] = await db.promise().query(countQuery, countParams);

        const total = countResults[0]?.total || 0;

        let employeesWithSrnu = results.map((employee, index) => ({
            srnu: offset + index + 1,
            ...employee
        }));

        // If viewing a single employee, add socialProfile
        if ((platformType == 'ios' || platformType == 'android') && id && type == 'view') {
            const [socialProfileRows] = await db.promise().query(
                `SELECT instagram, facebook, linkedin FROM social_profile WHERE employee_id=? AND company_id=? AND type='Employee_Profile'`,
                [id, decodedUserData.company_id]
            );

            employeesWithSrnu[0].socialProfile = socialProfileRows.length > 0 ? socialProfileRows[0] : {};
        }

        return res.json({
            status: true,
            employees: employeesWithSrnu,
            total,
            page: parsedPage,
            limit: parsedLimit
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ status: false, error: 'Server error' });
    }
});

router.get('/api/fetchDetails', (req, res) => {
    const { userData, type, UserId } = req.query;
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

    // Determine the query based on type

    let query;
    let queryParams = '';

    if (UserId != '') {
        queryParams = [UserId];
    } else {
        queryParams = [decodedUserData.id];
    }

    if (type === 'Personal') {
        query = `SELECT id, first_name, last_name, blood_group, dob, marital_status, gender,
                         official_email_id, email_id, contact_number, alternate_phone,
                         current_address, permanent_address, social_profile_link 
                  FROM employees WHERE id = ?`;
    } else if (type === 'Work') {
        query = `SELECT e.id,e.login_status, e.date_of_Joining, e.work_location, e.employee_type, e.employee_id, 
       e.experience, e.probation_period, e.probation_status, e.job_title, e.designation, e.status,
       d.name AS department_name, 
       sd.name AS sub_department_name
       ,e.department, 
       e.sub_department,Concat(emp.first_name,' ', emp.last_name) AS reporting_manager_name,emp.id as reporting_manager
FROM employees AS e 
LEFT JOIN departments AS d ON e.department = d.id
LEFT JOIN departments AS sd ON e.sub_department = sd.id
LEFT JOIN employees AS emp ON emp.id = e.reporting_manager
WHERE e.id = ?`;
    } else {
        return res.status(400).json({ error: 'Invalid type specified' });
    }

    // Execute the query
    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ status: false, status: false, error: 'Server error' });
        }

        // Check if any results were found
        if (results.length === 0) {
            return res.status(404).json({ status: false, error: 'No data found' });
        }

        res.json({
            data: results[0],
            status: true,
            message: 'Data found'
        });
    });
});



// router.post('/api/Update', (req, res) => {
//     const { type, id, first_name, last_name, reporting_manager, blood_group, dob, marital_status, gender, official_email_id, email_id, contact_number, alternate_phone, current_address, permanent_address, activeSection,
//         date_of_Joining, work_location, employee_type, employee_id, status,
//         experience, probation_period, probation_status, sub_department, department, job_title, designation
//         , ctc, emergency_contact_name, emergency_contact_number, bank, branch, city, ifsc, account_number, platformType
//     } = req.body;
//     let query;
//     let values;
//     if (!id) {
//         return res.status(400).json({ status: false, message: 'Missing required fields: id' });
//     }
//     if (platformType == 'ios' || platformType == 'android') {
//         query = 'UPDATE employees SET employee_id=?,first_name=?,last_name=?,official_email_id=?,date_of_Joining=?,marital_status=?,blood_group=?,email_id=?,contact_number=?,current_address=?,permanent_address=?,probation_status=?,experience=?,job_title=?,dob=?,gender=?,work_location=?,department=?,sub_department=?,designation=?,employee_type=?,probation_period=?,reporting_manager=?,ctc=?,emergency_contact_name=?,emergency_contact_number=?,alternate_phone=?,bank=?,branch=?,city=?,ifsc=?,account_number=? WHERE id=?';
//         values = [employee_id, first_name, last_name, official_email_id, date_of_Joining, marital_status, blood_group, email_id, contact_number, current_address, permanent_address, probation_status, experience, job_title, dob, gender, work_location, department, sub_department, designation, employee_type, probation_period, reporting_manager, ctc, emergency_contact_name, emergency_contact_number, alternate_phone, bank, branch, city, ifsc, account_number, id];
//     } else {
//         if (!id || !activeSection) {
//             return res.status(400).json({ status: false, message: 'Missing required fields: id and activeSection' });
//         }

//         if (type == 'Personal') {
//             switch (activeSection) {
//                 case 'personal':
//                     query = 'UPDATE employees SET first_name=?, last_name=?, blood_group=?, dob=?, marital_status=?, gender=? WHERE id=?';
//                     values = [first_name, last_name, blood_group, dob, marital_status, gender, id];
//                     break;
//                 case 'contact':
//                     query = 'UPDATE employees SET official_email_id=?, email_id=?, contact_number=?, alternate_phone=? WHERE id=?';
//                     values = [official_email_id, email_id, contact_number, alternate_phone, id];
//                     break;
//                 case 'addresses':
//                     query = 'UPDATE employees SET current_address=?, permanent_address=? WHERE id=?';
//                     values = [current_address, permanent_address, id];
//                     break;
//                 default:
//                     return res.status(400).json({ status: false, message: 'Invalid activeSection provided' });
//             }
//         } else if (type == 'Work') {
// switch (activeSection) {
//     case 'BasicInfo':
//         query = 'UPDATE employees SET probation_period=?,status=?,probation_status=?,date_of_Joining=?, work_location=?, employee_type=?, employee_id=?, experience=?,reporting_manager=? WHERE id=?';
//         values = [probation_period, status, probation_status, date_of_Joining, work_location, employee_type, employee_id, experience, reporting_manager, id];
//         break;
//     case 'WorkInfo':
//         query = 'UPDATE employees SET job_title=?,designation=?,sub_department=?, department=? WHERE id=?';
//         values = [job_title, designation, sub_department, department, id];
//         break;
//     default:
//         return res.status(400).json({ status: false, message: 'Invalid activeSection provided ok' });
// }
//         }
//     }




//     db.query(query, values, (err, results) => {
//         if (err) {
//             console.error('Database error:', err);
//             return res.status(500).json({ status: false, message: 'Database error', error: err });
//         }
//         res.json({ status: true, message: 'Update successful', data: results });
//     });
// });

router.post('/api/Update', (req, res) => {
    const { type, id, first_name, last_name, reporting_manager, blood_group, dob, marital_status, gender, official_email_id, email_id, contact_number, alternate_phone, current_address, permanent_address, activeSection,
        date_of_Joining, work_location, employee_type, employee_id, status,
        experience, probation_period, probation_status, sub_department, department, job_title, designation
        , ctc, emergency_contact_name, emergency_contact_number, bank, branch, city, ifsc, account_number, platformType, login_status
    } = req.body;
    let query;
    let values;
    if (!id) {
        return res.status(400).json({ status: false, message: 'Missing required fields: id' });
    }
    if (platformType == 'ios' || platformType == 'android') {
        query = 'UPDATE employees SET employee_id=?,first_name=?,last_name=?,official_email_id=?,date_of_Joining=?,marital_status=?,blood_group=?,email_id=?,contact_number=?,current_address=?,permanent_address=?,probation_status=?,experience=?,job_title=?,dob=?,gender=?,work_location=?,department=?,sub_department=?,designation=?,employee_type=?,probation_period=?,reporting_manager=?,ctc=?,emergency_contact_name=?,emergency_contact_number=?,alternate_phone=?,bank=?,branch=?,city=?,ifsc=?,account_number=? WHERE id=?';
        values = [employee_id, first_name, last_name, official_email_id, date_of_Joining, marital_status, blood_group, email_id, contact_number, current_address, permanent_address, probation_status, experience, job_title, dob, gender, work_location, department, sub_department, designation, employee_type, probation_period, reporting_manager, ctc, emergency_contact_name, emergency_contact_number, alternate_phone, bank, branch, city, ifsc, account_number, id];
    } else {
        if (!id || !activeSection) {
            return res.status(400).json({ status: false, message: 'Missing required fields: id and activeSection' });
        }

        if (type == 'Personal') {
            query = 'UPDATE employees SET first_name=?, last_name=?, blood_group=?, dob=?, marital_status=?, gender=?,official_email_id=?, email_id=?, contact_number=?, alternate_phone=?,current_address=?, permanent_address=? WHERE id=?';
            values = [first_name, last_name, blood_group, dob, marital_status, gender, official_email_id, email_id, contact_number, alternate_phone, current_address, permanent_address, id];

        } else if (type == 'Work') {


            switch (activeSection) {
                case 'BasicInfo':
                    query = 'UPDATE employees SET login_status=?,probation_period=?,status=?,probation_status=?,date_of_Joining=?, work_location=?, employee_type=?, employee_id=?, experience=?,reporting_manager=? WHERE id=?';
                    values = [login_status, probation_period, status, probation_status, date_of_Joining, work_location, employee_type, employee_id, experience, reporting_manager, id];
                    break;
                case 'WorkInfo':
                    query = 'UPDATE employees SET job_title=?,designation=?,sub_department=?, department=? WHERE id=?';
                    values = [job_title, designation, sub_department, department, id];
                    break;
                default:
                    return res.status(400).json({ status: false, message: 'Invalid activeSection provided ok' });
            }
        }
    }

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error', error: err });
        }
        res.json({ status: true, message: 'Update successful', data: results });
    });
});

router.post('/api/departments', (req, res) => {
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
    if (!decodedUserData || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }
    db.query('SELECT id,name FROM departments WHERE type =1 and company_id=?', [decodedUserData.company_id], (err, departments) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error', error: err });
        }
        res.json({ status: true, data: departments });
    });
});

router.post('/api/sub-departments', (req, res) => {
    const { userData, id } = req.body;
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }
    if (!decodedUserData || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }

    const departmentId = id;
    if (!id) {
        return res.status(400).json({ status: false, error: 'Department ID is required' });
    }

    db.query('SELECT id,name FROM departments WHERE type =2 AND company_id=? AND parent_id = ?', [decodedUserData.company_id, departmentId], (err, subDepartments) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'Database error', error: err });
        }
        res.json({ status: true, data: subDepartments });
    });
});



// employeeTeamDetails
router.post('/api/employeeTeamDetails', (req, res) => {
    const { userData, UserId } = req.body;
    let decodedUserData = null;
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
    let EmpID = UserId || decodedUserData.id;
    let query;
    let queryParams = '';

    queryParams = [EmpID];


    query = `SELECT e.id,e.first_name, e.last_name, e.blood_group, e.dob, e.marital_status, e.gender,
                         e.official_email_id, e.email_id, e.contact_number,e.alternate_phone,
         e.date_of_Joining,e.employee_type, 
       e.designation, 
       d.name AS department_name, 
       sd.name AS sub_department_name,
       Concat(emp.first_name,' ', emp.last_name) AS reporting_manager_name
       FROM employees AS e 
LEFT JOIN departments AS d ON e.department = d.id
LEFT JOIN departments AS sd ON e.sub_department = sd.id
LEFT JOIN employees AS emp ON emp.id = e.reporting_manager

WHERE e.id = ?`;



    // Execute the query
    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ status: false, status: false, error: 'Server error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ status: false, error: 'No data found' });
        }

        res.json({ data: results[0], status: true, message: 'Data found' });


    });
});
router.post("/ToggleStatus", (req, res) => {
    const { whereValue, table, updateColumn, status, whereColumn, userData } = req.body;
    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    // Validate decoded userData
    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and company ID are required' });
    }

    if (!whereValue) {
        return res.status(400).json({ status: false, message: "whereValue is required." });
    }

    db.query(
        `UPDATE ${table} SET ${updateColumn} = ? WHERE ${whereColumn} = ? and company_id = ?`,
        [status, whereValue, decodedUserData.company_id],
        (err, updateResults) => {
            if (err) {
                return res.status(500).json({
                    status: false,
                    message: "Error updating status.",
                    error: err.message
                });
            }

            if (updateResults.affectedRows === 0) {
                return res.status(404).json({
                    status: false,
                    message: "Not found or no changes made."
                });
            }

            res.status(200).json({
                status: true,
                message: "Status updated successfully.",
                updatedStatus: status
            });
        }
    );
});

// Export the router
module.exports = router;
