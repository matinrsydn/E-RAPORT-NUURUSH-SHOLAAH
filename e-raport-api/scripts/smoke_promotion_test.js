const db = require('../models');
const promotionService = require('../services/promotionService');

async function main(){
  try{
    await db.sequelize.authenticate();
    console.log('DB connected');

  // create or find tahun ajaran
  const [taFrom] = await db.TahunAjaran.findOrCreate({ where: { nama_ajaran: 'TA-From', semester: '1' }, defaults: { status: 'tidak-aktif' } });
  const [taTo] = await db.TahunAjaran.findOrCreate({ where: { nama_ajaran: 'TA-To', semester: '2' }, defaults: { status: 'tidak-aktif' } });

  // create or find kelas
  const [kelasA] = await db.Kelas.findOrCreate({ where: { nama_kelas: 'Kelas A' }, defaults: { kapasitas: 30 } });
  const [kelasB] = await db.Kelas.findOrCreate({ where: { nama_kelas: 'Kelas B' }, defaults: { kapasitas: 30 } });

    // set next_kelas_id mapping (A -> B)
    await kelasA.update({ next_kelas_id: kelasB.id });

  // create or find siswa
  const [siswa] = await db.Siswa.findOrCreate({ where: { nis: 'TEST001' }, defaults: { nama: 'Siswa Test', kelas_id: kelasA.id } });

    console.log('Created test data:', { taFrom: taFrom.id, taTo: taTo.id, kelasA: kelasA.id, kelasB: kelasB.id, siswa: siswa.id });

    // run promotion
    const log = await promotionService.promoteStudents({ fromTaId: taFrom.id, toTaId: taTo.id, kelasFromId: kelasA.id, mode: 'auto' });
    console.log('Promotion log id:', log.id || log);

    // verify
    const siswaAfter = await db.Siswa.findByPk(siswa.id);
    const histories = await db.SiswaKelasHistory.findAll({ where: { siswa_id: siswa.id }, order: [['id','ASC']] });
    const logs = await db.PromosiLog.findAll({ order: [['id','ASC']] });

    console.log('Siswa after promotion:', siswaAfter && siswaAfter.kelas_id);
    console.log('Histories:', histories.map(h => ({ id: h.id, siswa_id: h.siswa_id, kelas_id: h.kelas_id, tahun_ajaran_id: h.tahun_ajaran_id, note: h.note })));
    console.log('PromosiLogs:', logs.map(l => ({ id: l.id, dari: l.tahun_ajaran_from_id, ke: l.tahun_ajaran_to_id, kelas_from: l.kelas_from_id } )));

    process.exit(0);
  }catch(err){
    console.error('Smoke test failed', err);
    process.exit(1);
  }
}

main();
