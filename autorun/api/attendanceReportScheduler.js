const cron = require("node-cron");
const nodemailer = require("nodemailer");
const axios = require("axios");
const fs = require("fs");
const xlsx = require("xlsx");

// =====================
// 🔧 CONFIGURATION
// =====================
const API_URL = "http://localhost:2200/AttendanceApp/api/Attendancedirectory";
const EMAIL_TO = ["yuvrajsinghrathore1021@gmail.com","sunilsharma2037@gmail.com"]; 
const EMAIL_FROM = "indiadeals2004@gmail.com";
const EMAIL_PASS = "iwfxsrvhmnwjpxmk";

// =====================
// 📧 Email Setup
// =====================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_FROM,
    pass: EMAIL_PASS,
  },
});

// =====================
// 📊 Generate Excel Function (using XLSX)
// =====================
async function generateExcelAndSendMail() {
  try {
    console.log("🔄 Fetching attendance data...");

    // 1️⃣ Fetch data from API
    const response = await axios.post(API_URL, {
      userData: '',
      companyId: 8,
      date: new Date().toISOString().split("T")[0],
    });
    const data = response.data.Attendanceemployees;

    if (!data || data.length === 0) {
      console.log("⚠️ No attendance data found.");
      return;
    }
    // === 1️⃣ Format data for Excel ===
    const datanew = data.map((emp) => ({
      "Sr No": emp.srnu,
      "Employee Name": emp.first_name,
      "Date": emp.attendance_date,
      "Check In": emp.check_in_time || "-",
      "Check Out": emp.check_out_time || "-",
      "Duration": emp.duration || "-",
      "Status": emp.status,
      "Branch In": emp.branch_in || "-",
      "Branch Out": emp.branch_out || "-",
    }));

    // 2️⃣ Convert data to worksheet
    const worksheet = xlsx.utils.json_to_sheet(datanew);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Attendance Report");

    // 3️⃣ Save Excel file temporarily
    const filePath = `./attendance_report_${new Date()
      .toISOString()
      .split("T")[0]}.xlsx`;
    xlsx.writeFile(workbook, filePath);




    // 4️⃣ Send Email with attachment
    const summary = response.data.summary;
    await transporter.sendMail({
      from: `"HRMS Attendance Bot" <${EMAIL_FROM}>`,
      to: EMAIL_TO.join(", "),
      subject: `Attendance Report - ${new Date().toLocaleDateString()}`,
      text: `📊 **Attendance Summary - ${new Date().toLocaleDateString()}**

Total Employees: ${summary.totalEmployees}
Present: ${summary.attendanceCount}
On Leave: ${summary.leaveCount}
Absent: ${summary.absentees}

Please find the detailed attendance report attached.`,
      attachments: [
        {
          filename: `Attendance_Report_${new Date().toISOString().split("T")[0]}.xlsx`,
          path: filePath,
        },
      ],
    });

    console.log(`✅ Attendance email sent successfully at ${new Date()}`);

    // 5️⃣ Delete temporary file
    fs.unlinkSync(filePath);
  } catch (error) {
    console.error("❌ Error sending attendance report:", error.message);
  }
}

// =====================
// ⏰ CRON JOBS
// =====================
// Run at 11:00 AM and 6:00 PM daily
cron.schedule("0 11 * * *", generateExcelAndSendMail, { timezone: "Asia/Kolkata" });
cron.schedule("0 18 * * *", generateExcelAndSendMail, { timezone: "Asia/Kolkata" });

// Run immediately on load (for testing)
generateExcelAndSendMail();

console.log("🕐 Attendance report scheduler started (11:00 & 18:00 daily)");

