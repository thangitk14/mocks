const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'service_logs_mysql',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Test@123',
  database: process.env.DB_NAME || 'service_logs',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Promisify for async/await usage
const promisePool = pool.promise();

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    return;
  }
  console.log('Database connected successfully');
  connection.release();
});

module.exports = promisePool;

