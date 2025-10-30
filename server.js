// // /////////// proper local host 
// const express = require('express');
// const http = require('http');
// require('dotenv').config();
// const cors = require('cors');
// const jwt = require('jsonwebtoken');
// const path = require('path');
// const app = express();

// const { Server } = require('socket.io');
// const server = http.createServer(app);
// const db = require('./DB/ConnectionSql');

// const Redis = require('redis');
// // 🧠 Optional: Redis cache for live location
// const redisClient = Redis.createClient({ url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' });
// redisClient.connect().then(() => console.log('✅ Redis connected')).catch(() => console.log('⚠️ Redis not connected, using in-memory fallback'));

// // 🧠 In-memory fallback map if Redis is down
// const liveLocations = new Map();

// const { getEmployeeProfile } = require('./helpers/getEmployeeProfile');
// // Import cron jobs
// require("./autorun/cron");

// const io = new Server(server, {
//     cors: {
//         origin: "*",
//         methods: ["GET", "POST"]
//     }
// });

// // Middleware
// app.use(cors());
// app.use(express.json());

// const api1 = require('./api/homePage/HomeApi');
// const uplodefile = require('./api/homePage/Uplodefile');
// const loginSinup = require('./api/homePage/loginSinup');
// const Attendance = require('./api/attendance/Attendance');
// const Attendancemark = require('./api/attendance/Attendancemark');
// const AttendanceApproval = require('./api/attendance/AttendanceApproval');
// const AttendanceApprovalLog = require('./api/attendance/AttendanceApprovalLog');
// const AttendanceRules = require('./api/attendance/AttendanceRule');

// const Datatable = require('./api/homePage/Datatable');
// const CompanyAdd = require('./api/companyFrom/Company');
// const AdminPage = require('./api/companyFrom/AdminPage');
// const Employeesdirectory = require('./api/directory/Employeesdirectory');

// const leaveapi = require('./api/leave/leaveapi');
// const holidayapi = require('./api/holiday/holidayapi');
// const Setting = require('./api/setting/Setting');
// const AttendanceSetting = require('./api/attendance/AttendanceSetting');
// const Header = require('./api/Default/Header');
// const Notification = require('./api/notification/Notificationsystem');
// // const Rulesapi = require('./api/rules/rulesapi');

// const Rulesapi = require('./api/leave/rulesapi');
// const Urls = require('./api/homePage/url');
// // mail 
// const Mail = require('./api/function/sendMail');
// const DetailsUpload = require('./api/directory/DetailsUpload');

// // pay roll 
// const payrollRule = require('./api/payrol/payrollRule');
// const pay = require('./api/payrol/Pay');
// const penaltie = require('./api/payrol/Penaltie');

// // logs 
// const logshandel = require('./api/leave/logshandel');
// const excelexports = require('./api/excel/excelexports');
// const JWT_SECRET = 'yuvi';

// // // app api Start
// const AttendanceApp = require('./api/app/attendance/Attendance');
// const LeaveApp = require('./api/app/leave/Leave');
// const HolidayApi = require('./api/app/Holiday/HolidayApi');
// const Profile = require('./api/app/profile/Profile');
// const WorkWeek = require('./api/app//workweek/WorkWeek');
// const PayDetails = require('./api/app/pay/PayDetails');
// const Salaryslip = require('./api/app/paysalaryslip/Salaryslip');
// const Employeesdetails = require('./api/app/employeesdetails/Employeesdetails');
// const EmployeeLocationTracking = require('./api/location/EmployeeLocationTracking');

// // face 
// const FaceUplode = require('./api/faceauthorization/Uplode');
// // // app api End
// // notification
// const NotificationApi = require('./api/notification/Notificationsystem');
// const Levesubmit = require('./api/leave/levesubmit');
// const Reports = require('./api/reports/Report');
// // Salary 
// const Salary = require('./api/Salary/Salary');
// // Dashboard
// const Dashboard = require('./api/dashboard/Dashboard');
// const Menu = require('./api/dashboard/Menu');
// const ExcelEmployee = require('./api/directory/ExcelEmployee');

// // Expenses
// const Expenses = require('./api/expenses/Expenses');

// //////HrAttendance
// const HrAttendance = require('./api/attendance/HrAttendance');



// const authenticateToken = (req, res, next) => {
//     const token = req.headers['authorization']?.split(' ')[1];
//     if (!token) {
//         return res.status(401).json({ status: false, message: 'Token not found.' });
//     }
//     jwt.verify(token, process.env.JWT_SECRET || JWT_SECRET, (err, user) => {
//         if (err) {
//             return res.status(403).json({ status: false, message: 'Invalid token.' });
//         }
//         req.user = user;
//         next();
//     });
// };




// const url = require("url");
// app.use((req, res, next) => {
//     const start = Date.now();

//     res.on("finish", () => {
//         const duration = Date.now() - start;

//         // Ignore socket.io
//         if (req.url.startsWith("/socket.io")) return;

//         const method = req.method;
//         const parsedUrl = url.parse(req.originalUrl);
//         const cleanUrl = parsedUrl.pathname; // removes ?query=params
//         const statusCode = res.statusCode;
//         const userId = req.user ? req.user.id : null;

//         const sql = `
//       INSERT INTO api_sql_logs (method, url, status_code, duration_ms, user_id)
//       VALUES (?, ?, ?, ?, ?) `;
//         const values = [method, cleanUrl, statusCode, duration, userId];

//         db.query(sql, values, (err) => {
//             if (err) {
//                 console.error("Log insert failed:", err.message);
//             }
//             // no need to send response here, this is async logging
//         });
//     });

//     next();
// });
// const notificationRoutes = require("./api/firebase/firebasenotification");
// app.use("/api/notification", notificationRoutes);

// // Apply authentication middleware to all routes except /userapi
// app.use('/api1', authenticateToken, api1);
// app.use('/Company', authenticateToken, CompanyAdd);
// app.use('/Admin', authenticateToken, AdminPage);
// app.use('/Attendance', authenticateToken, Attendance);
// app.use('/Attendancemark', authenticateToken, Attendancemark);
// app.use('/AttendanceApproval', authenticateToken, AttendanceApproval);
// app.use('/AttendanceApprovalLog', authenticateToken, AttendanceApprovalLog);
// app.use('/Directory', authenticateToken, Employeesdirectory);
// app.use('/leaveapi', authenticateToken, leaveapi);
// app.use('/holidayapi', authenticateToken, holidayapi);
// app.use('/AttendanceRules', authenticateToken, AttendanceRules);
// app.use('/Setting', authenticateToken, Setting);
// app.use('/AttendanceSetting', authenticateToken, AttendanceSetting);
// app.use('/Header', authenticateToken, Header);
// app.use('/Urls', authenticateToken, Urls);
// app.use('/rulesapi', authenticateToken, Rulesapi);
// app.use('/logshandel', authenticateToken, logshandel);
// app.use('/DetailsUpload', authenticateToken, DetailsUpload);
// app.use('/excelexports', excelexports);

// // pay roll 
// app.use('/payrollRule', authenticateToken, payrollRule);
// app.use('/pay', authenticateToken, pay);
// app.use('/penaltie', authenticateToken, penaltie);
// app.use('/dashboard', authenticateToken, Dashboard);
// app.use('/menu', authenticateToken, Menu);

// // // app api Start
// app.use('/AttendanceApp', authenticateToken, AttendanceApp);
// app.use('/LeaveApp', authenticateToken, LeaveApp);
// app.use('/HolidayApiApp', authenticateToken, HolidayApi);
// app.use('/Profile', authenticateToken, Profile);
// app.use('/WorkWeekApp', authenticateToken, WorkWeek);
// app.use('/PayDetailsApp', authenticateToken, PayDetails);
// app.use('/Employeesdetails', authenticateToken, Employeesdetails);
// // app.use('/Excel', authenticateToken, ExcelEmployee);
// app.use('/Excel', ExcelEmployee);

// // face 
// app.use('/Face', authenticateToken, FaceUplode);


// // // Pdf Make for app
// app.use('/PDFdow', Salaryslip);
// // app.use('/PDFdow', authenticateToken, Salaryslip);
// app.use('/Reports', authenticateToken, Reports);

// // No authentication for userapi
// app.use('/userapi', loginSinup);
// app.use('/Datatable', Datatable);
// app.use('/uplodefile', uplodefile);

// app.use((req, res, next) => {
//     req.io = io;
//     next();
// });
// app.use('/NotificationApi', authenticateToken, NotificationApi);

// // sendMail
// app.use('/sendMail', Mail);
// app.use('/Notification', Notification);
// app.use('/uploads', express.static(path.join(__dirname, './uploads')));
// // try
// app.use('/levesubmit', authenticateToken, Levesubmit);
// app.use('/EmployeeLocation', authenticateToken, EmployeeLocationTracking);
// // Salary
// app.use('/Salary', authenticateToken, Salary);
// app.use('/Expenses', authenticateToken, Expenses);
// app.use('/hrAttendance', authenticateToken, HrAttendance);

// // io.on("connection", (socket) => {  
// //     socket.on("join", (userId) => {
// //         console.log("User joined room:", userId);
// //         socket.join(userId?.toString());
// //     });
// //     socket.on("disconnect", () => {
// //     });
// // });

// io.on("connection", (socket) => {
//     console.log("User connected:", socket.id);
//     socket.on("join", ({ userId, company_id }) => {
//         // ✅ Save values on socket instance
//         socket.userId = userId;
//         socket.company_id = company_id;

//         socket.join(userId?.toString());
//         socket.join(company_id?.toString());
//         console.log(`User ${userId} joined personal & company ${company_id} rooms`);
//     });

//     socket.on("getProfile", async (payload) => {
//         // console.log('getProfile payload', payload);
//         const result = await getEmployeeProfile(payload);

//         socket.emit("profileResponse", result);
//         // console.log('profileResponse sent', result);
//     });

//     // 🔄 Receive and broadcast live location
//     socket.on('sendLocation', async (data) => {
//         try {
//             // { latitude: 26.9136458, longitude: 75.7402153 }
//             const { latitude, longitude } = data;

//             if (!latitude || !longitude || !socket.userId || !socket.company_id) return;

//             const timestamp = new Date().toISOString();
//             const locationData = {
//                 employee_id: socket.userId,
//                 company_id: socket.company_id,
//                 latitude,
//                 longitude,
//                 timestamp,
//             };
//             try {
//                 if (redisClient.isReady) {
//                     await redisClient.hSet(`employee:${socket.userId}`, {
//                         latitude: lat,
//                         longitude: lng,
//                         timestamp,
//                         company_id
//                     });
//                     await redisClient.expire(`employee:${socket.userId}`, 600);
//                 } else {
//                     liveLocations.set(socket.userId, locationData);
//                 }
//             } catch (cacheErr) {
//                 console.error('Redis save error:', cacheErr);
//                 liveLocations.set(socket.userId, locationData);
//             }

//             // // ✅ Broadcast real-time update
//             // if (req.io) {
//             //     req.io.to(socket.company_id.toString()).emit('receive-Location', locationData);
//             // }


//             // ✅ Broadcast location update to everyone in same company
//             io.to(socket.company_id.toString()).emit('receive-Location', locationData);
//             // console.log('Broadcasted locationData:', locationData);
//             //   // ✅ Save current location in Redis (fast cache)
//             //   await redisClient.hSet(`employee:${socket.userId}`, locationData);

//             //   // ✅ Broadcast to all employees in same company
//             // //   io.to(`company_${socket.company_id}`).emit('receiveLocation', locationData);

//             // io.to(socket.company_id.toString()).emit('receive-Location', locationData);

//         } catch (err) {
//             console.error('sendLocation Error:', err);
//         }
//     });

//     socket.on("disconnect", () => {
//     });
// });

// server.listen(2200, '0.0.0.0', () => {
//     console.log('✅ Server is running on http://localhost:2200');
// });






















///////////////////////////////////////////////////////
////aws proper 
// new notfaction
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const app = express();
const { Server } = require('socket.io');
const db = require('./DB/ConnectionSql');

const Redis = require('redis');
// 🧠 Optional: Redis cache for live location
const redisClient = Redis.createClient({ url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' });
redisClient.connect().then(() => console.log('✅ Redis connected')).catch(() => console.log('⚠️ Redis not connected, using in-memory fallback'));

// 🧠 In-memory fallback map if Redis is down
const liveLocations = new Map();

const { getEmployeeProfile } = require('./helpers/getEmployeeProfile');

const fs = require('fs');
const https = require('https');

// Load SSL certificate
const sslOptions = {
    key: fs.readFileSync('./ssl/server.key'),
    cert: fs.readFileSync('./ssl/server.cert')
};

const server = https.createServer(sslOptions, app);

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
const ExcelEmployee = require('./api/directory/ExcelEmployee');

// Expenses
const Expenses = require('./api/expenses/Expenses');
////HrAttendance
const HrAttendance = require('./api/attendance/HrAttendance');
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
app.use('/Expenses', authenticateToken, Expenses);
app.use('/hrAttendance', authenticateToken, HrAttendance);
// io.on("connection", (socket) => {
//     //// console.log("User connected:", socket.id);
//     socket.on("join", (userId) => {
//         //// console.log("User joined room:", userId);
//         socket.join(userId.toString());
//     });
//     socket.on("disconnect", () => {
//         //// console.log("User disconnected:", socket.id);
//     });
// });

// io.on("connection", (socket) => {
//     socket.on("join", ({ userId, company_id }) => {
//         socket.join(userId?.toString());
//         socket.join(company_id?.toString());
//         console.log(`User ${userId} joined personal & company ${company_id} rooms`);
//     });

//     socket.on("disconnect", () => {
//     });
// });


io.on("connection", (socket) => {
    socket.on("join", ({ userId, company_id }) => {
        // ✅ Save values on socket instance
        socket.userId = userId;
        socket.company_id = company_id;

        socket.join(userId?.toString());
        socket.join(company_id?.toString());
        console.log(`User ${userId} joined personal & company ${company_id} rooms`);
    });

    socket.on("getProfile", async (payload) => {
        const result = await getEmployeeProfile(payload);

        socket.emit("profileResponse", result);
    });

    // 🔄 Receive and broadcast live location
    socket.on('sendLocation', async (data) => {

        try {
            // { latitude: 26.9136458, longitude: 75.7402153 }
            const { latitude, longitude } = data;

            if (!latitude || !longitude || !socket.userId || !socket.company_id) return;

            const timestamp = new Date().toISOString();
            const locationData = {
                employee_id: socket.userId,
                company_id: socket.company_id,
                latitude,
                longitude,
                timestamp,
            };
            try {
                if (redisClient.isReady) {
                    await redisClient.hSet(`employee:${socket.userId}`, {
                        latitude: lat,
                        longitude: lng,
                        timestamp,
                        company_id
                    });
                    await redisClient.expire(`employee:${socket.userId}`, 600);
                } else {
                    liveLocations.set(socket.userId, locationData);
                }
            } catch (cacheErr) {
                console.error('Redis save error:', cacheErr);
                liveLocations.set(socket.userId, locationData);
            }

            // ✅ Broadcast real-time update
            if (req.io) {
                req.io.to(socket.company_id.toString()).emit('receive-Location', locationData);
            }
            //   // ✅ Save current location in Redis (fast cache)
            //   await redisClient.hSet(`employee:${socket.userId}`, locationData);

            //   // ✅ Broadcast to all employees in same company
            // //   io.to(`company_${socket.company_id}`).emit('receiveLocation', locationData);

            // io.to(socket.company_id.toString()).emit('receive-Location', locationData);

        } catch (err) {
            console.error('sendLocation Error:', err);
        }
    });

    socket.on("disconnect", () => {
    });
});




const PORT = process.env.PORT || 2100;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ HTTPS Server running at https://0.0.0.0:${PORT}`);
});


