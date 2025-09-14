const db = require('../models');

function parseArgs() {
  const opts = {};
  process.argv.slice(2).forEach(a => {
    if (a.startsWith('--ta=')) opts.tahun_ajaran_id = Number(a.split('=')[1]);
    if (a.startsWith('--kelas=')) opts.kelas_id = Number(a.split('=')[1]);
    if (a.startsWith('--siswa=')) opts.siswa_id = Number(a.split('=')[1]);
  });
  return opts;
}

(async ()=>{
  const { tahun_ajaran_id, kelas_id, siswa_id } = parseArgs();
  if (!tahun_ajaran_id) {
    console.error('Usage: node scripts/add_missing_histories.js --ta=<tahun_ajaran_id> [--kelas=<kelas_id>] [--siswa=<siswa_id>]');
    process.exit(1);
  }

  try {
    // gather siswa to check
    const where = {};
    if (kelas_id) where.kelas_id = kelas_id;
    if (siswa_id) where.id = siswa_id;

    const siswas = await db.Siswa.findAll({ where });
    console.log('Found', siswas.length, 'siswa to check');

    let created = 0;
    for (const s of siswas) {
      // Resolve master TA from provided periode id
      let masterTa = null; try { const p = await db.PeriodeAjaran.findByPk(tahun_ajaran_id); if (p) masterTa = p.master_tahun_ajaran_id || (p.master && p.master.id) || null; } catch(e){}
      const exists = await db.SiswaKelasHistory.findOne({ where: { siswa_id: s.id, master_tahun_ajaran_id: masterTa } });
      if (!exists) {
        await db.SiswaKelasHistory.create({ siswa_id: s.id, kelas_id: s.kelas_id || null, master_tahun_ajaran_id: masterTa, note: 'auto-added history' });
        created++;
        console.log('Created history for siswa id=', s.id);
      }
    }

    console.log(`Done. Created ${created} history records.`);
    process.exit(0);
  } catch (err) {
    console.error('Error creating histories', err);
    process.exit(2);
  }
})();
