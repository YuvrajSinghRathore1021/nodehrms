// new 
const mysql = require('mysql2');
require('dotenv').config();
// ✅ Create a MySQL connection pool
const pool = mysql.createPool({
    host: 'database-1.c564ew8oajmx.ap-south-1.rds.amazonaws.com',
    user: 'hrmsadmin',
    password: 'HrmsAdmin123Latest',
    database: 'hrms',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0


    // host: 'localhost',
    // user: 'root',
    // password: '',
    // database: 'hrms',
    // port: 3306,
    // waitForConnections: true,
    // connectionLimit: 10,
    // queueLimit: 0
});

// ✅ Test initial connection and handle errors
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed:', err);
    } else {
        console.log('✅ Connected to MySQL database.');
        connection.release(); // release back to pool
    }
});

// ✅ Handle unexpected MySQL disconnections gracefully
pool.on('error', (err) => {
    console.error('MySQL Pool Error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Reconnecting MySQL pool...');
    } else {
        throw err;
    }
});

// ✅ Export promise-based pool for async/await usage
module.exports = pool;


