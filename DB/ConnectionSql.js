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

    // //////on aws loacalhost on live server
    // host: process.env.host || 'localhost',
    // user: process.env.user || 'hrmsadminnew',
    // password: process.env.password || '!Hrms@Admin!123@Latest!',
    // database: process.env.database || 'hrmsnewlatest',
    // port: 3306

    // host: '13.204.128.230',
    // user: 'hrmsadminnew',///hrmsadmin
    // password: '!Hrms@Admin!123@Latest!',////Hrms@Admin@Latest@   ////@Hrms@Admin@123@Latest@ ///HrmsAdmin123Latest
    // database: 'hrmsnewlatest',
    // port: 3306



    // new  rds connection    // 
    host: 'database-1.c564ew8oajmx.ap-south-1.rds.amazonaws.com',
    user: 'hrmsadmin',
    password: 'HrmsAdmin123Latest',
    database: 'hrms',
    port: 3306
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
