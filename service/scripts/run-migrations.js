const migrateAddDisableState = require('./migrate-add-disable-state');
const migrateAddDomainIdToMockGroups = require('./migrate-add-domain-id-to-mock-groups');

async function runAllMigrations() {
  console.log('========================================');
  console.log('Running All Migrations');
  console.log('========================================\n');

  const migrations = [
    { name: 'Add Disable State', fn: migrateAddDisableState },
    { name: 'Add Domain ID to Mock Groups', fn: migrateAddDomainIdToMockGroups }
  ];

  for (const migration of migrations) {
    try {
      console.log(`\n[${migration.name}]`);
      console.log('----------------------------------------');
      await migration.fn();
      console.log(`✓ ${migration.name} completed\n`);
    } catch (error) {
      console.error(`✗ ${migration.name} failed:`, error.message);
      throw error;
    }
  }

  console.log('========================================');
  console.log('All Migrations Completed Successfully');
  console.log('========================================');
}

// Run migrations if called directly
if (require.main === module) {
  runAllMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = runAllMigrations;

