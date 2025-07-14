const mysql = require('mysql2');
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
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'hrmsnewlive'
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