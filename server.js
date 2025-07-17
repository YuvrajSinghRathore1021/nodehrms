// new notfaction 
const express = require('express');
const http = require('http');
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
// const db = require('../../DB/ConnectionSql');
const db = require('./DB/ConnectionSql');

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

const api1 = require('./api/homePage/HomeApi');
const uplodefile = require('./api/homePage/Uplodefile');
const loginSinup = require('./api/homePage/loginSinup');
const Attendance = require('./api/attendance/Attendance');
const Attendancemark = require('./api/attendance/Attendancemark');
const AttendanceApproval = require('./api/attendance/AttendanceApproval');
const AttendanceApprovalLog = require('./api/attendance/AttendanceApprovalLog');
const AttendanceRules = require('./api/attendance/AttendanceRule');

const Datatable = require('./api/homePage/Datatable');
const CompanyAdd = require('./api/companyFrom/Company');
const AdminPage = require('./api/companyFrom/AdminPage');
const Employeesdirectory = require('./api/directory/Employeesdirectory');

const leaveapi = require('./api/leave/leaveapi');
const holidayapi = require('./api/holiday/holidayapi');
const Setting = require('./api/setting/Setting');
const AttendanceSetting = require('./api/attendance/AttendanceSetting');
const Header = require('./api/Default/Header');
const Notification = require('./api/notification/Notificationsystem');
// const Rulesapi = require('./api/rules/rulesapi');

const Rulesapi = require('./api/leave/rulesapi');
const Urls = require('./api/homePage/url');
// mail 
const Mail = require('./api/function/sendMail');
const DetailsUpload = require('./api/directory/DetailsUpload');

// pay roll 
const payrollRule = require('./api/payrol/payrollRule');
const pay = require('./api/payrol/Pay');
const penaltie = require('./api/payrol/Penaltie');

// logs 
const logshandel = require('./api/leave/logshandel');
const excelexports = require('./api/excel/excelexports');
const JWT_SECRET = 'yuvi';

// // app api Start
const AttendanceApp = require('./api/app/attendance/Attendance');
const LeaveApp = require('./api/app/leave/Leave');
const HolidayApi = require('./api/app/Holiday/HolidayApi');
const Profile = require('./api/app/profile/Profile');
const WorkWeek = require('./api/app//workweek/WorkWeek');
const PayDetails = require('./api/app/pay/PayDetails');
const Salaryslip = require('./api/app/paysalaryslip/Salaryslip');
const Employeesdetails = require('./api/app/employeesdetails/Employeesdetails');
const EmployeeLocationTracking = require('./api/location/EmployeeLocationTracking');

// face 
const FaceUplode = require('./api/faceauthorization/Uplode');
// // app api End
// notification
const NotificationApi = require('./api/notification/Notificationsystem');
const Levesubmit = require('./api/leave/levesubmit');
const Reports = require('./api/reports/Report');
// Salary 
const Salary = require('./api/Salary/Salary');
// Dashboard
const Dashboard = require('./api/dashboard/Dashboard');
const Menu = require('./api/dashboard/Menu');
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ status: false, message: 'Token not found.' });
    }
    jwt.verify(token, process.env.JWT_SECRET || JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ status: false, message: 'Invalid token.' });
        }
        req.user = user;
        next();
    });
};
// const authenticateToken = (req, res, next) => {
//     const token = req.headers['authorization']?.split(' ')[1];
//     if (!token) {
//         return res.status(401).json({ status: false, message: 'Token not found.' });
//     }
//     const sql = 'SELECT id, company_id FROM employees WHERE token = ?  AND employee_status=1 and status=1 and delete_status=0';
//     db.query(sql, [token], (err, results) => {
//         if (err) {
//             console.error("DB error:", err);
//             return res.status(500).json({ status: false, message: 'Database error.' });
//         }
//         if (results.length === 0) {
//             return res.status(404).json({ status: false, message: 'Invalid token.' });
//         }
//         req.user = results[0];
//         next();
//     });
// };

// Apply authentication middleware to all routes except /userapi
app.use('/api1', authenticateToken, api1);
app.use('/Company', authenticateToken, CompanyAdd);
app.use('/Admin', authenticateToken, AdminPage);
app.use('/Attendance', authenticateToken, Attendance);
app.use('/Attendancemark', authenticateToken, Attendancemark);
app.use('/AttendanceApproval', authenticateToken, AttendanceApproval);
app.use('/AttendanceApprovalLog', authenticateToken, AttendanceApprovalLog);
app.use('/Directory', authenticateToken, Employeesdirectory);
app.use('/leaveapi', authenticateToken, leaveapi);
app.use('/holidayapi', authenticateToken, holidayapi);
app.use('/AttendanceRules', authenticateToken, AttendanceRules);
app.use('/Setting', authenticateToken, Setting);
app.use('/AttendanceSetting', authenticateToken, AttendanceSetting);
app.use('/Header', authenticateToken, Header);
app.use('/Urls', authenticateToken, Urls);
app.use('/rulesapi', authenticateToken, Rulesapi);
app.use('/logshandel', authenticateToken, logshandel);
app.use('/DetailsUpload', authenticateToken, DetailsUpload);
app.use('/excelexports', excelexports);

// pay roll 
app.use('/payrollRule', authenticateToken, payrollRule);
app.use('/pay', authenticateToken, pay);
app.use('/penaltie', authenticateToken, penaltie);
app.use('/dashboard', authenticateToken, Dashboard);
app.use('/menu', authenticateToken, Menu);
// // app api Start
app.use('/AttendanceApp', authenticateToken, AttendanceApp);
app.use('/LeaveApp', authenticateToken, LeaveApp);
app.use('/HolidayApiApp', authenticateToken, HolidayApi);
app.use('/Profile', authenticateToken, Profile);
app.use('/WorkWeekApp', authenticateToken, WorkWeek);
app.use('/PayDetailsApp', authenticateToken, PayDetails);
app.use('/Employeesdetails', authenticateToken, Employeesdetails);

// face 
app.use('/Face', authenticateToken, FaceUplode);

// // Pdf Make for app
app.use('/PDFdow', authenticateToken, Salaryslip);
app.use('/Reports', authenticateToken, Reports);

// No authentication for userapi
app.use('/userapi', loginSinup);
app.use('/Datatable', Datatable);
app.use('/uplodefile', uplodefile);

app.use((req, res, next) => {
    req.io = io;
    next();
});
app.use('/NotificationApi', authenticateToken, NotificationApi);

// sendMail
app.use('/sendMail', Mail);
app.use('/Notification', Notification);
app.use('/uploads', express.static(path.join(__dirname, './uploads')));
// try
app.use('/levesubmit', authenticateToken, Levesubmit);
app.use('/EmployeeLocation', authenticateToken, EmployeeLocationTracking);
// Salary
app.use('/Salary', authenticateToken, Salary);
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    socket.on("join", (userId) => {
        console.log("User joined room:", userId);
        socket.join(userId.toString());
    });
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 2100;

// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });

// server.listen(PORT, () => {
//     console.log(`Server is running at http://localhost:${PORT}`);
// });
// app.listen(2100, '0.0.0.0', () => {
//   console.log('✅ Server is running on http://0.0.0.0:2100');
// });



app.listen(80, '0.0.0.0', () => {
  console.log('✅ Server is running on http://0.0.0.0:80');
});








