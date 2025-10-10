const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mysql = require("mysql2/promise");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// MySQL Connection
const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "hrmsnew",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

let onlineUsers = {};

// API Endpoints
app.get('/api/employees', async (req, res) => {
    const { userId } = req.query;

    try {
        // Get employees with last message and unread count
        const [employees] = await db.query(`
            SELECT 
                e.id, 
                CONCAT(e.first_name,' ', e.last_name) As name,
                e.email_id AS email,
                us.status,
                us.last_seen,
                (SELECT message FROM messages 
                 WHERE (sender_id = e.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = e.id)
                 ORDER BY timestamp DESC LIMIT 1) AS last_message,
                (SELECT COUNT(*) FROM messages 
                 WHERE sender_id = e.id AND receiver_id = ? AND status = 'delivered') AS unread_count
            FROM employees e
            LEFT JOIN user_status us ON e.id = us.user_id
            WHERE e.id != ?
            ORDER BY us.status DESC, us.last_seen DESC
        `, [userId, userId, userId, userId]);

        res.json({ employees });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.get('/api/messages/:userId/:receiverId', async (req, res) => {
    try {
        const { userId, receiverId } = req.params;

        const [messages] = await db.query(`
            SELECT m.*, CONCAT(e.first_name,' ', e.last_name) As sender_name  
            FROM messages m
            JOIN employees e ON m.sender_id = e.id
            WHERE (sender_id = ? AND receiver_id = ?) 
            OR (sender_id = ? AND receiver_id = ?) 
            ORDER BY timestamp
        `, [userId, receiverId, receiverId, userId]);

        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.post('/api/markAsRead', async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;

        await db.query(`
            UPDATE messages SET status = 'read' 
            WHERE sender_id = ? AND receiver_id = ? AND status != 'read'
        `, [senderId, receiverId]);

        // Emit event to update read status in real-time
        const [updatedMessages] = await db.query(`
            SELECT id FROM messages 
            WHERE sender_id = ? AND receiver_id = ? AND status = 'read'
            ORDER BY timestamp DESC LIMIT 10
        `, [senderId, receiverId]);

        const messageIds = updatedMessages.map(msg => msg.id);

        io.emit("messagesRead", {
            messageIds,
            senderId,
            receiverId
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Add GET notifications endpoint
app.get('/api/notifications', async (req, res) => {
    try {
        const { user_id } = req.query;
        const [notifications] = await db.query(
            `SELECT * FROM notifications 
            WHERE receiver_id = ? 
            ORDER BY is_read ASC, created_at DESC`,
            [user_id]
        );
        res.json({ notifications });
    } catch (error) {
        console.error("Fetch notifications error:", error);
        res.status(500).send("Server error");
    }
});

// Update notifications creation endpoint
app.post('/api/notifications', async (req, res) => {
    try {
        const { sender_id, receiver_id, title, message } = req.body;



        const [result] = await db.query(
            `INSERT INTO notifications 
            (sender_id, receiver_id, title, message) 
            VALUES (?, ?, ?, ?)`,
            [sender_id, receiver_id, title, message]
        );

        const [newNotification] = await db.query(
            `SELECT * FROM notifications WHERE id = ?`,
            [result.insertId]
        );

        // Emit to specific receiver
        if (onlineUsers[receiver_id]) {
            io.to(onlineUsers[receiver_id]).emit("newNotification", newNotification[0]);
        }

        res.status(201).json(newNotification[0]);
    } catch (error) {
        console.error("Create notification error:", error);
        res.status(500).send("Server error");
    }
});
app.post('/api/notifications/mark-read', async (req, res) => {
    const { id } = req.body;
    await db.query(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [id]);
    res.json({ success: true });
});


// Socket.io
io.on("connection", async (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join", async (userId) => {
        try {
            onlineUsers[userId] = socket.id;

            // Update user status to online
            await db.query(`
                INSERT INTO user_status (user_id, status, socket_id) 
                VALUES (?, 'online', ?)
                ON DUPLICATE KEY UPDATE status = 'online', socket_id = ?, last_seen = NULL
            `, [userId, socket.id, socket.id]);

            console.log(`User ${userId} joined with socket ${socket.id}`);
            io.emit('userStatusChanged', { userId, status: 'online' });
        } catch (err) {
            console.error("Error updating user status:", err);
        }
    });

    socket.on("sendMessage", async (data) => {
        try {
            const { senderId, receiverId, message } = data;

            // Save message to database
            const [result] = await db.query(`
                INSERT INTO messages (sender_id, receiver_id, message, status) 
                VALUES (?, ?, ?, 'sent')
            `, [senderId, receiverId, message]);

            const messageId = result.insertId;

            // Get the full message with sender info
            const [[savedMessage]] = await db.query(`
                SELECT m.*,CONCAT(e.first_name,' ', e.last_name) As sender_name
                FROM messages m
                JOIN employees e ON m.sender_id = e.id
                WHERE m.id = ?
            `, [messageId]);

            // If receiver is online, send message and update status to delivered
            if (onlineUsers[receiverId]) {
                savedMessage.status = 'delivered';
                await db.query(`
                    UPDATE messages SET status = 'delivered' WHERE id = ?
                `, [messageId]);

                io.to(onlineUsers[receiverId]).emit("receiveMessage", savedMessage);
            }

            // Send back to sender with the full message data
            socket.emit("messageSent", savedMessage);

            // Update last message for both users in their chat lists
            io.emit('updateLastMessage', {
                senderId,
                receiverId,
                lastMessage: message
            });

        } catch (err) {
            console.error("Error sending message:", err);
        }
    });

    socket.on("typing", (receiverId) => {
        const senderId = Object.keys(onlineUsers).find(key => onlineUsers[key] === socket.id);
        if (senderId && onlineUsers[receiverId]) {
            io.to(onlineUsers[receiverId]).emit("typing", senderId);
        }
    });

    socket.on("stopTyping", (receiverId) => {
        const senderId = Object.keys(onlineUsers).find(key => onlineUsers[key] === socket.id);
        if (senderId && onlineUsers[receiverId]) {
            io.to(onlineUsers[receiverId]).emit("stopTyping", senderId);
        }
    });

    socket.on("disconnect", async () => {
        try {
            // Find which user disconnected
            const userId = Object.keys(onlineUsers).find(key => onlineUsers[key] === socket.id);

            if (userId) {
                delete onlineUsers[userId];

                // Update user status to offline
                await db.query(`
                    UPDATE user_status 
                    SET status = 'offline', last_seen = CURRENT_TIMESTAMP 
                    WHERE user_id = ?
                `, [userId]);

                console.log(`User ${userId} disconnected`);
                io.emit('userStatusChanged', { userId, status: 'offline' });
            }
        } catch (err) {
            console.error("Error handling disconnect:", err);
        }
    });
});


// server.listen(3001, () => console.log("Server running on port 3001"));
app.listen(3001, '0.0.0.0', () => {
    console.log('✅ Server is running on http://0.0.0.0:3001');
});