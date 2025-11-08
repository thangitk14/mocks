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

-- Insert default roles
INSERT IGNORE INTO roles (code, name, path) VALUES
  ('ADMIN', 'Administrator', '/*'),
  ('CONFIG_MANAGER', 'Configuration Manager', '/config/*'),
  ('USER_MANAGER', 'User Manager', '/users/*'),
  ('VIEWER', 'Viewer', '/view/*');

-- Insert default admin user
-- Password: Test@123 (bcrypt hashed)
-- Note: Password hash is generated with bcryptjs, 10 rounds
INSERT IGNORE INTO users (id, name, username, password, created_by, updated_by, state, expired_time)
VALUES (
  1,
  'System Administrator',
  'admin',
  '$2a$10$tAjbvG5/Z9Ts149obxmokeDTD3MBQ79jGHBDJH/nHCiiuDJvRmWFu', -- Test@123
  0,
  0,
  'Active',
  NULL
);

-- Assign ADMIN role to admin user
INSERT IGNORE INTO role_user (user_id, role_id)
SELECT 1, id FROM roles WHERE code = 'ADMIN' LIMIT 1;

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

-- Create api_logs table
CREATE TABLE IF NOT EXISTS api_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  domain_id INT NOT NULL,
  headers TEXT,
  body TEXT,
  query TEXT,
  method VARCHAR(10) NOT NULL,
  status INT,
  toCUrl TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (domain_id) REFERENCES mapping_domains(id) ON DELETE CASCADE,
  INDEX idx_domain_id (domain_id),
  INDEX idx_created_at (created_at),
  INDEX idx_method (method),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
