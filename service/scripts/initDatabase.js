const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'developer'}` });

async function initDatabase() {
  let connection;

  try {
    // Create connection without database selected
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    console.log('Connected to MySQL server');

    // Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    console.log(`Database ${process.env.DB_NAME} created or already exists`);

    // Use the database
    await connection.query(`USE ${process.env.DB_NAME}`);

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_by INT DEFAULT 0,
        updated_by INT DEFAULT 0,
        role_user_id INT,
        state ENUM('Active', 'InActive', 'Expired') DEFAULT 'Active',
        expired_time DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_state (state)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('Users table created or already exists');

    // Create roles table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        code VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        path VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('Roles table created or already exists');

    // Create role_user table (junction table for many-to-many relationship)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS role_user (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        role_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_role (user_id, role_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_role_id (role_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('RoleUser table created or already exists');

    // Insert default roles if they don't exist
    const defaultRoles = [
      { code: 'ADMIN', name: 'Administrator', path: '/*' },
      { code: 'CONFIG_MANAGER', name: 'Configuration Manager', path: '/config/*' },
      { code: 'USER_MANAGER', name: 'User Manager', path: '/users/*' },
      { code: 'VIEWER', name: 'Viewer', path: '/view/*' }
    ];

    for (const role of defaultRoles) {
      await connection.query(
        'INSERT IGNORE INTO roles (code, name, path) VALUES (?, ?, ?)',
        [role.code, role.name, role.path]
      );
    }
    console.log('Default roles inserted');

    // Create default admin user
    const adminPassword = await bcrypt.hash('Test@123', 10);
    await connection.query(
      `INSERT IGNORE INTO users (id, name, username, password, created_by, updated_by, state, expired_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [1, 'System Administrator', 'admin', adminPassword, 0, 0, 'Active', null]
    );
    console.log('Default admin user created (username: admin, password: Test@123)');

    // Assign ADMIN role to admin user
    const [adminRole] = await connection.query(
      'SELECT id FROM roles WHERE code = ? LIMIT 1',
      ['ADMIN']
    );
    if (adminRole && adminRole.length > 0) {
      await connection.query(
        'INSERT IGNORE INTO role_user (user_id, role_id) VALUES (?, ?)',
        [1, adminRole[0].id]
      );
      console.log('ADMIN role assigned to admin user');
    }

    console.log('\nDatabase initialization completed successfully!');
    console.log('\nDefault roles created:');
    console.log('- ADMIN: Full access (path: /*)');
    console.log('- CONFIG_MANAGER: Configuration access (path: /config/*)');
    console.log('- USER_MANAGER: User management access (path: /users/*)');
    console.log('- VIEWER: View access (path: /view/*)');
    console.log('\nDefault admin user created:');
    console.log('- Username: admin');
    console.log('- Password: Test@123');
    console.log('- State: Active');
    console.log('- Roles: ADMIN (full access)');
    console.log('\nYou can now login with admin credentials or register new users.');

  } catch (error) {
    console.error('Error initializing database:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the initialization
initDatabase();
