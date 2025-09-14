const { Sequelize, DataTypes } = require('sequelize');
const raportController = require('../controllers/raportController');

// Helper to build minimal DB with models used by controller
async function buildTestDb() {
  const sequelize = new Sequelize('sqlite::memory:', { logging: false });

  const MasterTahunAjaran = sequelize.define('MasterTahunAjaran', {
    nama_ajaran: DataTypes.STRING
  }, { tableName: 'mastertahunajarans' });

  const PeriodeAjaran = sequelize.define('PeriodeAjaran', {
    nama_ajaran: DataTypes.STRING,
    semester: DataTypes.STRING,
    status: DataTypes.STRING
  }, { tableName: 'periodeajarans' });

  const Siswa = sequelize.define('Siswa', {
    nis: DataTypes.STRING,
    nama: DataTypes.STRING
  }, { tableName: 'siswas' });

  const MataPelajaran = sequelize.define('MataPelajaran', {
    nama_mapel: DataTypes.STRING,
    jenis: DataTypes.STRING
  }, { tableName: 'matapelajarans' });

  const NilaiUjian = sequelize.define('NilaiUjian', {
    siswa_id: DataTypes.INTEGER,
    mapel_id: DataTypes.INTEGER,
    predikat: DataTypes.STRING,
    deskripsi: DataTypes.TEXT,
    semester: DataTypes.STRING,
    tahun_ajaran_id: DataTypes.INTEGER,
    mapel_text: DataTypes.STRING
  }, { tableName: 'nilaiujians' });

  const NilaiHafalan = sequelize.define('NilaiHafalan', {
    siswa_id: DataTypes.INTEGER,
    mapel_id: DataTypes.INTEGER,
    predikat: DataTypes.STRING,
    deskripsi: DataTypes.TEXT,
    semester: DataTypes.STRING,
    tahun_ajaran_id: DataTypes.INTEGER,
    mapel_text: DataTypes.STRING,
    nilai: DataTypes.FLOAT
  }, { tableName: 'nilaihafalans' });

  const Kehadiran = sequelize.define('Kehadiran', {
    siswa_id: DataTypes.INTEGER,
    indikatorkehadirans_id: DataTypes.INTEGER,
    indikator_text: DataTypes.STRING,
    izin: DataTypes.INTEGER,
    sakit: DataTypes.INTEGER,
    absen: DataTypes.INTEGER,
    semester: DataTypes.STRING,
    tahun_ajaran_id: DataTypes.INTEGER
  }, { tableName: 'kehadirans' });

  const Sikap = sequelize.define('Sikap', {
    siswa_id: DataTypes.INTEGER,
    indikator_sikap_id: DataTypes.INTEGER,
    indikator_text: DataTypes.STRING,
    nilai: DataTypes.STRING,
    deskripsi: DataTypes.TEXT,
    semester: DataTypes.STRING,
    tahun_ajaran_id: DataTypes.INTEGER
  }, { tableName: 'sikaps' });

  const DraftNilai = sequelize.define('DraftNilai', {
    upload_batch_id: DataTypes.STRING,
    is_valid: DataTypes.BOOLEAN
  }, { tableName: 'draftnilais' });
  // sync
  await sequelize.sync({ force: true });

  // sync
  await sequelize.sync({ force: true });

  return {
    sequelize,
    MasterTahunAjaran,
    PeriodeAjaran,
    Siswa,
    MataPelajaran,
    NilaiUjian,
    NilaiHafalan,
    Kehadiran,
    Sikap
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('raportController.saveValidatedRaport', () => {
  let db;

  beforeEach(async () => {
    db = await buildTestDb();
    // inject db into controller
    raportController.__setDb(db);

    // seed some common data
    await db.Siswa.create({ nis: '1001', nama: 'Siswa A' });
    await db.Siswa.create({ nis: '2002', nama: 'Siswa B' });

    await db.MataPelajaran.bulkCreate([
      { nama_mapel: 'Matematika', jenis: 'Ujian' },
      { nama_mapel: 'Quran', jenis: 'Hafalan' }
    ]);

    await db.PeriodeAjaran.create({ id: 1, nama_ajaran: '2024/2025', semester: '1', status: 'aktif' });
  });

  afterEach(async () => {
    if (db && db.sequelize) await db.sequelize.close();
  });

  test('Case 1: all rows valid -> returns 200 and processed_count equals rows', async () => {
    const req = { body: { validatedData: [
      { nis: '1001', semester: '1', tahun_ajaran_id: 1, nilaiUjian: [{ nama_mapel: 'Matematika', nilai: 90 }], upload_batch_id: 'b1' }
    ] } };
    const res = mockRes();

    await raportController.saveValidatedRaport(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.processed_count).toBe(1);
    expect(jsonArg.skipped_count).toBe(0);
  });

  test('Case 2: some rows invalid -> returns 200 with skipped details', async () => {
    const req = { body: { validatedData: [
      { nis: '1001', semester: '1', tahun_ajaran_id: 1, nilaiUjian: [{ nama_mapel: 'Matematika', nilai: 90 }], upload_batch_id: 'b2' },
      { nis: '2002', /* missing semester */ tahun_ajaran: '2024/2025', nilaiHafalan: [{ nama_mapel: 'Quran', nilai_angka: 80 }], upload_batch_id: 'b2' },
      { /* missing nis */ semester: '1', tahun_ajaran: '2024/2025', upload_batch_id: 'b2' }
    ] } };
    const res = mockRes();

    await raportController.saveValidatedRaport(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.processed_count).toBe(1);
    expect(jsonArg.skipped_count).toBe(2);
    expect(Array.isArray(jsonArg.skipped_rows)).toBe(true);
    expect(jsonArg.skipped_rows.length).toBe(2);
  });

  test('Case 3: all rows invalid -> returns 400 with skipped_rows', async () => {
    const req = { body: { validatedData: [
      { nis: null, semester: null },
      { /* missing everything */ }
    ] } };
    const res = mockRes();

    await raportController.saveValidatedRaport(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const jsonArg = res.json.mock.calls[0][0];
    expect(Array.isArray(jsonArg.skipped_rows)).toBe(true);
    expect(jsonArg.skipped_rows.length).toBe(2);
  });
});
