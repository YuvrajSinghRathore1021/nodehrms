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
