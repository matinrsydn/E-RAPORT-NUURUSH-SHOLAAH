const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const db = require('../models');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

function formatTanggal(tgl) {
  if (!tgl) return '';
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const d = new Date(tgl);
  const day = String(d.getDate()).padStart(2,'0');
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// alias for clarity when used in header like: 'Bandung, 01 Januari 2025'
function formatDateForNomor(tgl) { return formatTanggal(tgl) }

// Generate a simple sequential nomor_surat. In production use better format.
async function generateNomorSurat() {
  // e.g., SUR/2025/0001
  const year = new Date().getFullYear();
  const last = await db.SuratKeluar.findOne({ order: [['createdAt','DESC']] });
  let seq = 1;
  if (last && last.nomor_surat) {
    const m = last.nomor_surat.match(/(\d+)$/);
    if (m) seq = Number(m[1]) + 1;
  }
  return `SUR/${year}/${String(seq).padStart(4,'0')}`;
}

exports.generateFromTemplate = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'Template .docx wajib diunggah' });
    }

    const { 
      siswa_id, 
      tujuan_nama_pesantren, 
      tujuan_alamat_pesantren, 
      alasan, 
      jenis_keluar, 
      penanggung_jawab, 
      penanggung_nama,
      penanggung_pekerjaan, // <-- Input manual baru dari frontend
      penanggung_alamat    // <-- Input manual baru dari frontend
    } = req.body;

    if (!siswa_id) {
      return res.status(400).json({ message: 'Siswa wajib dipilih' });
    }

    // 1. Buat record di database
    const nomor_surat = await generateNomorSurat();
    const tanggal_surat = new Date();
    const surat = await db.SuratKeluar.create({ 
      nomor_surat, 
      siswa_id, 
      jenis_keluar: jenis_keluar || 'Pindah', 
      tujuan_nama_pesantren, 
      tujuan_alamat_pesantren, 
      alasan, 
      tanggal_surat, 
      penanggung_jawab, 
      penanggung_nama,
      // Anda bisa juga menyimpan data wali ke DB jika modelnya mendukung
    });

    // 2. Kumpulkan semua data yang diperlukan untuk placeholder
    const siswa = await db.Siswa.findByPk(siswa_id, { include: ['kelas'] });
    if (!siswa) {
        return res.status(404).json({ message: 'Data siswa tidak ditemukan' });
    }

    // Tentukan nama penanggung jawab (prioritaskan input manual)
    let namaPenanggungFinal = penanggung_nama;
    if (!namaPenanggungFinal) { // Jika input manual kosong, ambil dari data siswa
      if (penanggung_jawab === 'ayah') namaPenanggungFinal = siswa.nama_ayah || '';
      else if (penanggung_jawab === 'ibu') namaPenanggungFinal = siswa.nama_ibu || '';
      else namaPenanggungFinal = siswa.nama_wali || siswa.nama_ayah || '';
    }
    
    // 3. Siapkan objek data yang cocok 100% dengan placeholder di template
    const data = {
      nomor_surat: surat.nomor_surat,
      siswa_nama: siswa.nama,
      siswa_ttl: `${siswa.tempat_lahir || ''}, ${formatTanggal(siswa.tanggal_lahir)}`,
      siswa_jenis_kelamin: siswa.jenis_kelamin,
      siswa_agama: siswa.agama,
      siswa_kelas: siswa.kelas ? siswa.kelas.nama_kelas : '',
      
      // Data Penanggung Jawab (sesuai placeholder di template)
      penanggung_nama: namaPenanggungFinal,
      penanggung_pekerjaan: penanggung_pekerjaan, // Diambil langsung dari input form
      penanggung_alamat: penanggung_alamat,       // Diambil langsung dari input form

      // Data Pesantren Tujuan (sesuai placeholder di template)
      // PERHATIAN: Placeholder Anda untuk Nama Pesantren adalah {penanggung_alamat}. Ini mungkin salah ketik di template.
      // Kode ini mengisinya dengan `tujuan_nama_pesantren` agar sesuai.
      // Sangat disarankan untuk memperbaiki template menjadi {tujuan_nama_pesantren}.
      pesantren: tujuan_nama_pesantren, // Placeholder Anda: {penanggung_alamat} untuk Nama Pesantren
      tujuan_alamat_pesantren: tujuan_alamat_pesantren, // Placeholder Anda: {tujuan_alamat_pesantren} untuk Alamat Pesantren
      
      alasan: alasan,
      tanggal_surat: formatTanggal(surat.tanggal_surat)
    };
    
    // Koreksi untuk placeholder nama pesantren yang salah di template
    // Ini akan memastikan data yang benar masuk ke placeholder yang salah
    data['penanggung_alamat'] = tujuan_nama_pesantren;


    // 4. Proses template dan kirim file
    const content = await readFile(file.path);
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    
    doc.setData(data);
    
    try {
      doc.render();
    } catch (error) {
      console.error("Docxtemplater render error: ", error);
      throw error;
    }

    const buf = doc.getZip().generate({ type: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="surat-pindah-${siswa.nama.replace(/\s/g, '-')}.docx"`);
    return res.send(buf);

  } catch (err) {
    console.error('Error generating surat:', err);
    return res.status(500).json({ message: 'Terjadi kesalahan saat membuat surat', error: err && err.message });
  } finally {
    try { 
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
    } catch(e){
      console.error("Error cleaning up uploaded file:", e);
    }
  }
};