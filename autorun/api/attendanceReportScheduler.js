const cron = require("node-cron");
const nodemailer = require("nodemailer");
const axios = require("axios");
const fs = require("fs");
const xlsx = require("xlsx");

// =====================
// 🔧 CONFIGURATION
// =====================
const API_URL = "http://localhost:2200/AttendanceApp/api/Attendancedirectory";
const EMAIL_TO = ["sunilsharma2037@gmail.com"];//, "Sumit.singh00027@gmail.com"
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

let companydata = [
  { id: 6, name: "India Deals Portal Pvt Ltd", email: "sunilsharma2037@gmail.com,yuvrajsinghrathore1021@gmail.com" },
  { id: 8, name: "India Deals Portal Pvt Ltd", email: "Sumit.singh00027@gmail.com" },
]

async function generateExcelAndSendMailc() {
  for (let i = 0; i < companydata.length; i++) {
    const companyId = companydata[i].id;
    const companyEmail = companydata[i].email;
    await generateExcelAndSendMail(companyId, companyEmail);
  }
}


async function generateExcelAndSendMail(companyId, companyEmail) {
  try {
    console.log("🔄 Fetching attendance data...");

    // 1️⃣ Fetch data from API
    const response = await axios.post(API_URL, {
      userData: '',
      companyId: companyId,
      date: new Date().toISOString().split("T")[0],
    });
    const data = response.data.Attendanceemployees;

    if (!data || data.length === 0) {
      console.log("⚠️ No attendance data found.");
      return;
    }
    // === 1️⃣ Format data for Excel ===
    // "Sr No": emp.srnu,
    const datanew = data.map((emp) => ({
      "Employee Name": emp.first_name,
      "Date": emp.attendance_date,
      "Status": emp.status,
      "Check In": emp.check_in_time || "-",
      "Check Out": emp.check_out_time || "-",
      "Duration": emp.duration || "-",
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
      // to: EMAIL_TO.join(", "),
      to: companyEmail,
      subject: `Attendance Report - ${new Date().toLocaleDateString()}`,
      text: `📊 **Attendance Summary - ${new Date().toLocaleDateString()}**

Total Employees: ${summary.totalEmployees}
Present: ${summary.attendanceCount}
On Leave: ${summary.leaveCount}
Absent: ${summary.absentees}
LWP: ${summary?.lwp}

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
cron.schedule("0 11 * * *", generateExcelAndSendMailc, { timezone: "Asia/Kolkata" });
cron.schedule("30 19 * * *", generateExcelAndSendMailc, { timezone: "Asia/Kolkata" });


console.log("🕐 Attendance report scheduler started (11:00 & 19:30 daily)");

