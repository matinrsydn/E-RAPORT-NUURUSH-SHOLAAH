// scripts/reset_db_sync.js
// Quick developer utility: drop & recreate all tables from models, then exit.
// WARNING: destructive! Only run in development.

const db = require('../models');

async function run() {
  try {
    console.log('Disabling FOREIGN_KEY_CHECKS and starting sequelize.sync({ force: true }) - this will DROP and RECREATE all tables');
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.sequelize.sync({ force: true });
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Database schema recreated from models (force:true) with FK checks restored');
    process.exit(0);
  } catch (err) {
    console.error('Failed to sync database:', err);
    process.exit(1);
  }
}

run();
