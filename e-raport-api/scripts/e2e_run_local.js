const path = require('path');
const fs = require('fs');
const { parseExcelFile } = require('../controllers/excelParser');
const raportController = require('../controllers/raportController');

async function run() {
  const tmpDir = path.join(__dirname, '..', 'tmp');
  const file = fs.readdirSync(tmpDir).find(f => f.startsWith('test_upload_') && f.endsWith('.xlsx'));
  if (!file) return console.error('Test file not found');
  const filePath = path.join(tmpDir, file);
  console.log('Parsing', filePath);
  const parsed = await parseExcelFile(filePath);
  console.log('Parsed count:', parsed.length);
  console.log(JSON.stringify(parsed, null, 2));

  // Build validatedData like uploadAndSave commit mode
  const validatedData = parsed
    .filter(p => p.is_valid)
    .map(p => {
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

  console.log('Validated count', validatedData.length);

  // Mock req/res for saveValidatedRaport
  const req = { body: { validatedData } };
  const res = {
    status(code) { this._status = code; return this; },
    json(obj) { console.log('saveValidatedRaport response status', this._status || 200, JSON.stringify(obj, null, 2)); }
  };

  await raportController.saveValidatedRaport(req, res);
}

run().catch(e => { console.error(e); process.exit(1) });
