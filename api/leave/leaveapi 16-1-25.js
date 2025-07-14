const express = require("express");
const router = express.Router();
const db = require("../../DB/ConnectionSql");

///////// leaveapi.js///////////////

router.post("/leave", async (req, res) => {
  const { leave_type, userData, start_date, end_date, reason } = req.body;

  let decodedUserData = null;
  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({ status: false, error: "Invalid userData" });
    }
  } else {
    return res.status(400).json({ status: false, error: "Missing userData" });
  }

  try {
    let RmIdValue = 0;
    // Step 1: Get the reporting manager ID if multi_level_approve is enabled
    const [settingResult] = await db.promise().query("SELECT multi_level_approve FROM settings WHERE type=? and company_id = ?", ['Leave_setting', decodedUserData.company_id]);

    if (settingResult.length > 0) {
      const multiLeaveApprove = settingResult[0].multi_level_approve;
      if (multiLeaveApprove === 1) {
        const [managerResults] = await db
          .promise()
          .query(
            "SELECT reporting_manager FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 and id = ? AND company_id = ?",
            [decodedUserData.id, decodedUserData.company_id]
          );
        if (managerResults.length === 0) {
          return res.status(200).json({
            status: false,
            error: "Employee not found",
            message: "Invalid employee ID or company ID"
          });
        }
        RmIdValue = managerResults[0].reporting_manager || 0;
      }
    }
    // Step 2: Insert leave record into the database
    const [insertResult] = await db
      .promise()
      .query(
        "INSERT INTO leaves (company_id,employee_id, leave_type, start_date, end_date, status, reason,rm_id) VALUES (?,?, ?, ?, ?, ?, ?,?)",
        [decodedUserData.company_id, decodedUserData.id, leave_type, start_date, end_date, 1, reason, RmIdValue]
      );
    return res.status(200).json({
      status: true,
      message: "Data inserted successfully.",
      id: insertResult.insertId
    });
  } catch (error) {
    console.error("Error processing leave request:", error);
    return res.status(200).json({
      status: false,
      message: "Internal server error",
      error: error.message
    });
  }
});



router.get("/fetchleave", (req, res) => {
  const { userData } = req.query;
  let decodedUserData = null;

  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      console.error("Error decoding userData:", error);
      return res.status(400).json({ status: false, error: "Invalid userData format" });
    }
  }

  if (!decodedUserData) {
    return res.status(400).json({ status: false, error: "User data is required" });
  }

  const { id } = decodedUserData;
  const limit = parseInt(req.query.limit, 10) || 10;
  const page = parseInt(req.query.page, 10) || 1;
  const offset = (page - 1) * limit;

  // Fetch the reporting manager of the employee (if required)
  const query = `
    SELECT reporting_manager
    FROM employees
    WHERE  employee_status=1 and status=1 and delete_status=0 and id = ? 
  `;
  const queryParams = [id];
  db.query(query, queryParams, (err, result) => {
    if (err) {
      console.error("Error fetching reporting manager:", err);
      return res.status(500).json({ status: false, error: "Error fetching reporting manager" });
    }
    if (!result || result.length === 0) {
      return res.status(404).json({ status: false, error: "Employee not found" });
    }
    const reportingManagerId = result[0].reporting_manager;
    // Fetch leave records based on the role and reporting manager
    let leaveQuery = `
      SELECT 
          e.employee_id, 
          e.first_name, 
          e.last_name,
          e.type, 
          e.reporting_manager,
          a.leave_type, 
          a.status, 
          a.start_date, 
          a.end_date, 
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

    db.query(leaveQuery, leaveQueryParams, (err, results) => {
      if (err) {
        console.error("Error fetching leave records:", err);
        return res.status(500).json({ status: false, error: "Error fetching leave records" });
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
          return res.status(500).json({ status: false, error: "Error counting leave records" });
        }

        const total = countResults[0]?.total || 0;
        const recordsWithSrnu = results.map((record, index) => ({
          ...record,
        }));

        // Send the response
        res.json({
          status: true,
          records: recordsWithSrnu,
          total,
          page,
          limit,
        });
      });
    });
  });
});


///////////  Soft Delete ////////////////

router.post("/delete", (req, res) => {
  const { leave_id } = req.body;
  if (!leave_id) {
    return res.status(200).json({ message: "Leave ID is required." });
  }
  db.query(
    "UPDATE leaves SET deletestatus = 1 WHERE leave_id = ?",
    [leave_id],
    (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(200).json({
          status: false,
          message: "Error updating leave.",
          error: err.message
        });
      }
      if (results.affectedRows === 0) {
        return res.status(200).json({
          status: false,
          message: "Leave not found or no changes made."
        });
      }
      return res.status(200).json({ status: true, message: "Data deleted successfully" });
    }
  );
});

///////  Fetch Leave Request Data //////////
router.post("/LeaveRequest", async (req, res) => {
  const { leave_id } = req.body;
  if (!leave_id) {
    return res.status(200).json({
      status: false,
      message: "Leave ID is required"
    });
  }
  const query = `
    SELECT 
      l.leave_id, 
      l.leave_type, 
      l.start_date, 
      l.end_date, 
      l.status,
      l.rm_id,
      l.rm_remark,
      l.rm_status,
      l.admin_id,
      l.admin_status,
      l.admin_remark,
      DATEDIFF(l.end_date, l.start_date) + 1 AS leave_days,  -- Calculating leave days
      l.reason, 
      e.id,
      e.first_name AS employee_first_name, 
      e.last_name AS employee_last_name, 
      e.designation, 
      d.name AS department, 
      sd.name AS sub_department,  
      CONCAT(e.first_name, ' ', e.last_name) AS applied_by,
      a.first_name AS admin_first_name, 
      a.last_name AS admin_last_name,
      CONCAT(a.first_name, ' ', a.last_name) AS approved_by,
      l.created
    FROM 
      leaves AS l
    INNER JOIN 
      employees AS e ON l.employee_id = e.id -- Employee who applied for the leave
    LEFT JOIN 
      employees AS a ON l.admin_id = a.id -- Admin who approved the leave
    LEFT JOIN 
      departments AS d ON e.department = d.id
    LEFT JOIN 
      departments AS sd ON e.sub_department = sd.id
    WHERE 
      l.leave_id = ?`;

  const queryParams = [leave_id];

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching leave records:", err);
      return res.status(200).json({
        status: false,
        error: "Error fetching leave records"
      });
    }

    const recordsWithSrnu = results.map((record, index) => ({
      srnu: index + 1,
      ...record
    }));

    res.json({
      status: true,
      records: recordsWithSrnu
    });
  });
});

//////////// Fetch leaveTypes ////////////

router.post("/FetchLeaveType", (req, res) => {
  const { userData } = req.body;
  if (!userData) {
    return res.status(200).json({ status: false, error: "Missing UserData" });
  }
  let decodedUserData;
  try {
    const decodedString = Buffer.from(userData, "base64").toString("utf-8");
    decodedUserData = JSON.parse(decodedString);
  } catch (error) {
    return res.status(200).json({ status: false, error: "Invalid UserData format" });
  }
  const employeeId = decodedUserData.id;
  if (!employeeId) {
    return res.status(200).json({ status: false, error: "Employee ID is missing" });
  }
  // Query to fetch employee leave_rule_id
  const fetchLeaveRuleIdsQuery = `
    SELECT leave_rule_id 
    FROM employees 
    WHERE  employee_status=1 and status=1 and delete_status=0 and id = ?`;
  db.query(fetchLeaveRuleIdsQuery, [employeeId], (err, employeeResult) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(200).json({ status: false, error: "Database query failed" });
    }
    if (employeeResult.length === 0 || !employeeResult[0].leave_rule_id) {
      return res.status(200).json({
        status: false,
        error: "Employee not found or no leave rules assigned"
      });
    }

    if (!employeeResult[0].leave_rule_id || employeeResult[0].leave_rule_id == '' || employeeResult[0].leave_rule_id == 0) {
      return res.status(200).json({
        status: false,
        error: "no leave rules assigned"
      });
    }

    // Ensure leave_rule_id is always treated as an array
    let leaveRuleIds;
    if (typeof employeeResult[0].leave_rule_id === "string") {
      leaveRuleIds = employeeResult[0].leave_rule_id.split(",");
    } else {
      leaveRuleIds = [employeeResult[0].leave_rule_id.toString()];
    }

    // Query to fetch leave types
    const fetchLeaveTypesQuery = `
      SELECT leave_type 
      FROM leave_rules 
      WHERE id IN (?)`;
    db.query(fetchLeaveTypesQuery, [leaveRuleIds], (err, leaveTypesResult) => {
      if (err) {
        console.error("Database query error:", err);
        return res
          .status(200)
          .json({ status: false, error: "Database query failed" });
      }
      if (leaveTypesResult.length === 0) {
        return res.status(200).json({
          status: false,
          error: "No leave types found for the given leave rules"
        });
      }
      return res.status(200).json({ status: true, result: leaveTypesResult });
    });
  });
});

///////////// Leave Approve //////////////

router.post("/LeaveApprove", async (req, res) => {
  const {
    employee_id,
    leave_id,
    rm_id,
    rm_remark,
    rm_status,
    admin_id,
    admin_remark,
    admin_status,
    userData
  } = req.body;

  // Validate leave ID
  if (!leave_id) {
    return res.status(400).json({
      status: false,
      message: "Leave ID is required."
    });
  }

  let decodedUserData = null;
  if (userData) {
    try {
      decodedUserData = JSON.parse(
        Buffer.from(userData, "base64").toString("utf-8")
      );
    } catch (error) {
      return res.status(400).json({
        status: false,
        message: "Invalid user data format."
      });
    }
  }

  if (!decodedUserData?.company_id) {
    return res.status(400).json({
      status: false,
      message: "Company ID is missing or invalid in user data."
    });
  }

  const companyId = Number(decodedUserData.company_id);
  if (isNaN(companyId)) {
    return res.status(400).json({
      status: false,
      message: "Company ID must be a valid number."
    });
  }

  let RmIdValue = 0;
  try {
    // Fetch multi-level approval setting
    const [SettingMultiLeaveApprove] = await db
      .promise()
      .query("SELECT multi_level_approve FROM settings WHERE company_id = ?", [
        companyId
      ]);

    if (
      SettingMultiLeaveApprove.length > 0 &&
      SettingMultiLeaveApprove[0].multi_level_approve === 1
    ) {
      if (!employee_id) {
        return res.status(200).json({
          status: false,
          message: "Employee ID is required."
        });
      }

      // Fetch RM ID
      const [managerResults] = await db.promise().query(
        "SELECT reporting_manager FROM employees WHERE  employee_status=1 and status=1 and delete_status=0 and id = ? AND company_id = ?",
        [employee_id, companyId]
      );

      if (managerResults.length === 0) {
        return res.status(200).json({
          status: false,
          message: "Reporting Manager not found for the given Employee ID."
        });
      }

      RmIdValue = managerResults[0].reporting_manager || 0;
    }
  } catch (err) {
    console.error("Error fetching company settings:", err);
    return res.status(200).json({
      status: false,
      message: "Error retrieving approval settings.",
      error: err.message
    });
  }

  try {
    // Verify leave exists
    const [leaveExists] = await db
      .promise()
      .query("SELECT * FROM leaves WHERE leave_id = ?", [leave_id]);

    if (leaveExists.length === 0) {
      return res.status(200).json({
        status: false,
        message: "Leave record not found."
      });
    }

    // RM Approval Handling
    if (rm_id && rm_status !== undefined) {
      const [rmResult] = await db.promise().query(
        `UPDATE leaves 
           SET rm_id = ?, rm_remark = ?, rm_status = ? 
           WHERE leave_id = ?`,
        [rm_id, rm_remark, rm_status, leave_id]
      );

      if (rmResult.affectedRows === 0) {
        return res.status(200).json({
          status: false,
          message: "RM update failed. No changes made."
        });
      }

      const rmActionMessage =
        rm_status === 1
          ? "Leave approved by RM successfully."
          : rm_status === 2
            ? "Leave rejected by RM successfully."
            : "Leave status reset by RM.";

      return res.status(200).json({ status: true, message: rmActionMessage });
    }

    // Admin Approval Handling (if RM approval is not required or already approved)
    if (RmIdValue === 0 || rm_status === 1 || !rm_id) {
      const [adminResult] = await db.promise().query(
        `UPDATE leaves 
           SET admin_id = ?, admin_remark = ?, admin_status = ? 
           WHERE leave_id = ?`,
        [admin_id, admin_remark, admin_status, leave_id]
      );

      if (adminResult.affectedRows === 0) {
        return res.status(200).json({
          status: false,
          message: "Admin update failed. No changes made."
        });
      }

      const adminActionMessage =
        admin_status === 1
          ? "Leave approved by Admin successfully."
          : admin_status === 2
            ? "Leave rejected by Admin successfully."
            : "Leave status reset by Admin.";

      return res.status(200).json({ status: true, message: adminActionMessage });
    }

    // RM approval required
    return res.status(400).json({
      status: false,
      message: "RM approval is required before Admin approval."
    });
  } catch (err) {
    console.error("Error processing leave approval:", err);
    return res.status(500).json({
      status: false,
      message: "Error processing the leave request.",
      error: err.message
    });
  }
});

//////// Leave Cancel //////////////

router.post("/LeaveCancel", (req, res) => {
  const { leave_id, status, userData } = req.body;
  let decodedUserData = null;
  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      console.error("Error decoding userData:", error);
      return res.status(200).json({
        status: false,
        message: "Invalid userData format."
      });
    }
  }
  // Validate leave_id
  if (!leave_id || isNaN(leave_id)) {
    return res.status(200).json({
      status: false,
      message: "Valid leave ID is required."
    });
  }
  // Update the leave record
  db.query(
    "UPDATE leaves SET status = 0 WHERE leave_id = ?",
    [leave_id],
    (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(200).json({
          status: false,
          message: "Error updating leave.",
          error: err.message
        });
      }
      if (result.affectedRows === 0) {
        return res.status(200).json({
          status: false,
          message: "Leave not found or no changes made."
        });
      }
      return res.status(200).json({
        status: true,
        message:
          status === 0
            ? "Leave canceled successfully. Status set to 0."
            : "Status updated to 1."
      });
    }
  );
});


// yuvraj code new 
const decodeUserData = (userData) => {
  try {
    const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
    return JSON.parse(decodedString);
  } catch (error) {
    return null;
  }
};

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

router.get('/api/leaveApprovalLog', async (req, res) => {
  try {
    const { data, userData } = req.query;
    let decodedUserData = null;
    if (userData) {
      decodedUserData = decodeUserData(userData);
      if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, message: 'Invalid userData', error: 'Invalid userData' });
      }
    } else {
      return res.status(400).json({ status: false, message: 'userData is required', error: 'Missing userData' });
    }

    // Parse filters
    let startDate = data?.startDate || formatDate(new Date());
    let endDate = data?.endDate || formatDate(new Date());
    let searchData = data?.searchData || null;
    let EmployeeId = data?.EmployeeId || null;

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
    const countQuery = 'SELECT COUNT(leave_id) AS total FROM leaves WHERE 1 = 1';
    const [countResults] = await db.promise().query(countQuery);

    const total = countResults[0]?.total || 0;

    // Add serial number (srnu) to each result
    const requestsWithSrnu = results.map((request, index) => ({
      srnu: index + 1,
      ...request,
    }));

    res.json({
      status: true,
      requests: requestsWithSrnu,
      total,
    });
  } catch (err) {
    console.error('Error fetching attendance approval log:', err);
    res.status(500).json({ status: false, error: 'Server error', message: err.message });
  }
});


router.post('/api/ChackViewDetails', (req, res) => {
  const { userData, Logid } = req.body;
  let decodedUserData = null;
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
  if (!decodedUserData || !decodedUserData.company_id) {
    return res.status(400).json({
      status: false,
      error: 'ID is required',
      message: 'ID is required'
    });
  }
  const company_id = decodedUserData.company_id;
  if (!company_id) {
    return res.status(400).json({
      status: false,
      error: 'Company ID is missing or invalid',
      message: 'Company ID is missing or invalid'
    });

  }

  const query = `SELECT AR.rm_status,Ar.id, AR.rm_id,AR.employee_id, AR.admin_id, AR.admin_status, AR.request_type,AR.rm_remark,AR.admin_remark, AR.request_date, AR.in_time, AR.out_time, AR.status, AR.reason, AR.created, e.first_name AS employee_first_name, e.employee_id, d.name AS department_name, em.first_name AS Rm FROM attendance_requests AS AR INNER JOIN employees AS e ON e.id = AR.employee_id LEFT JOIN departments AS d ON e.department = d.id LEFT JOIN employees AS em ON e.reporting_manager = em.id WHERE AR.company_id = ? AND AR.id=?`;

  db.query(query, [company_id, Logid], (err, results) => {
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
      data: results[0],
      message: 'Data found successfully'
    });

  });
});



router.post('/api/ApprovalSubmit', async (req, res) => {

  const { userData, ApprovalRequests_id, Type, ApprovalStatus, employee_id, reason } = req.body;
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

  // Validate company_id
  if (!decodedUserData || !decodedUserData.company_id) {
    return res.status(400).json({
      status: false,
      error: 'Company ID is required',
      message: 'Company ID is required'
    });
  }
  const company_id = decodedUserData.company_id;
  let query = '';
  let queryArray = [];
  // Update attendance request
  if (Type == 'Rm') {
    query = `
      UPDATE leaves 
      SET rm_status = ?, rm_remark = ? 
      WHERE leave_id = ? AND company_id = ?`;
    queryArray = [ApprovalStatus, reason, ApprovalRequests_id, company_id];
  } else {
    query = `
      UPDATE leaves 
      SET admin_status = ?, admin_remark = ?, admin_id = ? 
      WHERE leave_id = ? AND company_id = ?`;
    queryArray = [ApprovalStatus, reason, decodedUserData.id, ApprovalRequests_id, company_id];
  }

  try {
    const updateResult = await queryDb(query, queryArray);
    return res.status(200).json({
      status: true,
      message: 'Approval updated successfully',
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'An error occurred while processing the request',
      error: err.message,
    });
  }
});

// Generic function to execute database queries
function queryDb(query, params) {
  return new Promise((resolve, reject) => {
    db.query(query, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

module.exports = router;
