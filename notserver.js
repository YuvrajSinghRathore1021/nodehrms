// // ===============================
// // 📦 Backend: server.js (Node.js + Express + Socket.IO)
// // ===============================

// const express = require("express");
// const http = require("http");
// const socketIo = require("socket.io");
// const cors = require("cors");
// const bodyParser = require("body-parser");
// const mysql = require("mysql2");

// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"]
//   }
// });

// app.use(cors());
// app.use(bodyParser.json());

// // MySQL DB Connection
// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "hrmsnew"
// });

// // Socket.IO connection
// io.on("connection", socket => {
//   console.log("User connected:", socket.id);

//   socket.on("join", (userId) => {
//     socket.join(userId.toString());
//     console.log(`User ${userId} joined room`);
//   });

//   socket.on("disconnect", () => {
//     console.log("User disconnected:", socket.id);
//   });
// });

// // Send Notification API
// app.post("/send-notification", (req, res) => {
//   const {
//     company_id, sender_id, receiver_id,
//     page_url, img_url, title, message, notification_type
//   } = req.body;

//   const sql = `INSERT INTO notifications 
//     (company_id, sender_id, receiver_id, page_url, img_url, title, message, notification_type)
//     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

//   db.query(sql, [
//     company_id, sender_id, receiver_id,
//     page_url, img_url, title, message, notification_type
//   ], (err, result) => {
//     if (err) return res.status(500).send(err);

//     const notification = {
//       id: result.insertId,
//       company_id, sender_id, receiver_id,
//       page_url, img_url, title, message,
//       is_read: false,
//       created_at: new Date(),
//       notification_type
//     };

//     console.log("Sending real-time notification to:", receiver_id);
//     io.to(receiver_id.toString()).emit("receive-notification", notification);

//     res.status(200).send({ success: true, notification });
//   });
// });

// // Get Notifications API
// app.get("/notifications/:userId", (req, res) => {
//   const { userId } = req.params;
//   db.query("SELECT * FROM notifications WHERE receiver_id = ? ORDER BY created_at DESC", [userId], (err, results) => {
//     if (err) return res.status(500).send(err);
//     res.status(200).send(results);
//   });
// });

// // Mark As Read API
// app.post("/notifications/:id/read", (req, res) => {
//   const { id } = req.params;
//   db.query("UPDATE notifications SET is_read = 1 WHERE id = ?", [id], (err) => {
//     if (err) return res.status(500).send(err);
//     res.send({ success: true });
//   });
// });

// // Start server
// const PORT = 5000;
// server.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });
// // ===============================








const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const uplodefile = require('./api/homePage/Uplodefile');
const loginSinup = require('./api/homePage/loginSinup');
const Datatable = require('./api/homePage/Datatable');
const NotificationApi = require('./api/notification/Notificationsystem');

// API Routes
app.use('/userapi', loginSinup);
app.use('/Datatable', Datatable);
app.use('/uplodefile', uplodefile);

// Send io to routes that need real-time communication
app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use('/NotificationApi', NotificationApi);  // <== Make sure Notificationsystem uses `req.io`

app.use('/uploads', express.static(path.join(__dirname, './uploads')));

// Socket.IO Setup
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    console.log("User joined room:", userId);
    socket.join(userId?.toString());
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
