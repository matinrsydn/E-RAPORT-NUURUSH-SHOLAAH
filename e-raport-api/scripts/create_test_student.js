const db = require('../models');

async function run() {
  try {
    // Create guru
    const guru = await db.Guru.create({ nama: 'Guru Test', nip: 'G001' });
    console.log('Created guru id', guru.id);

    // Create kelas
    const kelas = await db.Kelas.create({ nama_kelas: 'X-A', kapasitas: 30, wali_kelas_id: guru.id });
    console.log('Created kelas id', kelas.id);

    // Create siswa
    const siswa = await db.Siswa.create({ nama: 'Budi', nis: '12345', kelas_id: kelas.id });
    console.log('Created siswa id', siswa.id);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
