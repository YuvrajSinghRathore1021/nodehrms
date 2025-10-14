const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');
// EmployeeLocation
// //working for company
// router.post('/EmployeeLocationGet', (req, res) => {
//   const { userData } = req.body;
//   let decodedUserData = null;

//   if (userData) {
//     try {
//       const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
//       decodedUserData = JSON.parse(decodedString);
//     } catch (error) {
//       return res.status(400).json({ status: false, error: 'Invalid userData' });
//     }
//   }
//   if (!decodedUserData || !decodedUserData.company_id || !decodedUserData.id) {
//     return res.status(400).json({ status: false, error: 'company_id, id are required' });
//   }

//   db.query(`SELECT l.id,e.profile_image,l.employee_id,CONCAT(e.first_name,' ',e.last_name) as name,  l.latitude, l.longitude, l.timestamp FROM locations l INNER JOIN employees e ON e.id=l.employee_id WHERE l.company_id=? And l.type=1`,
//     [decodedUserData.company_id],
//     (err, results) => {
//       if (err) {
//         return res.status(500).json({
//           status: false,
//           message: 'Database error.',
//           error: err
//         });
//       }
//       return res.status(200).json({
//         status: true,
//         message: 'Data Fatch successfully.',
//         data: results
//       });

//     });
// });

router.post('/EmployeeLocationGet', (req, res) => {
  const { userData, searchData = "", departmentId = 0, subDepartmentid = 0 } = req.body;
  let decodedUserData = null;

  if (userData) {
    try {
      const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({ status: false, error: 'Invalid userData' });
    }
  }

  if (!decodedUserData || !decodedUserData.company_id || !decodedUserData.id) {
    return res.status(400).json({ status: false, error: 'company_id and id are required' });
  }

  const { company_id, id: viewer_id } = decodedUserData;

  const permissionSql = `SELECT target_id FROM location_permissions WHERE company_id = ? AND viewer_id = ? AND can_view = 1`;

  db.query(permissionSql, [company_id, viewer_id], (err, permissionResults) => {
    if (err) {
      return res.status(500).json({ status: false, message: 'Permission fetch error', error: err });
    }

    const targetIds = permissionResults.map(row => row.target_id);
    if (targetIds.length === 0) {
      return res.status(200).json({ status: true, data: [] }); // No allowed targets
    }
    const placeholders = targetIds.join(',');
    let locationSql = `
          SELECT l.id, e.profile_image, l.employee_id,
              CONCAT(e.first_name, ' ', e.last_name) AS name,
              l.latitude, l.longitude, l.timestamp 
          FROM locations l
          INNER JOIN employees e ON e.id = l.employee_id
          WHERE e.employee_status=1 and e.status=1 and e.delete_status=0 and l.company_id = ? AND l.type = 1 AND l.employee_id IN (${placeholders})
      `;
    let queryParams = [company_id];
    if (searchData) {
      locationSql += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? Or e.employee_id LIKE ?)`;
      queryParams.push(`%${searchData}%`, `%${searchData}%`, `%${searchData}%`);
    }

    // Department and Employee Status Filters
    if (departmentId && departmentId != 0) {
      locationSql += ` AND e.department = ?`;
      queryParams.push(departmentId);
    }
    if (subDepartmentid && subDepartmentid != 0) {
      locationSql += ` AND e.sub_department = ?`;
      queryParams.push(subDepartmentid);
    }
    // name order by as 
    locationSql += ` ORDER BY e.first_name ASC`;

    db.query(locationSql, queryParams, (err, results) => {
      if (err) {
        return res.status(500).json({ status: false, message: 'Location fetch error', error: err });
      }

      return res.status(200).json({
        status: true,
        message: 'Location data fetched successfully',
        data: results
      });

    });
  });
});


router.post('/EmployeeGet', (req, res) => {
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
  if (!decodedUserData || !decodedUserData.company_id || !decodedUserData.id) {
    return res.status(400).json({ status: false, error: 'company_id, id are required' });
  }

  db.query(`SELECT id,CONCAT(first_name,' ',last_name) as name FROM employees WHERE employee_status=1 and status=1 and delete_status=0 and company_id = ?`,
    [decodedUserData.company_id],
    (err, results) => {
      if (err) {
        return res.status(500).json({
          status: false,
          message: 'Database error.',
          error: err
        });
      }
      return res.status(200).json({
        status: true,
        message: 'Data Fatch successfully.',
        data: results
      });

    });
});

router.post('/SubmitLocationPermissions', (req, res) => {
  const { userData, can_view, viewer_id, target_id } = req.body;
  let parsed = JSON.parse(target_id);
  let newTargetId = parsed.join(',');

  let decodedUserData = null;
  if (userData) {
    try {
      const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({ status: false, error: 'Invalid userData' });
    }
  }

  if (!decodedUserData || !decodedUserData.company_id || !decodedUserData.id) {
    return res.status(400).json({ status: false, error: 'company_id and id required' });
  }

  let employee_id = decodedUserData.id;
  let company_id = decodedUserData.company_id;


  const sqlCheck = 'SELECT id FROM location_permissions WHERE viewer_id = ?';
  db.query(sqlCheck, [viewer_id], (err, results) => {
    if (err) return res.status(500).json({ status: false, error: 'DB error', err });


    if (results.length > 0) {
      // Update
      const sqlUpdate = `UPDATE location_permissions SET employee_id=?,target_id=?,can_view=?  WHERE viewer_id = ? And company_id=?`;
      db.query(sqlUpdate, [employee_id, newTargetId, can_view, viewer_id, company_id], (err) => {
        if (err) return res.status(500).json({ status: false, error: 'Update failed', err });

        res.json({ status: true, message: 'Data updated' });
      });
    } else {
      // Insert
      const sqlInsert = `INSERT INTO location_permissions (employee_id, company_id, target_id,can_view,viewer_id) VALUES ( ?, ?, ?, ?, ?)`;
      db.query(sqlInsert, [employee_id, company_id, newTargetId, can_view, viewer_id], (err) => {
        if (err) return res.status(500).json({ status: false, error: 'Insert failed', err });
        res.json({ status: true, message: 'Data inserted' });
      });
    }
  });
});

router.get('/api/FetchLocationPermissions', async (req, res) => {
  const { userData } = req.query;
  let decodedUserData = null;

  if (userData) {
    try {
      const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({ status: false, error: 'Invalid userData' });
    }
  }

  const limit = parseInt(req.query.limit, 10) || 10;
  const page = parseInt(req.query.page, 10) || 1;
  const offset = (page - 1) * limit;

  if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
    return res.status(400).json({ status: false, error: 'Employee ID is required' });
  }

  const query = `
    SELECT lp.id, lp.employee_id, lp.company_id, lp.viewer_id, lp.target_id, lp.can_view,
           CONCAT(e1.first_name, ' ', e1.last_name) AS PermactionBy,
           CONCAT(e2.first_name, ' ', e2.last_name) AS ViewerBy
    FROM location_permissions AS lp
    LEFT JOIN employees AS e1 ON lp.employee_id = e1.id
    LEFT JOIN employees AS e2 ON lp.viewer_id = e2.id
    WHERE lp.company_id = ? and e1.employee_status=1 and e1.status=1 and e1.delete_status=0 and e2.employee_status=1 and e2.status=1 and e2.delete_status=0
    ORDER BY lp.id DESC
    LIMIT ? OFFSET ?
  `;
  const queryParams = [decodedUserData.company_id, limit, offset];

  db.query(query, queryParams, async (err, results) => {
    if (err) {
      console.error('Error fetching location permissions:', err);
      return res.status(500).json({ status: false, error: 'Server error' });
    }

    // Fetch all employees once for mapping target IDs
    db.query('SELECT id, CONCAT(first_name, " ", last_name) AS full_name FROM employees WHERE company_id = ? and employee_status=1 and status=1 and delete_status=0', [decodedUserData.company_id], (empErr, employees) => {
      if (empErr) {
        return res.status(500).json({ status: false, error: 'Error fetching employee names' });
      }

      const employeeMap = {};
      employees.forEach(emp => {
        employeeMap[emp.id] = emp.full_name;
      });

      const dataWithDetails = results.map((row, index) => {
        const targetIds = row.target_id ? row.target_id.split(',').map(id => parseInt(id)) : [];
        const targetEmployee = targetIds.map(id => employeeMap[id]).filter(Boolean);

        return {
          srnu: offset + index + 1,
          ...row,
          targetEmployee,
        };
      });

      // Get total count
      db.query('SELECT COUNT(id) AS total FROM location_permissions WHERE company_id = ? ', [decodedUserData.company_id], (countErr, countResults) => {
        if (countErr) {
          return res.status(500).json({ status: false, error: 'Server error' });
        }

        res.json({
          status: true,
          data: dataWithDetails,
          message: 'Data fetched successfully',
          total: countResults[0].total,
          page,
          limit
        });
      });
    });
  });
});


// get Location 
router.post('/Get', async (req, res) => {
  const { userData, type = 'in', startDate, endDate, employeeId } = req.body;
  let decodedUserData = null;
  if (userData) {
    try {
      const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({ status: false, error: 'Invalid userData' });
    }
  }

  if (!decodedUserData || !decodedUserData.company_id || !decodedUserData.id) {
    return res.status(400).json({ status: false, error: 'company_id and id are required' });
  }

  try {
    const companyId = decodedUserData.company_id;

    // Validate type
    const locationField = type === 'out' ?
      '`out_latitude`, `out_longitude`, `check_out_time`, `attendance_date`' :
      '`in_latitude`, `in_longitude`, `check_in_time`, `attendance_date`';

    let whereClause = `WHERE company_id = ?`;
    const params = [companyId];

    if (employeeId) {
      whereClause += ` AND employee_id = ?`;
      params.push(employeeId);
    }

    if (startDate && endDate) {
      whereClause += ` AND DATE(attendance_date) BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    const [dataGet] = await db.promise().query(
      `SELECT attendance_id, employee_id, ${locationField} FROM attendance ${whereClause}`,
      params
    );

    res.json({
      status: true,
      message: 'Data fetched successfully',
      data: dataGet
    });

  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ status: false, error: 'Server error' });
  }
});


// Export the router
module.exports = router;