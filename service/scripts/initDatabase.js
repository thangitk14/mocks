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

    // Create or update default admin user (always reset to default)
    const adminPassword = await bcrypt.hash('Test@123', 10);
    await connection.query(
      `INSERT INTO users (id, name, username, password, created_by, updated_by, state, expired_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = ?,
         username = ?,
         password = ?,
         updated_by = ?,
         state = ?,
         expired_time = ?`,
      [1, 'System Administrator', 'admin', adminPassword, 0, 0, 'Active', null,
       'System Administrator', 'admin', adminPassword, 0, 'Active', null]
    );
    console.log('Default admin user created/updated (username: admin, password: Test@123)');

    // Delete existing role assignments for admin user (to ensure clean state)
    await connection.query('DELETE FROM role_user WHERE user_id = ?', [1]);
    console.log('Cleared existing role assignments for admin user');

    // Assign ADMIN role to admin user
    const [adminRole] = await connection.query(
      'SELECT id FROM roles WHERE code = ? LIMIT 1',
      ['ADMIN']
    );
    if (adminRole && adminRole.length > 0) {
      await connection.query(
        'INSERT INTO role_user (user_id, role_id) VALUES (?, ?)',
        [1, adminRole[0].id]
      );
      console.log('ADMIN role assigned to admin user');
    }

    // Create mapping_domains table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mapping_domains (
        id INT PRIMARY KEY AUTO_INCREMENT,
        project_name VARCHAR(255) NOT NULL,
        path VARCHAR(255) NOT NULL UNIQUE,
        forward_domain VARCHAR(255) NOT NULL,
        created_by INT DEFAULT 0,
        updated_by INT DEFAULT 0,
        state ENUM('Active', 'InActive') DEFAULT 'Active',
        forward_state ENUM('SomeApi', 'AllApi', 'NoneApi') DEFAULT 'NoneApi',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_path (path),
        INDEX idx_state (state),
        INDEX idx_forward_state (forward_state)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('Mapping domains table created or already exists');

    // Create api_logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS api_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        domain_id INT NOT NULL,
        headers TEXT,
        body TEXT,
        query TEXT,
        method VARCHAR(10) NOT NULL,
        status INT,
        toCUrl TEXT,
        response_headers TEXT,
        response_body TEXT,
        duration INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (domain_id) REFERENCES mapping_domains(id) ON DELETE CASCADE,
        INDEX idx_domain_id (domain_id),
        INDEX idx_created_at (created_at),
        INDEX idx_method (method),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('API logs table created or already exists');

    // Create mock_responses table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mock_responses (
        id INT PRIMARY KEY AUTO_INCREMENT,
        domain_id INT NOT NULL,
        name VARCHAR(500),
        path VARCHAR(500) NOT NULL,
        method VARCHAR(10) NOT NULL,
        status_code INT NOT NULL,
        delay INT DEFAULT 0,
        headers TEXT,
        body TEXT,
        state ENUM('Active', 'Forward', 'Disable') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (domain_id) REFERENCES mapping_domains(id) ON DELETE CASCADE,
        -- Removed UNIQUE constraint to allow multiple mocks with same path/method (for Save More feature)
        -- The latest Active mock will be used (ORDER BY created_at DESC)
        INDEX idx_domain_id (domain_id),
        INDEX idx_path (path),
        INDEX idx_method (method),
        INDEX idx_state (state)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('Mock responses table created or already exists');

    // Create mock_groups table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mock_groups (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('Mock groups table created or already exists');

    // Create mock_group_responses table (junction table for many-to-many relationship)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mock_group_responses (
        id INT PRIMARY KEY AUTO_INCREMENT,
        group_id INT NOT NULL,
        mock_response_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES mock_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (mock_response_id) REFERENCES mock_responses(id) ON DELETE CASCADE,
        INDEX idx_group_id (group_id),
        INDEX idx_mock_response_id (mock_response_id),
        UNIQUE KEY unique_group_mock (group_id, mock_response_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('Mock group responses table created or already exists');

    // ============================================
    // MIGRATIONS FOR MOCK_RESPONSES TABLE
    // ============================================

    // Migration 1: Add name column if it doesn't exist (for existing tables)
    try {
      await connection.query(`
        ALTER TABLE mock_responses 
        ADD COLUMN name VARCHAR(500)
      `);
      console.log('Name column added to mock_responses');
    } catch (error) {
      // Column might already exist, ignore error
      if (error.message.includes('Duplicate column name')) {
        console.log('Name column already exists in mock_responses');
      }
    }

    // Migration 2: Update state ENUM to include 'Disable' if it doesn't exist
    try {
      const [rows] = await connection.query(`
        SELECT COLUMN_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'mock_responses' 
          AND COLUMN_NAME = 'state'
      `);
      
      if (rows && rows.length > 0) {
        const columnType = rows[0].COLUMN_TYPE;
        // Check if 'Disable' is not in the ENUM
        if (!columnType.includes('Disable')) {
          await connection.query(`
            ALTER TABLE mock_responses 
            MODIFY COLUMN state ENUM('Active', 'Forward', 'Disable') DEFAULT 'Active'
          `);
          console.log('✓ Updated mock_responses.state ENUM to include Disable');
        } else {
          console.log('✓ mock_responses.state ENUM already includes Disable');
        }
      }
    } catch (error) {
      // Column might not exist yet (table not created), or already updated
      if (error.message.includes("doesn't exist") || error.message.includes('Unknown column')) {
        console.log('State column does not exist yet (will be created with correct ENUM)');
      } else {
        console.log('Error checking/updating state ENUM (may already be updated):', error.message);
      }
    }

    // Migration 3: Remove UNIQUE constraint to allow multiple mocks with same path/method
    // This allows "Save More" feature to create multiple mocks
    try {
      const [constraints] = await connection.query(`
        SELECT CONSTRAINT_NAME 
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'mock_responses' 
          AND CONSTRAINT_NAME = 'unique_domain_path_method'
          AND CONSTRAINT_TYPE = 'UNIQUE'
      `);
      
      if (constraints && constraints.length > 0) {
        await connection.query(`
          ALTER TABLE mock_responses DROP INDEX unique_domain_path_method
        `);
        console.log('✓ Removed UNIQUE constraint from mock_responses (allows multiple mocks with same path/method)');
      } else {
        console.log('✓ UNIQUE constraint does not exist (may have been removed already)');
      }
    } catch (error) {
      if (error.message.includes("doesn't exist") || error.message.includes('Unknown key')) {
        console.log('UNIQUE constraint does not exist (may have been removed already)');
      } else {
        console.log('Error removing UNIQUE constraint:', error.message);
      }
    }

    // ============================================
    // MIGRATIONS FOR API_LOGS TABLE
    // ============================================

    // Migration 4: Add response_headers and response_body columns if they don't exist (for existing tables)
    try {
      await connection.query(`
        ALTER TABLE api_logs 
        ADD COLUMN response_headers TEXT
      `);
      console.log('Response headers column added');
    } catch (error) {
      // Column might already exist, ignore error
      if (error.message.includes('Duplicate column name')) {
        console.log('Response headers column already exists');
      }
    }
    
    try {
      await connection.query(`
        ALTER TABLE api_logs 
        ADD COLUMN response_body TEXT
      `);
      console.log('Response body column added');
    } catch (error) {
      // Column might already exist, ignore error
      if (error.message.includes('Duplicate column name')) {
        console.log('Response body column already exists');
      }
    }
    
    try {
      await connection.query(`
        ALTER TABLE api_logs 
        ADD COLUMN duration INT
      `);
      console.log('Duration column added');
    } catch (error) {
      // Column might already exist, ignore error
      if (error.message.includes('Duplicate column name')) {
        console.log('Duration column already exists');
      }
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
