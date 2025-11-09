-- ============================================
-- Complete Database Initialization Script
-- This script creates all tables and initial data
-- Run automatically when MySQL container starts for the first time
-- ============================================

-- Create users table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create role_user table (junction table for many-to-many relationship)
CREATE TABLE IF NOT EXISTS role_user (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_role (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_role_id (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create mapping_domains table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create api_logs table with all columns including duration
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
  duration INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (domain_id) REFERENCES mapping_domains(id) ON DELETE CASCADE,
  INDEX idx_domain_id (domain_id),
  INDEX idx_created_at (created_at),
  INDEX idx_method (method),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create mock_responses table
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
  state ENUM('Active', 'Forward') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (domain_id) REFERENCES mapping_domains(id) ON DELETE CASCADE,
  UNIQUE KEY unique_domain_path_method (domain_id, path, method),
  INDEX idx_domain_id (domain_id),
  INDEX idx_path (path),
  INDEX idx_method (method),
  INDEX idx_state (state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Migration: Add missing columns if table exists
-- These will only run if tables already exist (for existing databases)
-- ============================================

-- Add duration column to api_logs if it doesn't exist
-- Note: This uses a stored procedure approach to handle IF NOT EXISTS
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS AddColumnIfNotExists(
    IN tableName VARCHAR(64),
    IN columnName VARCHAR(64),
    IN columnDefinition TEXT
)
BEGIN
    DECLARE columnExists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO columnExists
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND COLUMN_NAME = columnName;
    
    IF columnExists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' ADD COLUMN ', columnName, ' ', columnDefinition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- Add missing columns using the procedure
CALL AddColumnIfNotExists('api_logs', 'duration', 'INT NULL AFTER response_body');
CALL AddColumnIfNotExists('api_logs', 'response_headers', 'TEXT AFTER toCUrl');
CALL AddColumnIfNotExists('api_logs', 'response_body', 'TEXT AFTER response_headers');
CALL AddColumnIfNotExists('mock_responses', 'name', 'VARCHAR(500) AFTER id');

-- Clean up procedure
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;

-- ============================================
-- Insert Initial Data
-- ============================================

-- Insert default roles
INSERT IGNORE INTO roles (code, name, path) VALUES
  ('ADMIN', 'Administrator', '/*'),
  ('CONFIG_MANAGER', 'Configuration Manager', '/config/*'),
  ('USER_MANAGER', 'User Manager', '/users/*'),
  ('VIEWER', 'Viewer', '/view/*');

-- Insert default admin user
-- Password: Test@123 (bcrypt hashed with 10 rounds)
-- Hash: $2a$10$tAjbvG5/Z9Ts149obxmokeDTD3MBQ79jGHBDJH/nHCiiuDJvRmWFu
INSERT IGNORE INTO users (id, name, username, password, created_by, updated_by, state, expired_time)
VALUES (
  1,
  'System Administrator',
  'admin',
  '$2a$10$tAjbvG5/Z9Ts149obxmokeDTD3MBQ79jGHBDJH/nHCiiuDJvRmWFu',
  0,
  0,
  'Active',
  NULL
);

-- Assign ADMIN role to admin user
INSERT IGNORE INTO role_user (user_id, role_id)
SELECT 1, id FROM roles WHERE code = 'ADMIN' LIMIT 1;

-- ============================================
-- Initialization Complete
-- ============================================
