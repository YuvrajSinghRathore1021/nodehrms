const express = require('express');
const router = express.Router();
const cors = require('cors');
const db = require('../../DB/ConnectionSql');
const path = require('path');
const { AdminCheck } = require('.././../model/functlity/AdminCheck');
const uploadFile = require('../../model/functlity/uploadfunclite')
router.use(cors());

router.post('/api/UploadLogo', uploadFile, async (req, res) => {
    const { userData, folderName, CheckId } = req.body;
    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    if (!decodedUserData || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Company ID is required' });
    }

    const uploadedFileName = req.file ? path.basename(req.file.path) : null;
    // const filePath = req.file ? req.file.path.replace(/^.*uploads\\/, '/uploads/') : null;
    const filePath = req.file ? '/uploads/' + path.relative('uploads', req.file.path) : null;

    const id = CheckId || decodedUserData.id;
    db.query('SELECT profile_image FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 and id = ?', [id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ status: false, message: 'Failed to fetch current logo.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ status: false, message: 'Company not found.' });
        }
        const currentLogo = results[0].logo;
        const logoToUse = filePath || currentLogo;

        db.query('UPDATE employees SET profile_image = ? WHERE  employee_status=1 and status=1 and delete_status=0 and id = ?', [logoToUse, decodedUserData.id], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ status: false, message: 'Failed to update company profile_image.' });
            }
            return res.status(200).json({
                status: true,
                message: 'Profile Image uploaded and updated successfully.',
                folderName: folderName || 'default',
                imageName: uploadedFileName
            });
        });
    });

});


// get logo 
// router.post('/api/GetEmployeesProfile', async (req, res) => {
//     try {
//         const { userData, } = req.body;
//         let decodedUserData = null;
//         let CheckId = req.body.CheckId || null;
//         if (!CheckId || CheckId === 'undefined' || CheckId === 'null') {
//             CheckId = null;
//         }
//         // Decode base64 userData
//         if (userData) {
//             try {
//                 const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
//                 decodedUserData = JSON.parse(decodedString);
//             } catch (err) {
//                 return res.status(400).json({ status: false, error: 'Invalid userData format' });
//             }
//         }

//         // Check for valid company_id
//         if (!decodedUserData || !decodedUserData.company_id) {
//             return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
//         }

//         const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
//         const employeeId = CheckId || decodedUserData.id;

//         // Fetch employee data
//         db.query(
//             `SELECT 
//                 profile_image, type, attendance_rules_id,
//                 CONCAT(first_name, ' ', last_name) AS full_name,
//                     CONCAT(first_name, ' ', last_name) AS first_name,
//                 email_id, official_email_id,
//                 face_detection
//             FROM employees 
//             WHERE employee_status = 1 
//               AND status = 1 
//               AND delete_status = 0 
//               AND id = ?`,
//             [employeeId],
//             (err, results) => {
//                 if (err) {
//                     return res.status(500).json({
//                         status: false,
//                         message: 'Database error occurred while fetching employee details',
//                         error: err.message
//                     });
//                 }

//                 if (results.length === 0) {
//                     return res.status(404).json({ status: false, message: 'Employee not found' });
//                 }

//                 const employee = results[0];
//                 const ruleId = employee.attendance_rules_id;
//                 let in_time = '09:30';
//                 let out_time = '18:30';
//                 let half_day_time = '04:30';
//                 let working_hours = '09:00';

//                 // Fetch attendance rules
//                 db.query(
//                     `SELECT in_time, out_time, half_day, max_working_hours 
//                      FROM attendance_rules 
//                      WHERE rule_id = ? AND company_id = ?`,
//                     [ruleId, decodedUserData.company_id],
//                     (err, ruleResults) => {
//                         if (err) {
//                             return res.status(500).json({
//                                 status: false,
//                                 message: 'Database error occurred while fetching attendance rules',
//                                 error: err.message
//                             });
//                         }

//                         if (ruleResults.length > 0) {
//                             const rule = ruleResults[0];
//                             in_time = rule.in_time || in_time;
//                             out_time = rule.out_time || out_time;
//                             half_day_time = rule.half_day || half_day;
//                             working_hours = rule.max_working_hours || working_hours;
//                         }
//                         const today = new Date();
//                         const [inHours, inMinutes] = in_time.split(':').map(Number);
//                         const [outHours, outMinutes] = out_time.split(':').map(Number);

//                         // Create Date objects with today's date and given times
//                         const inDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), inHours, inMinutes);
//                         const outDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), outHours, outMinutes);

//                         // Convert to IST explicitly (if your server runs in another timezone)
//                         const inIST = new Date(inDateTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
//                         const outIST = new Date(outDateTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));



//                         return res.status(200).json({
//                             status: true,
//                             data: employee,
//                             face_detection: employee.face_detection || 0,
//                             message: 'Profile fetched successfully',
//                             profile_image: employee.profile_image || '',
//                             data: results,
//                             isAdmin: isAdmin,
//                             in_time: inIST,
//                             out_time: outIST,

//                             half_day_time,
//                             working_hours

//                         });
//                     }
//                 );
//             }
//         );
//     } catch (error) {
//         return res.status(500).json({
//             status: false,
//             message: 'Unexpected error occurred',
//             error: error.message
//         });
//     }
// });

router.post('/api/GetEmployeesProfile', async (req, res) => {
    try {
        const { userData, } = req.body;
        let decodedUserData = null;
        let CheckId = req.body.CheckId || null;
        if (!CheckId || CheckId === 'undefined' || CheckId === 'null') {
            CheckId = null;
        }
        // Decode base64 userData
        if (userData) {
            try {
                const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
                decodedUserData = JSON.parse(decodedString);
            } catch (err) {
                return res.status(400).json({ status: false, error: 'Invalid userData format' });
            }
        }

        // Check for valid company_id
        if (!decodedUserData || !decodedUserData.company_id) {
            return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
        }

        const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);
        const employeeId = CheckId || decodedUserData.id;

        // Fetch employee data
        db.query(
            `SELECT 
                profile_image, type, attendance_rules_id,
                CONCAT_WS(' ', first_name, last_name) AS full_name,
                  CONCAT_WS(' ', first_name, last_name) AS first_name,
                email_id, official_email_id,
                face_detection,login_status
            FROM employees 
            WHERE employee_status = 1 
              AND status = 1 
              AND delete_status = 0 
              AND id = ?`,
            [employeeId],
            (err, results) => {
                if (err) {
                    return res.status(500).json({
                        status: false,
                        message: 'Database error occurred while fetching employee details',
                        error: err.message
                    });
                }

                if (results.length === 0) {
                    return res.status(404).json({ status: false, message: 'Employee not found' });
                }

                const employee = results[0];
                const ruleId = employee.attendance_rules_id;
                let in_time = '09:30';
                let out_time = '18:30';
                let half_day_time = '04:30';
                let working_hours = '09:00';

                // Fetch attendance rules
                db.query(
                    `SELECT in_time, out_time, half_day, max_working_hours 
                     FROM attendance_rules 
                     WHERE rule_id = ? AND company_id = ?`,
                    [ruleId, decodedUserData.company_id],
                    (err, ruleResults) => {
                        if (err) {
                            return res.status(500).json({
                                status: false,
                                message: 'Database error occurred while fetching attendance rules',
                                error: err.message
                            });
                        }

                        if (ruleResults.length > 0) {
                            const rule = ruleResults[0];
                            in_time = rule.in_time || in_time;
                            out_time = rule.out_time || out_time;
                            half_day_time = rule.half_day || half_day_time;
                            working_hours = rule.max_working_hours || working_hours;
                        }
                        const today = new Date();
                        const [inHours, inMinutes] = in_time.split(':').map(Number);
                        const [outHours, outMinutes] = out_time.split(':').map(Number);

                        // Create Date objects with today's date and given times
                        const inDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), inHours, inMinutes);
                        const outDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), outHours, outMinutes);

                        // Convert to IST explicitly (if your server runs in another timezone)
                        const inIST = new Date(inDateTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
                        const outIST = new Date(outDateTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

                        // const inIST = formatToIST(inDateTime);
                        // const outIST = formatToIST(outDateTime);
                        if (employee.login_status != 1) {
                            return res.status(403).json({ status: false, message: 'Invalid token.' });
                        }

                        return res.status(200).json({
                            status: true,
                            data: employee,
                            face_detection: employee.face_detection || 0,
                            message: 'Profile fetched successfully',
                            profile_image: employee.profile_image || '',
                            data: results,
                            isAdmin: isAdmin,
                            in_time: inIST,
                            out_time: outIST,
                            half_day_time,
                            working_hours,
                            latitude:'',
                            longitude:''
                        });
                    }
                );
            }
        );
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: 'Unexpected error occurred',
            error: error.message
        });
    }
});

router.post('/api/Deleteapi', (req, res) => {
    const { userData } = req.body;
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
    if (!company_id) {
        return res.status(400).json({ status: false, message: 'ID is required.' });
    }
    db.query('UPDATE employees SET profile_image=? WHERE id = ? AND company_id=?',
        ['', decodedUserData.id, company_id],
        (err, results) => {
            if (err) {
                return res.status(500).json({ status: false, message: 'Error updating leave.', error: err.message });
            }
            if (results.affectedRows === 0) {
                return res.status(200).json({ status: false, message: 'Type not found or no changes made.' });
            }
            console.log('Data deleted successfully');
            return res.status(200).json({ status: true, message: 'Profile Image deleted successfully' });
        }
    );
});

// Export the router
module.exports = router;
