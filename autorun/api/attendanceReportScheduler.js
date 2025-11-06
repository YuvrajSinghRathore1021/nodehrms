// const cron = require("node-cron");
// const nodemailer = require("nodemailer");
// const ExcelJS = require("exceljs");
// const axios = require("axios");
// const fs = require("fs");

// // =====================
// // 🔧 CONFIGURATION
// // =====================
// const API_URL = "https://api.sysboat.com/AttendanceApp/api/Attendancedirectory";
// const EMAIL_TO = ["yuvrajsinghrathore1021@gmail.com"]; // Add your recipients
// const EMAIL_FROM = "indiadeals2004@gmail.com";
// const EMAIL_PASS = "iwfxsrvhmnwjpxmk";

// // =====================
// // 📧 Email Setup
// // =====================
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: EMAIL_FROM,
//     pass: EMAIL_PASS,
//   },
// });

// // =====================
// // 📊 Generate Excel Function
// // =====================
// async function generateExcelAndSendMail() {
//   try {
//     // 1️⃣ Fetch attendance data from your API
//     const response = await axios.post(API_URL, {
//       userData: {},
//       companyId: 6,
//       date: new Date().toISOString().split("T")[0],
//     });

//     const data = response.data.Attendanceemployees;
//     if (!data || data.length === 0) {
//       console.log("⚠️ No attendance data found.");
//       return;
//     }

//     // 2️⃣ Create Excel workbook
//     const workbook = new ExcelJS.Workbook();
//     const sheet = workbook.addWorksheet("Attendance Report");

//     // Add Header Row
//     sheet.columns = [
//       { header: "Sr. No.", key: "srnu", width: 10 },
//       { header: "Employee Name", key: "first_name", width: 25 },
//       { header: "Date", key: "attendance_date", width: 15 },
//       { header: "Check In", key: "check_in_time", width: 15 },
//       { header: "Check Out", key: "check_out_time", width: 15 },
//       { header: "Status", key: "status", width: 10 },
//       { header: "In Branch", key: "branch_in", width: 20 },
//       { header: "Out Branch", key: "branch_out", width: 20 },
//       { header: "Daily Status In", key: "daily_status_in", width: 15 },
//       { header: "Daily Status Out", key: "daily_status_out", width: 15 },
//     ];

//     // Add Rows
//     data.forEach((emp) => sheet.addRow(emp));

//     // 3️⃣ Save file temporarily
//     const filePath = `./attendance_report_${new Date()
//       .toISOString()
//       .split("T")[0]}.xlsx`;
//     await workbook.xlsx.writeFile(filePath);

//     // 4️⃣ Send Email
//     await transporter.sendMail({
//       from: `"HRMS Attendance Bot" <${EMAIL_FROM}>`,
//       to: EMAIL_TO,
//       subject: `Attendance Report - ${new Date().toLocaleDateString()}`,
//       text: "Please find attached the latest attendance report.",
//       attachments: [
//         {
//           filename: `Attendance_Report_${new Date()
//             .toISOString()
//             .split("T")[0]}.xlsx`,
//           path: filePath,
//         },
//       ],
//     });

//     console.log(`✅ Attendance email sent successfully at ${new Date()}`);

//     // 5️⃣ Delete temp file
//     fs.unlinkSync(filePath);
//   } catch (error) {
//     console.error("❌ Error sending attendance report:", error.message);
//   }
// }

// //
// // =====================
// // ⏰ CRON JOBS
// // =====================
// //
// // Run at 11:00 AM and 6:00 PM daily
// cron.schedule("0 11 * * *", generateExcelAndSendMail, { timezone: "Asia/Kolkata" });
// cron.schedule("0 18 * * *", generateExcelAndSendMail, { timezone: "Asia/Kolkata" });

// // page on load 
// generateExcelAndSendMail();

// console.log("🕐 Attendance report scheduler started (11:00 & 18:00 daily)");



// // /-----npm install @vladmandic/face-api @tensorflow/tfjs-node canvas
// // /-----npm install face-recognition








const cron = require("node-cron");
const nodemailer = require("nodemailer");
const axios = require("axios");
const fs = require("fs");
const xlsx = require("xlsx");

// =====================
// 🔧 CONFIGURATION
// =====================
const API_URL = "http://localhost:2200/AttendanceApp/api/Attendancedirectory";
const EMAIL_TO = ["yuvrajsinghrathore1021@gmail.com"]; // recipients
const EMAIL_FROM = "indiadeals2004@gmail.com";
const EMAIL_PASS = "iwfxsrvhmnwjpxmk"; // app password

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
      userData: {},
      companyId: 6,
      date: new Date().toISOString().split("T")[0],
    });

    const data = response.data.Attendanceemployees;
    if (!data || data.length === 0) {
      console.log("⚠️ No attendance data found.");
      return;
    }

    // 2️⃣ Convert data to worksheet
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Attendance Report");

    // 3️⃣ Save Excel file temporarily
    const filePath = `./attendance_report_${new Date()
      .toISOString()
      .split("T")[0]}.xlsx`;
    xlsx.writeFile(workbook, filePath);

    // 4️⃣ Send Email with attachment
    await transporter.sendMail({
      from: `"HRMS Attendance Bot" <${EMAIL_FROM}>`,
      to: EMAIL_TO.join(", "),
      subject: `Attendance Report - ${new Date().toLocaleDateString()}`,
      text: "Please find attached the latest attendance report.",
      attachments: [
        {
          filename: `Attendance_Report_${new Date()
            .toISOString()
            .split("T")[0]}.xlsx`,
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

