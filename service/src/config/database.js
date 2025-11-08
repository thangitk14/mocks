const mysql = require('mysql2');
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'developer'}` });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
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
