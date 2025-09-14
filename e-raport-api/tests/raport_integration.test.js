const { Sequelize, DataTypes } = require('sequelize');
const raportController = require('../controllers/raportController');
const templateController = require('../controllers/templateController');

async function buildTestDb() {
  const sequelize = new Sequelize('sqlite::memory:', { logging: false });

  // Define models minimal to match associations used in controllers
  const Guru = sequelize.define('Guru', { nama: DataTypes.STRING }, { tableName: 'gurus' });
  const Kelas = sequelize.define('Kelas', { nama_kelas: DataTypes.STRING, wali_kelas_id: DataTypes.INTEGER }, { tableName: 'kelas' });
  const Siswa = sequelize.define('Siswa', { nis: { type: DataTypes.STRING, unique: true }, nama: DataTypes.STRING, kelas_id: DataTypes.INTEGER }, { tableName: 'Siswas' });
  const MataPelajaran = sequelize.define('MataPelajaran', { nama_mapel: DataTypes.STRING, jenis: DataTypes.STRING }, { tableName: 'MataPelajarans' });
  const PeriodeAjaran = sequelize.define('PeriodeAjaran', { nama_ajaran: DataTypes.STRING, semester: DataTypes.STRING, status: DataTypes.STRING }, { tableName: 'TahunAjarans' });

  const NilaiHafalan = sequelize.define('NilaiHafalan', { siswa_id: DataTypes.INTEGER, mapel_id: DataTypes.INTEGER, tahun_ajaran_id: DataTypes.INTEGER, semester: DataTypes.STRING, predikat: DataTypes.STRING, mapel_text: DataTypes.STRING, deskripsi: DataTypes.TEXT, nilai: DataTypes.FLOAT }, { tableName: 'nilaihafalans' });
  const NilaiUjian = sequelize.define('NilaiUjian', { siswa_id: DataTypes.INTEGER, mapel_id: DataTypes.INTEGER, tahun_ajaran_id: DataTypes.INTEGER, semester: DataTypes.STRING, predikat: DataTypes.STRING, deskripsi: DataTypes.TEXT, mapel_text: DataTypes.STRING }, { tableName: 'nilaiujians' });
  const Kehadiran = sequelize.define('Kehadiran', { siswa_id: DataTypes.INTEGER, indikator_text: DataTypes.STRING, izin: DataTypes.INTEGER, sakit: DataTypes.INTEGER, absen: DataTypes.INTEGER, semester: DataTypes.STRING, tahun_ajaran_id: DataTypes.INTEGER }, { tableName: 'kehadirans' });
  const Sikap = sequelize.define('Sikap', { siswa_id: DataTypes.INTEGER, indikator_text: DataTypes.STRING, nilai: DataTypes.FLOAT, deskripsi: DataTypes.TEXT, semester: DataTypes.STRING, tahun_ajaran_id: DataTypes.INTEGER }, { tableName: 'sikaps' });

  // Minimal additional models used by templateController includes
  const IndikatorSikap = sequelize.define('IndikatorSikap', { indikator_text: DataTypes.STRING, jenis_sikap: DataTypes.STRING }, { tableName: 'indikatorsikaps' });
  const KepalaPesantren = sequelize.define('KepalaPesantren', { nama: DataTypes.STRING }, { tableName: 'kepalapesantrens' });

  // Associations
  Siswa.belongsTo(Kelas, { foreignKey: 'kelas_id', as: 'kelas' });
  Kelas.belongsTo(Guru, { foreignKey: 'wali_kelas_id', as: 'walikelas' });
  // allow Siswa -> nilai/kehadiran/sikap includes
  Siswa.hasMany(NilaiHafalan, { foreignKey: 'siswa_id', as: 'NilaiHafalans' });
  Siswa.hasMany(NilaiUjian, { foreignKey: 'siswa_id', as: 'NilaiUjians' });
  Siswa.hasMany(Sikap, { foreignKey: 'siswa_id', as: 'Sikaps' });
  Siswa.hasMany(Kehadiran, { foreignKey: 'siswa_id', as: 'Kehadirans' });
  NilaiHafalan.belongsTo(Siswa, { foreignKey: 'siswa_id', as: 'siswa' });
  NilaiHafalan.belongsTo(MataPelajaran, { foreignKey: 'mapel_id', as: 'mapel' });
  NilaiHafalan.belongsTo(PeriodeAjaran, { foreignKey: 'tahun_ajaran_id', as: 'tahunAjaran' });
  NilaiUjian.belongsTo(Siswa, { foreignKey: 'siswa_id', as: 'siswa' });
  NilaiUjian.belongsTo(MataPelajaran, { foreignKey: 'mapel_id', as: 'mapel' });
  NilaiUjian.belongsTo(PeriodeAjaran, { foreignKey: 'tahun_ajaran_id', as: 'tahunAjaran' });
  Sikap.belongsTo(Siswa, { foreignKey: 'siswa_id', as: 'siswa' });
  Sikap.belongsTo(IndikatorSikap, { foreignKey: 'indikator_sikap_id', as: 'indikator_sikap' });
  Kehadiran.belongsTo(Siswa, { foreignKey: 'siswa_id', as: 'siswa' });

  // expose additional models in returned object

  await sequelize.sync({ force: true });

  return { sequelize, Guru, Kelas, Siswa, MataPelajaran, PeriodeAjaran, NilaiHafalan, NilaiUjian, Sikap, Kehadiran, IndikatorSikap, KepalaPesantren };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  return res;
}

describe('integration: saveValidatedRaport & generateRaport', () => {
  let db;
  beforeEach(async () => {
    db = await buildTestDb();
    raportController.__setDb(db);
    templateController.__setDb && templateController.__setDb(db);

    // seed
    const guru = await db.Guru.create({ nama: 'Pak Ali' });
    const kelas = await db.Kelas.create({ nama_kelas: 'X-A', wali_kelas_id: guru.id });
    await db.Siswa.create({ nis: '9001', nama: 'Test Siswa', kelas_id: kelas.id });
    await db.MataPelajaran.bulkCreate([
      { nama_mapel: 'Quran', jenis: 'Hafalan' },
      { nama_mapel: 'Math', jenis: 'Ujian' }
    ]);
    await db.PeriodeAjaran.create({ id: 10, nama_ajaran: '2024/2025', semester: '1', status: 'aktif' });
    await db.KepalaPesantren.create({ nama: 'Pak Kepala' });
  });

  afterEach(async () => {
    if (db && db.sequelize) await db.sequelize.close();
  });

  test('saves numeric nilai for NilaiHafalan and deduplicates duplicates', async () => {
    const req = { body: { validatedData: [
      {
        nis: '9001', semester: '1', tahun_ajaran_id: 10,
        nilaiHafalan: [
          { nama_mapel: 'Quran', nilai_angka: '85', deskripsi: 'good' },
          { nama_mapel: 'Quran', nilai_angka: '85', deskripsi: 'duplicate' } // duplicate
        ],
        upload_batch_id: 'b-x'
      }
    ] } };
    const res = mockRes();

    await raportController.saveValidatedRaport(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    // ensure only one hafalan row was inserted
    const rows = await db.NilaiHafalan.findAll({ where: { siswa_id: 1, tahun_ajaran_id: 10 } });
    expect(rows.length).toBe(1);
    expect(rows[0].nilai).toBeCloseTo(85);
  });

  test('generateRaport reads kelas and walikelas correctly', async () => {
    // first insert a hafalan row so generateRaport has some data
    await db.NilaiHafalan.create({ siswa_id: 1, mapel_id: null, tahun_ajaran_id: 10, semester: '1', predikat: 'Tercapai', mapel_text: 'Quran', nilai: 90 });
    const req = { params: { siswaId: 1, semester: '1', tahun_ajaran_id: 10 }, query: { debugJson: '1' } };
    const res = mockRes();

    await templateController.generateRaport(req, res);

    // With debugJson the controller returns templateData JSON
    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.templateData.kelas).toBe('X-A');
    expect(body.templateData.wali_kelas).toBe('Pak Ali');
  });
});
