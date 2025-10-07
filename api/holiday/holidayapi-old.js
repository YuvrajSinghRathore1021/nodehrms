const express = require("express");
const router = express.Router();
const db = require("../../DB/ConnectionSql");

router.post("/holiday", (req, res) => {
  const { date, holiday, userData } = req.body;
  // Check for missing fields
  if (!date || !holiday) {
    return res.status(400).json({ status: false, message: "Date and holiday are required." });
  }

  let decodedUserData = null;

  if (userData) {
    try {
      const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({ status: false, error: 'Invalid userData' });
    }
  }

  if (!decodedUserData.company_id) {
    return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
  }


  // Apply Holiday query
  db.query(
    "INSERT INTO holiday(employee_id,date, holiday,company_id) VALUES(?,?, ?,?)",
    [decodedUserData.id, date, holiday, decodedUserData.company_id],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(200).json({
          message: "Error creating leave record.",
          error: err.message
        });
      }
      res
        .status(200)
        .json({ status: true, message: "Data inserted successfully.", id: results.insertId });
    }
  );
});

// Holiday Update

router.post("/HolidayUpdate", (req, res) => {
  const { id, holiday, date, userData } = req.body;
  // Validate input
  if (!id) {
    return res.status(400).json({ status: false, message: "ID is required to update holiday." });
  }

  let decodedUserData = null;
  if (userData) {
    try {
      const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({ status: false, error: 'Invalid userData' });
    }
  }

  if (!decodedUserData.company_id) {
    return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
  }

  db.query("UPDATE holiday SET holiday = ?, date = ? WHERE id = ? AND company_id=?", [holiday, date, id, decodedUserData.company_id], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        status: false,
        message: "Error updating holiday.",
        error: err.message
      });
    }
    if (results.affectedRows === 0) {
      return res
        .status(404)
        .json({
          status: false,
          message: "Holiday not found or no changes made."
        });
    }
    res
      .status(200)
      .json({ status: true, message: "Holiday updated successfully." });
  }
  );
});

// HoliDay Delete
router.post("/holidaydelete", (req, res) => {
  const { id, userData } = req.body;
  if (!id) {
    return res.status(200).json({ status: false, message: "ID is required." });
  }
  let decodedUserData = null;

  if (userData) {
    try {
      const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({ status: false, error: 'Invalid userData' });
    }
  }

  if (!decodedUserData.company_id) {
    return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
  }
  db.query("DELETE FROM holiday WHERE id = ? AND company_id=?", [id, decodedUserData.company_id], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res
        .status(200)
        .json({ status: false, message: "Error deleting holiday.", error: err.message });
    }
    if (results.affectedRows > 0) {
      return res.status(200).json({ status: true, message: "Holiday deleted successfully." });
    } else {
      return res.status(200).json({ status: false, message: "Holiday not found." });
    }
  });
});

router.get("/holidayfetch", (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const page = parseInt(req.query.page, 10) || 1;
  const offset = (page - 1) * limit;

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

  if (!decodedUserData.company_id) {
    return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
  }
  const holidayQuery = `
        SELECT * FROM holiday WHERE company_id=? LIMIT ? OFFSET ?
    `;

  db.query(holidayQuery, [decodedUserData.company_id, limit, offset], (err, results) => {
    if (err) {
      console.error("Error fetching holiday records:", err);
      return res.status(500).json({ status: false, error: "Server error" });
    }
    const countQuery = `
            SELECT COUNT(id) as total FROM holiday WHERE company_id=?
        `;
    db.query(countQuery, [decodedUserData.company_id], (countErr, countResults) => {
      if (countErr) {
        console.error("Error fetching total holiday records:", countErr);
        return res.status(500).json({ status: false, error: "Server error" });
      }
      const total = countResults[0].total;
      const recordsWithSrnu = results.map((record, index) => ({
        srnu: offset + index + 1,
        ...record
      }));
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


router.get("/HolidayCalender", (req, res) => {
  const { userData, data } = req.query;
  let currentMonth = null;
  let currentYear = null;

  // Assuming 'data' is not declared here, it seems like it was supposed to be 'decodedUserData'
  if (data) {
    currentMonth = data['currentMonth'] ? Number(data['currentMonth']) + 1 : null;
    currentYear = data['currentYear'] ? data['currentYear'] : null;
  }

  // console.log(currentMonth);
  let decodedUserData = null;
  if (userData) {
    try {
      const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({ status: false, error: 'Invalid userData' });
    }
  }

  if (!decodedUserData.company_id) {
    return res.status(400).json({ status: false, error: 'Company ID is missing or invalid' });
  }

  let query = "SELECT holiday, date FROM holiday WHERE company_id=? AND status=1";
  let queryData = [decodedUserData.company_id];

  if (currentMonth && currentYear) {
    // Constructing the date filter condition for a specific month and year
    query += ' AND MONTH(date) = ? AND YEAR(date) = ?';
    queryData.push(currentMonth);
    queryData.push(currentYear);
  }

  db.query(query, queryData, (err, results) => {
    if (err) {
      console.error("Database Error:", err);
      return res.status(500).json({
        status: false,
        message: "Error fetching holiday status.",
        error: err.message
      });
    }

    if (results.length === 0) {
      return res.status(200).json({
        status: true,
        message: "No holidays found.",
        data: []
      });
    }

    return res.status(200).json({
      status: true,
      message: "Holiday details fetched successfully.",
      data: results
    });
  });
});

router.post("/HolidayUpdateStatus", (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(200).json({ status: false, message: "ID is required." });
  }

  db.query("SELECT status FROM holiday WHERE id = ?", [id], (err, results) => {
    if (err) {
      return res
        .status(200)
        .json({
          status: false,
          message: "Error fetching holiday status.",
          error: err.message
        });
    }
    if (results.length === 0) {
      return res
        .status(404)
        .json({ status: false, message: "Holiday not found." });
    }
    const newStatus = results[0].status === 1 ? 0 : 1;
    db.query(
      "UPDATE holiday SET status = ? WHERE id = ?",
      [newStatus, id],
      (err, updateResults) => {
        if (err) {
          return res
            .status(200)
            .json({
              status: false,
              message: "Error updating holiday status.",
              error: err.message
            });
        }

        if (updateResults.affectedRows === 0) {
          return res
            .status(200)
            .json({
              status: false,
              message: "Holiday not found or no changes made."
            });
        }
        res
          .status(200)
          .json({
            status: true,
            message: "Holiday status updated successfully.",
            newStatus
          });
      }
    );
  });
});

module.exports = router;