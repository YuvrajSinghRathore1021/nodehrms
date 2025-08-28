const express = require("express");
const router = express.Router();
const db = require("../../../DB/ConnectionSql");

///////// leaveapi.js///////////////

router.post("/fetchleave", (req, res) => {

    const { userData } = req.body;
    let decodedUserData = null;

    if (userData) {
        try {
            const decodedString = Buffer.from(userData, "base64").toString("utf-8");
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            console.error("Error decoding userData:", error);
            return res
                .status(400)
                .json({ status: false, error: "Invalid userData format" });
        }
    }

    if (!decodedUserData) {
        return res
            .status(400)
            .json({ status: false, error: "User data is required" });
    }

    const { id } = decodedUserData;
    const limit = parseInt(req.body.limit, 10) || 10;
    const page = parseInt(req.body.page, 10) || 1;
    const offset = (page - 1) * limit;

    // Fetch the reporting manager of the employee (if required)
    const query = `SELECT reporting_manager FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 and id = ? `;
    const queryParams = [id];

    db.query(query, queryParams, (err, result) => {
        if (err) {
            console.error("Error fetching reporting manager:", err);
            return res
                .status(500)
                .json({ status: false, error: "Error fetching reporting manager" });
        }
        if (!result || result.length === 0) {
            return res
                .status(404)
                .json({ status: false, error: "Employee not found" });
        }
        const reportingManagerId = result[0].reporting_manager;
        // Fetch leave records based on the role and reporting manager
        let leaveQuery = `
      SELECT 
          e.employee_id, 
          CONCAT(e.first_name,' ', e.last_name) As first_name,
          e.type, 
          e.reporting_manager,
          a.leave_type, 
          a.status, 
          a.leave_rule_id,
          a.start_half,
          a.end_half,
          a.start_date, 
          a.end_date, 
          a.rm_id ,a.status ,a.rm_remark ,a.rm_status ,a.admin_id ,a.admin_status ,a.admin_remark,
          a.leave_id,
          DATEDIFF(a.end_date, a.start_date) + 1 AS leave_days
      FROM 
          employees e
      INNER JOIN 
          leaves a ON e.id = a.employee_id
      WHERE 
           e.employee_status=1 and e.status=1 and e.delete_status=0 and a.deletestatus = 0
    `;
        let leaveQueryParams = [];
        leaveQuery += ` AND a.employee_id = ?`;
        leaveQueryParams.push(id);

        leaveQuery += ` LIMIT ? OFFSET ?`;
        leaveQueryParams.push(limit, offset);

        console.log(leaveQuery);
        console.log(leaveQueryParams);
        db.query(leaveQuery, leaveQueryParams, (err, results) => {
            if (err) {
                console.error("Error fetching leave records:", err);
                return res
                    .status(500)
                    .json({ status: false, error: "Error fetching leave records" });
            }

            // Count query for pagination
            let countQuery = `
        SELECT 
            COUNT(a.leave_id) AS total 
        FROM 
            employees e 
        INNER JOIN 
            leaves a ON e.id = a.employee_id
        WHERE 
             e.employee_status=1 and e.status=1 and e.delete_status=0 and a.deletestatus = 0
      `;
            let countParams = [];

            countQuery += ` AND a.employee_id = ?`;
            countParams.push(id);

            db.query(countQuery, countParams, (err, countResults) => {
                if (err) {
                    console.error("Error counting leave records:", err);
                    return res
                        .status(500)
                        .json({ status: false, error: "Error counting leave records" });
                }

                const total = countResults[0]?.total || 0;
                const recordsWithSrnu = results.map((record, index) => ({
                    ...record
                }));

                // Send the response
                res.json({
                    status: true,
                    records: recordsWithSrnu,
                    total,
                    page,
                    limit
                });
            });
        });
    });
});



// new 
const decodeUserData = (userData) => {
    try {
        const decodedString = Buffer.from(userData, "base64").toString("utf-8");
        return JSON.parse(decodedString);
    } catch (error) {
        return null;
    }
};


router.post("/api/leaveApprovalLog", async (req, res) => {
    try {
        let { EmployeeId, userData } = req.body;
        let decodedUserData = null;

        if (userData) {
            decodedUserData = decodeUserData(userData);
            if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
                return res
                    .status(400)
                    .json({
                        status: false,
                        message: "Invalid userData",
                        error: "Invalid userData"
                    });
            }
        } else {
            return res
                .status(400)
                .json({
                    status: false,
                    message: "userData is required",
                    error: "Missing userData"
                });
        }

        // Parse filters

        EmployeeId = EmployeeId || decodedUserData.id;

        // Query to fetch attendance requests
        const query = `
     SELECT 
        l.leave_id,
        l.employee_id, 
        l.company_id, 
        l.rm_status, 
        l.rm_id, 
        l.rm_remark, 
        l.admin_id, 
        l.admin_status, 
        l.admin_remark,   
        l.status, 
        l.reason, 
        l.created,
            l.start_half,
          l.end_half,
      l.leave_type,  
             l.start_date, 
             l.end_date, 
            DATEDIFF( l.end_date,  l.start_date) + 1 AS leave_days,
  
            Emp.employee_id, 
            Emp.first_name, 
            
            Emp.last_name,
            Emp.type, 
            Emp.reporting_manager
    FROM 
        leaves AS l
    INNER JOIN 
        employees AS Emp 
        ON Emp.id = l.employee_id
    WHERE 
        l.employee_id = ? 
        AND (
            -- Case 1: Manager's requests
            l.rm_id = ? 
            -- Case 2: admin/CEO/HR with no RM assigned
            OR (
                EXISTS (
                    SELECT 1 
                    FROM employees 
                    WHERE 
                        id = ? 
                        AND company_id = ? 
                        AND FIND_IN_SET(type, 'admin,ceo,hr') > 0
                ) 
                AND l.rm_id = 0
            )
            
            -- Case 3: Admin/CEO/HR with RM assigned and approved
            OR (
                EXISTS (
                    SELECT 1 
                    FROM employees 
                    WHERE 
                        id = ? 
                        AND company_id = ? 
                        AND FIND_IN_SET(type, 'admin,ceo,hr') > 0
                ) 
                AND l.rm_id != 0 
                AND l.rm_status = 1
            )
        )
    ORDER BY 
        l.leave_id DESC;
  `;

        const queryParams = [
            EmployeeId,
            decodedUserData.id,
            decodedUserData.id,
            decodedUserData.company_id,
            decodedUserData.id,
            decodedUserData.company_id
        ];

        // Execute the query
        const [results] = await db.promise().query(query, queryParams);

        // Count total records for pagination
        const countQuery =
            "SELECT COUNT(leave_id) AS total FROM leaves WHERE 1 = 1";
        const [countResults] = await db.promise().query(countQuery);

        const total = countResults[0]?.total || 0;

        // Add serial number (srnu) to each result
        const requestsWithSrnu = results.map((request, index) => ({
            srnu: index + 1,
            ...request
        }));

        res.json({
            status: true,
            requests: requestsWithSrnu,
            total
        });
    } catch (err) {
        console.error("Error fetching attendance approval log:", err);
        res
            .status(500)
            .json({ status: false, error: "Server error", message: err.message });
    }
});




// admin api 

router.post("/api/Review", async (req, res) => {
    try {
        let { EmployeeId, userData, Search, StartDate, EndDate, LeaveType } = req.body;

        const limit = parseInt(req.body.limit, 10) || 10;
        const page = parseInt(req.body.page, 10) || 1;
        const offset = (page - 1) * limit;

        let decodedUserData = null;
        if (userData) {
            decodedUserData = decodeUserData(userData);
            if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
                return res
                    .status(400)
                    .json({
                        status: false,
                        message: "Invalid userData",
                        error: "Invalid userData"
                    });
            }
        } else {
            return res
                .status(400)
                .json({
                    status: false,
                    message: "userData is required",
                    error: "Missing userData"
                });
        }

        // Parse filters
        EmployeeId = EmployeeId || decodedUserData.id;

        // Query to fetch attendance requests
        let query = `
     SELECT 
        l.leave_id,
        l.employee_id, 
        l.company_id, 
        l.rm_status, 
        l.rm_id, 
        l.rm_remark, 
        l.admin_id, 
        l.admin_status, 
        l.admin_remark,   
        l.status, 
        l.reason, 
        l.created,
        l.leave_type,  
        l.start_date, 
        l.end_date, 
          l.start_half,
          l.end_half,
        DATEDIFF(l.end_date, l.start_date) + 1 AS leave_days,
        Emp.employee_id, Emp.first_name,
        Emp.last_name,
        Emp.type, 
        Emp.reporting_manager
    FROM 
        leaves AS l
    INNER JOIN 
        employees AS Emp 
        ON Emp.id = l.employee_id
    WHERE l.company_id=? and l.admin_status = 0 AND rm_status = 0 AND (
            -- Case 1: Manager's requests
            l.rm_id = ? 
            -- Case 2: admin/CEO/HR with no RM assigned
            OR (
                EXISTS (
                    SELECT 1 
                    FROM employees 
                    WHERE 
                        id = ? 
                        AND company_id = ? 
                        AND FIND_IN_SET(type, 'admin,ceo,hr') > 0
                ) 
                AND l.rm_id = 0
            )
            -- Case 3: Admin/CEO/HR with RM assigned and approved
            OR (
                EXISTS (
                    SELECT 1 
                    FROM employees 
                    WHERE 
                        id = ? 
                        AND company_id = ? 
                        AND FIND_IN_SET(type, 'admin,ceo,hr') > 0
                ) 
                AND l.rm_id != 0 
                AND l.rm_status = 1
            )
               OR (l.employee_id = ? AND l.admin_status = 0  )
        )
  `;

        let queryParams = [
            decodedUserData.company_id,
            decodedUserData.id,
            decodedUserData.id,
            decodedUserData.company_id,
            decodedUserData.id,
            decodedUserData.company_id,
            decodedUserData.id
        ];

        // Apply filters for search, start date, end date, and leave type
        if (StartDate) {
            query += ` AND l.start_date >= ?`;
            queryParams.push(StartDate);
        }
        if (EndDate) {
            query += ` AND l.end_date <= ?`;
            queryParams.push(EndDate);
        }
        if (LeaveType) {
            query += ` AND l.leave_rule_id = ?`;
            queryParams.push(LeaveType);
        }
        if (Search) {
            query += ` AND (Emp.first_name LIKE ? OR Emp.last_name LIKE ?)`;
            queryParams.push(`%${Search}%`, `%${Search}%`);
        }

        // Pagination
        query += ` ORDER BY l.leave_id DESC LIMIT ? OFFSET ?`;
        queryParams.push(limit, offset);

        // Execute the query to get results
        const [results] = await db.promise().query(query, queryParams);

        // Count query for total number of records
        let countQuery = `
            SELECT COUNT(leave_id) AS total 
            FROM leaves AS l 
              INNER JOIN 
        employees AS Emp 
        ON Emp.id = l.employee_id
            WHERE l.company_id=?
            AND (
                l.rm_id = ? And l.admin_status = 0 AND l.rm_status = 0
                OR (
                    EXISTS (
                        SELECT 1 
                        FROM employees 
                        WHERE 
                            id = ? 
                            AND company_id = ? 
                            AND FIND_IN_SET(type, 'admin,ceo,hr') > 0
                    ) 
                    AND l.rm_id = 0
                )
                OR (
                    EXISTS (
                        SELECT 1 
                        FROM employees 
                        WHERE 
                            id = ? 
                            AND company_id = ? 
                            AND FIND_IN_SET(type, 'admin,ceo,hr') > 0
                    ) 
                    AND l.rm_id != 0 
                    AND l.rm_status = 1
                )
                    OR (l.employee_id = ? AND l.admin_status = 0  )
            )
        `;

        let countQueryParams = [
            decodedUserData.company_id,
            decodedUserData.id,
            decodedUserData.id,
            decodedUserData.company_id,
            decodedUserData.id,
            decodedUserData.company_id, decodedUserData.id,
        ];

        // Apply the same filters to count query
        if (StartDate) {
            countQuery += ` AND l.start_date >= ?`;
            countQueryParams.push(StartDate);
        }
        if (EndDate) {
            countQuery += ` AND l.end_date <= ?`;
            countQueryParams.push(EndDate);
        }
        if (LeaveType) {
            countQuery += ` AND l.leave_rule_id = ?`;
            countQueryParams.push(LeaveType);
        }
        if (Search) {
            countQuery += ` AND (Emp.first_name LIKE ? OR Emp.last_name LIKE ?)`;
            countQueryParams.push(`%${Search}%`, `%${Search}%`);
        }

        // Execute the count query
        const [countResults] = await db.promise().query(countQuery, countQueryParams);

        const total = countResults[0]?.total || 0;

        // Add serial number (srnu) to each result
        const requestsWithSrnu = results.map((request, index) => ({
            srnu: index + 1,
            ...request
        }));

        // Send the response
        res.json({
            status: true,
            requests: requestsWithSrnu,
            total
        });

    } catch (err) {
        console.error("Error fetching attendance approval log:", err);
        res.status(500).json({ status: false, error: "Server error", message: err.message });
    }
});



// Approved //

router.post("/api/Approved", async (req, res) => {

    try {

        let { EmployeeId, userData, Search, StartDate, EndDate, LeaveType } = req.body;

        const limit = parseInt(req.body.limit, 10) || 10;
        const page = parseInt(req.body.page, 10) || 1;
        const offset = (page - 1) * limit;

        let decodedUserData = null;
        if (userData) {
            decodedUserData = decodeUserData(userData);
            if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
                return res
                    .status(400)
                    .json({
                        status: false,
                        message: "Invalid userData",
                        error: "Invalid userData"
                    });
            }
        } else {
            return res
                .status(400)
                .json({
                    status: false,
                    message: "userData is required",
                    error: "Missing userData"
                });
        }

        // Parse filters
        EmployeeId = EmployeeId || decodedUserData.id;

        // Query to fetch attendance requests
        let query = `
     SELECT 
        l.leave_id,
        l.employee_id, 
        l.company_id, 
        l.rm_status, 
        l.rm_id, 
        l.rm_remark, 
        l.admin_id, 
        l.admin_status, 
        l.admin_remark,   
        l.status, 
        l.reason, 
        l.created,
        l.leave_type,  
        l.start_date, 
        l.end_date, 
          l.start_half,
          l.end_half,
        DATEDIFF(l.end_date, l.start_date) + 1 AS leave_days,
        Emp.employee_id, 
        Emp.first_name, 
        Emp.last_name,
        Emp.type, 
        Emp.reporting_manager
    FROM 
        leaves AS l
    INNER JOIN 
        employees AS Emp 
        ON Emp.id = l.employee_id
    WHERE l.company_id=? AND (
            -- Case 1: Manager's requests
            l.rm_id = ?  And l.rm_status=1 
            -- Case 2: admin/CEO/HR with no RM assigned
            OR (
                EXISTS (
                    SELECT 1 
                    FROM employees 
                    WHERE 
                        id = ? 
                        AND company_id = ? 
                        AND FIND_IN_SET(type, 'admin,ceo,hr') > 0
                ) 
                AND l.rm_id = 0 And l.admin_status=1 
            )
            -- Case 3: Admin/CEO/HR with RM assigned and approved
            OR (
                EXISTS (
                    SELECT 1 
                    FROM employees 
                    WHERE 
                        id = ? 
                        AND company_id = ? 
                        AND FIND_IN_SET(type, 'admin,ceo,hr') > 0
                ) 
                AND l.rm_id != 0 
                AND l.rm_status = 1 And l.admin_status=1 
            )
                 OR (l.employee_id = ? And l.admin_status=1)
        )
  `;

        let queryParams = [
            decodedUserData.company_id,
            decodedUserData.id,
            decodedUserData.id,
            decodedUserData.company_id,
            decodedUserData.id,
            decodedUserData.company_id,
            decodedUserData.id
        ];

        // Apply filters for search, start date, end date, and leave type
        if (StartDate) {
            query += ` AND l.start_date >= ?`;
            queryParams.push(StartDate);
        }
        if (EndDate) {
            query += ` AND l.end_date <= ?`;
            queryParams.push(EndDate);
        }
        if (LeaveType) {
            query += ` AND l.leave_rule_id = ?`;
            queryParams.push(LeaveType);
        }
        if (Search) {
            query += ` AND (Emp.first_name LIKE ? OR Emp.last_name LIKE ?)`;
            queryParams.push(`%${Search}%`, `%${Search}%`);
        }

        // Pagination
        query += ` ORDER BY l.leave_id DESC LIMIT ? OFFSET ?`;
        queryParams.push(limit, offset);

        // Execute the query to get results
        const [results] = await db.promise().query(query, queryParams);

        // Count query for total number of records
        let countQuery = `
            SELECT COUNT(leave_id) AS total 
            FROM leaves AS l 
              INNER JOIN 
        employees AS Emp 
        ON Emp.id = l.employee_id
            WHERE l.company_id=?
            AND (
                l.rm_id = ? And l.rm_status=1 
                OR (
                    EXISTS (
                        SELECT 1 
                        FROM employees 
                        WHERE 
                            id = ? 
                            AND company_id = ? 
                            AND FIND_IN_SET(type, 'admin,ceo,hr') > 0
                    ) 
                    AND l.rm_id = 0  And l.admin_status=1 
                )
                OR (
                    EXISTS (
                        SELECT 1 
                        FROM employees 
                        WHERE 
                            id = ? 
                            AND company_id = ? 
                            AND FIND_IN_SET(type, 'admin,ceo,hr') > 0
                    ) 
                    AND l.rm_id != 0 
                    AND l.rm_status = 1 And l.admin_status=1 
                )
                                  OR (l.employee_id = ? And l.admin_status=1)

            )
        `;

        let countQueryParams = [
            decodedUserData.company_id,
            decodedUserData.id,
            decodedUserData.id,
            decodedUserData.company_id,
            decodedUserData.id,
            decodedUserData.company_id,
            decodedUserData.id
        ];

        // Apply the same filters to count query
        if (StartDate) {
            countQuery += ` AND l.start_date >= ?`;
            countQueryParams.push(StartDate);
        }
        if (EndDate) {
            countQuery += ` AND l.end_date <= ?`;
            countQueryParams.push(EndDate);
        }
        if (LeaveType) {
            countQuery += ` AND l.leave_rule_id = ?`;
            countQueryParams.push(LeaveType);
        }
        if (Search) {
            countQuery += ` AND (Emp.first_name LIKE ? OR Emp.last_name LIKE ?)`;
            countQueryParams.push(`%${Search}%`, `%${Search}%`);
        }

        // Execute the count query
        const [countResults] = await db.promise().query(countQuery, countQueryParams);

        const total = countResults[0]?.total || 0;

        // Add serial number (srnu) to each result
        const requestsWithSrnu = results.map((request, index) => ({
            srnu: index + 1,
            ...request
        }));

        // Send the response
        res.json({
            status: true,
            requests: requestsWithSrnu,
            total
        });

    } catch (err) {
        console.error("Error fetching attendance approval log:", err);
        res.status(500).json({ status: false, error: "Server error", message: err.message });
    }
});



// Rejected //

router.post("/api/Rejected", async (req, res) => {

    try {

        let { EmployeeId, userData, Search, StartDate, EndDate, LeaveType } = req.body;

        const limit = parseInt(req.body.limit, 10) || 10;
        const page = parseInt(req.body.page, 10) || 1;
        const offset = (page - 1) * limit;

        let decodedUserData = null;
        if (userData) {
            decodedUserData = decodeUserData(userData);
            if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
                return res
                    .status(400)
                    .json({
                        status: false,
                        message: "Invalid userData",
                        error: "Invalid userData"
                    });
            }
        } else {
            return res
                .status(400)
                .json({
                    status: false,
                    message: "userData is required",
                    error: "Missing userData"
                });
        }

        // Parse filters
        EmployeeId = EmployeeId || decodedUserData.id;

        // Query to fetch attendance requests
        let query = `
     SELECT 
        l.leave_id,
        l.employee_id, 
        l.company_id, 
        l.rm_status, 
        l.rm_id, 
        l.rm_remark, 
        l.admin_id, 
        l.admin_status, 
        l.admin_remark,   
        l.status, 
        l.reason, 
        l.created,
        l.leave_type,  
        l.start_date, 
        l.end_date, 
          l.start_half,
          l.end_half,
        DATEDIFF(l.end_date, l.start_date) + 1 AS leave_days,
        Emp.employee_id, 
        Emp.first_name, 
        Emp.last_name,
        Emp.type, 
        Emp.reporting_manager
    FROM 
        leaves AS l
    INNER JOIN 
        employees AS Emp 
        ON Emp.id = l.employee_id
    WHERE l.company_id=? AND (
            -- Case 1: Manager's requests
            l.rm_id = ?  And l.rm_status=2 
            -- Case 2: admin/CEO/HR with no RM assigned
            OR (
                EXISTS (
                    SELECT 1 
                    FROM employees 
                    WHERE 
                        id = ? 
                        AND company_id = ? 
                        AND FIND_IN_SET(type, 'admin,ceo,hr') > 0
                ) 
                AND l.rm_id = 0 And l.admin_status=2 
            )
            -- Case 3: Admin/CEO/HR with RM assigned and approved
            OR (
                EXISTS (
                    SELECT 1 
                    FROM employees 
                    WHERE 
                        id = ? 
                        AND company_id = ? 
                        AND FIND_IN_SET(type, 'admin,ceo,hr') > 0
                ) 
                AND l.rm_id != 0 
                AND l.rm_status = 1 And l.admin_status=2
            )
                    OR (l.employee_id = ? And l.admin_status=2)
        )
  `;

        let queryParams = [
            decodedUserData.company_id,
            decodedUserData.id,
            decodedUserData.id,
            decodedUserData.company_id,
            decodedUserData.id,
            decodedUserData.company_id,
            decodedUserData.id
        ];

        // Apply filters for search, start date, end date, and leave type
        if (StartDate) {
            query += ` AND l.start_date >= ?`;
            queryParams.push(StartDate);
        }
        if (EndDate) {
            query += ` AND l.end_date <= ?`;
            queryParams.push(EndDate);
        }
        if (LeaveType) {
            query += ` AND l.leave_rule_id = ?`;
            queryParams.push(LeaveType);
        }
        if (Search) {
            query += ` AND (Emp.first_name LIKE ? OR Emp.last_name LIKE ?)`;
            queryParams.push(`%${Search}%`, `%${Search}%`);
        }

        // Pagination
        query += ` ORDER BY l.leave_id DESC LIMIT ? OFFSET ?`;
        queryParams.push(limit, offset);

        // Execute the query to get results
        const [results] = await db.promise().query(query, queryParams);

        // Count query for total number of records
        let countQuery = `
            SELECT COUNT(leave_id) AS total 
            FROM leaves AS l 
              INNER JOIN 
        employees AS Emp 
        ON Emp.id = l.employee_id
            WHERE l.company_id=?
            AND (
                l.rm_id = ? And l.rm_status=2
                OR (
                    EXISTS (
                        SELECT 1 
                        FROM employees 
                        WHERE 
                            id = ? 
                            AND company_id = ? 
                            AND FIND_IN_SET(type, 'admin,ceo,hr') > 0
                    ) 
                    AND l.rm_id = 0  And l.admin_status=2
                )
                OR (
                    EXISTS (
                        SELECT 1 
                        FROM employees 
                        WHERE 
                            id = ? 
                            AND company_id = ? 
                            AND FIND_IN_SET(type, 'admin,ceo,hr') > 0
                    ) 
                    AND l.rm_id != 0 
                    AND l.rm_status = 1 And l.admin_status=2
                )
                      OR (l.employee_id = ? And l.admin_status=2)
            )
        `;

        let countQueryParams = [
            decodedUserData.company_id,
            decodedUserData.id,
            decodedUserData.id,
            decodedUserData.company_id,
            decodedUserData.id,
            decodedUserData.company_id,
            decodedUserData.id
        ];

        // Apply the same filters to count query
        if (StartDate) {
            countQuery += ` AND l.start_date >= ?`;
            countQueryParams.push(StartDate);
        }
        if (EndDate) {
            countQuery += ` AND l.end_date <= ?`;
            countQueryParams.push(EndDate);
        }
        if (LeaveType) {
            countQuery += ` AND l.leave_rule_id = ?`;
            countQueryParams.push(LeaveType);
        }
        if (Search) {
            countQuery += ` AND (Emp.first_name LIKE ? OR Emp.last_name LIKE ?)`;
            countQueryParams.push(`%${Search}%`, `%${Search}%`);
        }

        // Execute the count query
        const [countResults] = await db.promise().query(countQuery, countQueryParams);

        const total = countResults[0]?.total || 0;

        // Add serial number (srnu) to each result
        const requestsWithSrnu = results.map((request, index) => ({
            srnu: index + 1,
            ...request
        }));

        // Send the response
        res.json({
            status: true,
            requests: requestsWithSrnu,
            total
        });

    } catch (err) {
        console.error("Error fetching attendance approval log:", err);
        res.status(500).json({ status: false, error: "Server error", message: err.message });
    }
});


module.exports = router;
