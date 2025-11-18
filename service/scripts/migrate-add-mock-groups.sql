-- ============================================
-- Migration: Add Mock Groups Feature
-- This script creates mock_groups and mock_group_responses tables
-- ============================================

-- Create mock_groups table
CREATE TABLE IF NOT EXISTS mock_groups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create mock_group_responses table (junction table for many-to-many relationship)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Migration Complete
-- ============================================
