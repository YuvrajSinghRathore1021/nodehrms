const express = require("express");
const router = express.Router();
const db = require("../../../DB/ConnectionSql");


router.post("/holidayfetch", (req, res) => {

    const limit = parseInt(req.body.limit, 10) || 10;
    const page = parseInt(req.body.page, 10) || 1;
    const offset = (page - 1) * limit;

    const { userData, StartDate, EndDate, Search } = req.body;
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

    if (StartDate) {
        holidayQuery += ` AND date >= ?`;
        queryParams.push(StartDate);
    }
    if (EndDate) {
        holidayQuery += ` AND date <= ?`;
        queryParams.push(EndDate);
    }
    if (Search) {
        holidayQuery += ` AND (Emp.holiday LIKE ?)`;
        queryParams.push(`%${Search}%`);
    }

    holidayQuery += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
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

            if (StartDate) {
                countQuery += ` AND date >= ?`;
                countQueryqueryParams.push(StartDate);
            }
            if (EndDate) {
                countQuery += ` AND date <= ?`;
                countQueryqueryParams.push(EndDate);
            }
            if (Search) {
                countQuery += ` AND (Emp.holiday LIKE ?)`;
                countQueryqueryParams.push(`%${Search}%`);
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


router.post("/HolidayCalender", (req, res) => {   
    let { userData ,currentMonth,currentYear} = req.body;  

      currentMonth = currentMonth ? Number(currentMonth) + 1 : null;
      currentYear = currentYear ? currentYear : null;


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
      "SELECT holiday, date FROM holiday WHERE company_id=? AND status=1";
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


module.exports = router;
