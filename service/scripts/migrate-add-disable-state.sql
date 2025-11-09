-- Migration: Add 'Disable' to mock_responses.state ENUM
-- Run this script if you have an existing database

-- Check if 'Disable' is not in the ENUM, then add it
SET @dbname = DATABASE();
SET @tablename = 'mock_responses';
SET @columnname = 'state';

-- Modify ENUM to include 'Disable'
ALTER TABLE mock_responses 
MODIFY COLUMN state ENUM('Active', 'Forward', 'Disable') DEFAULT 'Active';

