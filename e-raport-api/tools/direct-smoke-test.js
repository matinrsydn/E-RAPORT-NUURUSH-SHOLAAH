const fs = require('fs');
const path = require('path');
const controller = require('../controllers/raportGeneratorController');

function makeRes(outFile) {
  return {
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this._status = code; return this; },
    json(obj) { fs.writeFileSync(outFile + '.json', JSON.stringify(obj, null, 2)); },
    send(body) {
      // body is buffer
      fs.writeFileSync(outFile, body);
      console.log('Wrote', outFile);
    }
  };
}

(async () => {
  try {
    if (!fs.existsSync(path.resolve(__dirname, '..', 'tmp'))) fs.mkdirSync(path.resolve(__dirname, '..', 'tmp'));

    // Identitas
    const reqIdent = { params: { siswaId: '5' }, query: { format: 'docx' } };
    await controller.generateIdentitas(reqIdent, makeRes(path.resolve(__dirname, '..', 'tmp', 'identitas.docx')));

    // Nilai
    const reqNilai = { params: { siswaId: '5', tahunAjaranId: '9', semester: '1' }, query: { format: 'docx' } };
    await controller.generateNilaiReport(reqNilai, makeRes(path.resolve(__dirname, '..', 'tmp', 'nilai.docx')));

    // Sikap
    const reqSikap = { params: { siswaId: '5', tahunAjaranId: '9', semester: '1' }, query: { format: 'docx' } };
    await controller.generateSikapReport(reqSikap, makeRes(path.resolve(__dirname, '..', 'tmp', 'sikap.docx')));

    console.log('Direct smoke test selesai.');
  } catch (err) {
    console.error('Direct smoke test gagal:', err.message);
    process.exit(1);
  }
})();
