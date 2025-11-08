const express = require('express');
const router = express.Router();
const cors = require('cors');
const db = require('../../DB/ConnectionSql');
const path = require('path');
const { AdminCheck } = require('.././../model/functlity/AdminCheck');
const uploadFile = require('../../model/functlity/uploadfunclite')
router.use(cors());
const { getEmployeeProfile } = require('../../helpers/getEmployeeProfile');


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


// router.post('/api/GetEmployeesProfile', async (req, res) => {
//     try {
//         const { userData } = req.body;
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
//         db.query(`SELECT 
//         e.profile_image, 
//         e.type, 
//         e.attendance_rules_id,
//         e.branch_id,
//         CONCAT_WS(' ', e.first_name, e.last_name) AS full_name,
//         CONCAT_WS(' ', e.first_name, e.last_name) AS first_name,
//         e.email_id, 
//         e.official_email_id,
//         e.face_detection,
//         e.login_status,
//         e.location_access,
//         b.latitude,
//         b.longitude,
//         b.radius
//      FROM employees e
//      LEFT JOIN branches b ON e.branch_id = b.id AND b.company_id = e.company_id
//      WHERE e.employee_status = 1 
//        AND e.status = 1 
//        AND e.delete_status = 0 
//        AND e.id = ?`,
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
//                             half_day_time = rule.half_day || half_day_time;
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

//                         // const inIST = formatToIST(inDateTime);
//                         // const outIST = formatToIST(outDateTime);
//                         if (employee.login_status != 1) {
//                             return res.status(403).json({ status: false, message: 'Invalid token.' });
//                         }

//                         return res.status(200).json({
//                             status: true,
//                             // data: employee,
//                             face_detection: employee.face_detection || 0,
//                             location_access: employee.location_access || 0,
//                             message: 'Profile fetched successfully',
//                             profile_image: employee.profile_image || '',
//                             data: results,
//                             isAdmin: isAdmin,
//                             in_time: inIST,
//                             out_time: outIST,
//                             half_day_time,
//                             working_hours,
//                             latitude: employee.latitude || '',
//                             longitude: employee.longitude || '',
//                             brachSwitch: true,
//                             radius: employee.radius || 0
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
    const result = await getEmployeeProfile(req.body);
    res.status(result.status ? 200 : 400).json(result);
});

router.post('/EmployeesProfile', async (req, res) => {
    const { userData, employeeId } = req.body;

    let decodedUserData = null;

    // Decode and validate userData
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({
                status: false,
                error: 'Invalid userData',
                message: 'Invalid userData'
            });
        }
    }

    // Validate company_id and employeeId
    if (!decodedUserData?.company_id) {
        return res.status(400).json({
            status: false,
            message: 'Company ID is required'
        });
    }

    if (!employeeId) {
        return res.status(400).json({
            status: false,
            message: 'Employee ID is required'
        });
    }
    let date = new Date();
    let today = date.toISOString().split('T')[0];
    try {
        // ✅ Get employee basic info, latest attendance & latest break info
        const [employeesProfile] = await db.promise().query(
            `SELECT 
                e.id AS emp_id,
                e.employee_id,
                e.profile_image,
                CONCAT(e.first_name, ' ', e.last_name) AS name,
                b.name AS branch_name,
                a.attendance_date,
                a.check_in_time,
                a.check_out_time,
                bl.start_time AS break_in,
                bl.end_time AS break_out
            FROM employees e
            LEFT JOIN branches b ON b.id = e.branch_id
            LEFT JOIN attendance a ON a.employee_id = e.id AND a.attendance_date = ?
            LEFT JOIN break_logs bl ON a.attendance_id = bl.attendance_id 
                AND (bl.end_time IS NULL OR bl.end_time = '' or bl.end_time = '00:00:00')
            WHERE e.id = ? AND e.company_id = ?
            `,
            [today, employeeId, decodedUserData.company_id]
        );

        if (employeesProfile.length === 0) {
            return res.status(404).json({
                status: false,
                message: "Employee not found"
            });
        }

        const emp = employeesProfile[0];
        const data = {
            id: emp.emp_id,
            employee_id: emp.employee_id,
            name: emp.name,
            profile_image: emp.profile_image,
            branch_name: emp.branch_name,
            attendance_date: emp.attendance_date || '',
            attendance_in: emp.check_in_time || '',
            attendance_out: emp.check_out_time || '',
            break_in: emp.break_in || '',
            break_out: emp.break_out || ''
        };

        return res.json({
            status: true,
            data: data,
            message: 'Fetched successfully'
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: false,
            message: "Error fetching employee profile"
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
            // console.log('Data deleted successfully');
            return res.status(200).json({ status: true, message: 'Profile Image deleted successfully' });
        }
    );
});

// Export the router
module.exports = router;
