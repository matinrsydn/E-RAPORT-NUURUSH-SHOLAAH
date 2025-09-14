const db = require('../models');

(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('DB connected via Sequelize.');

    const masters = await db.MasterTahunAjaran.findAll({
      order: [['nama_ajaran','ASC']],
      include: [{ model: db.PeriodeAjaran, as: 'periodes' }]
    });

    const out = masters.map(m => ({
      id: m.id,
      nama_ajaran: m.nama_ajaran,
      status: m.status,
      periodes: (m.periodes || []).map(p => ({ id: p.id, nama_ajaran: p.nama_ajaran, semester: p.semester, status: p.status }))
    }));

    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('DB check failed:', err && err.message ? err.message : err);
    process.exit(2);
  }
})();
