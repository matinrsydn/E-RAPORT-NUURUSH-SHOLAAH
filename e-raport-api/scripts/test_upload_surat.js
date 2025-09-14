const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

(async ()=>{
  try{
    const form = new FormData();
    const samplePath = './tmp/sample_surat_template.docx.txt';
    if(!fs.existsSync(samplePath)) { console.error('sample not found', samplePath); process.exit(1) }
    form.append('template', fs.createReadStream(samplePath), { filename: 'sample.docx' });
    // choose a siswa_id that exists; try 1
    form.append('siswa_id', '1');
    form.append('tujuan_nama_pesantren', 'Pesantren Contoh');
    form.append('tujuan_alamat_pesantren', 'Jl. Contoh No.1');
    form.append('alasan', 'Pindah untuk melanjutkan');
    form.append('jenis_keluar', 'Pindah');
    form.append('penanggung_jawab', 'wali');
    form.append('penanggung_nama', 'Bapak Wali');

    const res = await axios.post('http://localhost:5000/api/surat-keluar/generate-from-template', form, {
      headers: form.getHeaders(),
      responseType: 'arraybuffer'
    });
    console.log('status', res.status)
    const out = './tmp/generated_surat.docx'
    fs.writeFileSync(out, Buffer.from(res.data))
    console.log('Wrote generated file to', out)
  }catch(e){
    console.error('error', e.response ? e.response.data : e.message)
  }
})();
