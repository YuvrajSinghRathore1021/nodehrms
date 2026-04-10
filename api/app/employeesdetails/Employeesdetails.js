const express = require("express");
const router = express.Router();
const db = require("../../../DB/ConnectionSql");
const { AdminCheck } = require('../../../model/functlity/AdminCheck');
// app cheak A
router.post('/api/IdCard', async (req, res) => {
    const { userData } = req.body;
   
    if ( !req?.user?.id || !req?.user?.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
    }
    try {
        let query = `SELECT e.id, e.employee_id,CONCAT(e.first_name,'', e.last_name) AS name, e.official_email_id, e.email_id,  e.contact_number, e.alternate_phone,  e.dob, e.gender,e.designation, e.profile_image,c.company_name,c.logo FROM employees AS e INNER JOIN companies AS c ON e.company_id=c.id WHERE e.company_id=? AND e.id=?`;
        let values = [req?.user?.company_id, req?.user?.id];

        db.query(query, values, (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ status: false, message: 'Database error', error: err });
            }
            res.json({
                status: true,
                message: 'fetched successfully',
                data: results,
            });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ status: false, error: 'Server error fetching PayDetails' });
    }
});


// app cheak A
router.post('/api/SalarySlipStructure', async (req, res) => {
    const { userData } = req.body;

    if ( !req?.user?.id || !req?.user?.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
    }

    try {
        let query = `-- Get CTC row
SELECT 'CTC' AS component_name, 
       e.ctc / 12 AS Monthly_Amount, 
       e.ctc AS Yearly_Amount
FROM employees e
WHERE e.id = ?

UNION ALL

-- Get all other salary components
SELECT sc.component_name, 
       CASE 
           WHEN sc.calculation_method = 'fixed_amount' THEN sc.fixed_amount
           WHEN sc.calculation_method = 'percentage' THEN (e.ctc / 12 * sc.percentage / 100)
           ELSE 0
       END AS Monthly_Amount,
       (CASE 
           WHEN sc.calculation_method = 'fixed_amount' THEN sc.fixed_amount
           WHEN sc.calculation_method = 'percentage' THEN (e.ctc / 12 * sc.percentage / 100)
           ELSE 0
       END) * 12 AS Yearly_Amount
FROM employees e
JOIN salary_structure ss ON e.structure_id = ss.structure_id
JOIN salary_component sc ON ss.structure_id = sc.structure_id
WHERE e.id = ? AND e.company_id = ?`;
        let values = [req?.user?.id, req?.user?.id, req?.user?.company_id];

        db.query(query, values, (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ status: false, message: 'Database error', error: err });
            }
            res.json({
                status: true,
                message: 'fetched successfully',
                data: results,
            });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ status: false, error: 'Server error fetching PayDetails' });
    }
});



// // web cheak A
router.get('/api/documentGet', async (req, res) => {
    const { userData, data } = req.query;
    let EmployeeId = null;

    if (data) {
        EmployeeId = data['EmployeeId'] ? data['EmployeeId'] : null;
    }

    const isAdmin = await AdminCheck(req?.user?.id, req?.user?.company_id);

    if (isAdmin === false) {
        return res.status(200).json({
            status: false,
            error: 'You do not have access to this functionality', message: 'You do not have access to this functionality'
        });
    }
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;
    const offset = (page - 1) * limit;

    if ( !req?.user?.id) {
        return res.status(400).json({ status: false, error: 'Employee ID is required' });
    }

    // Build the base query
    let query = `SELECT id, employee_id, company_id, document_name, file_path, status, add_stamp, uploaded_at FROM documents WHERE company_id = ? And employee_id = ?`;

    const queryParams = [req?.user?.company_id, EmployeeId || req?.user?.id];

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
        let countQuery = 'SELECT COUNT(id) AS total FROM documents WHERE company_id = ? And employee_id = ?';
        let countQueryParams = [req?.user?.company_id, EmployeeId || req?.user?.id];


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


// // web cheak A
// router.post('/api/documentUpdate', async (req, res) => {
//     try {
//         const { userData, id, status } = req.body;




//         if ( !req?.user?.id || !req?.user?.company_id) {
//             return res.status(400).json({
//                 status: false,
//                 error: 'Employee ID and Company ID are required',
//             });
//         }

//         const Query = `UPDATE documents SET status = ? WHERE id = ?`;
//         const QueryArray = [status, id];

//         db.query(Query, QueryArray, (err, Result) => {
//             if (err) {
//                 console.error('Error checking for duplicate salary details:', err);
//                 return res.status(500).json({
//                     status: false,
//                     message: 'Failed to check duplicate salary details.',
//                 });
//             }
//             return res.status(200).json({
//                 status: true,
//                 message: 'successfully updated',
//                 data: Result,
//             });

//         })
//     } catch (error) {
//         console.error('Error processing salary submission:', error);
//         res.status(500).json({
//             status: false,
//             message: 'Failed to process salary submission.',
//         });
//     }
// });



// Update documentGet endpoint to support filters and multiple employees
router.post('/api/documentGet', async (req, res) => {
    const {
        userData,
        page = 1,
        limit = 10,
        employee_id,
        status_filter = 'all',
        date_from = null,
        date_to = null,
        search = ''
    } = req.body;

   
   

    const isAdmin = await AdminCheck(req?.user?.id, req?.user?.company_id);
    if (!isAdmin) {
        return res.status(403).json({
            status: false,
            message: 'You do not have access to this functionality'
        });
    }

    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    const offset = (parsedPage - 1) * parsedLimit;

    // Handle multiple employees
    let employeeIdCondition = '';
    let queryParams = [req?.user?.company_id];

    if (employee_id && employee_id !== '') {
        const employeeIdArray = employee_id.split(',').map(id => parseInt(id));
        const placeholders = employeeIdArray.map(() => '?').join(',');
        employeeIdCondition = ` AND d.employee_id IN (${placeholders})`;
        queryParams.push(...employeeIdArray);
    } else {
        return res.json({
            status: true,
            data: [],
            total: 0,
            page: parsedPage,
            limit: parsedLimit
        });
    }

    let query = `
        SELECT d.id, d.employee_id, d.company_id, d.document_name, d.file_path, d.status, 
                d.add_stamp, d.uploaded_at,
               CONCAT(e.first_name, ' ', e.last_name) AS employee_name
        FROM documents d
        LEFT JOIN employees e ON d.employee_id = e.id
        WHERE d.company_id = ? ${employeeIdCondition}
    `;

    // Status filter
    if (status_filter !== 'all') {
        query += ` AND d.status = ?`;
        queryParams.push(parseInt(status_filter));
    }

    // Document type filter
    // if (document_type && document_type !== '') {
    //     query += ` AND d.document_type = ?`;
    //     queryParams.push(document_type);
    // }

    // Date range filter
    if (date_from && date_from !== 'null') {
        query += ` AND DATE(d.uploaded_at) >= ?`;
        queryParams.push(date_from);
    }
    if (date_to && date_to !== 'null') {
        query += ` AND DATE(d.uploaded_at) <= ?`;
        queryParams.push(date_to);
    }

    // Search filter
    if (search && search.trim() !== '') {
        query += ` AND (
            d.document_name LIKE ? OR
            e.first_name LIKE ? OR
            e.last_name LIKE ?
        )`;
        const searchLike = `%${search}%`;
        queryParams.push(searchLike, searchLike, searchLike);
    }

    query += ` ORDER BY d.id DESC LIMIT ? OFFSET ?`;
    queryParams.push(parsedLimit, offset);

    try {
        const [results] = await db.promise().query(query, queryParams);

        // Get total count
        let countQuery = `SELECT COUNT(d.id) AS total FROM documents d
            LEFT JOIN employees e ON d.employee_id = e.id
            WHERE d.company_id = ? ${employeeIdCondition}`;

        let countParams = [req?.user?.company_id];
        if (employee_id && employee_id !== '') {
            const employeeIdArray = employee_id.split(',').map(id => parseInt(id));
            countParams.push(...employeeIdArray);
        }

        if (status_filter !== 'all') {
            countQuery += ` AND d.status = ?`;
            countParams.push(parseInt(status_filter));
        }
        // if (document_type && document_type !== '') {
        //     countQuery += ` AND d.document_type = ?`;
        //     countParams.push(document_type);
        // }
        if (date_from && date_from !== 'null') {
            countQuery += ` AND DATE(d.uploaded_at) >= ?`;
            countParams.push(date_from);
        }
        if (date_to && date_to !== 'null') {
            countQuery += ` AND DATE(d.uploaded_at) <= ?`;
            countParams.push(date_to);
        }
        if (search && search.trim() !== '') {
            countQuery += ` AND (
                d.document_name LIKE ? OR
                e.first_name LIKE ? OR
                e.last_name LIKE ?
            )`;
            const searchLike = `%${search}%`;
            countParams.push(searchLike, searchLike, searchLike);
        }

        const [countResults] = await db.promise().query(countQuery, countParams);
        const total = countResults[0]?.total || 0;

        return res.json({
            status: true,
            data: results,
            total,
            page: parsedPage,
            limit: parsedLimit
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ status: false, error: 'Server error' });
    }
});

// Document statistics endpoint
router.post('/api/documentStats', async (req, res) => {
    const {
        userData,
        employee_ids,
        status_filter = 'all',
        date_from = null,
        date_to = null,
        search = ''
    } = req.body;

  

    const isAdmin = await AdminCheck(req?.user?.id, req?.user?.company_id);
    if (!isAdmin) {
        return res.status(403).json({
            status: false,
            message: 'You do not have access to this functionality'
        });
    }

    let employeeIdCondition = '';
    let queryParams = [req?.user?.company_id];

    if (employee_ids && employee_ids !== '') {
        const employeeIdArray = employee_ids.split(',').map(id => parseInt(id));
        const placeholders = employeeIdArray.map(() => '?').join(',');
        employeeIdCondition = ` AND d.employee_id IN (${placeholders})`;
        queryParams.push(...employeeIdArray);
    } else {
        return res.json({
            status: true,
            data: {
                total: 0,
                pending: 0,
                approved: 0,
                rejected: 0
            }
        });
    }

    let query = `
        SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN d.status = 0 THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN d.status = 2 THEN 1 ELSE 0 END) AS approved,
            SUM(CASE WHEN d.status = 3 THEN 1 ELSE 0 END) AS rejected
        FROM documents d
        LEFT JOIN employees e ON d.employee_id = e.id
        WHERE d.company_id = ? ${employeeIdCondition}
    `;

    if (status_filter !== 'all') {
        query += ` AND d.status = ?`;
        queryParams.push(parseInt(status_filter));
    }

    if (date_from && date_from !== 'null') {
        query += ` AND DATE(d.uploaded_at) >= ?`;
        queryParams.push(date_from);
    }
    if (date_to && date_to !== 'null') {
        query += ` AND DATE(d.uploaded_at) <= ?`;
        queryParams.push(date_to);
    }
    if (search && search.trim() !== '') {
        query += ` AND (
            d.document_name LIKE ? OR
            e.first_name LIKE ? OR
            e.last_name LIKE ?
        )`;
        const searchLike = `%${search}%`;
        queryParams.push(searchLike, searchLike, searchLike);
    }
    try {
        const [results] = await db.promise().query(query, queryParams);
        return res.json({
            status: true,
            data: results[0] || { total: 0, pending: 0, approved: 0, rejected: 0 }
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ status: false, error: 'Server error' });
    }
});

// Bulk document update endpoint
router.post('/api/bulkDocumentUpdate', async (req, res) => {
    try {
        const { userData, ids, status } = req.body;
     

       

        if ( !req?.user?.id || !req?.user?.company_id) {
            return res.status(400).json({
                status: false,
                error: 'Employee ID and Company ID are required',
            });
        }

        if (!ids || ids.length === 0) {
            return res.status(400).json({
                status: false,
                message: 'No documents selected',
            });
        }

        const placeholders = ids.map(() => '?').join(',');
        const Query = `UPDATE documents SET status = ? WHERE id IN (${placeholders})`;
        const QueryArray = [status, ...ids];

        db.query(Query, QueryArray, (err, Result) => {
            if (err) {
                console.error('Error updating documents:', err);
                return res.status(500).json({
                    status: false,
                    message: 'Failed to update documents.',
                });
            }
            return res.status(200).json({
                status: true,
                message: `${Result.affectedRows} document(s) updated successfully`,
                data: Result,
            });
        });
    } catch (error) {
        console.error('Error processing document update:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to process document update.',
        });
    }
});

// Update documentUpdate endpoint to handle document_type
router.post('/api/documentUpdate', async (req, res) => {
    try {
        const { userData, id, status, document_type, remark } = req.body;
       
        if ( !req?.user?.id || !req?.user?.company_id) {
            return res.status(400).json({
                status: false,
                error: 'Employee ID and Company ID are required',
            });
        }

        let Query = `UPDATE documents SET status = ?`;
        let QueryArray = [status];

        if (remark) {
            Query += `, remark = ?`;
            QueryArray.push(remark);
        }
        if (document_type) {
            Query += `, document_type = ?`;
            QueryArray.push(document_type);
        }

        Query += `, updated_by = ?, updated_at = NOW() WHERE id = ?`;
        QueryArray.push(req?.user?.id, id);

        db.query(Query, QueryArray, (err, Result) => {
            if (err) {
                console.error('Error updating document:', err);
                return res.status(500).json({
                    status: false,
                    message: 'Failed to update document.',
                });
            }
            return res.status(200).json({
                status: true,
                message: 'Document updated successfully',
                data: Result,
            });
        });
    } catch (error) {
        console.error('Error processing document update:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to process document update.',
        });
    }
});


module.exports = router;
