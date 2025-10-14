const express = require("express");
const router = express.Router();
const db = require("../../DB/ConnectionSql");
const admin = require("firebase-admin");
const moment = require("moment");

// Schedule or manually trigger route

router.post("/check-miss-punch-in", async (req, res) => {
  try {
    const today = moment().format("YYYY-MM-DD");

    // 1️⃣ Get all employees with their company and rule info
    const [employees] = await db.promise().query(`
      SELECT e.id AS employee_id, e.first_name, e.company_id, e.fcm_token,ar.in_time, c.company_name
      FROM employees e
      LEFT JOIN attendance_rules ar ON e.attendance_rules_id = ar.rule_id
      LEFT JOIN companies c ON e.company_id = c.id
      WHERE e.employee_status=1 AND e.status=1 AND e.delete_status=0 AND e.fcm_token IS NOT NULL
    `);

    if (employees.length === 0) {
      return res.json({ success: false, message: "No employees found." });
    }

    let notifiedCount = 0;

    for (const emp of employees) {
      const [attendance] = await db.promise().query(
        `SELECT * FROM attendance WHERE employee_id = ? AND attendance_date = ?`,
        [emp.employee_id, today]
      );

      // No record or no check_in_time means missed punch-in
      if (attendance.length === 0 || !attendance[0].check_in_time) {
        const now = moment();
        const inTime = moment(emp.in_time, "HH:mm:ss");

        // Optional: send only after in_time + 15 mins
        if (now.isAfter(inTime.add(15, "minutes"))) {
          const message = {
            notification: {
              title: "Missed Punch-In",
              body: `Hi ${emp.first_name}, you missed your punch-in today.`,
            },
            token: emp.fcm_token,
            data: {
              type: "miss_punch_in",
              employee_id: String(emp.employee_id),
              date: today,
            },
            android: { notification: { sound: "default" } },
            apns: { payload: { aps: { sound: "default" } } },
          };

          try {
            await admin.messaging().send(message);
            console.log(`Notification sent to ${emp.first_name}`);
            notifiedCount++;
          } catch (err) {
            console.error(`FCM error for ${emp.first_name}:`, err.message);
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Miss Punch-In check completed.`,
      notifiedCount,
    });
  } catch (error) {
    console.error("Error checking miss punch-in:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
