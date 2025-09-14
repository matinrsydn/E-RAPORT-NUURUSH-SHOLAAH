const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path,
      method: 'GET',
      timeout: 3000,
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { const parsed = JSON.parse(data); resolve(parsed); }
        catch (e) { resolve(data); }
      });
    });
    req.on('error', (err) => reject(err));
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.end();
  });
}

async function waitForServer(retries = 10, delayMs = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      await get('/');
      return true;
    } catch (e) {
      // wait
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return false;
}

(async () => {
  try {
    const ready = await waitForServer(20, 300);
    if (!ready) {
      throw new Error('server not responding on 127.0.0.1:5000 after retries');
    }

    console.log('Checking root / ...');
    const root = await get('/');
    console.log('Root response:', JSON.stringify(root, null, 2));

    console.log('Fetching /api/master-tahun-ajaran ...');
    const masters = await get('/api/master-tahun-ajaran');
    console.log('Masters:', JSON.stringify(masters, null, 2));

    if (Array.isArray(masters) && masters.length > 0) {
      const first = masters[0].id;
      console.log(`Fetching periodes for master ${first} ...`);
      const periodes = await get(`/api/tahun-ajaran?master_tahun_ajaran_id=${first}`);
      console.log('Periodes:', JSON.stringify(periodes, null, 2));
    } else {
      console.log('No masters returned');
    }
    process.exit(0);
  } catch (err) {
    console.error('HTTP check failed:', err && err.message ? err.message : err);
    process.exit(2);
  }
})();
