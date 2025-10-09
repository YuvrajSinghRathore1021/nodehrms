// App Pass 
// ledawabbxuseiuxa


// const express = require('express');
// const router = express.Router();
// const nodemailer = require('nodemailer');
// const db = require('../../DB/ConnectionSql');

// const transporter = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: "yuvrajsinghrathore1021@gmail.com",
//         pass: "dccewr4ewdfwedwqw"
//     }
// });

// router.post("/api/send", (req, res) => {
//     const { from, to, subject, message } = req.body;

//     if (!from || !to || !subject || !message) {
//         return res.status(400).send("All fields (from, to, subject, message) are required.");
//     }

//     // HTML Template
//     const htmlTemplate = `
//     <!DOCTYPE html>
//     <html lang="en">
//     <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>Email Notification</title>
//         <style>
// body {
//     font-family: Arial, sans-serif;
//     margin: 0;
//     padding: 0;
//     background-color: #f4f4f4;
// }
// .container {
//     max-width: 600px;
//     margin: 20px auto;
//     background: #ffffff;
//     border-radius: 8px;
//     overflow: hidden;
//     box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
// }
// .header {
//     background-color: #0073e6;
//     color: #ffffff;
//     text-align: center;
//     padding: 20px;
// }
// .header h1 {
//     margin: 0;
// }
// .content {
//     padding: 20px;
//     color: #333333;
//     line-height: 1.6;
// }
// .content h2 {
//     margin-top: 0;
//     color: #0073e6;
// }
// .footer {
//     text-align: center;
//     background: #f4f4f4;
//     padding: 10px;
//     font-size: 14px;
//     color: #666666;
// }
//         </style>
//     </head>
//     <body>
//         <div class="container">
//             <!-- Header Section -->
//             <div class="header">
//                 <h1>Email Notification</h1>
//             </div>

//             <!-- Content Section -->
//             <div class="content">
//                 <h2>Hello,</h2>
//                 <p>${message}</p>
//                 <p>
//                     Best regards,<br>
//                     Your Team
//                 </p>
//             </div>

//             <!-- Footer Section -->
//             <div class="footer">
//                 &copy; ${new Date().getFullYear()} Your Company. All Rights Reserved.
//             </div>
//         </div>
//     </body>
//     </html>
//     `;
//     const mailOptions = {
//         from,
//         to,
//         subject,
//         html: htmlTemplate,
//     };
//     transporter.sendMail(mailOptions, (error, info) => {
//         if (error) {
//             console.error("Error sending email:", error);
//             return res.status(500).send("Error sending email.");
//         }
//         res.status(200).send("Email sent successfully");
//     });

// });

// module.exports = router;




const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const db = require('../../DB/ConnectionSql');
const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        // user: "yuvrajsinghrathore1021@gmail.com",
        // pass: "ledawabbxuseiuxa"
        user: "indiadeals2004@gmail.com",
        pass: "iwfxsrvhmnwjpxmk"
    }
});

router.post("/api/send", (req, res) => {
    const { from, to, subject, message } = req.body;

    // if (!from || !to || !subject || !message) {
    //     return res.status(400).send("All fields (from, to, subject, message) are required.");
    // }

    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Notification</title>
        <style>
                        body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                background: #ffffff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                background-color: #0073e6;
                color: #ffffff;
                text-align: center;
                padding: 20px;
            }
            .header h1 {
                margin: 0;
            }
            .content {
                padding: 20px;
                color: #333333;
                line-height: 1.6;
            }
            .content h2 {
                margin-top: 0;
                color: #0073e6;
            }
            .footer {
                text-align: center;
                background: #f4f4f4;
                padding: 10px;
                font-size: 14px;
                color: #666666;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Email Notification</h1>
            </div>
            <div class="content">
                <h2>Hello,</h2>
                <p>${message}</p>
                <p>
                    Best regards,<br>
                    Your Team
                </p>
            </div>
            <div class="footer">
                &copy; ${new Date().getFullYear()} Your Company. All Rights Reserved.
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
        from,
        to,
        subject,
        html: htmlTemplate,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        const log = {
            sender_email: from,
            recipient_email: to,
            subject,
            message,
            status: error ? "FAILED" : "SUCCESS",
            error_message: error ? error.toString() : null
        };

        // Insert log into the database
        const query = `
            INSERT INTO email_logs (sender_email, recipient_email, subject, message, status, error_message)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        db.query(query, [log.sender_email, log.recipient_email, log.subject, log.message, log.status, log.error_message], (err, result) => {
            if (err) {
                console.error("Error inserting email log:", err);
            }
        });
        if (error) {
            console.error("Error sending email:", error);
            return res.status(500).send("Error sending email.");
        }
        res.status(200).send("Email sent successfully");
    });
});

module.exports = router;














// const express = require('express');
// const router = express.Router();
// const nodemailer = require('nodemailer');
// const db = require('../../DB/ConnectionSql');

// const transporter = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: "yuvrajsinghrathore1021@gmail.com",
//         pass: "dccewr4ewdfwedwqw"
//     }
// });

// router.post("/api/send", (req, res) => {
//     const { from, to, cc, bcc, subject, message } = req.body;

//     if (!from || !to || !subject || !message) {
//         return res.status(400).send("Fields (from, to, subject, message) are required.");
//     }

//     const htmlTemplate = `
//     <!DOCTYPE html>
//     <html lang="en">
//     <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>Email Notification</title>
//         <style>
//             /* Add styles here */
//         </style>
//     </head>
//     <body>
//         <div class="container">
//             <div class="header">
//                 <h1>Email Notification</h1>
//             </div>
//             <div class="content">
//                 <h2>Hello,</h2>
//                 <p>${message}</p>
//                 <p>
//                     Best regards,<br>
//                     Your Team
//                 </p>
//             </div>
//             <div class="footer">
//                 &copy; ${new Date().getFullYear()} Your Company. All Rights Reserved.
//             </div>
//         </div>
//     </body>
//     </html>
//     `;

//     const mailOptions = {
//         from,
//         to,
//         cc, // Add CC here
//         bcc, // Add BCC here
//         subject,
//         html: htmlTemplate,
//     };

//     transporter.sendMail(mailOptions, (error, info) => {
//         const log = {
//             sender_email: from,
//             recipient_email: to,
//             cc_email: cc || null, // Include CC if provided
//             bcc_email: bcc || null, // Include BCC if provided
//             subject,
//             message,
//             status: error ? "FAILED" : "SUCCESS",
//             error_message: error ? error.toString() : null
//         };

//         // Insert log into the database
//         const query = `
//             INSERT INTO email_logs (sender_email, recipient_email, cc_email, bcc_email, subject, message, status, error_message)
//             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//         `;
//         db.query(query, [log.sender_email, log.recipient_email, log.cc_email, log.bcc_email, log.subject, log.message, log.status, log.error_message], (err, result) => {
//             if (err) {
//                 console.error("Error inserting email log:", err);
//             }
//         });

//         if (error) {
//             console.error("Error sending email:", error);
//             return res.status(500).send("Error sending email.");
//         }
//         res.status(200).send("Email sent successfully");
//     });
// });
// module.exports = router;
