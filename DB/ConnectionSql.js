const mysql = require('mysql2');
require('dotenv').config();
// Create a MySQL connection

////live Time
// const db = mysql.createConnection({
//     host: 'localhost',
//     user: 'hrmsnewyuvraj',
//     password: 'hrms@india',
//     database: 'hrmsnew'
// });

////localhost Time

const db = mysql.createConnection({
    host: process.env.host || 'localhost',
    user: process.env.user || 'root',
    password: process.env.password || '',
    database: process.env.database || 'hrmsnewlive'
});


db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to the MySQL database.');
});

// Export the connection
module.exports = db;