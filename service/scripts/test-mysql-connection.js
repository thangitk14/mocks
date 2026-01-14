// Node.js script to test MySQL connection with detailed error information
// Run with: node test-mysql-connection.js

const mysql = require('mysql2');
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'developer'}` });

const config = {
  host: process.env.DB_HOST || 'mock_mysql',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Ttct@835!!',
  database: process.env.DB_NAME || 'service_dev',
  connectTimeout: 5000
};

console.log('==========================================');
console.log('MySQL Connection Test');
console.log('==========================================');
console.log('');
console.log('Connection Configuration:');
console.log('  Host:', config.host);
console.log('  Port:', config.port);
console.log('  User:', config.user);
console.log('  Password:', config.password ? '[HIDDEN]' : '[NOT SET]');
console.log('  Database:', config.database);
console.log('');

// Test connection
console.log('Attempting to connect...');
const connection = mysql.createConnection(config);

connection.connect((err) => {
  if (err) {
    console.error('❌ Connection FAILED!');
    console.error('');
    console.error('Error Details:');
    console.error('  Code:', err.code);
    console.error('  Message:', err.message);
    console.error('  SQL State:', err.sqlState);
    console.error('  SQL Message:', err.sqlMessage);
    console.error('');
    
    // Provide specific recommendations based on error code
    if (err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ECONNREFUSED') {
      console.log('Possible Issues:');
      console.log('  1. Wrong username or password');
      console.log('  2. User does not have permission to connect from this host');
      console.log('  3. MySQL server is not accepting remote connections');
      console.log('');
      console.log('Solutions:');
      console.log('  1. Check DB_USER and DB_PASSWORD environment variables');
      console.log('  2. Grant permissions: CREATE USER IF NOT EXISTS \'root\'@\'%\' IDENTIFIED BY \'password\';');
      console.log('  3. Grant privileges: GRANT ALL PRIVILEGES ON *.* TO \'root\'@\'%\' WITH GRANT OPTION;');
      console.log('  4. Flush privileges: FLUSH PRIVILEGES;');
    } else if (err.code === 'ENOTFOUND' || err.code === 'EHOSTUNREACH') {
      console.log('Possible Issues:');
      console.log('  1. MySQL host is incorrect or unreachable');
      console.log('  2. Docker network issue');
      console.log('');
      console.log('Solutions:');
      console.log('  1. Check DB_HOST environment variable (should be: mock_mysql)');
      console.log('  2. Verify MySQL container is running: docker ps | grep mock_service_mysql');
      console.log('  3. Check Docker network: docker network inspect mock_service_network');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.log('Possible Issues:');
      console.log('  1. Database does not exist');
      console.log('');
      console.log('Solutions:');
      console.log('  1. Check DB_NAME environment variable');
      console.log('  2. Create database: CREATE DATABASE ' + config.database + ';');
    }
    
    process.exit(1);
  } else {
    console.log('✅ Connection SUCCESSFUL!');
    console.log('');
    
    // Test query
    connection.query('SELECT DATABASE() as current_db, USER() as current_user, VERSION() as version', (err, results) => {
      if (err) {
        console.error('Query error:', err.message);
      } else {
        console.log('Connection Info:');
        console.log('  Current Database:', results[0].current_db);
        console.log('  Current User:', results[0].current_user);
        console.log('  MySQL Version:', results[0].version);
      }
      
      connection.end();
      process.exit(0);
    });
  }
});



