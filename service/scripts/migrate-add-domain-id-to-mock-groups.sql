-- ============================================
-- Migration: Add domain_id to mock_groups table
-- This script adds domain_id column to mock_groups to separate groups by forward domain
-- ============================================

-- Check if column exists before adding (MySQL doesn't support IF NOT EXISTS for ALTER TABLE)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'mock_groups'
  AND COLUMN_NAME = 'domain_id';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE mock_groups ADD COLUMN domain_id INT NOT NULL DEFAULT 1 AFTER id',
  'SELECT "Column domain_id already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index if not exists
SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'mock_groups'
  AND INDEX_NAME = 'idx_domain_id';

SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE mock_groups ADD INDEX idx_domain_id (domain_id)',
  'SELECT "Index idx_domain_id already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key if not exists
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'mock_groups'
  AND CONSTRAINT_NAME = 'fk_mock_groups_domain_id';

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE mock_groups ADD CONSTRAINT fk_mock_groups_domain_id FOREIGN KEY (domain_id) REFERENCES mapping_domains(id) ON DELETE CASCADE',
  'SELECT "Foreign key fk_mock_groups_domain_id already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- Migration Complete
-- ============================================

