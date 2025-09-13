const db = require('../models');
const siswaController = require('../controllers/siswaController');

async function run(){
  await db.sequelize.authenticate();
  console.log('DB connected');

  // find a TA and kelas
  const tas = await db.TahunAjaran.findAll();
  const ta = tas.find(t=>t.status==='aktif') || tas[0];
  if(!ta){ console.error('No tahun ajaran found'); process.exit(1); }
  const kelas = (await db.Kelas.findAll())[0];

  const req = { body: { nama: 'SMOKE Siswa '+Date.now(), nis: 'SMK'+Math.floor(Math.random()*100000), kelas_id: kelas ? kelas.id : null, tahun_ajaran_id: ta.id } };
  const res = {
    status(code){ this._code = code; return this },
    json(obj){ console.log('RESP STATUS', this._code, 'BODY', obj); return obj },
    send(){ console.log('send'); }
  };

  try{
    await siswaController.createSiswa(req, res);
    // verify history
    const siswa = await db.Siswa.findOne({ where: { nis: req.body.nis } });
    const histories = await db.SiswaKelasHistory.findAll({ where: { siswa_id: siswa.id } });
    console.log('Created siswa id', siswa.id, 'histories count', histories.length);
    console.log(histories.map(h=>({id:h.id, kelas_id:h.kelas_id, tahun_ajaran_id:h.tahun_ajaran_id, note:h.note})))
    process.exit(0);
  }catch(e){ console.error('ERROR', e); process.exit(1); }
}

run();
