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
    // host: process.env.host || 'localhost',
    // user: process.env.user || 'root',
    // password: process.env.password || '',
    // database: process.env.database || 'hrmsnewlive'
    // port: 3306

    // host: 'localhost',
    // user: 'root',
    // password: '',
    // database: 'hrmslatest',

    //////on aws loacalhost on live server
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

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to the MySQL database.');
});

// Export the connection
module.exports = db;


//  host: '13.204.128.230',
//     user: 'hrmsadminnew',
//     password: '!Hrms@Admin!123@Latest!',
//     database: 'hrmsnewlatest'
