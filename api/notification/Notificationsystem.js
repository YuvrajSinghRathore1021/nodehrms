const express = require('express');
require('dotenv').config();
const router = express.Router();
const mysql = require('mysql2');

// DB Connection
const db = mysql.createConnection({

  // host: process.env.host || 'localhost',
  // user: process.env.user || 'hrmsadmin',
  // password: process.env.password || 'Hrms@Admin123!',
  // database: process.env.database || 'hrmsnew'

  // host: process.env.host || 'localhost',
  // user: process.env.user || 'hrmsadminnew',
  // password: process.env.password || '!Hrms@Admin!123@Latest!',
  // database: process.env.database || 'hrmsnewlatest',
  // port: 3306


  // host: 'localhost',
  // user: 'root',
  // password: '',
  // database: 'hrmslatest',


  ////// on aws live
  host: process.env.host || 'localhost',
  user: process.env.user || 'hrmsadminnew',
  password: process.env.password || '!Hrms@Admin!123@Latest!',
  database: process.env.database || 'hrmsnewlatest',
  port: 3306


  // host: '13.204.128.230',
  // user: 'hrmsadminnew',
  // password: '!Hrms@Admin!123@Latest!',
  // database: 'hrmsnewlatest',
  // port: 3306

});

// Send Notification
// router.post('/send', (req, res) => {
//   const { userData, receiver_id, page_url, img_url, title, message, notification_type } = req.body;
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
//   const sql = `INSERT INTO notifications 
//     (company_id, sender_id, receiver_id, page_url, img_url, title, message, notification_type)
//     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

//   db.query(sql, [decodedUserData.company_id, decodedUserData.id, receiver_id, page_url, img_url, title, message, notification_type], (err, result) => {
//     if (err) return res.status(500).send(err);
//     const notification = {
//       id: result.insertId,
//       company_id: decodedUserData.company_id,
//       sender_id: decodedUserData.id,
//       receiver_id,
//       page_url,
//       img_url,
//       title,
//       message,
//       is_read: false,
//       created_at: new Date(),
//       notification_type
//     };
//     // Emit real-time notification using Socket.IO
//     req.io.to(receiver_id.toString()).emit("receive-notification", notification);
//     res.status(200).send({ success: true, notification });
//   });
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

          req.io.to(company_id.toString()).emit('receive-Loaction', locationData);
          res.json({ status: true, message: 'Location updated', data: locationData });
        });
      } else {
        // Insert
        const sqlInsert = `INSERT INTO locations (employee_id, company_id, latitude, longitude, timestamp, type) VALUES (?, ?, ?, ?, ?, 1)`;
        db.query(sqlInsert, [employee_id, company_id, latitude, longitude, timestamp], (err) => {
          if (err) return res.status(500).json({ status: false, error: 'Insert failed', err });

          req.io.to(company_id.toString()).emit('receive-Loaction', locationData);
          res.json({ status: true, message: 'Location inserted', data: locationData });
        });
      }
    });



  });
});




// router.post('/SendLocation', (req, res) => {
//   const { userData, latitude, longitude } = req.body;
//   let decodedUserData = null;

//   if (userData) {
//     try {
//       const decodedString = Buffer.from(userData, 'base64').toString('utf-8');
//       decodedUserData = JSON.parse(decodedString);
//     } catch (error) {
//       return res.status(400).json({ status: false, error: 'Invalid userData' });
//     }
//   }

//   if (!decodedUserData || !decodedUserData.company_id || !decodedUserData.id) {
//     return res.status(400).json({ status: false, error: 'company_id and id required' });
//   }

//   let employee_id = decodedUserData.id;
//   let company_id = decodedUserData.company_id;

//   const timestamp = new Date();



//   const sqlCheck = 'SELECT id FROM locations WHERE employee_id = ?';
//   // const sqlCheck = `SELECT e.profile_image,l.employee_id,CONCAT(e.first_name,' ',e.last_name) as name FROM locations l INNER JOIN employees e ON e.id=l.employee_id WHERE l.company_id=? And l.type=1 AND e.id=?`;
//   db.query(sqlCheck, [company_id, employee_id], (err, results) => {
//     if (err) return res.status(500).json({ status: false, error: 'DB error', err });

//     const locationData = { employee_id, company_id, latitude, longitude, timestamp };

//     if (results.length > 0) {
//       // Update
//       const sqlUpdate = `UPDATE locations SET latitude = ?, longitude = ?, timestamp = ? WHERE employee_id = ?`;
//       db.query(sqlUpdate, [latitude, longitude, timestamp, employee_id], (err) => {
//         if (err) return res.status(500).json({ status: false, error: 'Update failed', err });

//         req.io.to(company_id.toString()).emit('receive-Loaction', locationData);
//         res.json({ status: true, message: 'Location updated', data: locationData });
//       });
//     } else {
//       // Insert
//       const sqlInsert = `INSERT INTO locations (employee_id, company_id, latitude, longitude, timestamp, type) VALUES (?, ?, ?, ?, ?, 1)`;
//       db.query(sqlInsert, [employee_id, company_id, latitude, longitude, timestamp], (err) => {
//         if (err) return res.status(500).json({ status: false, error: 'Insert failed', err });

//         req.io.to(company_id.toString()).emit('receive-Loaction', locationData);
//         res.json({ status: true, message: 'Location inserted', data: locationData });
//       });
//     }
//   });
// });

module.exports = router;
