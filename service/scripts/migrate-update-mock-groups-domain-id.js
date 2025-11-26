const mysql = require('mysql2/promise');
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'developer'}` });

async function migrateUpdateMockGroupsDomainId() {
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
    console.log('Migration: Update domain_id for existing mock_groups');
    console.log('========================================');

    // Check if mock_groups table exists
    const [tables] = await connection.query(`
      SELECT COUNT(*) as count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'mock_groups'
    `, [process.env.DB_NAME]);

    if (tables[0].count === 0) {
      console.log('⚠ Table mock_groups does not exist');
      return;
    }

    // Check if domain_id column exists
    const [columns] = await connection.query(`
      SELECT COUNT(*) as count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'mock_groups'
        AND COLUMN_NAME = 'domain_id'
    `, [process.env.DB_NAME]);

    if (columns[0].count === 0) {
      console.log('⚠ Column domain_id does not exist in mock_groups table');
      console.log('Please run migrate-add-domain-id-to-mock-groups.js first');
      return;
    }

    // Check if domain_id = 2 exists in mapping_domains
    const [domains] = await connection.query(`
      SELECT COUNT(*) as count
      FROM mapping_domains
      WHERE id = 2
    `);

    if (domains[0].count === 0) {
      console.log('⚠ Domain with id = 2 does not exist in mapping_domains');
      console.log('Please create domain with id = 2 first or update the migration script');
      return;
    }

    // Get current mock groups count
    const [currentGroups] = await connection.query(`
      SELECT COUNT(*) as count
      FROM mock_groups
    `);

    console.log(`Found ${currentGroups[0].count} mock groups in database`);

    if (currentGroups[0].count === 0) {
      console.log('✓ No mock groups to update');
      return;
    }

    // Get groups that need updating (where domain_id != 2 or is NULL)
    const [groupsToUpdate] = await connection.query(`
      SELECT id, name, domain_id
      FROM mock_groups
      WHERE domain_id IS NULL OR domain_id != 2
    `);

    if (groupsToUpdate.length === 0) {
      console.log('✓ All mock groups already have domain_id = 2');
      return;
    }

    console.log(`\nUpdating ${groupsToUpdate.length} mock groups to domain_id = 2:`);
    groupsToUpdate.forEach(group => {
      console.log(`  - ID: ${group.id}, Name: ${group.name}, Current domain_id: ${group.domain_id || 'NULL'}`);
    });

    // Update all mock groups to domain_id = 2
    const [result] = await connection.query(`
      UPDATE mock_groups
      SET domain_id = 2
      WHERE domain_id IS NULL OR domain_id != 2
    `);

    console.log(`\n✓ Updated ${result.affectedRows} mock groups to domain_id = 2`);

    // Verify update
    const [verifyGroups] = await connection.query(`
      SELECT COUNT(*) as count
      FROM mock_groups
      WHERE domain_id = 2
    `);

    console.log(`✓ Verification: ${verifyGroups[0].count} mock groups now have domain_id = 2`);

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
  migrateUpdateMockGroupsDomainId()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateUpdateMockGroupsDomainId;

