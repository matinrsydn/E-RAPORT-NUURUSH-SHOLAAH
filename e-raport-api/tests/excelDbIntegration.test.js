const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const Sequelize = require('sequelize');

// Helper to load models into a fresh Sequelize instance
function loadModels(sequelize) {
  const models = {};
  const modelFiles = fs.readdirSync(path.join(__dirname, '..', 'models')).filter(f => f.endsWith('.js') && f !== 'index.js');
  modelFiles.forEach(file => {
    const model = require(path.join(__dirname, '..', 'models', file))(sequelize, Sequelize.DataTypes);
    models[model.name] = model;
  });
  Object.keys(models).forEach(name => {
    if (typeof models[name].associate === 'function') models[name].associate(models);
  });
  models.sequelize = sequelize;
  models.Sequelize = Sequelize;
  return models;
}

const { uploadCompleteData } = require('../controllers/excelController');

describe('Excel Database Integration Tests (sqlite memory)', () => {
  let workbook;
  const testFilePath = path.join(__dirname, 'test-data-db.xlsx');
  let db;

  beforeAll(async () => {
    // Create in-memory sqlite sequelize
    const sequelize = new Sequelize('sqlite::memory:', { logging: false });
    db = loadModels(sequelize);

    // Sync models
    await db.sequelize.sync({ force: true });

    // Create prerequisite data
    const masterTA = await db.MasterTahunAjaran.create({
      nama_ajaran: '2025/2026',
      is_active: true
    });

    await db.PeriodeAjaran.create({
      master_tahun_ajaran_id: masterTA.id,
      nama_ajaran: '2025/2026',
      semester: '1',
      status: 'aktif'
    });

    // Create test mata pelajaran
    await db.MataPelajaran.bulkCreate([
      { nama_mapel: 'Matematika', jenis: 'umum' },
      { nama_mapel: 'Bahasa Arab', jenis: 'agama' }
    ]);

    // Create test siswa
    await db.Siswa.create({ nis: '1234', nama: 'Test Siswa 1' });

    // Create test Excel file
    workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Template Nilai Ujian');

    sheet.columns = [
      { header: 'NIS', key: 'nis' },
      { header: 'Nama', key: 'nama' },
      { header: 'Nama Mapel', key: 'nama_mapel' },
      { header: 'Kitab', key: 'kitab' },
      { header: 'Nilai', key: 'nilai' },
      { header: 'Semester', key: 'semester' },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran' }
    ];

    const testData = [
      { nis: '1234', nama: 'Test Siswa 1', nama_mapel: 'Matematika', kitab: 'Kitab Mat 1', nilai: 85, semester: '1', tahun_ajaran: '2025/2026' },
      { nis: '1234', nama: 'Test Siswa 1', nama_mapel: 'Bahasa Arab', kitab: 'Kitab Arab 1', nilai: 90, semester: '1', tahun_ajaran: '2025/2026' }
    ];

    testData.forEach(data => sheet.addRow(data));
    await workbook.xlsx.writeFile(testFilePath);

    // Monkeypatch controllers' db reference to our test db
    // Note: controllers require db from '../models' which caches a different sequelize instance.
    // We'll override module cache for '../models' to return our in-memory db for the duration of tests.
    const modelsPath = path.join(__dirname, '..', 'models');
    jest.resetModules();
    jest.doMock(modelsPath, () => db, { virtual: false });
  });

  afterAll(async () => {
    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    if (db && db.sequelize) await db.sequelize.close();
    jest.resetModules();
  });

  test('should save nilai ujian to database correctly', async () => {
    // Re-require controller after mocking models
    const { uploadCompleteData: upload } = require('../controllers/excelController');

    const req = { file: { path: testFilePath }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await upload(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();

    const nilaiUjian = await db.NilaiUjian.findAll({ include: [ { model: db.Siswa, as: 'siswa' }, { model: db.MataPelajaran, as: 'mapel' } ] });
    expect(nilaiUjian.length).toBeGreaterThanOrEqual(2);
    const values = nilaiUjian.map(n => n.nilai).sort();
    expect(values).toContain(85);
    expect(values).toContain(90);
  });

  test('should handle mata pelajaran case sensitivity', async () => {
    const workbook2 = new ExcelJS.Workbook();
    const sheet2 = workbook2.addWorksheet('Template Nilai Ujian');
    sheet2.columns = [
      { header: 'NIS', key: 'nis' },
      { header: 'Nama', key: 'nama' },
      { header: 'Nama Mapel', key: 'nama_mapel' },
      { header: 'Kitab', key: 'kitab' },
      { header: 'Nilai', key: 'nilai' },
      { header: 'Semester', key: 'semester' },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran' }
    ];
    sheet2.addRow({ nis: '1234', nama: 'Test Siswa 1', nama_mapel: 'MATEMATIKA', kitab: 'Kitab Mat 1', nilai: 85, semester: '1', tahun_ajaran: '2025/2026' });
    const casePath = path.join(__dirname, 'case.xlsx');
    await workbook2.xlsx.writeFile(casePath);

    const { uploadCompleteData: upload } = require('../controllers/excelController');
    const req = { file: { path: casePath }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await upload(req, res);

    if (fs.existsSync(casePath)) fs.unlinkSync(casePath);

    const nilaiUjian = await db.NilaiUjian.findOne({ where: { siswa_id: 1 }, include: [{ model: db.MataPelajaran, as: 'mapel' }] });
    expect(nilaiUjian).toBeDefined();
    expect(nilaiUjian.mapel.nama_mapel.toLowerCase()).toBe('matematika');
  });
});