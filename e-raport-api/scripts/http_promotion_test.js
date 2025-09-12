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

    // Helper: create or find Tahun Ajaran
    async function ensureTA(name, semester, status) {
      const payload = { nama_ajaran: name, semester: semester, status };
      const res = await request('POST', '/api/tahun-ajaran', payload);
      if (res.status === 201) return res;
      // if conflict, try to find existing by listing
      const list = await request('GET','/api/tahun-ajaran');
      if (list.status === 200 && Array.isArray(list.body)) {
        const found = list.body.find(t => t.nama_ajaran === name && String(t.semester) === String(semester));
        if (found) return { status: 200, body: found };
      }
      return res;
    }

    // Helper: create or find Kelas
    async function ensureKelas(name) {
      const res = await request('POST', '/api/kelas', { nama_kelas: name, kapasitas: 30 });
      if (res.status === 201) return res;
      // fallback: try to find by listing
      const list = await request('GET','/api/kelas');
      if (list.status === 200 && Array.isArray(list.body)) {
        const found = list.body.find(k => k.nama_kelas === name);
        if (found) return { status: 200, body: found };
      }
      return res;
    }

    // Helper: create or find Siswa
    async function ensureSiswa(nis, nama, kelas_id) {
      const res = await request('POST', '/api/siswa', { nama, nis, kelas_id });
      if (res.status === 201) return res;
      // fallback: try to find by listing
      const list = await request('GET','/api/siswa');
      if (list.status === 200 && Array.isArray(list.body)) {
        const found = list.body.find(s => s.nis === nis);
        if (found) return { status: 200, body: found };
      }
      return res;
    }

    console.log('Create TA from');
    const ta1Name = unique('HTTP_TA_FROM');
    const ta1 = await ensureTA(ta1Name, '1', 'aktif');
    console.log(ta1);

    console.log('Create TA to');
    const ta2Name = unique('HTTP_TA_TO');
    const ta2 = await ensureTA(ta2Name, '2', 'tidak-aktif');
    console.log(ta2);

    console.log('Create Kelas A');
    const kAName = unique('HTTP Kelas A');
    const kA = await ensureKelas(kAName);
    console.log(kA);

    console.log('Create Kelas B');
    const kBName = unique('HTTP Kelas B');
    const kB = await ensureKelas(kBName);
    console.log(kB);

    // set next_kelas_id on kelas A
    console.log('Set next_kelas_id on Kelas A');
    const updateA = await request('PUT',`/api/kelas/${kA.body.id}`,{ nama_kelas: kA.body.nama_kelas, wali_kelas_id: kA.body.wali_kelas_id || null, next_kelas_id: kB.body.id });
    console.log(updateA);

    console.log('Create siswa in Kelas A');
    const nis = unique('HTTP001');
    const siswa = await ensureSiswa(nis, unique('HTTP Siswa'), kA.body.id);
    console.log(siswa);

    console.log('Run promotion via /api/kenaikan');
    const promote = await request('POST','/api/kenaikan',{ fromTaId: ta1.body.id, toTaId: ta2.body.id, kelasFromId: kA.body.id, mode: 'auto' });
    console.log(promote);

    console.log('Fetch promosi logs');
    const logs = await request('GET','/api/kenaikan/logs');
    console.log(logs);

    console.log('Fetch siswa in kelas B');
    const siswaB = await request('GET',`/api/siswa?kelas_id=${kB.body.id}`);
    console.log(siswaB);

    console.log('Done');
  }catch(err){
    console.error('HTTP test failed', err);
  }
})();
