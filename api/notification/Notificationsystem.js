const express = require('express');
require('dotenv').config();
const router = express.Router();
const mysql = require('mysql2');
const { ConsoleMessage } = require('puppeteer');
const db = require('../../DB/ConnectionSql');

// // DB Connection
// const db = mysql.createConnection({
//   // new  rds connection    // 
//   host: 'database-1.c564ew8oajmx.ap-south-1.rds.amazonaws.com',
//   user: 'hrmsadmin',
//   password: 'HrmsAdmin123Latest',
//   database: 'hrms',
//   port: 3306

// });



router.post('/send', (req, res) => {
    const { userData, receiver_id, page_url, img_url, title, message, notification_type } = req.body;

    if (!userData || !receiver_id) {
        return res.status(400).json({ status: false, error: "Missing userData or receiver_id" });
    }

    let decodedUserData = null;

    try {
        const decodedString = Buffer.from(userData, "base64").toString("utf-8");
        decodedUserData = JSON.parse(decodedString);
    } catch (error) {
        return res.status(400).json({ status: false, error: "Invalid userData" });
    }

    if (!decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
    }

    // Store as string in DB
    const receiverIdStr = receiver_id.toString();

    const sql = `INSERT INTO notifications 
        (company_id, sender_id, receiver_id, page_url, img_url, title, message, notification_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [
        decodedUserData.company_id,
        decodedUserData.id,
        receiverIdStr,
        page_url,
        img_url,
        title,
        message,
        notification_type
    ], (err, result) => {
        if (err) return res.status(500).send(err);

        const notification = {
            id: result.insertId,
            company_id: decodedUserData.company_id,
            sender_id: decodedUserData.id,
            receiver_id: receiverIdStr,
            page_url,
            img_url,
            title,
            message,
            is_read: false,
            created_at: new Date(),
            notification_type
        };

        // Emit notification to each individual receiver
        const receiverIds = receiverIdStr.split(',').map(id => id.trim());
        receiverIds.forEach(id => {
            if (notification_type == 'message') {
                req.io.to(id).emit("receive-message", notification);
            } else {
                req.io.to(id).emit("receive-notification", notification);
            }

        });

        res.status(200).send({ success: true, notification });
    });
});



router.post('/NotificationGet', (req, res) => {
    const { userData, notification_type = '' } = req.body;
    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, "base64").toString("utf-8");
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: "Invalid userData" });
        }
    } else {
        return res.status(400).json({ status: false, error: "Missing userData" });
    }

    if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
        return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
    }
    db.query("SELECT * FROM notifications WHERE FIND_IN_SET(?, receiver_id) and notification_type =? ORDER BY created_at DESC", [decodedUserData.id, notification_type], (err, results) => {
        if (err) return res.status(500).send(err);

        return res.status(200).json({ status: true, data: results, message: 'Notification fetched successfully' });
    });
});


router.post('/read', (req, res) => {
    const { id } = req.body;
    db.query("UPDATE notifications SET is_read = 1 WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).send(err);
        return res.status(200).json({ status: true, message: 'Notification marked as read' });
    });
});



router.post('/SendLocation', (req, res) => {
    const { userData, latitude, longitude } = req.body;

    let decodedUserData = null;
    if (userData) {
        try {
            const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
            decodedUserData = JSON.parse(decodedString);
        } catch (error) {
            return res.status(400).json({ status: false, error: 'Invalid userData' });
        }
    }

    if (!decodedUserData || !decodedUserData.company_id || !decodedUserData.id) {
        return res.status(400).json({ status: false, error: 'company_id and id required' });
    }


    let employee_id = decodedUserData.id;
    let company_id = decodedUserData.company_id;

    const timestamp = new Date();
    const sqlCheckEmp = `SELECT profile_image,CONCAT(first_name,' ',last_name) as name FROM employees WHERE company_id=? And id = ?`;
    db.query(sqlCheckEmp, [company_id, employee_id], (err, Employeeresults) => {
        if (err) return res.status(500).json({ status: false, error: 'DB error', err });

        let profile_image = Employeeresults[0].profile_image;
        let name = Employeeresults[0].name;


        const sqlCheck = 'SELECT id FROM locations WHERE employee_id = ?';
        db.query(sqlCheck, [employee_id], (err, results) => {
            if (err) return res.status(500).json({ status: false, error: 'DB error', err });

            const locationData = { profile_image, name, employee_id, company_id, latitude, longitude, timestamp };

            if (results.length > 0) {

                // Update
                const sqlUpdate = `UPDATE locations SET latitude = ?, longitude = ?, timestamp = ? WHERE employee_id = ?`;
                db.query(sqlUpdate, [latitude, longitude, timestamp, employee_id], (err) => {
                    if (err) return res.status(500).json({ status: false, error: 'Update failed', err });

                    req.io.to(company_id.toString()).emit('receive-Location', locationData);

                    res.json({ status: true, message: 'Location updated', data: locationData });
                });
            } else {
                // Insert
                const sqlInsert = `INSERT INTO locations (employee_id, company_id, latitude, longitude, timestamp, type) VALUES (?, ?, ?, ?, ?, 1)`;
                db.query(sqlInsert, [employee_id, company_id, latitude, longitude, timestamp], (err) => {
                    if (err) return res.status(500).json({ status: false, error: 'Insert failed', err });

                    req.io.to(company_id.toString()).emit('receive-Location', locationData);
                    res.json({ status: true, message: 'Location inserted', data: locationData });
                });
            }
        });
    });
});






module.exports = router;
























// const express = require('express');
// require('dotenv').config();
// const router = express.Router();
// const db = require('../../DB/ConnectionSql');
// const Redis = require('redis');

// const redisClient = Redis.createClient({ url: process.env.REDIS_URL });
// redisClient.connect().then(() => console.log('✅ Redis connected')).catch(console.error);

// // Track last sync per employee (to avoid too frequent DB writes)
// const lastSyncMap = new Map();

// // Save in DB every 2–5 minutes (adjust as needed)  
// const SYNC_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

// // ✅ API to handle live location updates
// router.post('/SendLocation', async (req, res) => {
//   try {
//     const { userData, latitude, longitude } = req.body;
//     if (!userData || !latitude || !longitude)
//       return res.status(400).json({ status: false, error: 'Invalid data' });

//     const decoded = JSON.parse(Buffer.from(userData, 'base64').toString('utf8'));
//     const { id: employee_id, company_id } = decoded;
//     if (!employee_id || !company_id)
//       return res.status(400).json({ status: false, error: 'Invalid userData' });

//     const timestamp = new Date();

//     const locationData = {
//       employee_id,
//       company_id,
//       latitude,
//       longitude,
//       timestamp,
//     };

//     // ✅ Store latest location in Redis
//     await redisClient.hSet(`employee:${employee_id}`, {
//       latitude,
//       longitude,
//       timestamp: timestamp.toISOString(),
//       company_id,
//     });

//     // ✅ Broadcast to other clients (real-time update)
//     if (req.io) {
//       req.io.to(company_id.toString()).emit('receive-Location', locationData);
//     }

//     res.json({
//       status: true,
//       message: 'Location received (cached)',
//       data: locationData,
//     });
//   } catch (err) {
//     console.error('SendLocation error:', err);
//     res.status(500).json({ status: false, error: 'Server error', details: err.message });
//   }
// });

// // ✅ Background worker to sync Redis → MySQL periodically
// setInterval(async () => {
//   try {
//     const keys = await redisClient.keys('employee:*');
//     console.log(`⏳ Syncing ${keys.length} employees from Redis → DB`);

//     for (const key of keys) {
//       const loc = await redisClient.hGetAll(key);
//       if (!loc || !loc.latitude) continue;

//       const employee_id = key.split(':')[1];
//       const company_id = loc.company_id;
//       const latitude = loc.latitude;
//       const longitude = loc.longitude;
//       const timestamp = loc.timestamp;

//       const lastSync = lastSyncMap.get(employee_id);
//       if (lastSync && Date.now() - lastSync < SYNC_INTERVAL_MS) continue;

//       lastSyncMap.set(employee_id, Date.now());

//       const sql = `
//         INSERT INTO locations (employee_id, company_id, latitude, longitude, timestamp, type)
//         VALUES (?, ?, ?, ?, ?, 1)
//         ON DUPLICATE KEY UPDATE latitude=?, longitude=?, timestamp=?;
//       `;
//       db.query(sql, [employee_id, company_id, latitude, longitude, timestamp, latitude, longitude, timestamp], (err) => {
//         if (err) console.error('DB Sync Error:', err.message);
//       });
//     }

//     console.log('✅ Redis → MySQL sync completed');
//   } catch (err) {
//     console.error('Redis Sync Worker Error:', err);
//   }
// }, SYNC_INTERVAL_MS);

// // ✅ Graceful shutdown
// process.on('SIGINT', async () => {
//   await redisClient.quit();
//   console.log('Redis connection closed');
//   process.exit(0);
// });





// router.post('/send', (req, res) => {
//   const { userData, receiver_id, page_url, img_url, title, message, notification_type } = req.body;

//   if (!userData || !receiver_id) {
//     return res.status(400).json({ status: false, error: "Missing userData or receiver_id" });
//   }

//   let decodedUserData = null;

//   try {
//     const decodedString = Buffer.from(userData, "base64").toString("utf-8");
//     decodedUserData = JSON.parse(decodedString);
//   } catch (error) {
//     return res.status(400).json({ status: false, error: "Invalid userData" });
//   }

//   if (!decodedUserData.id || !decodedUserData.company_id) {
//     return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
//   }

//   // Store as string in DB
//   const receiverIdStr = receiver_id.toString();

//   const sql = `INSERT INTO notifications 
//         (company_id, sender_id, receiver_id, page_url, img_url, title, message, notification_type)
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

//   db.query(sql, [
//     decodedUserData.company_id,
//     decodedUserData.id,
//     receiverIdStr,
//     page_url,
//     img_url,
//     title,
//     message,
//     notification_type
//   ], (err, result) => {
//     if (err) return res.status(500).send(err);

//     const notification = {
//       id: result.insertId,
//       company_id: decodedUserData.company_id,
//       sender_id: decodedUserData.id,
//       receiver_id: receiverIdStr,
//       page_url,
//       img_url,
//       title,
//       message,
//       is_read: false,
//       created_at: new Date(),
//       notification_type
//     };

//     // Emit notification to each individual receiver
//     const receiverIds = receiverIdStr.split(',').map(id => id.trim());
//     receiverIds.forEach(id => {
//       if (notification_type == 'message') {
//         req.io.to(id).emit("receive-message", notification);
//       } else {
//         req.io.to(id).emit("receive-notification", notification);
//       }

//     });

//     res.status(200).send({ success: true, notification });
//   });
// });



// router.post('/NotificationGet', (req, res) => {
//   const { userData, notification_type = '' } = req.body;
//   let decodedUserData = null;
//   if (userData) {
//     try {
//       const decodedString = Buffer.from(userData, "base64").toString("utf-8");
//       decodedUserData = JSON.parse(decodedString);
//     } catch (error) {
//       return res.status(400).json({ status: false, error: "Invalid userData" });
//     }
//   } else {
//     return res.status(400).json({ status: false, error: "Missing userData" });
//   }

//   if (!decodedUserData || !decodedUserData.id || !decodedUserData.company_id) {
//     return res.status(400).json({ status: false, error: 'Employee ID and Company ID are required' });
//   }
//   db.query("SELECT * FROM notifications WHERE FIND_IN_SET(?, receiver_id) and notification_type =? ORDER BY created_at DESC", [decodedUserData.id, notification_type], (err, results) => {
//     if (err) return res.status(500).send(err);

//     return res.status(200).json({ status: true, data: results, message: 'Notification fetched successfully' });
//   });
// });


// router.post('/read', (req, res) => {
//   const { id } = req.body;
//   db.query("UPDATE notifications SET is_read = 1 WHERE id = ?", [id], (err) => {
//     if (err) return res.status(500).send(err);
//     return res.status(200).json({ status: true, message: 'Notification marked as read' });
//   });
// });


// module.exports = router;
