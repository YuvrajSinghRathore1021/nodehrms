const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');
const { AdminCheck } = require('../../model/functlity/AdminCheck');



// app cheak A / Web Cheak A
router.get('/api/companyEmployeeName', async (req, res) => {
    const { userData, searchData = '', type = "" } = req.query;
     
   
    const company_id = req?.user?.company_id;
    if (!company_id) {
        return res.status(400).json({
            status: false,
            error: 'Company ID is missing or invalid',
            message: 'Company ID is missing or invalid'
        });
    }
    let query = "";
    let dataArray = [];

    const isAdmin = await AdminCheck(req?.user?.id, req?.user?.company_id);
    let NewFilds = "";
    if (type == "permission") {
        NewFilds += " ,designation,profile_image "
    }
    if (isAdmin == true) {
        // query = `SELECT id,CONCAT(IFNULL(first_name, ''), ' ', IFNULL(last_name, ''),' - ',IFNULL(employee_id, '')) AS name FROM employees WHERE employee_status=1 and status=1 and delete_status=0 and company_id = ?`;
        // dataArray.push(company_id);
        query = `
  SELECT 
    id,
    CONCAT_WS(' - ',
      CONCAT_WS(' ', IFNULL(first_name, ''), IFNULL(last_name, '')),
      IFNULL(employee_id, '')
    ) AS name
     ${NewFilds}
  FROM employees 
  WHERE employee_status = 1 
    AND status = 1 
    AND delete_status = 0 
    AND company_id = ?
   
`;
        dataArray.push(company_id);

    } else {
        // query = `SELECT id, CONCAT(IFNULL(first_name, ''), ' ', IFNULL(last_name, ''),' - ',IFNULL(employee_id, '')) AS name FROM employees WHERE employee_status=1 and status=1 and delete_status=0 and company_id = ? and reporting_manager=?`;
        // dataArray.push(company_id, req?.user?.id);
        query = `
  SELECT 
    id,
    CONCAT_WS(' - ',
      CONCAT_WS(' ', IFNULL(first_name, ''), IFNULL(last_name, '')),
      IFNULL(employee_id, '')
    ) AS name
      ${NewFilds}
  FROM employees 
  WHERE employee_status = 1 
    AND status = 1 
    AND delete_status = 0 
    AND company_id = ? 
    AND (reporting_manager = ? or id=?)

 
`;
        dataArray.push(company_id, req?.user?.id, req?.user?.id);

    }
    if (searchData) {
        query += ` AND (first_name LIKE ? OR last_name LIKE ? Or employee_id LIKE ?)`;
        dataArray.push(`%${searchData}%`, `%${searchData}%`, `%${searchData}%`);
    }

    query += ` ORDER BY first_name ASC`;

    db.query(query, dataArray, (err, results) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: 'Database error occurred while fetching employees',
                error: err.message || err
            });
        }
        if (results.length === 0) {
            return res.status(200).json({
                status: false,
                message: 'No employees found for this company'
            });
        }
        res.json({
            status: true,
            data: results,
            message: 'Data found successfully'
        });
    });
});


// app cheak A / Web Cheak A
router.post('/api/companyEmployeeName', async (req, res) => {
    const { userData, searchData = '', type = "" } = req.body;
   
    const company_id = req?.user?.company_id;
    if (!company_id) {
        return res.status(400).json({
            status: false,
            error: 'Company ID is missing or invalid',
            message: 'Company ID is missing or invalid'
        });
    }
    let query = "";
    let dataArray = [];

    const isAdmin = await AdminCheck(req?.user?.id, req?.user?.company_id);
    let NewFilds = "";
    if (type == "permission") {
        NewFilds += " ,designation,profile_image "
    }
    if (isAdmin == true) {
        // query = `SELECT id,CONCAT(IFNULL(first_name, ''), ' ', IFNULL(last_name, ''),' - ',IFNULL(employee_id, '')) AS name FROM employees WHERE employee_status=1 and status=1 and delete_status=0 and company_id = ?`;
        // dataArray.push(company_id);
        query = `
  SELECT 
    id,
    CONCAT_WS(' - ',
      CONCAT_WS(' ', IFNULL(first_name, ''), IFNULL(last_name, '')),
      IFNULL(employee_id, '')
    ) AS name
      ${NewFilds}
  FROM employees 
  WHERE employee_status = 1 
    AND status = 1 
    AND delete_status = 0 
    AND company_id = ?
  
`;
        dataArray.push(company_id);

    } else {
        // query = `SELECT id, CONCAT(IFNULL(first_name, ''), ' ', IFNULL(last_name, ''),' - ',IFNULL(employee_id, '')) AS name FROM employees WHERE employee_status=1 and status=1 and delete_status=0 and company_id = ? and reporting_manager=?`;
        // dataArray.push(company_id, req?.user?.id);
        query = `
  SELECT 
    id,
    CONCAT_WS(' - ',
      CONCAT_WS(' ', IFNULL(first_name, ''), IFNULL(last_name, '')),
      IFNULL(employee_id, '')
    ) AS name
      ${NewFilds}
  FROM employees 
  WHERE employee_status = 1 
    AND status = 1 
    AND delete_status = 0 
    AND company_id = ? 
    AND (reporting_manager = ? or id=?)
  
`;
        dataArray.push(company_id, req?.user?.id, req?.user?.id);

    }
    if (searchData) {
        query += ` AND (first_name LIKE ? OR last_name LIKE ? Or employee_id LIKE ?)`;
        dataArray.push(`%${searchData}%`, `%${searchData}%`, `%${searchData}%`);
    }

    query += ` ORDER BY first_name ASC`;
    db.query(query, dataArray, (err, results) => {
        if (err) {
            return res.status(500).json({
                status: false,
                message: 'Database error occurred while fetching employees',
                error: err.message || err
            });
        }
        if (results.length === 0) {
            return res.status(200).json({
                status: false,
                message: 'No employees found for this company'
            });
        }
        res.json({
            status: true,
            data: results,
            message: 'Data found successfully'
        });
    });
});

module.exports = router;