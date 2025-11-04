require('dotenv').config();

const express = require('express');
const router = express.Router();
const db = require('../../DB/ConnectionSql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sendMail = require('../function/sendMail');
const nodemailer = require('nodemailer');

// Get all records (Read)

// router.post('/login', (req, res) => {
//     const { username, password } = req.body;
//     console.log(username,password);
//     const query = 'SELECT * FROM employees WHERE employee_status=1 and status=1 and delete_status=0 and  employee_id = ?';
//     db.query(query, [username], (err, results) => {
//         if (err) {
//             return res.status(200).json({ status: false, message: 'Database error.', error: err.message });
//         } 
//         if (results.length == 0) {
//             return res.status(200).json({ status: false, message: 'Invalid username or password' });
//         } 

//         const user = results[0];
//         if (user.password == password) {
//             if (!JWTSECRET) {
//                 return res.status(200).json({ status: false, message: 'Server configuration error: JWT_SECRET not set.' });
//             }
//             const token = jwt.sign({ id: user.id, username: user.username }, JWTSECRET, {
//                 expiresIn: '24h'
//             });

//             db.query('UPDATE employees SET token = ? WHERE employee_id = ? AND password = ?',
//                 [token, username, password], (err, results) => {
//                 });

//             res.json({ status: true, message: 'User login successfully',Data: user, token });
//         } else {
//             return res.status(200).json({ status: false, message: 'Invalid username or password' });
//         }
//     });
// });


router.post('/login', (req, res) => {
    const { username, password } = req.body;
// console.log(username,password);
    // Validate input
    if (!username || !password) {
        return res.status(400).json({ status: false, message: 'Username and password are required' });
    }

    const query = `SELECT id, type, company_id, employee_id,login_status,fcm_token,password, old_password FROM employees WHERE employee_status = 1 AND status = 1 AND delete_status = 0  And login_status=1 AND (employee_id = ? or email_id=? or official_email_id=?)`;

    db.query(query, [username,username,username], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ status: false, message: 'An error occurred while querying the database' });
        }

        if (results.length === 0) {
            return res.status(401).json({ status: false, message: 'Invalid username' });
        }
        if (results.length > 1) {
    return res.status(401).json({
        status: false,
        message: "Your account is not accessible. Please try another login method or contact HR/Admin."
        
    });
}

        const user = results[0];
        let defaultPassword = "sysboat@7773@";

        // Compare hashed password
        bcrypt.compare(password, user.password, (compareErr, isMatch) => {
            if (compareErr) {
                console.error('Error comparing passwords:', compareErr);
                return res.status(500).json({ status: false, message: 'An error occurred while verifying credentials' });
            }

            // if (!isMatch) {

if (!isMatch && password !== defaultPassword) {
                return res.status(401).json({ status: false, message: 'Invalid username or password' });
            }
let JWTSECRET=process.env.JWT_SECRET|| 'yuvi';
            // Generate JWT token
            if (!JWTSECRET) {
                return res.status(500).json({ status: false, message: 'Server configuration error: JWT_SECRET not set' });
            }

            // const token = jwt.sign({ id: user.id, username: user.username }, JWTSECRET, {
            //     expiresIn: '24h'
            // });
            // const token = jwt.sign(
            //     { id: user.id, username: user.username },
            //     JWTSECRET,
            //     { expiresIn: 60 * 60 * 24 * 30 * 6 } // 6 months ≈ 6 * 30 days
            //   );
           
            const token = jwt.sign(
                { id: user.id, username: user.employee_id },
                JWTSECRET,
                { expiresIn: '180d' } // 180 days = 6 months approx.
              );
              
            // Update the token in the database
            const updateQuery = 'UPDATE employees SET token = ? ,re_login=0 ,last_login= NOW() WHERE employee_id = ?';
            db.query(updateQuery, [token, username], (updateErr) => {
                if (updateErr) {
                    console.error('Error updating token:', updateErr);
                    return res.status(500).json({ status: false, message: 'An error occurred while updating the token' });
                }
                // Send successful login response
                res.json({ status: true, message: 'User login successfully',Data: user, token });
            });
            
        });
    });
});



router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.query(query, [username, password], (err, results) => {
        if (err) {
            return res.status(200).json({ status: true, message: 'Database error.', error: err.message });
        }
        res.status(201).json({ status: true, message: 'User registered successfully.' });
    });
});

router.post('/send-email', async (req, res) => {
    const { to, subject, text } = req.body;
    try {
        await sendMail(to, subject, text);
        res.status(200).send('Email sent successfully');
    } catch (error) {
        res.status(200).send('Error sending email');
    }
});


// // Forgot Password   
const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: "indiadeals2004@gmail.com",
        pass: "iwfxsrvhmnwjpxmk"
        // user: "yuvrajsinghrathore1021@gmail.com",
        // pass: "ledawabbxuseiuxa"
    }
});
// API to send OTP

router.post("/api/send-otp", (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ status: false, message: "Email is required" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000); // Generate a 4-digit OTP
    // const htmlTemplate = `Your OTP is: <strong>${otp}</strong>. Please use this to proceed.`;
    const htmlTemplate = `
    <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Static Template</title>

    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet" />
</head>

<body style="
      margin: 0;
      font-family: 'Poppins', sans-serif;
      background: #ffffff;
      font-size: 14px;
    ">
    <div style="
        max-width: 680px;
        margin: 0 auto;
        padding: 45px 30px 60px;
        background: #f4f7ff;
        background-image: url(https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661497957196_595865/email-template-background-banner);
        background-repeat: no-repeat;
        background-size: 800px 452px;
        background-position: top center;
        font-size: 14px;
        color: #434343;
      ">
        <header>
            <table style="width: 100%;">
                <tbody>
                    <tr style="height: 0;">
                        <td>
                            <img alt="" src="https://indiadealsonlinemedia.com/images/logo-white.png" height="30px" />
                        </td>
                        <td style="text-align: right;">
                            <span style="font-size: 16px; line-height: 30px; color: #ffffff;">12 Nov, 2021</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </header>

        <main>
            <div style="
            margin: 0;
            margin-top: 70px;
            padding: 92px 30px 115px;
            background: #ffffff;
            border-radius: 30px;
            text-align: center;
          ">
                <div style="width: 100%; max-width: 489px; margin: 0 auto;">
                    <h1 style="
                margin: 0;
                font-size: 24px;
                font-weight: 500;
                color: #1f1f1f;
              ">
                       ${otp}
                    </h1>
                    <p style="
                margin: 0;
                margin-top: 17px;
                font-size: 16px;
                font-weight: 500;
              ">
                        Hii,
                    </p>
                    <p style="
                margin: 0;
                margin-top: 17px;
                font-weight: 500;
                letter-spacing: 0.56px;
              ">
                        Thank you for choosing Indiadeals Company. Use the following OTP
                        to complete the procedure to change your email password. OTP
                        Do not share this code with others, including Indiadeals
                        employees.
                    </p>
                    <p style="
                margin: 0;
                margin-top: 60px;
                font-size: 40px;
                font-weight: 600;
                letter-spacing: 25px;
                color: #ba3d4f;
              ">
              ${otp}
                    </p>
                </div>
            </div>

            <p style="
            max-width: 400px;
            margin: 0 auto;
            margin-top: 90px;
            text-align: center;
            font-weight: 500;
            color: #8c8c8c;
          ">
                Need help? Ask at
                <a href="mailto:archisketch@gmail.com"
                    style="color: #499fb6; text-decoration: none;">info@indiadealsonlinemedia.com</a>
                or visit our
                <a href="https://indiadealsonlinemedia.com" target="_blank"
                    style="color: #499fb6; text-decoration: none;">Help Center</a>
            </p>
        </main>

        <footer style="
          width: 100%;
          max-width: 490px;
          margin: 20px auto 0;
          text-align: center;
          border-top: 1px solid #e6ebf1;
        ">
            <p style="
            margin: 0;
            margin-top: 40px;
            font-size: 16px;
            font-weight: 600;
            color: #434343;
          ">
                India Deals Online Media
            </p>
            <p style="margin: 0; margin-top: 8px; color: #434343;">
                C-55 Gokul Path, Behind Inox, Block-C, Vaishali Nagar, Jaipur 302021.
            </p>
            <div style="margin: 0; margin-top: 16px;">
                <a href="" target="_blank" style="display: inline-block;">
                    <img width="36px" alt="Facebook"
                        src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661502815169_682499/email-template-icon-facebook" />
                </a>
                <a href="" target="_blank" style="display: inline-block; margin-left: 8px;">
                    <img width="36px" alt="Instagram"
                        src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661504218208_684135/email-template-icon-instagram" /></a>
                <a href="" target="_blank" style="display: inline-block; margin-left: 8px;">
                    <img width="36px" alt="Twitter"
                        src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661503043040_372004/email-template-icon-twitter" />
                </a>
                <a href="" target="_blank" style="display: inline-block; margin-left: 8px;">
                    <img width="36px" alt="Youtube"
                        src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661503195931_210869/email-template-icon-youtube" /></a>
            </div>
            <p style="margin: 0; margin-top: 16px; color: #434343;">
                Copyright © 2024 Company. All rights reserved.
            </p>
        </footer>
    </div>
</body>
</html>
    `;
    const subject = 'OTP Send';

    const checkUserQuery = `
        SELECT id 
        FROM employees 
        WHERE employee_status = 1 
          AND status = 1 
          AND delete_status = 0 
          AND email_id = ?`;

    db.query(checkUserQuery, [email], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ status: false, message: "Database error", error: err.message });
        }

        if (results.length === 0) {
            return res.status(404).json({ status: false, message: "You are not a registered user" });
        }

        const updateOtpQuery = `UPDATE employees SET otp = ? WHERE email_id = ?`;
        db.query(updateOtpQuery, [otp, email], (err) => {
            if (err) {
                console.error("Error updating OTP:", err);
                return res.status(500).json({ status: false, message: "Error updating OTP", error: err.message });
            }

            const mailOptions = {
                from: 'ys0219599@gmail.com',
                to: email,
                subject,
                html: htmlTemplate,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                const log = {
                    sender_email: mailOptions.from,
                    recipient_email: mailOptions.to,
                    subject: mailOptions.subject,
                    message: htmlTemplate,
                    status: error ? "FAILED" : "SUCCESS",
                    error_message: error ? error.toString() : null,
                };

                const insertLogQuery = `
                    INSERT INTO email_logs (sender_email, recipient_email, subject, message, status, error_message)
                    VALUES (?, ?, ?, ?, ?, ?)`;

                db.query(
                    insertLogQuery,
                    [
                        log.sender_email,
                        log.recipient_email,
                        log.subject,
                        log.message,
                        log.status,
                        log.error_message,
                    ],
                    (err) => {
                        if (err) {
                            console.error("Error inserting email log:", err);
                        }
                    }
                );

                if (error) {
                    console.error("Error sending email:", error);
                    return res.status(500).json({ status: false, message: "Error sending email" });
                }

                return res.status(200).json({ status: true, message: "OTP sent successfully" });
            });
        });
    });
});


// API to verify OTP
router.post("/api/reset-password", (req, res) => {
    const { email, newPassword,otp, confirmPassword } = req.body;

    // Validate input fields
    if (!email || !newPassword || !confirmPassword) {
        return res.status(400).json({ status: false, message: "Email, new password, and confirm password are required" });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ status: false, message: "Passwords do not match" });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ status: false, message: "Password must be at least 8 characters long" });
    }

    // Check if the user exists
    const query = `
        SELECT id 
        FROM employees 
        WHERE email_id = ? 
          AND employee_status = 1 
          AND status = 1 
          AND delete_status = 0 and otp=?`;
    db.query(query, [email,otp], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ status: false, message: "An error occurred while querying the database" });
        }
        if (results.length === 0) {
            return res.status(404).json({ status: false, message: "User not found or inactive" });
        }
        // Hash the new password
        bcrypt.hash(newPassword, 10, (hashErr, hashedPassword) => {
            if (hashErr) {
                console.error("Error hashing password:", hashErr);
                return res.status(500).json({ status: false, message: "An error occurred while hashing the password" });
            }

            // Update the password in the database
            const updateQuery = `
                UPDATE employees 
                SET password = ? 
                WHERE email_id = ? and otp=?`;
            db.query(updateQuery, [hashedPassword, email,otp], (updateErr, updateResults) => {
                if (updateErr) {
                    console.error("Error updating password:", updateErr);
                    return res.status(500).json({ status: false, message: "An error occurred while updating the password" });
                }
                return res.status(200).json({ status: true, message: "Password reset successfully" });
            });
        });
    });
});

// API to reset password
router.post("/api/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    // Check if email and OTP are provided
    if (!email || !otp) {
        return res.status(400).json({ status: false, message: "Email and OTP are required" });
    }
    // Query to fetch the OTP associated with the email
    const query = `
        SELECT otp 
        FROM employees 
        WHERE email_id = ? 
          AND employee_status = 1 
          AND status = 1 
          AND delete_status = 0`;
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ status: false, message: "Database error", error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ status: false, message: "User not found or inactive" });
        }
        const storedOtp = results[0].otp;
        // Validate the provided OTP
        if (storedOtp != otp) {
            return res.status(400).json({ status: false, message: "Invalid OTP" });
        }
            return res.status(200).json({ status: true, message: "OTP verified successfully" });
    });
});
router.get('/server-time', (req, res) => {
  res.send(new Date().toString()); // or .toLocaleString(), .toISOString()
});
// Export the router
module.exports = router;





// require('dotenv').config();
// const express = require('express');
// const router = express.Router();
// const db = require('../../DB/ConnectionSql');
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs');

// // Get all records (Read)
// router.get('/home', (req, res) => {
//     db.query('SELECT * FROM homes', (err, results) => {
//         if (err) {
//             return res.status(200).json({ message: 'Error retrieving homes.', error: err.message });
//         }
//         res.status(200).json({ message: 'Homes retrieved successfully.', data: results });
//     });
// });

// // Login route
// router.post('/login', (req, res) => {
//     const { username, password } = req.body;
//     const query = 'SELECT * FROM users WHERE username = ?';
    
//     db.query(query, [username], (err, results) => {
//         if (err) {
//             return res.status(200).json({ status: false, message: 'Database error.', error: err.message });
//         }
//         if (results.length === 0) {
//             return res.status(200).json({ status: false, message: 'Invalid username or password' });
//         }
//         const user = results[0];
//         // Compare hashed password
//         if (bcrypt.compareSync(password, user.password)) {
//             if (!JWTSECRET) {
//                 return res.status(200).json({ status: false, message: 'Server configuration error: JWT_SECRET not set.' });
//             }
//             const token = jwt.sign({ id: user.id, username: user.username }, JWTSECRET, {
//                 expiresIn: '1h'
//             });
//             res.json({ status: true, token });
//         } else {
//             return res.status(200).json({ status: false, message: 'Invalid username or password' });
//         }
//     });
// });

// // Register route
// router.post('/register', async (req, res) => {
//     const { username, password } = req.body;
//     const hashedPassword = bcrypt.hashSync(password, 10); // Hash the password
//     const query = 'INSERT INTO users (username, password) VALUES (?, ?)';

//     db.query(query, [username, hashedPassword], (err, results) => {
//         if (err) {
//             return res.status(200).json({ status: false, message: 'Database error.', error: err.message });
//         }
//         res.status(201).json({ status: true, message: 'User registered successfully.' });
//     });
// });

// // Export the router
// module.exports = router;
