const http = require('http');

function request(options, body){
  return new Promise((resolve,reject)=>{
    const req = http.request(options, res=>{
      let data='';
      res.on('data', chunk=>data+=chunk);
      res.on('end', ()=>{
        const contentType = res.headers['content-type']||'';
        const parsed = contentType.includes('application/json') && data ? JSON.parse(data) : data;
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if(body) req.write(body);
    req.end();
  })
}

(async ()=>{
  try{
    const baseHost = 'localhost';
    const basePort = 5000;
    console.log('GET /api/tingkatans');
    let res = await request({ hostname: baseHost, port: basePort, path: '/api/tingkatans', method: 'GET' });
    console.log('GET status', res.status);
    console.log('GET count', Array.isArray(res.body)? res.body.length : JSON.stringify(res.body));

    console.log('POST create');
    const postBody = JSON.stringify({ nama_tingkatan: 'ZZ Smoke', urutan: 777 });
    res = await request({ hostname: baseHost, port: basePort, path: '/api/tingkatans', method: 'POST', headers: { 'Content-Type':'application/json', 'Content-Length': Buffer.byteLength(postBody) } }, postBody);
    console.log('POST status', res.status, 'body', res.body);
    const createdId = res.body && res.body.id;

    console.log('PUT update');
    const putBody = JSON.stringify({ nama_tingkatan: 'ZZ Smoke Updated', urutan: 778 });
    res = await request({ hostname: baseHost, port: basePort, path: `/api/tingkatans/${createdId}`, method: 'PUT', headers: { 'Content-Type':'application/json', 'Content-Length': Buffer.byteLength(putBody) } }, putBody);
    console.log('PUT status', res.status, 'body', res.body);

    console.log('DELETE');
    res = await request({ hostname: baseHost, port: basePort, path: `/api/tingkatans/${createdId}`, method: 'DELETE' });
    console.log('DELETE status', res.status);

    console.log('SMOKE TEST DONE');
  }catch(e){ console.error('ERROR', e); process.exit(1) }
})();
