const path = require('path');
const fs = require('fs');

(async function() {
  console.log('*** RESET DB FROM MODELS - START ***');
  try {
    const db = require('../models');
    const { parseExcelFile } = require('../controllers/excelParser');
    const raportController = require('../controllers/raportController');

    console.log('Authenticating DB...');
    await db.sequelize.authenticate();
    console.log('Connected. Syncing (force: true) - this will DROP all tables.');

    // WARNING: destructive
    await db.sequelize.sync({ force: true });
    console.log('Sync complete. All tables recreated from models.');

    // Seed MasterTahunAjaran + PeriodeAjaran
    console.log('Seeding MasterTahunAjaran and PeriodeAjaran...');
    const master = await db.MasterTahunAjaran.create({ nama_ajaran: '2024/2025', status: 'Nonaktif' });
    const periode1 = await db.PeriodeAjaran.create({ nama_ajaran: '2024/2025', semester: '1', status: 'aktif', master_tahun_ajaran_id: master.id });
    const periode2 = await db.PeriodeAjaran.create({ nama_ajaran: '2024/2025', semester: '2', status: 'tidak-aktif', master_tahun_ajaran_id: master.id });
    console.log('Seeded master and periode:', master.id, periode1.id, periode2.id);

    // Seed IndikatorKehadiran master
    console.log('Seeding IndikatorKehadiran...');
    await db.IndikatorKehadiran.bulkCreate([
      { nama_kegiatan: 'Mengaji', is_active: true },
      { nama_kegiatan: 'Osis', is_active: true }
    ]);

    // Seed MataPelajaran minimal for smoke test
    console.log('Seeding MataPelajaran...');
    await db.MataPelajaran.bulkCreate([
      { nama_mapel: 'Matematika', jenis: 'Ujian' },
      { nama_mapel: 'Hafalan X', jenis: 'Hafalan' }
    ]);

    // Seed Guru, Kelas, Siswa
    console.log('Seeding Guru, Kelas, Siswa...');
    const guru = await db.Guru.create({ nama: 'Guru Test', nip: 'G001' });
    const kelas = await db.Kelas.create({ nama_kelas: 'X-A', kapasitas: 30, wali_kelas_id: guru.id });
    const siswa = await db.Siswa.create({ nama: 'Budi', nis: '12345', kelas_id: kelas.id });

    // Create KelasPeriode linking kelas to periode1
    console.log('Creating KelasPeriode link...');
    await db.KelasPeriode.create({ kelas_id: kelas.id, periode_ajaran_id: periode1.id });

    console.log('All seeds completed.');

    // Run smoke test: parse test Excel and save validated rows
    const tmpDir = path.join(__dirname, '..', 'tmp');
    const testFile = fs.readdirSync(tmpDir).find(f => f.startsWith('test_upload_') && f.endsWith('.xlsx'));
    if (!testFile) {
      console.warn('No test_upload_*.xlsx found in tmp/. Skipping smoke upload test.');
      console.log('*** RESET DB FROM MODELS - DONE (no smoke test) ***');
      process.exit(0);
    }

    const filePath = path.join(tmpDir, testFile);
    console.log('Running smoke test using', filePath);
    const parsed = await parseExcelFile(filePath);
    console.log('Parsed rows:', parsed.length);

    const validatedData = parsed.filter(p => p.is_valid).map(p => {
      const d = p.data;
      return {
        nis: d.nis,
        nama_siswa: d.nama_siswa,
        semester: String(d.semester),
        tahun_ajaran: d.tahun_ajaran,
        nilaiUjian: d.nilai_ujian || [],
        nilaiHafalan: d.nilai_hafalan || [],
        kehadiran_detail: d.kehadiran_detail || [],
        sikap: d.sikap || {},
        upload_batch_id: Date.now().toString()
      };
    });

    console.log('Validated rows to save:', validatedData.length);

    if (validatedData.length === 0) {
      console.warn('No valid rows found; smoke test cannot save.');
      console.log('*** RESET DB FROM MODELS - DONE ***');
      process.exit(0);
    }

    // Mock req/res for saveValidatedRaport
    const req = { body: { validatedData } };
    const res = {
      status(code) { this._status = code; return this; },
      json(obj) { console.log('saveValidatedRaport response status', this._status || 200, JSON.stringify(obj, null, 2)); }
    };

    await raportController.saveValidatedRaport(req, res);
    console.log('Smoke test completed.');
    console.log('*** RESET DB FROM MODELS - DONE SUCCESSFULLY ***');
    process.exit(0);
  } catch (err) {
    console.error('ERROR during reset:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
