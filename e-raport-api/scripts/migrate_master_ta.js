const db = require('../models');

async function run() {
  try {
    console.log('Starting master TA migration...');
    const sequelize = db.sequelize;
    await sequelize.transaction(async (t) => {
      // get distinct nama_ajaran from TahunAjarans
      const [results] = await sequelize.query("SELECT DISTINCT nama_ajaran FROM `TahunAjarans`", { transaction: t });
      for (const row of results) {
        const nama = row.nama_ajaran;
        if (!nama) continue;
        let master = await db.MasterTahunAjaran.findOne({ where: { nama_ajaran: nama }, transaction: t });
        if (!master) {
          master = await db.MasterTahunAjaran.create({ nama_ajaran: nama, status: 'Nonaktif' }, { transaction: t });
          console.log('Created master TA:', master.id, master.nama_ajaran);
        }
        // update all TahunAjarans with this nama_ajaran
        await db.sequelize.query('UPDATE `TahunAjarans` SET master_tahun_ajaran_id = :masterId WHERE nama_ajaran = :nama', {
          replacements: { masterId: master.id, nama },
          transaction: t
        });
      }
    });
    console.log('Migration finished successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

if (require.main === module) run();
