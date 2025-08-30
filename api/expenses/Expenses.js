const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadFile = require('../../model/functlity/uploadfunclite')
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const db = require('../../DB/ConnectionSql');
const { Console } = require('console');
const { AdminCheck } = require('../../model/functlity/AdminCheck');
const e = require('express');
router.use(cors());
const uploadsDir = path.join(__dirname, '../../uploads/logo/');


router.post('/api/getExpenses', async (req, res) => {
    const { userData, limit = 10, page = 1, search = '' } = req.body;

    let decodedUserData = null;
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
    let employeeId = req.body.employee_id || decodedUserData.id;

    // SELECT id, employee_id, company_id, expense_type, amount, reason, expense_date, added_by, rm_id, admin_id, rm_status, admin_status, rm_remark, admin_remark, status, created_at, updated_at FROM expenses WHERE 1

    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    const offset = (parsedPage - 1) * parsedLimit;

    let query = `
    SELECT 
        e.id,
        e.employee_id,
        e.expense_type,
        e.amount,
        e.reason,
        e.expense_date,
        e.document,
        e.added_by,
        e.rm_id,
        e.admin_id,
        e.rm_status,
        e.admin_status,
        e.rm_remark,
        e.admin_remark,
        e.status,
        e.created_at,
        e.updated_at,
        e.payment_status,e.scheduled_pay_date,e.is_auto_release,e.payment_released_at,

        CONCAT(emp.first_name, ' ', emp.last_name) AS employee_name,
        CONCAT(rm.first_name, ' ', rm.last_name) AS rm_name,
        CONCAT(admin.first_name, ' ', admin.last_name) AS admin_name,
        CONCAT(added.first_name, ' ', added.last_name) AS added_by_name

    FROM expenses e
    LEFT JOIN employees emp ON e.employee_id = emp.id
    LEFT JOIN employees rm ON e.rm_id = rm.id
    LEFT JOIN employees admin ON e.admin_id = admin.id
    LEFT JOIN employees added ON e.added_by = added.id
    WHERE e.company_id = ? AND e.employee_id = ?
`;

    let queryParams = [decodedUserData.company_id, employeeId];

    // Add search condition if search string is provided
    if (search && search.trim() !== '') {
        query += ` AND (
        emp.first_name LIKE ? OR emp.last_name LIKE ? OR
        e.reason LIKE ? OR
        e.expense_type LIKE ? OR
        e.amount LIKE ?
    )`;
        const searchLike = `%${search}%`;
        queryParams.push(searchLike, searchLike, searchLike, searchLike, searchLike);
    }

    query += ` ORDER BY e.id DESC LIMIT ? OFFSET ?`;
    queryParams.push(parsedLimit, offset);


    try {
        // Fetch main employee(s)
        const [results] = await db.promise().query(query, queryParams);

        // Get total count
        let countQuery = `SELECT COUNT(e.id) AS total FROM expenses e
LEFT JOIN employees emp ON e.employee_id = emp.id
WHERE e.company_id = ? AND e.employee_id = ?`;

        let countParams = [decodedUserData.company_id, employeeId];

        if (search && search.trim() !== '') {
            countQuery += ` AND (
        emp.first_name LIKE ? OR emp.last_name LIKE ? OR
        e.reason LIKE ? OR
        e.expense_type LIKE ? OR
        e.amount LIKE ?
    )`;
            const searchLike = `%${search}%`;
            countParams.push(searchLike, searchLike, searchLike, searchLike, searchLike);
        }

        const [countResults] = await db.promise().query(countQuery, countParams);

        const total = countResults[0]?.total || 0;

        let expensesWithSrnu = results.map((Expenses, index) => ({
            srnu: offset + index + 1,
            action_status: actionFound(Expenses),
            employee_name: Expenses.employee_name || '',
            rm_name: Expenses.rm_name || '',
            admin_name: Expenses.admin_name || '',
            added_by_name: Expenses.added_by_name || '',
            edit_action: true,
            ...Expenses
        }));


        return res.json({
            status: true,
            expenses: expensesWithSrnu,
            total,
            page: parsedPage,
            limit: parsedLimit
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ status: false, error: 'Server error' });
    }

});



function actionFound(action) {
    // get approve next
    // admin 
    // 0 =pending, 1=approved, 2=rejected

    if (action.rm_id == 0 && action.admin_id == 0) {
        return `admin`;
    } else if (action.rm_id > 0 && action.rm_status == 1 && action.admin_status == 0) {
        return `admin`;
    } else if (action.rm_id > 0 && action.rm_status == 1 && action.admin_id > 0) {
        return `admin`;
    }

    //    rm 
    else if (action.rm_id > 0 && action.rm_status == 0 && action.admin_id == 0) {
        return `rm`;
    }
    // view 
    else if (action.rm_id > 0 && action.rm_status == 1 && action.admin_status == 1) {
        return `view`;
    }
    else if (action.rm_status == 2 || action.admin_status == 2) {
        return `view`;
    } else if (action.admin_status == 1 || action.admin_status == 2) {
        return `view`;
    }

    return ' ';
}


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/expenses/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});


const upload = multer({ storage });

router.post('/expensesAdd', upload.single('document'), async (req, res) => {
    const { userData, expense_type, amount, reason, expense_date } = req.body;

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
    // uploads/expenses/
    // const document = req.file ? req.file.filename : null;
    const document = 'uploads/expenses/' + (req.file ? req.file.filename : null);
    let { employee_id } = req.body;
    employee_id = employee_id || decodedUserData.id;
    // Basic validations
    if (!employee_id || !expense_type || !amount || !expense_date) {
        return res.status(400).json({ status: false, message: 'Missing required fields.' });
    }
    const isAdmin = await AdminCheck(decodedUserData.id, decodedUserData.company_id);

    try {
        let RmIdValue = 0;
        // Step 1: Get the reporting manager ID
        const [SettingMultiLeaveApprove] = await db.promise().query('SELECT multi_level_approve FROM settings WHERE company_id = ?',
            [decodedUserData.company_id]
        );

        if (SettingMultiLeaveApprove.length === 0) { }
        else {
            if (SettingMultiLeaveApprove[0].multi_level_approve == 1) {
                const [managerResults] = await db.promise().query(
                    'SELECT reporting_manager FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 and id = ? AND company_id = ?',
                    [employee_id, decodedUserData.company_id]
                );
                if (managerResults.length === 0) {
                    return res.status(404).json({ status: false, error: 'Employee not found', message: 'Invalid employee ID or company ID' });
                }
                RmIdValue = managerResults[0].reporting_manager ? managerResults[0].reporting_manager : 0;
            }
        }
        let insertQuery = "";
        if (isAdmin) {

            insertQuery = `INSERT INTO expenses (employee_id, company_id, expense_type, amount, reason, expense_date, document, added_by, rm_id, admin_id, rm_status, admin_status, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

            db.query(insertQuery, [employee_id || decodedUserData.id, decodedUserData.company_id, expense_type, amount, reason || '', expense_date, document, decodedUserData?.id || 0, RmIdValue || 0, decodedUserData.id || 0, '0', 1, 1], (err, result) => {
                if (err) {
                    return res.status(500).json({ status: false, message: 'DB error', error: err });
                }
                return res.status(200).json({ status: true, message: 'Expense added successfully', id: result.insertId });
            });

        } else {
            insertQuery = `INSERT INTO expenses (employee_id, company_id, expense_type, amount, reason, expense_date, document, added_by, rm_id, admin_id, rm_status, admin_status, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

            db.query(insertQuery, [decodedUserData.id, decodedUserData.company_id, expense_type, amount, reason || '', expense_date, document, decodedUserData?.id || 0, RmIdValue || 0, 0, '0', '0', 1], (err, result) => {
                if (err) {
                    return res.status(500).json({ status: false, message: 'DB error', error: err });
                }
                return res.status(200).json({ status: true, message: 'Expense added successfully', id: result.insertId });
            });

        }

    } catch (err) {
        res.status(500).json({ status: false, message: 'Database error', error: err.message });
    }
});



router.post('/RequestApprove', async (req, res) => {
    const { userData, expense_type, amount, reason, employee_id, action_type, id, status } = req.body;
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

    // Basic validations
    if (!employee_id || !expense_type || !amount) {
        return res.status(400).json({ status: false, message: 'Missing required fields.' });
    }

    try {
        let EmployeeId = decodedUserData.id;
        if (action_type == "rm") {
            const [Results] = await db.promise().query(
                'UPDATE expenses SET rm_status = ?, rm_remark = ?, rm_id = ? WHERE id = ? AND company_id = ?',
                [status, reason, EmployeeId, id, decodedUserData.company_id]
            );
            if (Results.affectedRows === 0) {
                return res.status(404).json({ status: false, message: 'Expense request not found or already processed' });
            }
            return res.status(200).json({ status: true, message: 'Expense request updated successfully' });

        } else {
            const [Results] = await db.promise().query(
                'UPDATE expenses SET admin_status = ?, admin_remark = ?, admin_id = ? WHERE id = ? AND company_id = ?',
                [status, reason, EmployeeId, id, decodedUserData.company_id]
            );
            if (Results.affectedRows === 0) {
                return res.status(404).json({ status: false, message: 'Expense request not found or already processed' });
            }
            return res.status(200).json({ status: true, message: 'Expense request updated successfully' });
        }

    } catch (err) {
        res.status(500).json({ status: false, message: 'Database error', error: err.message });
    }
});

//amount count =total, totalpaid,totalunpaid,totalrejected,totalreturned        
router.post('/amountCount', async (req, res) => {
    const { userData, employee_id } = req.body;
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
    // Basic validations
    if (!employee_id) {
        return res.status(400).json({ status: false, message: 'Missing required fields.' });
    }
    try {
        const [Results] = await db.promise().query(
            `SELECT 
                SUM(CASE WHEN status = 1 THEN amount ELSE 0 END) AS total,
                SUM(CASE WHEN status = 1 AND rm_status = 1 AND admin_status = 1 THEN amount ELSE 0 END) AS totalpaid,
                SUM(CASE WHEN status = 1 AND (rm_status = 0 OR admin_status = 0) THEN amount ELSE 0 END) AS totalunpaid,
                SUM(CASE WHEN status = 2 THEN amount ELSE 0 END) AS totalrejected,
                SUM(CASE WHEN status = 3 THEN amount ELSE 0 END) AS totalreturned
            FROM expenses
            WHERE company_id = ? AND employee_id = ?`,
            [decodedUserData.company_id, employee_id]
        );

        if (Results.length === 0) {
            return res.status(404).json({ status: false, message: 'No expenses found for this employee' });
        }

        return res.status(200).json({ status: true, data: Results[0] });

    } catch (err) {
        res.status(500).json({ status: false, message: 'Database error', error: err.message });
    }
});




// expenses edit 
router.post('/expensesEdit', upload.single('document'), async (req, res) => {
    const { userData, id, expense_type, amount, reason, expense_date, employee_id } = req.body;
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

    // Basic validations
    if (!id || !expense_type || !amount || !expense_date) {
        return res.status(400).json({ status: false, message: 'Missing required fields.' });
    }

    const document = 'uploads/expenses/' + (req.file ? req.file.filename : null);
    try {
        // Check if the expense exists
        const [expenseResults] = await db.promise().query(
            'SELECT * FROM expenses WHERE id = ? AND company_id = ?',
            [id, decodedUserData.company_id]
        );

        if (expenseResults.length === 0) {
            return res.status(404).json({ status: false, message: 'Expense not found' });
        }

        // Update the expense
        const updateQuery = `
            UPDATE expenses 
            SET 
                expense_type = ?, 
                amount = ?, 
                reason = ?, 
                expense_date = ?, 
                document = ?, 
                updated_at = NOW() 
            WHERE id = ? AND company_id = ?
        `;

        await db.promise().query(updateQuery, [
            expense_type,
            amount,
            reason || '',
            expense_date,
            document,
            id,
            decodedUserData.company_id
        ]);

        return res.status(200).json({ status: true, message: 'Expense updated successfully' });

    } catch (err) {
        res.status(500).json({ status: false, message: 'Database error', error: err.message });
    }
});


// Export the router
module.exports = router;
