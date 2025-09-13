const http = require('http');

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: '127.0.0.1', port: 5000, path, method, headers: { 'Content-Type': 'application/json' } };
    const req = http.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null }));
    });
    req.on('error', err => reject(err));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

(async()=>{
  try{
    const ts = Date.now();
    const unique = s => `${s}_${ts}`;

    async function ensureTA(name, semester, status) {
      const payload = { nama_ajaran: name, semester: semester, status };
      const res = await request('POST', '/api/tahun-ajaran', payload);
      if (res.status === 201) return res;
      const list = await request('GET','/api/tahun-ajaran');
      if (list.status === 200 && Array.isArray(list.body)) {
        const found = list.body.find(t => t.nama_ajaran === name && String(t.semester) === String(semester));
        if (found) return { status: 200, body: found };
      }
      return res;
    }

    async function ensureKelas(name) {
      const res = await request('POST', '/api/kelas', { nama_kelas: name, kapasitas: 30 });
      if (res.status === 201) return res;
      const list = await request('GET','/api/kelas');
      if (list.status === 200 && Array.isArray(list.body)) {
        const found = list.body.find(k => k.nama_kelas === name);
        if (found) return { status: 200, body: found };
      }
      return res;
    }

    async function ensureSiswaWithHistory(nis, nama, kelas_id, tahun_ajaran_id) {
      // create siswa via API and include tahun_ajaran_id
      const res = await request('POST','/api/siswa', { nama, nis, kelas_id, tahun_ajaran_id });
      return res;
    }

    const taFrom = await ensureTA(unique('ALL_TA_FROM'), '1', 'aktif');
    const taTo = await ensureTA(unique('ALL_TA_TO'), '2', 'tidak-aktif');
    const kA = await ensureKelas(unique('ALL KELAS A'));
    const kB = await ensureKelas(unique('ALL KELAS B'));

    // set next
    await request('PUT',`/api/kelas/${kA.body.id}`,{ nama_kelas: kA.body.nama_kelas, next_kelas_id: kB.body.id });

    // create siswa with history
    const siswaRes = await ensureSiswaWithHistory(unique('NISALL'), unique('SISWA ALL'), kA.body.id, taFrom.body.id);
    console.log('Created siswa', siswaRes);

    // call new endpoint
    const promoteAll = await request('POST','/api/kenaikan/all-for-tahun',{ fromTaId: taFrom.body.id, toTaId: taTo.body.id, mode: 'auto' });
    console.log('Promote all result', promoteAll);
  }catch(err){ console.error('http test failed', err); }
})();
