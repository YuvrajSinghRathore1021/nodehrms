// ================== BASIC SETUP ==================
const express = require("express");
const http = require("http");
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
// ================== LOCATION BUFFER ==================
const BATCH_SIZE = 200; // per user

// config
// const BATCH_INTERVAL = 5 * 60 * 1000; // 5 min
const BATCH_INTERVAL = 5000; // 5 min
const MAX_BUFFER_SIZE = 500; // safety limit
const QUEUE_PREFIX = "location_queue:";

// // // localhost
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
// require("./autorun/cron");

// ================== MIDDLEWARE ==================
app.use(cors());
app.use(express.json());

// /// ================== REDIS SETUP ==================

// const pubClient = createClient({
//     url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
// });

// ================== REDIS SETUP ==================

const pubClient = createClient({
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    socket: {
        reconnectStrategy: retries => {
            console.log("🔄 Redis reconnect attempt:", retries);
            return Math.min(retries * 100, 3000);
        },
        keepAlive: 5000
    }
});

const subClient = pubClient.duplicate();

// Redis events
pubClient.on("error", err =>
    console.error("❌ Redis Pub Error:", err.message)
);
subClient.on("error", err =>
    console.error("❌ Redis Sub Error:", err.message)
);

pubClient.on("end", () =>
    console.log("❌ Redis disconnected")
);

pubClient.on("reconnecting", () =>
    console.log("🔄 Redis reconnecting...")
);

// ================== SOCKET.IO ==================
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"]
});

// Redis connect + adapter attach (IMPORTANT FIX)
(async () => {
    try {
        await pubClient.connect();
        await subClient.connect();
        console.log("✅ Redis connected");

        io.adapter(createAdapter(pubClient, subClient));
        console.log("✅ Socket.IO Redis adapter attached");

    } catch (err) {
        console.error("❌ Redis connection failed:", err.message);
    }
})();


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
    // console.log(req.body);
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ status: false, message: "Invalid token" });
        }

        let newUser = {
            id: user?.switch_id || user?.id || 0,
            company_id: user?.switch_company_id || user?.company_id || 0,
            employee_id: user?.employee_id || null,
            user_id: user?.id || 0,
            user_company_id: user?.company_id || 0,
            iat: user?.iat || null,
            exp: user?.exp || null
        }
        req.user = newUser;
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
const Blog = require('./api/posts/posts');
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
const LocationHistory = require('./api/location/LocationHistory');
const FaceUplode = require('./api/faceauthorization/Uplode');
const NotificationApi = require('./api/notification/Notificationsystem');
const Reports = require('./api/reports/Report');
const Salary = require('./api/Salary/Salary');
const Dashboard = require('./api/dashboard/Dashboard');
const Menu = require('./api/dashboard/Menu');
const ExcelEmployee = require('./api/directory/ExcelEmployee');
const Expenses = require('./api/expenses/Expenses');
const HrAttendance = require('./api/attendance/HrAttendance');
const Authentication = require('./api/faceauthorization/Authentication');
// const facerecognition = require('./api/facerecognition/faceVerify');
const Attendancepolicy = require('./api/attendance/Attendancepolicy');
const Upload = require('./api/uploadFunclity/upload');
const notificationRoutes = require("./api/firebase/firebasenotification");

//////url
// un-authentication 
app.use("/api/notification", notificationRoutes);
app.use('/excelexports', excelexports);
app.use('/upload', Upload);
app.use('/Excel', ExcelEmployee);
app.use('/PDFdow', Salaryslip);
app.use('/userapi', loginSinup);
app.use('/Datatable', Datatable);
app.use('/uplodefile', uplodefile);
app.use('/sendMail', Mail);
app.use('/Notification', Notification);

// authenticateToken api
app.use('/Company', authenticateToken, CompanyAdd); ////->done
app.use('/Blog', authenticateToken, Blog); ////->done
app.use('/AttendanceApp', authenticateToken, AttendanceApp);////->done
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

// pay roll 
app.use('/payrollRule', authenticateToken, payrollRule);////->done
app.use('/pay', authenticateToken, pay);////->done
app.use('/penaltie', authenticateToken, penaltie);////->done
app.use('/dashboard', authenticateToken, Dashboard);////->done
app.use('/menu', authenticateToken, Menu);
// // app api Start

app.use('/LeaveApp', authenticateToken, LeaveApp);////->done
app.use('/HolidayApiApp', authenticateToken, HolidayApi);////->done
app.use('/Profile', authenticateToken, Profile);////->done
app.use('/WorkWeekApp', authenticateToken, WorkWeek);////->done
app.use('/Employeesdetails', authenticateToken, Employeesdetails);////->done

// app.use('/Excel', authenticateToken, ExcelEmployee);

app.use('/Face', authenticateToken, FaceUplode);
// app.use('/facerecognition', authenticateToken, facerecognition);

// app.use('/PDFdow', authenticateToken, Salaryslip);
app.use('/Reports', authenticateToken, Reports);


app.use('/NotificationApi', authenticateToken, NotificationApi);
//Authentication
app.use('/authentication', authenticateToken, Authentication);

app.use('/uploads', express.static(path.join(__dirname, './uploads')));
// try
app.use('/EmployeeLocation', authenticateToken, EmployeeLocationTracking);
app.use('/LocationHistory', authenticateToken, LocationHistory);
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


    // ================== MEMORY FALLBACK ==================
    const liveLocations = new Map();
    // auto cleanup every hour
    setInterval(() => {
        liveLocations.clear();
        console.log("🧹 Cleared fallback locations");
    }, 1000 * 60 * 60);

    /* -------- LIVE LOCATION -------- */
    // socket.on("sendLocation", async (data) => {
    //     const userId = data.employee_id || socket.userId;
    //     const company_id = socket.company_id;
    //     if (!userId || !company_id) return;

    //     const locationData = {
    //         employee_id: userId,
    //         company_id,
    //         latitude: data.latitude || 0,
    //         longitude: data.longitude || 0,
    //         speed: data.speed || 0,
    //         recorded_at: new Date()
    //     };

    //     // ================== REDIS LIVE ==================
    //     try {
    //         await pubClient.hSet(
    //             `live_location:${userId}`,
    //             "user_id", userId.toString(),
    //             "company_id", company_id.toString(),
    //             "latitude", data.latitude.toString(),
    //             "longitude", data.longitude.toString(),
    //             "updated_at", Date.now().toString()
    //         );

    //         await pubClient.sAdd(
    //             `company_users:${company_id}`,
    //             userId.toString()
    //         );
    //     } catch (err) {
    //         console.error("❌ Redis error:", err.message);
    //     }

    //     // ================== BUFFER STORE ==================
    //     if (!locationBuffer.has(userId)) {
    //         locationBuffer.set(userId, []);
    //     }

    //     const userBuffer = locationBuffer.get(userId);

    //     // 👉 optional filter (noise remove)
    //     if (userBuffer.length > 0) {
    //         const last = userBuffer[userBuffer.length - 1];

    //         const distance = getDistance(
    //             last.latitude,
    //             last.longitude,
    //             locationData.latitude,
    //             locationData.longitude
    //         );

    //         if (distance < 30) return; // ignore small movement
    //     }

    //     userBuffer.push(locationData);

    //     // 👉 safety flush (overflow)
    //     if (userBuffer.length >= MAX_BUFFER_SIZE) {
    //         await flushUserBuffer(userId);
    //     }

    //     // ================== EMIT LIVE ==================
    //     io.to(company_id.toString()).emit("receive-Location", {
    //         employee_id: userId,
    //         company_id,
    //         latitude: data.latitude,
    //         longitude: data.longitude,
    //         timestamp: new Date().toISOString()
    //     });
    // });



    socket.on("sendLocation", async (data) => {
        const userId = data.employee_id || socket.userId;
        const company_id = socket.company_id;
        if (!userId || !company_id) return;

        const locationData = {
            employee_id: userId,
            company_id,
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            speed: data.speed || 0,
            recorded_at: getISTDateTime()
        };



        try {
            // // ================== REDIS LIVE ==================

            // await pubClient.hSet(`live_location:${userId}`, {
            //     user_id: userId.toString(),
            //     company_id: company_id.toString(),
            //     // latitude: data.latitude.toString(),
            //     // longitude: data.longitude.toString(),
            //     latitude: String(data.latitude ?? 0),
            //     longitude: String(data.longitude ?? 0),
            //     updated_at: Date.now().toString()
            // });

            try {
                await pubClient.hSet(
                    `live_location:${userId}`,
                    [
                        "user_id", String(userId),
                        "company_id", String(company_id),
                        "latitude", String(data.latitude),
                        "longitude", String(data.longitude),
                        "updated_at", String(Date.now())
                    ]
                );
            } catch (err) { }

            await pubClient.sAdd(`company_users:${company_id}`, userId.toString());
            const lastKey = `last_location:${userId}`;
            const last = await pubClient.get(lastKey);

            if (last) {
                const lastLoc = JSON.parse(last);

                const dist = getDistance(
                    lastLoc.latitude,
                    lastLoc.longitude,
                    locationData.latitude,
                    locationData.longitude
                );

                if (dist < 30) return;   // // // ignore
            }
            // ================== REDIS QUEUE ==================
            await pubClient.rPush(`${QUEUE_PREFIX}${userId}`, JSON.stringify(locationData));

            // save last location
            await pubClient.set(lastKey, JSON.stringify(locationData), { EX: 300 })

        } catch (err) {
            console.error("❌ Redis error:", err.message);
        }

        // ================== EMIT LIVE ==================
        io.to(company_id.toString()).emit("receive-Location", {
            employee_id: userId,
            company_id,
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: new Date().toISOString()
        });
    });
    socket.on("disconnect", () => {
        console.log("❌ Socket disconnected:", socket.id);
    });

});


setInterval(async () => {
    // console.log("⏳ Worker processing queues...");
    try {
        const keys = await pubClient.keys(`${QUEUE_PREFIX}*`);
        for (const key of keys) {
            const data = await pubClient.lRange(key, 0, BATCH_SIZE - 1);

            if (data.length === 0) continue;

            const parsed = data.map(d => JSON.parse(d));

            const values = parsed.map(loc => [
                loc.employee_id,
                loc.company_id,
                loc.latitude,
                loc.longitude,
                loc.speed,
                loc.recorded_at
            ]);

            await db.promise().query(
                `INSERT INTO employee_locations 
                (employee_id, company_id, latitude, longitude, speed, recorded_at)
                VALUES ?`,
                [values]
            );

            // remove processed data
            await pubClient.lTrim(key, data.length, -1);

            console.log(`✅ Inserted ${data.length} rows from ${key}`);
        }

    } catch (err) {
        console.error("❌ Worker error:", err.message);
    }

}, BATCH_INTERVAL);

// ================== GLOBAL ERROR PROTECTION ==================

process.on("uncaughtException", err => {
    console.error("🔥 Uncaught Exception:", err);
});

process.on("unhandledRejection", err => {
    console.error("🔥 Unhandled Rejection:", err);
});


// // //================== SERVER START  Local==================
// server.listen(2200, "0.0.0.0", () => {
//     console.log("🚀 Server running on http://localhost:2100");
// });

// ///================== SERVER START  Live==================
const PORT = process.env.PORT || 2100;
server.listen(PORT, '::', () => {
    console.log(`✅ HTTPS Server running at https://0.0.0.0:${PORT}`);
});

function getISTDateTime() {
    return new Date().toLocaleString("sv-SE", {
        timeZone: "Asia/Kolkata"
    }).replace("T", " ").slice(0, 19);
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const toRad = (x) => x * Math.PI / 180;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}










// // ================== BASIC SETUP ==================
// const express = require("express");
// const http = require("http");
// require("dotenv").config();
// const cors = require("cors");
// const jwt = require("jsonwebtoken");
// const path = require("path");

// const app = express();

// // localhost
// const server = http.createServer(app);

// // // live
// // const fs = require('fs');
// // const https = require('https');

// // const sslOptions = {
// //     key: fs.readFileSync('./ssl/server.key'),
// //     cert: fs.readFileSync('./ssl/server.cert')
// // };

// // const server = https.createServer(sslOptions, app);




// // ================== SOCKET + REDIS ==================
// const { Server } = require("socket.io");
// const { createClient } = require("redis");
// const { createAdapter } = require("@socket.io/redis-adapter");


// // ================== DB & HELPERS ==================
// const db = require("./DB/ConnectionSql");
// const { getEmployeeProfile } = require("./helpers/getEmployeeProfile");
// // require("./autorun/cron");

// // ================== MIDDLEWARE ==================
// app.use(cors());
// app.use(express.json());

// // /// ================== REDIS SETUP ==================

// // const pubClient = createClient({
// //     url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
// // });

// // ================== REDIS SETUP ==================

// const pubClient = createClient({
//     url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
//     socket: {
//         reconnectStrategy: retries => {
//             console.log("🔄 Redis reconnect attempt:", retries);
//             return Math.min(retries * 100, 3000);
//         },
//         keepAlive: 5000
//     }
// });

// const subClient = pubClient.duplicate();

// // Redis events
// pubClient.on("error", err =>
//     console.error("❌ Redis Pub Error:", err.message)
// );
// subClient.on("error", err =>
//     console.error("❌ Redis Sub Error:", err.message)
// );

// pubClient.on("end", () =>
//     console.log("❌ Redis disconnected")
// );

// pubClient.on("reconnecting", () =>
//     console.log("🔄 Redis reconnecting...")
// );

// // ================== SOCKET.IO ==================
// const io = new Server(server, {
//     cors: { origin: "*", methods: ["GET", "POST"] },
//     transports: ["websocket", "polling"]
// });

// // Redis connect + adapter attach (IMPORTANT FIX)
// (async () => {
//     try {
//         await pubClient.connect();
//         await subClient.connect();
//         console.log("✅ Redis connected");

//         io.adapter(createAdapter(pubClient, subClient));
//         console.log("✅ Socket.IO Redis adapter attached");

//     } catch (err) {
//         console.error("❌ Redis connection failed:", err.message);
//     }
// })();


// // expose socket to APIs
// app.use((req, res, next) => {
//     req.io = io;
//     next();
// });

// // ================== AUTH ==================
// const JWT_SECRET = process.env.JWT_SECRET || "yuvi";

// const authenticateToken = (req, res, next) => {
//     const token = req.headers["authorization"]?.split(" ")[1];
//     if (!token) {
//         return res.status(403).json({ status: false, message: "Token not found" });
//     }

//     jwt.verify(token, JWT_SECRET, (err, user) => {
//         if (err) {
//             return res.status(403).json({ status: false, message: "Invalid token" });
//         }
//         req.user = user;
//         next();
//     });
// };

// // ================== ROUTES ==================
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
// const Blog = require('./api/posts/posts');
// const AttendanceSetting = require('./api/attendance/AttendanceSetting');
// const Header = require('./api/Default/Header');
// const Notification = require('./api/notification/Notificationsystem');
// // const Rulesapi = require('./api/rules/rulesapi');
// const Rulesapi = require('./api/leave/rulesapi');
// const Urls = require('./api/homePage/url');
// const Mail = require('./api/function/sendMail');
// const DetailsUpload = require('./api/directory/DetailsUpload');
// const payrollRule = require('./api/payrol/payrollRule');
// const pay = require('./api/payrol/Pay');
// const penaltie = require('./api/payrol/Penaltie');
// const logshandel = require('./api/leave/logshandel');
// const excelexports = require('./api/excel/excelexports');
// const AttendanceApp = require('./api/app/attendance/Attendance');
// const LeaveApp = require('./api/app/leave/Leave');
// const HolidayApi = require('./api/app/Holiday/HolidayApi');
// const Profile = require('./api/app/profile/Profile');
// const WorkWeek = require('./api/app//workweek/WorkWeek');
// const Salaryslip = require('./api/app/paysalaryslip/Salaryslip');
// const Employeesdetails = require('./api/app/employeesdetails/Employeesdetails');
// const EmployeeLocationTracking = require('./api/location/EmployeeLocationTracking');
// const LocationHistory = require('./api/location/LocationHistory');
// const FaceUplode = require('./api/faceauthorization/Uplode');
// const NotificationApi = require('./api/notification/Notificationsystem');
// const Reports = require('./api/reports/Report');
// const Salary = require('./api/Salary/Salary');
// const Dashboard = require('./api/dashboard/Dashboard');
// const Menu = require('./api/dashboard/Menu');
// const ExcelEmployee = require('./api/directory/ExcelEmployee');
// const Expenses = require('./api/expenses/Expenses');
// const HrAttendance = require('./api/attendance/HrAttendance');
// const Authentication = require('./api/faceauthorization/Authentication');
// // const facerecognition = require('./api/facerecognition/faceVerify');
// const Attendancepolicy = require('./api/attendance/Attendancepolicy');
// const Upload = require('./api/uploadFunclity/upload');
// const notificationRoutes = require("./api/firebase/firebasenotification");

// //////url
// app.use("/api/notification", notificationRoutes);
// app.use('/Company', authenticateToken, CompanyAdd); ////->done
// app.use('/Blog', Blog);
// // app.use('/Blog', authenticateToken, Blog); ////->done
// app.use('/Admin', authenticateToken, AdminPage); ////->done
// app.use('/Attendance', authenticateToken, Attendance);////->done
// app.use('/Attendancemark', authenticateToken, Attendancemark); ////->done
// app.use('/AttendanceApproval', authenticateToken, AttendanceApproval);////->done
// app.use('/AttendanceApprovalLog', authenticateToken, AttendanceApprovalLog);///->done
// app.use('/Directory', authenticateToken, Employeesdirectory); ////->done
// app.use('/leaveapi', authenticateToken, leaveapi); /// ->done
// app.use('/holidayapi', authenticateToken, holidayapi); ////->done
// app.use('/AttendanceRules', authenticateToken, AttendanceRules);///->done
// app.use('/Setting', authenticateToken, Setting); //// done
// app.use('/AttendanceSetting', authenticateToken, AttendanceSetting);///->done
// app.use('/Header', authenticateToken, Header); //// ->done
// app.use('/Urls', authenticateToken, Urls);//// ->done
// app.use('/rulesapi', authenticateToken, Rulesapi); ////->done
// app.use('/logshandel', authenticateToken, logshandel); ///->done
// app.use('/DetailsUpload', authenticateToken, DetailsUpload);////->done
// app.use('/excelexports', excelexports);
// // pay roll
// app.use('/payrollRule', authenticateToken, payrollRule);////->done
// app.use('/pay', authenticateToken, pay);////->done
// app.use('/penaltie', authenticateToken, penaltie);////->done
// app.use('/dashboard', authenticateToken, Dashboard);////->done
// app.use('/menu', authenticateToken, Menu);
// // // app api Start
// app.use('/AttendanceApp', AttendanceApp);////->done
// app.use('/LeaveApp', authenticateToken, LeaveApp);////->done
// app.use('/HolidayApiApp', authenticateToken, HolidayApi);////->done
// app.use('/Profile', authenticateToken, Profile);////->done
// app.use('/WorkWeekApp', authenticateToken, WorkWeek);////->done
// app.use('/Employeesdetails', authenticateToken, Employeesdetails);////->done
// app.use('/upload', Upload);
// // app.use('/Excel', authenticateToken, ExcelEmployee);
// app.use('/Excel', ExcelEmployee);
// app.use('/Face', authenticateToken, FaceUplode);
// // app.use('/facerecognition', authenticateToken, facerecognition);
// app.use('/PDFdow', Salaryslip);
// // app.use('/PDFdow', authenticateToken, Salaryslip);
// app.use('/Reports', authenticateToken, Reports);
// // No authentication for userapi
// app.use('/userapi', loginSinup);
// app.use('/Datatable', Datatable);
// app.use('/uplodefile', uplodefile);

// app.use('/NotificationApi', authenticateToken, NotificationApi);
// //Authentication
// app.use('/authentication', authenticateToken, Authentication);
// // sendMail
// app.use('/sendMail', Mail);
// app.use('/Notification', Notification);
// app.use('/uploads', express.static(path.join(__dirname, './uploads')));
// // try
// app.use('/EmployeeLocation', authenticateToken, EmployeeLocationTracking);
// app.use('/LocationHistory', authenticateToken, LocationHistory);
// // Salary
// app.use('/Salary', authenticateToken, Salary);
// app.use('/Expenses', authenticateToken, Expenses);
// app.use('/hrAttendance', authenticateToken, HrAttendance);
// app.use('/attendancepolicy', authenticateToken, Attendancepolicy);


// // ================== SOCKET LOGIC ==================
// io.on("connection", (socket) => {
//     // console.log("🔗 Socket connected:", socket.id);
//     // ---------- JOIN ----------
//     socket.on("join", ({ userId, company_id }) => {
//         // console.log("🔗 Join request:", { userId, company_id });
//         if (!userId || !company_id) return;

//         socket.userId = userId;
//         socket.company_id = company_id;
//         socket.join(userId.toString());
//         socket.join(company_id.toString());
//         console.log(`👤 User ${userId} joined company ${company_id}`);
//     });

//     // ---------- PROFILE ----------
//     socket.on("getProfile", async (payload) => {
//         try {
//             const result = await getEmployeeProfile(payload);
//             socket.emit("profileResponse", result);
//         } catch (err) {
//             socket.emit("profileResponse", { status: false });
//         }
//     });


//     // ================== MEMORY FALLBACK ==================
//     const liveLocations = new Map();
//     // auto cleanup every hour
//     setInterval(() => {
//         liveLocations.clear();
//         console.log("🧹 Cleared fallback locations");
//     }, 1000 * 60 * 60);

//     /* -------- LIVE LOCATION -------- */
//     socket.on("sendLocation", async (data) => {
//         const userId = data.employee_id || socket.userId;
//         const company_id = socket.company_id;
//         if (!userId || !company_id) return;
//         const locationData = {
//             employee_id: userId,
//             company_id,
//             latitude: data.latitude || 0,
//             longitude: data.longitude || 0,
//             timestamp: new Date().toISOString(),
//         };

//         try {
//             await pubClient.hSet(
//                 `live_location:${userId}`,
//                 "user_id", userId.toString(),
//                 "company_id", company_id.toString(),
//                 "latitude", data.latitude.toString(),
//                 "longitude", data.longitude.toString(),
//                 "updated_at", Date.now().toString()
//             );

//             await pubClient.sAdd(
//                 `company_users:${company_id}`,
//                 userId.toString()
//             );
//         } catch (err) {
//             console.error("❌ Redis error:", err.message);
//             liveLocations.set(userId, locationData); // fallback fixed
//         }
//         // // ✅ EMIT ONCE
//         // console.log("📍 Emitting location for user:", userId);
//         // console.log("📍 locationData:", locationData);
//         io.to(company_id.toString()).emit("receive-Location", locationData);
//     });

//     socket.on("disconnect", () => {
//         console.log("❌ Socket disconnected:", socket.id);
//     });

// });
// // ================== GLOBAL ERROR PROTECTION ==================

// process.on("uncaughtException", err => {
//     console.error("🔥 Uncaught Exception:", err);
// });

// process.on("unhandledRejection", err => {
//     console.error("🔥 Unhandled Rejection:", err);
// });


// // //================== SERVER START  Local==================
// server.listen(2200, "0.0.0.0", () => {
//     console.log("🚀 Server running on http://localhost:2100");
// });

// // // ///================== SERVER START  Live==================
// // const PORT = process.env.PORT || 2100;
// // server.listen(PORT, '::', () => {
// //     console.log(`✅ HTTPS Server running at https://0.0.0.0:${PORT}`);
// // });








