const http = require('http');
const fs = require('fs');

function fetch(path, outFile) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path,
      method: 'GET'
    };
    const req = http.request(options, (res) => {
      if (res.statusCode !== 200) return reject(new Error('Status ' + res.statusCode));
      const file = fs.createWriteStream(outFile);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  try {
    await fetch('/api/raports/generate/identitas/5', './tmp/identitas.docx');
    console.log('identitas saved');
    await fetch('/api/raports/generate/nilai/5/9/1', './tmp/nilai.docx');
    console.log('nilai saved');
    await fetch('/api/raports/generate/sikap/5/9/1', './tmp/sikap.docx');
    console.log('sikap saved');
  } catch (e) {
    console.error('smoke test failed:', e.message);
    process.exit(1);
  }
})();
