const express = require("express");
const router = express.Router();
const db = require("../../DB/ConnectionSql");


router.post("/holiday", (req, res) => {
  const { date, holiday, userData, holiday_type, half_day_type, status } = req.body;

  if (!date || !holiday) {
    return res
      .status(400)
      .json({ status: false, message: "Date and holiday are required." });
  }
  let decodedUserData = null;
  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({ status: false, message: "Invalid userData format." });
    }
  }

  if (!decodedUserData || !decodedUserData.company_id) {
    return res
      .status(400)
      .json({ status: false, message: "Company ID is missing or invalid." });
  }

  const selectedDate = new Date(date);
  const dayOfWeek = selectedDate.getDay();


  const companyId = decodedUserData.company_id;
  // holiday_type,half_day_type
  db.query(
    `SELECT mon1, tue1, wed1, thu1, fri1, sat1, sun1,
            mon2, tue2, wed2, thu2, fri2, sat2, sun2,
            mon3, tue3, wed3, thu3, fri3, sat3, sun3,
            mon4, tue4, wed4, thu4, fri4, sat4, sun4,
            mon5, tue5, wed5, thu5, fri5, sat5, sun5 
     FROM work_week 
     WHERE company_id = ? LIMIT 1`,
    [companyId],

    (err, workWeekResults) => {
      if (err) {
        console.error("Error querying work_week:", err);
        return res.status(200).json({
          status: false,
          message: "Database error while checking work_week.",
          error: err.message,
        });
      }

      if (!workWeekResults.length) {
        return res.status(200).json({
          status: false,
          message: "Work week data not found for the company.",
        });
      }
      console.log(dayOfWeek);
      const weekNumber = Math.ceil(selectedDate.getDate() / 7);
      const dayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][dayOfWeek];
      const columnKey = `${dayKey}${weekNumber}`;

      const dayStatus = workWeekResults[0][columnKey];
      if (dayStatus === 3) {
        return res.status(200).json({
          status: false,
          message: `Holidays cannot be applied on the selected day: ${date}. It is a work-off day.`,
        });
      }

      db.query(
        "SELECT * FROM holiday WHERE date = ? AND company_id = ?",
        [date, companyId],
        (err, holidayResults) => {
          if (err) {
            console.error("Error querying holidays:", err);
            return res.status(200).json({
              status: false,
              message: "Database error while checking for existing holidays.",
              error: err.message,
            });
          }

          if (holidayResults.length > 0) {
            return res.status(200).json({
              status: false,
              message: "A holiday is already applied for this date.",
            });
          }

          db.query(
            "INSERT INTO holiday (employee_id,date, holiday, company_id,holiday_type,half_day_type,status) VALUES (?,?,?,?,?, ?, ?)",
            [decodedUserData.id, date, holiday, companyId, holiday_type, half_day_type, status],
            (err, insertResult) => {
              if (err) {
                console.error("Error inserting holiday:", err);
                return res.status(200).json({
                  status: false,
                  message: "Error creating holiday record.",
                  error: err.message,
                });
              }

              res.status(200).json({
                status: true,
                message: "Holiday inserted successfully.",
                id: insertResult.insertId,
              });
            }
          );
        }
      );


    }
  );


});

// Holiday Update

router.post("/HolidayUpdate", (req, res) => {
  const { id, holiday, date, userData, holiday_type, half_day_type, status } = req.body;

  // Validate input
  if (!id) {
    return res
      .status(400)
      .json({ status: false, message: "ID is required to update holiday." });
  }
  let decodedUserData = null;

  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({ status: false, error: "Invalid userData" });
    }
  }

  if (!decodedUserData.company_id) {
    return res
      .status(400)
      .json({ status: false, error: "Company ID is missing or invalid" });
  }

  const selectedDate = new Date(date);
  const dayOfWeek = selectedDate.getDay();
  const companyId = decodedUserData.company_id;
  db.query(
    `SELECT mon1, tue1, wed1, thu1, fri1, sat1, sun1,
            mon2, tue2, wed2, thu2, fri2, sat2, sun2,
            mon3, tue3, wed3, thu3, fri3, sat3, sun3,
            mon4, tue4, wed4, thu4, fri4, sat4, sun4,
            mon5, tue5, wed5, thu5, fri5, sat5, sun5 
     FROM work_week 
     WHERE company_id = ? LIMIT 1`,
    [companyId],
    (err, workWeekResults) => {
      if (err) {
        console.error("Error querying work_week:", err);
        return res.status(200).json({
          status: false,
          message: "Database error while checking work_week.",
          error: err.message,
        });
      }

      if (!workWeekResults.length) {
        return res.status(200).json({
          status: false,
          message: "Work week data not found for the company.",
        });
      }
      const weekNumber = Math.ceil(selectedDate.getDate() / 7);
      const dayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][dayOfWeek];
      const columnKey = `${dayKey}${weekNumber}`;

      const dayStatus = workWeekResults[0][columnKey];
      if (dayStatus === 3) {
        return res.status(200).json({
          status: false,
          message: `Holidays cannot be applied on the selected day: ${date}. It is a work-off day.`,
        });
      }

      db.query(
        "SELECT * FROM holiday WHERE date = ? AND company_id = ? and id !=?",
        [date, companyId, id],
        (err, holidayResults) => {
          if (err) {
            console.error("Error querying holidays:", err);
            return res.status(200).json({
              status: false,
              message: "Database error while checking for existing holidays.",
              error: err.message,
            });
          }

          if (holidayResults.length > 0) {
            return res.status(200).json({
              status: false,
              message: "A holiday is already applied for this date.",
            });
          }

          // holiday_type, half_day_type
          db.query(
            "UPDATE holiday SET holiday = ?, date = ?,holiday_type=?, half_day_type=?,status=? WHERE id = ? AND company_id=?",
            [holiday, date, holiday_type, half_day_type, status, id, decodedUserData.company_id],
            (err, results) => {
              if (err) {
                console.error("Database error:", err);
                return res.status(500).json({
                  status: false,
                  message: "Error updating holiday.",
                  error: err.message
                });
              }
              if (results.affectedRows === 0) {
                return res.status(404).json({
                  status: false,
                  message: "Holiday not found or no changes made."
                });
              }
              res
                .status(200)
                .json({ status: true, message: "Holiday updated successfully." });
            }
          );
        }
      );
    });

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
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({ status: false, error: "Invalid userData" });
    }
  }

  if (!decodedUserData.company_id) {
    return res
      .status(400)
      .json({ status: false, error: "Company ID is missing or invalid" });
  }
  db.query(
    "DELETE FROM holiday WHERE id = ? AND company_id=?",
    [id, decodedUserData.company_id],
    (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res
          .status(200)
          .json({
            status: false,
            message: "Error deleting holiday.",
            error: err.message
          });
      }
      if (results.affectedRows > 0) {
        return res
          .status(200)
          .json({ status: true, message: "Holiday deleted successfully." });
      } else {
        return res
          .status(200)
          .json({ status: false, message: "Holiday not found." });
      }
    }
  );
});

router.get("/holidayfetch", (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const page = parseInt(req.query.page, 10) || 1;
  const offset = (page - 1) * limit;

  const { userData } = req.query;
  let decodedUserData = null;

  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({ status: false, error: "Invalid userData" });
    }
  }

  if (!decodedUserData.company_id) {
    return res
      .status(400)
      .json({ status: false, error: "Company ID is missing or invalid" });
  }
  const holidayQuery = `
        SELECT * FROM holiday WHERE company_id=? ORDER BY id DESC LIMIT ? OFFSET ?
    `;

  db.query(
    holidayQuery,
    [decodedUserData.company_id, limit, offset],
    (err, results) => {
      if (err) {
        console.error("Error fetching holiday records:", err);
        return res.status(500).json({ status: false, error: "Server error" });
      }
      const countQuery = `
            SELECT COUNT(id) as total FROM holiday WHERE company_id=?
        `;
      db.query(
        countQuery,
        [decodedUserData.company_id],
        (countErr, countResults) => {
          if (countErr) {
            console.error("Error fetching total holiday records:", countErr);
            return res
              .status(500)
              .json({ status: false, error: "Server error" });
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
        }
      );
    }
  );
});


router.get("/HolidayCalender", (req, res) => {
  const { userData, data } = req.query;
  let currentMonth = null;
  let currentYear = null;

  if (data) {
    currentMonth = data["currentMonth"]
      ? Number(data["currentMonth"]) + 1
      : null;
    currentYear = data["currentYear"] ? data["currentYear"] : null;
  }

  let decodedUserData = null;
  if (userData) {
    try {
      const decodedString = Buffer.from(userData, "base64").toString("utf-8");
      decodedUserData = JSON.parse(decodedString);
    } catch (error) {
      return res.status(400).json({ status: false, error: "Invalid userData" });
    }
  }

  if (!decodedUserData.company_id) {
    return res
      .status(400)
      .json({ status: false, error: "Company ID is missing or invalid" });
  }

  let query =
    "SELECT holiday, date, holiday_type, half_day_type FROM holiday WHERE company_id=? AND status=1";
  let queryData = [decodedUserData.company_id];

  if (currentMonth && currentYear) {
    // Constructing the date filter condition for a specific month and year
    query += " AND MONTH(date) = ? AND YEAR(date) = ?";
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
      return res.status(200).json({
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
          return res.status(200).json({
            status: false,
            message: "Error updating holiday status.",
            error: err.message
          });
        }

        if (updateResults.affectedRows === 0) {
          return res.status(200).json({
            status: false,
            message: "Holiday not found or no changes made."
          });
        }
        res.status(200).json({
          status: true,
          message: "Holiday status updated successfully.",
          newStatus
        });
      }
    );
  });
});

module.exports = router;
