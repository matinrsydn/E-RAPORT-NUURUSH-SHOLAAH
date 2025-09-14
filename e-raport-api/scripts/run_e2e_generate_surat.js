const { spawn } = require('child_process');
const { join } = require('path');
const fs = require('fs');

const API_DIR = join(__dirname, '..');
const SERVER_CMD = 'node';
const SERVER_ARGS = [join(API_DIR, 'server.js')];
const SAMPLE_TEMPLATE = join(API_DIR, 'tmp', 'sample_surat_template.docx.txt');
const OUT_FILE = join(API_DIR, 'tmp', 'generated_surat.docx');

function waitForReady(proc, timeout = 20000) {
  return new Promise((resolve, reject) => {
    let buf = '';
    const to = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout waiting for server ready'));
    }, timeout);

    function onData(d) {
      buf += d.toString();
      if (buf.includes('Server berjalan pada port') || buf.includes('Database terkoneksi')) {
        cleanup();
        resolve();
      }
    }

    function onErr() { /* ignore */ }

    function onExit(code) {
      cleanup();
      reject(new Error('Server exited with code ' + code));
    }

    function cleanup() {
      clearTimeout(to);
      proc.stdout.removeListener('data', onData);
      proc.stderr.removeListener('data', onData);
      proc.removeListener('exit', onExit);
    }

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('exit', onExit);
  });
}

(async ()=>{
  console.log('Starting server...');
  const srv = spawn(SERVER_CMD, SERVER_ARGS, { cwd: API_DIR, stdio: ['ignore','pipe','pipe'] });

  try {
    await waitForReady(srv, 20000);
    console.log('Server ready, uploading template...');

    // use curl to post the form and save file (curl is available on Windows)
    const curlArgs = [
      '-v', '-X', 'POST', 'http://127.0.0.1:5000/api/surat-keluar/generate-from-template',
      '-F', `template=@${SAMPLE_TEMPLATE};filename=sample.docx`,
      '-F', 'siswa_id=1',
      '-F', 'tujuan_nama_pesantren=Pesantren Contoh',
      '-F', 'tujuan_alamat_pesantren=Jl Contoh No1',
      '-F', 'alasan=Pindah',
      '-F', 'jenis_keluar=Pindah',
      '-F', 'penanggung_jawab=wali',
      '-F', 'penanggung_nama=Bapak Wali',
      '-o', OUT_FILE
    ];

    await new Promise((resolve, reject) => {
      const c = spawn('curl.exe', curlArgs, { stdio: 'inherit' });
      c.on('exit', (code) => code === 0 ? resolve() : reject(new Error('curl exit ' + code)));
    });

    if (fs.existsSync(OUT_FILE)) {
      console.log('Generated file written to', OUT_FILE);
    } else {
      console.error('Expected output file not found:', OUT_FILE);
    }
  } catch (err) {
    console.error('E2E test failed:', err && err.message || err);
  } finally {
    try { process.kill(srv.pid); } catch(e){}
    process.exit(0);
  }
})();
