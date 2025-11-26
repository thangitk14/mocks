const mysql = require('mysql2/promise');
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'developer'}` });

async function migrateAddDisableState() {
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
    console.log('Migration: Add Disable to mock_responses.state ENUM');
    console.log('========================================');

    // Check current ENUM values
    const [columns] = await connection.query(`
      SELECT COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'mock_responses'
        AND COLUMN_NAME = 'state'
    `, [process.env.DB_NAME]);

    if (columns.length === 0) {
      console.log('⚠ Table mock_responses or column state does not exist');
      return;
    }

    const columnType = columns[0].COLUMN_TYPE;
    console.log(`Current state column type: ${columnType}`);

    // Check if 'Disable' is already in the ENUM
    if (columnType.includes("'Disable'")) {
      console.log('✓ Disable state already exists in ENUM');
    } else {
      console.log('Modifying state column to include Disable...');
      await connection.query(`
        ALTER TABLE mock_responses 
        MODIFY COLUMN state ENUM('Active', 'Forward', 'Disable') DEFAULT 'Active'
      `);
      console.log('✓ State column updated to include Disable');
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
  migrateAddDisableState()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateAddDisableState;

