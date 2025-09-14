const db = require('../models');

(async function(){
  console.log('*** DROP ALL TABLES - START ***');
  try {
    await db.sequelize.authenticate();
    console.log('Connected to DB. Dropping all tables...');
    const qi = db.sequelize.getQueryInterface();
    // dropAllTables should remove all user tables
    await qi.dropAllTables();
    console.log('dropAllTables completed.');
    // Also try to drop SequelizeMeta if exists (some environments name it SequelizeMeta)
    try {
      await qi.dropTable('SequelizeMeta');
      console.log('Dropped SequelizeMeta table (if it existed).');
    } catch (err) {
      // ignore
      console.log('SequelizeMeta drop skipped or not present.');
    }
    console.log('*** DROP ALL TABLES - DONE ***');
    process.exit(0);
  } catch (err) {
    console.error('Error dropping tables:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
