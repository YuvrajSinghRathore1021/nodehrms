// ================== BASIC SETUP ==================
const express = require("express");
const http = require("http");
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
// // localhost
// const server = http.createServer(app);
// live 
const fs = require('fs');
const https = require('https');

const sslOptions = {
    key: fs.readFileSync('./ssl/server.key'),
    cert: fs.readFileSync('./ssl/server.cert')
};

const server = https.createServer(sslOptions, app);

// ================== SOCKET + REDIS ==================
const { Server } = require("socket.io");
const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");


// ================== DB & HELPERS ==================
const db = require("./DB/ConnectionSql");
const { getEmployeeProfile } = require("./helpers/getEmployeeProfile");
require("./autorun/cron");

// ================== MIDDLEWARE ==================
app.use(cors());
app.use(express.json());

// ================== REDIS SETUP ==================

const pubClient = createClient({
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});

const subClient = pubClient.duplicate();

// ✅ REQUIRED error handlers
pubClient.on("error", (err) => console.error("❌ Redis Pub Error:", err.message));
subClient.on("error", (err) => console.error("❌ Redis Sub Error:", err.message));

(async () => {
    try {
        await pubClient.connect();
        await subClient.connect();
        console.log("✅ Redis Pub/Sub connected");
    } catch (err) {
        console.error("❌ Redis connection failed:", err.message);
    }
})();

// 🧠 In-memory fallback
const liveLocations = new Map();
// ================== SOCKET.IO ==================
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
    transports: ["websocket"]
});

// 🔥 Redis adapter (FIXED)
io.adapter(createAdapter(pubClient, subClient));


// expose socket to APIs
app.use((req, res, next) => {
    req.io = io;
    next();
});

// ================== AUTH ==================
const JWT_SECRET = process.env.JWT_SECRET || "yuvi";

const authenticateToken = (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) {
        return res.status(403).json({ status: false, message: "Token not found" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ status: false, message: "Invalid token" });
        }
        req.user = user;
        next();
    });
};

// ================== ROUTES ==================
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
const Mail = require('./api/function/sendMail');
const DetailsUpload = require('./api/directory/DetailsUpload');
const payrollRule = require('./api/payrol/payrollRule');
const pay = require('./api/payrol/Pay');
const penaltie = require('./api/payrol/Penaltie');
const logshandel = require('./api/leave/logshandel');
const excelexports = require('./api/excel/excelexports');
const AttendanceApp = require('./api/app/attendance/Attendance');
const LeaveApp = require('./api/app/leave/Leave');
const HolidayApi = require('./api/app/Holiday/HolidayApi');
const Profile = require('./api/app/profile/Profile');
const WorkWeek = require('./api/app//workweek/WorkWeek');
const Salaryslip = require('./api/app/paysalaryslip/Salaryslip');
const Employeesdetails = require('./api/app/employeesdetails/Employeesdetails');
const EmployeeLocationTracking = require('./api/location/EmployeeLocationTracking');
const FaceUplode = require('./api/faceauthorization/Uplode');
const NotificationApi = require('./api/notification/Notificationsystem');
const Levesubmit = require('./api/leave/levesubmit');
const Reports = require('./api/reports/Report');
const Salary = require('./api/Salary/Salary');
const Dashboard = require('./api/dashboard/Dashboard');
const Menu = require('./api/dashboard/Menu');
const ExcelEmployee = require('./api/directory/ExcelEmployee');
const Expenses = require('./api/expenses/Expenses');
const HrAttendance = require('./api/attendance/HrAttendance');
const Authentication = require('./api/faceauthorization/Authentication');
const facerecognition = require('./api/facerecognition/faceVerify');
const Attendancepolicy = require('./api/attendance/Attendancepolicy');
const Upload = require('./api/uploadFunclity/upload');
const notificationRoutes = require("./api/firebase/firebasenotification");

//////url
app.use("/api/notification", notificationRoutes);
app.use('/Company', authenticateToken, CompanyAdd); ////->done
app.use('/Admin', authenticateToken, AdminPage); ////->done
app.use('/Attendance', authenticateToken, Attendance);////->done
app.use('/Attendancemark', authenticateToken, Attendancemark); ////->done
app.use('/AttendanceApproval', authenticateToken, AttendanceApproval);////->done
app.use('/AttendanceApprovalLog', authenticateToken, AttendanceApprovalLog);///->done
app.use('/Directory', authenticateToken, Employeesdirectory); ////->done
app.use('/leaveapi', authenticateToken, leaveapi); /// ->done
app.use('/holidayapi', authenticateToken, holidayapi); ////->done
app.use('/AttendanceRules', authenticateToken, AttendanceRules);///->done
app.use('/Setting', authenticateToken, Setting); //// done
app.use('/AttendanceSetting', authenticateToken, AttendanceSetting);///->done
app.use('/Header', authenticateToken, Header); //// ->done
app.use('/Urls', authenticateToken, Urls);//// ->done
app.use('/rulesapi', authenticateToken, Rulesapi); ////->done
app.use('/logshandel', authenticateToken, logshandel); ///->done
app.use('/DetailsUpload', authenticateToken, DetailsUpload);////->done
app.use('/excelexports', excelexports);
// pay roll 
app.use('/payrollRule', authenticateToken, payrollRule);////->done
app.use('/pay', authenticateToken, pay);////->done
app.use('/penaltie', authenticateToken, penaltie);////->done
app.use('/dashboard', authenticateToken, Dashboard);////->done
app.use('/menu', authenticateToken, Menu);
// // app api Start
app.use('/AttendanceApp', AttendanceApp);////->done
app.use('/LeaveApp', authenticateToken, LeaveApp);////->done
app.use('/HolidayApiApp', authenticateToken, HolidayApi);////->done
app.use('/Profile', authenticateToken, Profile);////->done
app.use('/WorkWeekApp', authenticateToken, WorkWeek);////->done
app.use('/Employeesdetails', authenticateToken, Employeesdetails);////->done
app.use('/upload', Upload);
// app.use('/Excel', authenticateToken, ExcelEmployee);
app.use('/Excel', ExcelEmployee);
app.use('/Face', authenticateToken, FaceUplode);
app.use('/facerecognition', authenticateToken, facerecognition);
app.use('/PDFdow', Salaryslip);
// app.use('/PDFdow', authenticateToken, Salaryslip);
app.use('/Reports', authenticateToken, Reports);
// No authentication for userapi
app.use('/userapi', loginSinup);
app.use('/Datatable', Datatable);
app.use('/uplodefile', uplodefile);

app.use('/NotificationApi', authenticateToken, NotificationApi);
//Authentication
app.use('/authentication', authenticateToken, Authentication);
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
app.use('/attendancepolicy', authenticateToken, Attendancepolicy);


// ================== SOCKET LOGIC ==================
io.on("connection", (socket) => {
    // console.log("🔗 Socket connected:", socket.id);
    // ---------- JOIN ----------
    socket.on("join", ({ userId, company_id }) => {
        // console.log("🔗 Join request:", { userId, company_id });
        if (!userId || !company_id) return;

        socket.userId = userId;
        socket.company_id = company_id;
        socket.join(userId.toString());
        socket.join(company_id.toString());
        console.log(`👤 User ${userId} joined company ${company_id}`);
    });

    // ---------- PROFILE ----------
    socket.on("getProfile", async (payload) => {
        try {
            const result = await getEmployeeProfile(payload);
            socket.emit("profileResponse", result);
        } catch (err) {
            socket.emit("profileResponse", { status: false });
        }
    });




    /* -------- LIVE LOCATION -------- */
    socket.on("sendLocation", async (data) => {
        const userId = data.employee_id || socket.userId;
        const company_id = socket.company_id;

        if (!userId || !company_id) return;

        const locationData = {
            employee_id: userId,
            company_id,
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            timestamp: new Date().toISOString(),
        };

        try {
            await pubClient.hSet(
                `live_location:${userId}`,
                "user_id", userId.toString(),
                "company_id", company_id.toString(),
                "latitude", data.latitude.toString(),
                "longitude", data.longitude.toString(),
                "updated_at", Date.now().toString()
            );

            await pubClient.sAdd(
                `company_users:${company_id}`,
                userId.toString()
            );
        } catch (err) {
            console.error("❌ Redis error:", err.message);
            liveLocations.set(userId, locationData); // fallback fixed
        }
        // ✅ EMIT ONCE
        console.log("📍 Emitting location for user:", userId);
        console.log("📍 locationData:", locationData);
        io.to(company_id.toString()).emit("receive-Location", locationData);
    });

    socket.on("disconnect", () => {
        console.log("❌ Socket disconnected:", socket.id);
    });
});

// // ///================== SERVER START  Local==================
// server.listen(2100, "0.0.0.0", () => {
//     console.log("🚀 Server running on http://localhost:2100");
// });

///================== SERVER START  Live==================
const PORT = process.env.PORT || 2100;
server.listen(PORT, '::', () => {
    console.log(`✅ HTTPS Server running at https://0.0.0.0:${PORT}`);
});





