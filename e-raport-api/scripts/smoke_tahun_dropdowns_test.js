const http = require('http');

function request(path) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: '127.0.0.1', port: 5000, path, method: 'GET' };
    const req = http.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, body: body }); }
      });
    });
    req.on('error', err => reject(err));
    req.end();
  });
}

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)) }

async function waitForServer(retries = 12, delay = 500){
  for(let i=0;i<retries;i++){
    try{
      const res = await request('/').catch(()=>null)
      if(res && (res.status===200 || res.status===204)) return true
    }catch(e){/*ignore*/}
    await sleep(delay)
  }
  return false
}

(async ()=>{
  try {
    console.log('Testing Tahun Ajaran dropdown endpoints...');
  const ready = await waitForServer()
    if(!ready){ throw new Error('backend not responding on http://127.0.0.1:5000 (health check failed)') }
    const asal = await request('/api/tahun-ajaran?semester=2&uniqueByName=true');
    const tujuan = await request('/api/tahun-ajaran?semester=1&uniqueByName=true');

    if (asal.status !== 200) throw new Error('asal endpoint failed: ' + asal.status);
    if (tujuan.status !== 200) throw new Error('tujuan endpoint failed: ' + tujuan.status);

    const asalAllSem2 = (Array.isArray(asal.body) && asal.body.every(x => String(x.semester) === '2'));
    const tujuanAllSem1 = (Array.isArray(tujuan.body) && tujuan.body.every(x => String(x.semester) === '1'));

    console.log('asal count=', Array.isArray(asal.body) ? asal.body.length : 'not-array');
    console.log('tujuan count=', Array.isArray(tujuan.body) ? tujuan.body.length : 'not-array');

    if (!asalAllSem2) {
      console.error('FAIL: some asal items are not semester=2');
      console.log(JSON.stringify(asal.body, null, 2));
      process.exitCode = 2; return;
    }
    if (!tujuanAllSem1) {
      console.error('FAIL: some tujuan items are not semester=1');
      console.log(JSON.stringify(tujuan.body, null, 2));
      process.exitCode = 3; return;
    }

    console.log('OK: dropdown endpoints return correct semesters (asal=2, tujuan=1)');
  } catch (err) {
    console.error('ERROR running smoke test', err);
    process.exitCode = 1;
  }
})();
