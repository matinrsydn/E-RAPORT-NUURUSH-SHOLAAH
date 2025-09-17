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

// Download surat keluar document with streaming
exports.downloadSuratKeluar = async (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/templates', filename);

    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File tidak ditemukan' });
        }

        // Get file stats
        const stat = fs.statSync(filePath);
        
        // Set headers with correct MIME type
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.setHeader('Cache-Control', 'no-cache');

        // Create read stream with reasonable chunk size
        const stream = fs.createReadStream(filePath, {
            highWaterMark: 64 * 1024 // 64KB chunks
        });
        
        // Handle stream errors
        stream.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Gagal mengunduh file' });
            }
            stream.destroy();
        });

        // Handle client disconnect
        req.on('close', () => {
            stream.destroy();
        });

        // Pipe the file to response with error handling
        stream.pipe(res).on('error', (error) => {
            console.error('Pipe error:', error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Gagal mengunduh file' });
            }
            stream.destroy();
        });

    } catch (error) {
        console.error('Error downloading file:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                message: 'Gagal mengunduh file',
                error: error.message 
            });
        }
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
  // Use a transaction to ensure atomicity when getting and updating sequence
  const transaction = await db.sequelize.transaction();
  try {
    // Find the last nomor_surat for the current year only, lock for update
    const last = await db.SuratKeluar.findOne({
      where: db.sequelize.where(
        db.sequelize.fn('YEAR', db.sequelize.col('tanggal_surat')),
        year
      ),
      order: [['createdAt', 'DESC']],
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    let seq = 1;
    if (last && last.nomor_surat) {
      const m = last.nomor_surat.match(/(\d+)$/);
      if (m) seq = Number(m[1]) + 1;
    }

    let nomor_surat = `SUR/${year}/${String(seq).padStart(4, '0')}`;

    // Double-check uniqueness, increment if needed
    while (await db.SuratKeluar.findOne({ where: { nomor_surat }, transaction })) {
      seq += 1;
      nomor_surat = `SUR/${year}/${String(seq).padStart(4, '0')}`;
    }

    await transaction.commit();
    return nomor_surat;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

exports.generateFromTemplate = async (req, res) => {
  try {
    // Use predefined template instead of uploaded file
    const templatePath = path.join(__dirname, '../uploads/templates/surat_keluar.docx');
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ message: 'Template surat keluar tidak ditemukan' });
    }

    const { 
      siswa_id, 
      tujuan_nama_pesantren, 
      tujuan_alamat_pesantren, 
      alasan, 
      jenis_keluar = 'Pindah', // Set default value
      penanggung_jawab = 'wali', // Set default value
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
    const surat = await db.SuratKeluar.create({ 
      nomor_surat,
      siswa_id,
      // Ensure jenis_keluar is one of 'Pindah' or 'DO'
      jenis_keluar: ['Pindah', 'DO'].includes(jenis_keluar) ? jenis_keluar : 'Pindah',
      tujuan_nama_pesantren,
      tujuan_alamat_pesantren,
      alasan,
      tanggal_surat,
      // PERBAIKAN: Sesuaikan dengan ENUM yang tersedia ('ayah', 'ibu', 'wali')
      penanggung_jawab: penanggung_jawab || 'wali',
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
    const content = await readFile(templatePath);
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { 
      paragraphLoop: true, 
      linebreaks: true
    });

    try {
      // Use modern API methods
      await doc.renderAsync({
        ...data,
        jenis_keluar: data.jenis_keluar || 'Pindah',
        penanggung_jawab: data.penanggung_jawab || 'wali'
      });

      const buf = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE'
      });
    } catch (error) {
      console.error("Docxtemplater render error: ", error);
      if (error.properties && error.properties.errors) {
        error.properties.errors.forEach(err => console.error("Template error:", err));
      }
      throw new Error('Gagal memproses template surat');
    }

    const buf = doc.getZip().generate({ type: 'nodebuffer' });

    // Store the generated file
    const outputFilename = `surat-pindah-${siswa.nama.replace(/\s/g, '-')}.docx`;
    const outputPath = path.join(__dirname, '../uploads/surat-keluar', outputFilename);

    // Ensure the directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save the file
    fs.writeFileSync(outputPath, buf);

    // Update the existing record with file information
    await surat.update({
      nama_file: outputFilename,
      path: outputPath,
      jenis_dokumen: 'surat_keluar_generated',
      keterangan: `Surat keluar untuk ${siswa.nama}`
    });

    // Send as attachment
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(outputFilename)}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    return res.send(buf);

  } catch (err) {
    console.error('Error generating surat:', err);
    return res.status(500).json({ 
      message: err.message || 'Terjadi kesalahan saat membuat surat'
    });
  }
};