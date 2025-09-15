const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const db = require('../models');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

// Get all surat keluar documents
exports.getAllSuratKeluar = async (req, res) => {
    try {
        const documents = await db.SuratKeluar.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(documents);
    } catch (error) {
        console.error('Error getting documents:', error);
        res.status(500).json({ 
            message: 'Gagal memuat daftar surat',
            error: error.message 
        });
    }
};

// Upload surat keluar document
exports.uploadSuratKeluar = async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'File wajib diunggah' });
        }

        // Store file information in database if needed
        const suratKeluar = await db.SuratKeluar.create({
            nama_file: file.filename,
            path: file.path,
            jenis_dokumen: req.body.jenis_dokumen || 'surat_keluar',
            keterangan: req.body.keterangan
        });

        res.status(201).json({
            message: 'File berhasil diunggah',
            data: {
                id: suratKeluar.id,
                nama_file: file.filename,
                jenis_dokumen: suratKeluar.jenis_dokumen
            }
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ 
            message: 'Gagal mengunggah file',
            error: error.message 
        });
    }
};

// Download surat keluar document
exports.downloadSuratKeluar = async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, '../uploads/surat-keluar', filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File tidak ditemukan' });
        }

        res.download(filePath);
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ 
            message: 'Gagal mengunduh file',
            error: error.message 
        });
    }
};

// Delete surat keluar document
exports.deleteSuratKeluar = async (req, res) => {
    try {
        const id = req.params.id;
        const document = await db.SuratKeluar.findByPk(id);
        
        if (!document) {
            return res.status(404).json({ message: 'Dokumen tidak ditemukan' });
        }

        // Delete the file
        const filePath = path.join(__dirname, '../uploads/surat-keluar', document.nama_file);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete from database
        await document.destroy();
        res.json({ message: 'Dokumen berhasil dihapus' });
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ 
            message: 'Gagal menghapus dokumen',
            error: error.message 
        });
    }
};

function formatTanggal(tgl) {
  if (!tgl) return '';
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const d = new Date(tgl);
  const day = String(d.getDate()).padStart(2,'0');
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

async function generateNomorSurat() {
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
      penanggung_jawab, // Ini mungkin tidak lagi dipakai jika semua dari form ortu
      ortu_nama,
      ortu_pekerjaan,
      ortu_alamat
    } = req.body;

    if (!siswa_id) {
      return res.status(400).json({ message: 'Siswa wajib dipilih' });
    }

    // 1. Buat record di database
    const nomor_surat = await generateNomorSurat();
    const tanggal_surat = new Date();
    // PERBAIKAN: Gunakan `ortu_nama` untuk kolom `penanggung_nama`
    const surat = await db.SuratKeluar.create({ 
      nomor_surat, 
      siswa_id, 
      jenis_keluar: jenis_keluar || 'Pindah', 
      tujuan_nama_pesantren, 
      tujuan_alamat_pesantren, 
      alasan, 
      tanggal_surat, 
      penanggung_jawab: "Orang Tua/Wali", // Bisa diisi default atau dari form
      penanggung_nama: ortu_nama,
    });

    // 2. Ambil data siswa dari database
    const siswa = await db.Siswa.findByPk(siswa_id, { include: ['kelas'] });
    if (!siswa) {
      return res.status(404).json({ message: 'Data siswa tidak ditemukan' });
    }

    // 3. Siapkan objek data yang bersih untuk template
    const data = {
      // Data Surat
      nomor_surat: surat.nomor_surat,
      tanggal_surat: formatTanggal(surat.tanggal_surat),
      
      // Data Siswa (dari DB)
      siswa_nama: siswa.nama || '',
      siswa_ttl: `${siswa.tempat_lahir || ''}, ${formatTanggal(siswa.tanggal_lahir)}`,
      siswa_jenis_kelamin: siswa.jenis_kelamin || '',
      siswa_agama: siswa.agama || '',
      siswa_kelas: siswa.kelas ? siswa.kelas.nama_kelas : '',
      
      // Data Orang Tua/Wali (dari Form Manual)
      ortu_nama: ortu_nama || '',
      ortu_pekerjaan: ortu_pekerjaan || '',
      ortu_alamat: ortu_alamat || '',
      
      // Data Tujuan
      tujuan_nama_pesantren: tujuan_nama_pesantren || '',
      tujuan_alamat_pesantren: tujuan_alamat_pesantren || '',
      alasan: alasan || '',
    };

    // 4. Proses template dan kirim file
    const content = await readFile(file.path);
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    
    doc.setData(data);
    
    try {
      doc.render();
    } catch (error) {
      console.error("Docxtemplater render error: ", error);
      if (error.properties && error.properties.errors) {
        error.properties.errors.forEach(err => console.error("Template error:", err));
      }
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
    } catch(e) {
      console.error("Error cleaning up uploaded file:", e);
    }
  }
};