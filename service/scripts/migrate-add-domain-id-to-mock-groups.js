const mysql = require('mysql2/promise');
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'developer'}` });

async function migrateAddDomainIdToMockGroups() {
  let connection;

  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('========================================');
    console.log('Migration: Add domain_id to mock_groups table');
    console.log('========================================');

    // Check if column exists
    const [columns] = await connection.query(`
      SELECT COUNT(*) as count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'mock_groups'
        AND COLUMN_NAME = 'domain_id'
    `, [process.env.DB_NAME]);

    if (columns[0].count === 0) {
      console.log('Adding domain_id column...');
      await connection.query(`
        ALTER TABLE mock_groups 
        ADD COLUMN domain_id INT NOT NULL DEFAULT 1 AFTER id
      `);
      console.log('✓ Column domain_id added');
    } else {
      console.log('✓ Column domain_id already exists');
    }

    // Check if index exists
    const [indexes] = await connection.query(`
      SELECT COUNT(*) as count
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'mock_groups'
        AND INDEX_NAME = 'idx_domain_id'
    `, [process.env.DB_NAME]);

    if (indexes[0].count === 0) {
      console.log('Adding idx_domain_id index...');
      await connection.query(`
        ALTER TABLE mock_groups 
        ADD INDEX idx_domain_id (domain_id)
      `);
      console.log('✓ Index idx_domain_id added');
    } else {
      console.log('✓ Index idx_domain_id already exists');
    }

    // Check if foreign key exists
    const [foreignKeys] = await connection.query(`
      SELECT COUNT(*) as count
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'mock_groups'
        AND CONSTRAINT_NAME = 'fk_mock_groups_domain_id'
    `, [process.env.DB_NAME]);

    if (foreignKeys[0].count === 0) {
      console.log('Adding foreign key fk_mock_groups_domain_id...');
      await connection.query(`
        ALTER TABLE mock_groups 
        ADD CONSTRAINT fk_mock_groups_domain_id 
        FOREIGN KEY (domain_id) 
        REFERENCES mapping_domains(id) 
        ON DELETE CASCADE
      `);
      console.log('✓ Foreign key fk_mock_groups_domain_id added');
    } else {
      console.log('✓ Foreign key fk_mock_groups_domain_id already exists');
    }

    console.log('========================================');
    console.log('Migration Complete');
    console.log('========================================');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateAddDomainIdToMockGroups()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateAddDomainIdToMockGroups;

