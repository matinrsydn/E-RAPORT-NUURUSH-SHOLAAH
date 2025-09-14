const db = require('../models');

async function run() {
  try {
    await db.sequelize.authenticate();
    const masters = await db.MasterTahunAjaran.findAll({ raw: true });
    const pers = await db.PeriodeAjaran.findAll({ raw: true });
    console.log('Masters:', masters);
    console.log('Periodes:', pers);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
