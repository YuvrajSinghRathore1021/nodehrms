const express = require("express");
const router = express.Router();
const db = require("../../../DB/ConnectionSql");


router.post("/holidayfetch", (req, res) => {

  const limit = parseInt(req.body.limit, 10) || 10;
  const page = parseInt(req.body.page, 10) || 1;
  const offset = (page - 1) * limit;

  const { userData, Search, date } = req.body;
  let currentMonth = null;
  let currentYear = null;

  if (date) {
    const parsedDate = new Date(date);
    currentMonth = parsedDate.getMonth() + 1;
    currentYear = parsedDate.getFullYear();
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
  let holidayQuery = `
          SELECT * FROM holiday WHERE company_id=? 
      `;
  let queryParams = [decodedUserData.company_id];

  if (Search) {
    holidayQuery += ` AND (Emp.holiday LIKE ?)`;
    queryParams.push(`%${Search}%`);
  }
  if (currentMonth && currentYear) {
    // Constructing the date filter condition for a specific month and year
    holidayQuery += " AND MONTH(date) = ? AND YEAR(date) = ?";
    queryParams.push(currentMonth);
    queryParams.push(currentYear);
  }
  holidayQuery += ` ORDER BY date DESC LIMIT ? OFFSET ?`;
  queryParams.push(limit, offset);

  db.query(
    holidayQuery,
    queryParams,
    (err, results) => {
      if (err) {
        console.error("Error fetching holiday records:", err);
        return res.status(500).json({ status: false, error: "Server error" });
      }
      let countQuery = `
              SELECT COUNT(id) as total FROM holiday WHERE company_id=?
          `;
      let countQueryqueryParams = [decodedUserData.company_id];
      if (Search) {
        countQuery += ` AND (Emp.holiday LIKE ?)`;
        countQueryqueryParams.push(`%${Search}%`);
      }
      if (currentMonth && currentYear) {
        // Constructing the date filter condition for a specific month and year
        countQuery += " AND MONTH(date) = ? AND YEAR(date) = ?";
        countQueryqueryParams.push(currentMonth);
        countQueryqueryParams.push(currentYear);
      }
      db.query(
        countQuery,
        countQueryqueryParams,
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


module.exports = router;
