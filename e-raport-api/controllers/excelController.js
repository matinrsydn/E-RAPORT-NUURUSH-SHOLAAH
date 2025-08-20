const db = require('../models');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Download template Excel LENGKAP dengan multiple sheets
// Perbaikan pada excelController.js - fungsi downloadCompleteTemplate

// Perbaikan untuk fungsi uploadCompleteData di excelController.js

exports.uploadCompleteData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }

    const filePath = path.join(__dirname, '../', req.file.path);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const results = {
      nilai_ujian: { success: 0, errors: [] },
      hafalan: { success: 0, errors: [] },
      kehadiran: { success: 0, errors: [] },
      sikap: { success: 0, errors: [] }
    };

    const transaction = await db.sequelize.transaction();

    try {
      // ========== PROSES SHEET NILAI UJIAN ==========
      const nilaiWorksheet = workbook.getWorksheet('Template Nilai Ujian');
      if (nilaiWorksheet) {
        console.log('Processing Nilai Ujian sheet...');
        const nilaiData = [];
        let isFirstRow = true;

        nilaiWorksheet.eachRow((row, rowNumber) => {
          if (isFirstRow) {
            isFirstRow = false;
            return;
          }

          // Pastikan row.values ada dan tidak kosong
          if (!row.values || row.values.length < 8) return;

          const rowData = {
            nis: row.values[1],
            kode_mapel: row.values[3],
            pengetahuan_angka: parseFloat(row.values[5]) || null,
            keterampilan_angka: parseFloat(row.values[6]) || null,
            semester: row.values[7],
            tahun_ajaran: row.values[8],
          };

          // Skip jika data tidak lengkap
          if (!rowData.nis || !rowData.kode_mapel) return;
          if (rowData.pengetahuan_angka === null && rowData.keterampilan_angka === null) return;

          nilaiData.push(rowData);
        });

        console.log(`Found ${nilaiData.length} nilai ujian records`);

        // Proses dan simpan nilai ujian
        for (const item of nilaiData) {
          try {
            const siswa = await db.Siswa.findOne({ where: { nis: item.nis } });
            if (!siswa) {
              results.nilai_ujian.errors.push(`Siswa dengan NIS ${item.nis} tidak ditemukan`);
              continue;
            }

            // PERBAIKAN: Parse kode mapel dengan benar
            const mapelId = parseInt(item.kode_mapel.replace('MP', ''));
            const mapel = await db.MataPelajaran.findOne({ where: { id: mapelId } });
            
            if (!mapel) {
              results.nilai_ujian.errors.push(`Mata pelajaran dengan kode ${item.kode_mapel} tidak ditemukan`);
              continue;
            }

            // PERBAIKAN: Gunakan foreign key yang benar sesuai model
            await db.NilaiUjian.upsert({
              siswa_id: siswa.id, // Gunakan siswa_id sesuai model
              mapel_id: mapel.id,  // Gunakan mapel_id sesuai model
              pengetahuan_angka: item.pengetahuan_angka,
              keterampilan_angka: item.keterampilan_angka,
              semester: item.semester,
              tahun_ajaran: item.tahun_ajaran,
            }, { transaction });
            
            results.nilai_ujian.success++;
          } catch (error) {
            console.error('Error processing nilai ujian:', error);
            results.nilai_ujian.errors.push(`Error untuk NIS ${item.nis}: ${error.message}`);
          }
        }
      }

      // ========== PROSES SHEET HAFALAN ==========
      const hafalanWorksheet = workbook.getWorksheet('Template Hafalan');
      if (hafalanWorksheet) {
        console.log('Processing Hafalan sheet...');
        const hafalanData = [];
        let isFirstRow = true;

        hafalanWorksheet.eachRow((row, rowNumber) => {
          if (isFirstRow) {
            isFirstRow = false;
            return;
          }

          if (!row.values || row.values.length < 7) return;

          const rowData = {
            nis: row.values[1],
            kode_mapel: row.values[3],
            nilai_hafalan: parseFloat(row.values[5]) || null,
            semester: row.values[6],
            tahun_ajaran: row.values[7],
          };

          if (!rowData.nis || !rowData.kode_mapel || rowData.nilai_hafalan === null) return;

          hafalanData.push(rowData);
        });

        console.log(`Found ${hafalanData.length} hafalan records`);

        // Proses dan simpan hafalan
        for (const item of hafalanData) {
          try {
            const siswa = await db.Siswa.findOne({ where: { nis: item.nis } });
            if (!siswa) {
              results.hafalan.errors.push(`Siswa dengan NIS ${item.nis} tidak ditemukan`);
              continue;
            }

            const mapelId = parseInt(item.kode_mapel.replace('MP', ''));
            const mapel = await db.MataPelajaran.findOne({ where: { id: mapelId } });
            
            if (!mapel) {
              results.hafalan.errors.push(`Mata pelajaran dengan kode ${item.kode_mapel} tidak ditemukan`);
              continue;
            }

            // PERBAIKAN: Gunakan foreign key yang benar sesuai model NilaiHafalan
            await db.NilaiHafalan.upsert({
              siswaId: siswa.id,           // Gunakan siswaId sesuai model
              mataPelajaranId: mapel.id,   // Gunakan mataPelajaranId sesuai model
              nilai_angka: item.nilai_hafalan,
              semester: item.semester,
              tahun_ajaran: item.tahun_ajaran,
            }, { transaction });
            
            results.hafalan.success++;
          } catch (error) {
            console.error('Error processing hafalan:', error);
            results.hafalan.errors.push(`Error untuk NIS ${item.nis}: ${error.message}`);
          }
        }
      }

      // ========== PROSES SHEET KEHADIRAN ==========
      const kehadiranWorksheet = workbook.getWorksheet('Template Kehadiran');
      if (kehadiranWorksheet) {
        console.log('Processing Kehadiran sheet...');
        const kehadiranData = [];
        let isFirstRow = true;

        kehadiranWorksheet.eachRow((row, rowNumber) => {
          if (isFirstRow) {
            isFirstRow = false;
            return;
          }

          if (!row.values || row.values.length < 8) return;

          const rowData = {
            nis: row.values[1],
            kegiatan: row.values[3],
            izin: parseInt(row.values[4]) || 0,
            sakit: parseInt(row.values[5]) || 0,
            absen: parseInt(row.values[6]) || 0,
            semester: row.values[7],
            tahun_ajaran: row.values[8],
          };

          if (!rowData.nis || !rowData.kegiatan) return;

          kehadiranData.push(rowData);
        });

        console.log(`Found ${kehadiranData.length} kehadiran records`);

        // Proses dan simpan kehadiran
        for (const item of kehadiranData) {
          try {
            const siswa = await db.Siswa.findOne({ where: { nis: item.nis } });
            if (!siswa) {
              results.kehadiran.errors.push(`Siswa dengan NIS ${item.nis} tidak ditemukan`);
              continue;
            }

            await db.Kehadiran.upsert({
              siswaId: siswa.id,
              kegiatan: item.kegiatan,
              izin: item.izin,
              sakit: item.sakit,
              absen: item.absen,
              semester: item.semester,
              tahun_ajaran: item.tahun_ajaran,
            }, { transaction });
            
            results.kehadiran.success++;
          } catch (error) {
            console.error('Error processing kehadiran:', error);
            results.kehadiran.errors.push(`Error untuk NIS ${item.nis}: ${error.message}`);
          }
        }
      }

      // ========== PROSES SHEET SIKAP ==========
      const sikapWorksheet = workbook.getWorksheet('Template Sikap');
      if (sikapWorksheet) {
        console.log('Processing Sikap sheet...');
        const sikapData = [];
        let isFirstRow = true;

        sikapWorksheet.eachRow((row, rowNumber) => {
          if (isFirstRow) {
            isFirstRow = false;
            return;
          }

          if (!row.values || row.values.length < 8) return;

          const rowData = {
            nis: row.values[1],
            jenis_sikap: row.values[3],
            indikator: row.values[4],
            nilai_angka: parseFloat(row.values[5]) || null,
            deskripsi: row.values[6] || '',
            semester: row.values[7],
            tahun_ajaran: row.values[8],
          };

          if (!rowData.nis || !rowData.jenis_sikap || !rowData.indikator || rowData.nilai_angka === null) return;

          sikapData.push(rowData);
        });

        console.log(`Found ${sikapData.length} sikap records`);

        // Proses dan simpan sikap
        for (const item of sikapData) {
          try {
            const siswa = await db.Siswa.findOne({ where: { nis: item.nis } });
            if (!siswa) {
              results.sikap.errors.push(`Siswa dengan NIS ${item.nis} tidak ditemukan`);
              continue;
            }

            await db.Sikap.upsert({
              siswaId: siswa.id,
              jenis_sikap: item.jenis_sikap,
              indikator: item.indikator,
              angka: item.nilai_angka,
              deskripsi: item.deskripsi,
              semester: item.semester,
              tahun_ajaran: item.tahun_ajaran,
            }, { transaction });
            
            results.sikap.success++;
          } catch (error) {
            console.error('Error processing sikap:', error);
            results.sikap.errors.push(`Error untuk NIS ${item.nis}: ${error.message}`);
          }
        }
      }

      await transaction.commit();
      
      // Hapus file yang sudah diproses
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      console.log('Upload complete results:', results);

      res.status(200).json({ 
        message: 'Data berhasil diimpor dari template lengkap.',
        results: results
      });

    } catch (dbError) {
      await transaction.rollback();
      console.error('Database transaction error:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('Error processing complete excel file:', error);
    
    // Pastikan file dibersihkan jika ada error
    if (req.file && req.file.path) {
      const filePath = path.join(__dirname, '../', req.file.path);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }
    }
    
    res.status(500).json({ 
      message: 'Terjadi kesalahan saat memproses file Excel lengkap.', 
      error: error.message 
    });
  }
};
// Upload data dari multi-sheet Excel
exports.uploadCompleteData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }

    const filePath = path.join(__dirname, '../', req.file.path);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const results = {
      nilai_ujian: { success: 0, errors: [] },
      hafalan: { success: 0, errors: [] },
      kehadiran: { success: 0, errors: [] },
      sikap: { success: 0, errors: [] }
    };

    const transaction = await db.sequelize.transaction();

    try {
      // ========== PROSES SHEET NILAI UJIAN ==========
      const nilaiWorksheet = workbook.getWorksheet('Template Nilai Ujian');
      if (nilaiWorksheet) {
        const nilaiData = [];
        let isFirstRow = true;

        nilaiWorksheet.eachRow((row, rowNumber) => {
          if (isFirstRow) {
            isFirstRow = false;
            return;
          }

          const rowData = {
            nis: row.values[1],
            kode_mapel: row.values[3],
            pengetahuan_angka: parseFloat(row.values[5]) || null,
            keterampilan_angka: parseFloat(row.values[6]) || null,
            semester: row.values[7],
            tahun_ajaran: row.values[8],
          };

          if (rowData.nis && rowData.kode_mapel && 
              (rowData.pengetahuan_angka !== null || rowData.keterampilan_angka !== null)) {
            nilaiData.push(rowData);
          }
        });

        // Proses dan simpan nilai ujian
        for (const item of nilaiData) {
          const siswa = await db.Siswa.findOne({ where: { nis: item.nis } });
          const mapel = await db.MataPelajaran.findOne({ 
            where: { id: parseInt(item.kode_mapel.replace('MP', '')) } 
          });

          if (siswa && mapel) {
            await db.NilaiUjian.upsert({
              siswa_id: siswa.id,
              mapel_id: mapel.id,
              pengetahuan_angka: item.pengetahuan_angka,
              keterampilan_angka: item.keterampilan_angka,
              semester: item.semester,
              tahun_ajaran: item.tahun_ajaran,
            }, { transaction });
            results.nilai_ujian.success++;
          }
        }
      }

      // ========== PROSES SHEET HAFALAN ==========
      const hafalanWorksheet = workbook.getWorksheet('Template Hafalan');
      if (hafalanWorksheet) {
        const hafalanData = [];
        let isFirstRow = true;

        hafalanWorksheet.eachRow((row, rowNumber) => {
          if (isFirstRow) {
            isFirstRow = false;
            return;
          }

          const rowData = {
            nis: row.values[1],
            kode_mapel: row.values[3],
            nilai_hafalan: parseFloat(row.values[5]) || null,
            semester: row.values[6],
            tahun_ajaran: row.values[7],
          };

          if (rowData.nis && rowData.kode_mapel && rowData.nilai_hafalan !== null) {
            hafalanData.push(rowData);
          }
        });

        // Proses dan simpan hafalan
        for (const item of hafalanData) {
          const siswa = await db.Siswa.findOne({ where: { nis: item.nis } });
          const mapel = await db.MataPelajaran.findOne({ 
            where: { id: parseInt(item.kode_mapel.replace('MP', '')) } 
          });

          if (siswa && mapel) {
            await db.NilaiHafalan.upsert({
              siswaId: siswa.id,
              mataPelajaranId: mapel.id,
              nilai_angka: item.nilai_hafalan,
              semester: item.semester,
              tahun_ajaran: item.tahun_ajaran,
            }, { transaction });
            results.hafalan.success++;
          }
        }
      }

      // ========== PROSES SHEET KEHADIRAN ==========
      const kehadiranWorksheet = workbook.getWorksheet('Template Kehadiran');
      if (kehadiranWorksheet) {
        const kehadiranData = [];
        let isFirstRow = true;

        kehadiranWorksheet.eachRow((row, rowNumber) => {
          if (isFirstRow) {
            isFirstRow = false;
            return;
          }

          const rowData = {
            nis: row.values[1],
            kegiatan: row.values[3],
            izin: parseInt(row.values[4]) || 0,
            sakit: parseInt(row.values[5]) || 0,
            absen: parseInt(row.values[6]) || 0,
            semester: row.values[7],
            tahun_ajaran: row.values[8],
          };

          if (rowData.nis && rowData.kegiatan) {
            kehadiranData.push(rowData);
          }
        });

        // Proses dan simpan kehadiran
        for (const item of kehadiranData) {
          const siswa = await db.Siswa.findOne({ where: { nis: item.nis } });

          if (siswa) {
            await db.Kehadiran.upsert({
              siswaId: siswa.id,
              kegiatan: item.kegiatan,
              izin: item.izin,
              sakit: item.sakit,
              absen: item.absen,
              semester: item.semester,
              tahun_ajaran: item.tahun_ajaran,
            }, { transaction });
            results.kehadiran.success++;
          }
        }
      }

      // ========== PROSES SHEET SIKAP ==========
      const sikapWorksheet = workbook.getWorksheet('Template Sikap');
      if (sikapWorksheet) {
        const sikapData = [];
        let isFirstRow = true;

        sikapWorksheet.eachRow((row, rowNumber) => {
          if (isFirstRow) {
            isFirstRow = false;
            return;
          }

          const rowData = {
            nis: row.values[1],
            jenis_sikap: row.values[3],
            indikator: row.values[4],
            nilai_angka: parseFloat(row.values[5]) || null,
            deskripsi: row.values[6] || '',
            semester: row.values[7],
            tahun_ajaran: row.values[8],
          };

          if (rowData.nis && rowData.jenis_sikap && rowData.indikator && rowData.nilai_angka !== null) {
            sikapData.push(rowData);
          }
        });

        // Proses dan simpan sikap
        for (const item of sikapData) {
          const siswa = await db.Siswa.findOne({ where: { nis: item.nis } });

          if (siswa) {
            await db.Sikap.upsert({
              siswaId: siswa.id,
              jenis_sikap: item.jenis_sikap,
              indikator: item.indikator,
              angka: item.nilai_angka,
              deskripsi: item.deskripsi,
              semester: item.semester,
              tahun_ajaran: item.tahun_ajaran,
            }, { transaction });
            results.sikap.success++;
          }
        }
      }

      await transaction.commit();
      fs.unlinkSync(filePath);

      res.status(200).json({ 
        message: 'Data berhasil diimpor dari template lengkap.',
        results: results
      });

    } catch (dbError) {
      await transaction.rollback();
      throw dbError;
    }

  } catch (error) {
    console.error('Error processing complete excel file:', error);
    res.status(500).json({ 
      message: 'Terjadi kesalahan saat memproses file Excel lengkap.', 
      error: error.message 
    });
  }
};

// ====================== NILAI UJIAN ======================
exports.downloadTemplate = async (req, res) => {
  try {
    const { kelas_id, tahun_ajaran, semester } = req.query;

    if (!kelas_id || !tahun_ajaran || !semester) {
      return res.status(400).json({ message: 'Parameter kelas_id, tahun_ajaran, semester wajib diisi.' });
    }

    const siswaList = await db.Siswa.findAll({ where: { kelas_id }, order: [['nama', 'ASC']] });
    const mapelList = await db.MataPelajaran.findAll({ order: [['nama_mapel', 'ASC']] });

    if (siswaList.length === 0) return res.status(404).json({ message: 'Tidak ada siswa di kelas ini.' });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Nilai Ujian');

    sheet.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Siswa', key: 'nama_siswa', width: 25 },
      { header: 'Kode Mapel', key: 'kode_mapel', width: 15 },
      { header: 'Nama Mapel', key: 'nama_mapel', width: 25 },
      { header: 'Pengetahuan (Angka)', key: 'pengetahuan', width: 20 },
      { header: 'Keterampilan (Angka)', key: 'keterampilan', width: 20 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 }
    ];

    for (const siswa of siswaList) {
      for (const mapel of mapelList) {
        sheet.addRow({
          nis: siswa.nis,
          nama_siswa: siswa.nama,
          kode_mapel: mapel.kode_mapel || `MP${mapel.id}`,
          nama_mapel: mapel.nama_mapel,
          semester,
          tahun_ajaran
        });
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Template_Nilai_Ujian.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    res.status(500).json({ message: 'Gagal membuat template nilai ujian', error: err.message });
  }
};

exports.uploadNilai = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Tidak ada file yang diupload.' });

    const filePath = path.join(__dirname, '../', req.file.path);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet('Nilai Ujian');

    let success = 0;
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const siswa = await db.Siswa.findOne({ where: { nis: row.getCell(1).value } });
      const mapel = await db.MataPelajaran.findOne({ where: { kode_mapel: row.getCell(3).value } });

      if (siswa && mapel) {
        await db.NilaiUjian.upsert({
          siswa_id: siswa.id,
          mapel_id: mapel.id,
          pengetahuan_angka: parseFloat(row.getCell(5).value) || null,
          keterampilan_angka: parseFloat(row.getCell(6).value) || null,
          semester: row.getCell(7).value,
          tahun_ajaran: row.getCell(8).value
        });
        success++;
      }
    }
    fs.unlinkSync(filePath);
    res.json({ message: `Berhasil upload ${success} data nilai ujian.` });
  } catch (err) {
    res.status(500).json({ message: 'Gagal upload nilai ujian', error: err.message });
  }
};

// ====================== HAFALAN ======================
exports.downloadTemplateHafalan = async (req, res) => {
  try {
    const { kelas_id, tahun_ajaran, semester } = req.query;
    const siswaList = await db.Siswa.findAll({ where: { kelas_id }, order: [['nama', 'ASC']] });
    const mapelList = await db.MataPelajaran.findAll({ where: { nama_mapel: { [db.Sequelize.Op.iLike]: '%Qur%' } } });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Hafalan');
    sheet.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Siswa', key: 'nama_siswa', width: 25 },
      { header: 'Kode Mapel', key: 'kode_mapel', width: 15 },
      { header: 'Nama Mapel', key: 'nama_mapel', width: 25 },
      { header: 'Nilai Hafalan', key: 'nilai', width: 15 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 }
    ];
    for (const siswa of siswaList) {
      for (const mapel of mapelList) {
        sheet.addRow({ nis: siswa.nis, nama_siswa: siswa.nama, kode_mapel: mapel.kode_mapel, nama_mapel: mapel.nama_mapel, semester, tahun_ajaran });
      }
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Template_Hafalan.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: 'Gagal membuat template hafalan', error: err.message });
  }
};

exports.uploadHafalan = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Tidak ada file diupload.' });
    const filePath = path.join(__dirname, '../', req.file.path);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet('Hafalan');

    let success = 0;
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const siswa = await db.Siswa.findOne({ where: { nis: row.getCell(1).value } });
      const mapel = await db.MataPelajaran.findOne({ where: { kode_mapel: row.getCell(3).value } });

      if (siswa && mapel) {
        await db.NilaiHafalan.upsert({
          siswaId: siswa.id,
          mataPelajaranId: mapel.id,
          nilai_angka: parseFloat(row.getCell(5).value) || null,
          semester: row.getCell(6).value,
          tahun_ajaran: row.getCell(7).value
        });
        success++;
      }
    }
    fs.unlinkSync(filePath);
    res.json({ message: `Berhasil upload ${success} data hafalan.` });
  } catch (err) {
    res.status(500).json({ message: 'Gagal upload hafalan', error: err.message });
  }
};

// ====================== KEHADIRAN ======================
exports.downloadTemplateKehadiran = async (req, res) => {
  try {
    const { kelas_id, tahun_ajaran, semester } = req.query;
    const siswaList = await db.Siswa.findAll({ where: { kelas_id }, order: [['nama', 'ASC']] });
    const kegiatanList = ['Shalat Berjamaah', 'Mengaji', 'Tahfidz', 'Sekolah Formal'];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Kehadiran');
    sheet.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Siswa', key: 'nama', width: 25 },
      { header: 'Kegiatan', key: 'kegiatan', width: 20 },
      { header: 'Izin', key: 'izin', width: 10 },
      { header: 'Sakit', key: 'sakit', width: 10 },
      { header: 'Absen', key: 'absen', width: 10 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 }
    ];
    for (const siswa of siswaList) {
      for (const k of kegiatanList) {
        sheet.addRow({ nis: siswa.nis, nama: siswa.nama, kegiatan: k, izin: 0, sakit: 0, absen: 0, semester, tahun_ajaran });
      }
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Template_Kehadiran.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: 'Gagal membuat template kehadiran', error: err.message });
  }
};

exports.uploadKehadiran = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Tidak ada file diupload.' });
    const filePath = path.join(__dirname, '../', req.file.path);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet('Kehadiran');

    let success = 0;
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const siswa = await db.Siswa.findOne({ where: { nis: row.getCell(1).value } });

      if (siswa) {
        await db.Kehadiran.upsert({
          siswaId: siswa.id,
          kegiatan: row.getCell(3).value,
          izin: parseInt(row.getCell(4).value) || 0,
          sakit: parseInt(row.getCell(5).value) || 0,
          absen: parseInt(row.getCell(6).value) || 0,
          semester: row.getCell(7).value,
          tahun_ajaran: row.getCell(8).value
        });
        success++;
      }
    }
    fs.unlinkSync(filePath);
    res.json({ message: `Berhasil upload ${success} data kehadiran.` });
  } catch (err) {
    res.status(500).json({ message: 'Gagal upload kehadiran', error: err.message });
  }
};

// ====================== SIKAP ======================
exports.downloadTemplateSikap = async (req, res) => {
  try {
    const { kelas_id, tahun_ajaran, semester } = req.query;
    const siswaList = await db.Siswa.findAll({ where: { kelas_id }, order: [['nama', 'ASC']] });
    const indikatorSpiritual = await db.IndikatorSikap.findAll({ where: { jenis_sikap: 'spiritual' } });
    const indikatorSosial = await db.IndikatorSikap.findAll({ where: { jenis_sikap: 'sosial' } });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sikap');
    sheet.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Siswa', key: 'nama', width: 25 },
      { header: 'Jenis Sikap', key: 'jenis', width: 15 },
      { header: 'Indikator', key: 'indikator', width: 30 },
      { header: 'Nilai Angka', key: 'angka', width: 15 },
      { header: 'Deskripsi', key: 'deskripsi', width: 40 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 }
    ];
    for (const siswa of siswaList) {
      for (const ind of indikatorSpiritual) {
        sheet.addRow({ nis: siswa.nis, nama: siswa.nama, jenis: 'spiritual', indikator: ind.indikator, semester, tahun_ajaran });
      }
      for (const ind of indikatorSosial) {
        sheet.addRow({ nis: siswa.nis, nama: siswa.nama, jenis: 'sosial', indikator: ind.indikator, semester, tahun_ajaran });
      }
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Template_Sikap.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: 'Gagal membuat template sikap', error: err.message });
  }
};

exports.uploadSikap = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Tidak ada file diupload.' });
    const filePath = path.join(__dirname, '../', req.file.path);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet('Sikap');

    let success = 0;
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const siswa = await db.Siswa.findOne({ where: { nis: row.getCell(1).value } });

      if (siswa) {
        await db.Sikap.upsert({
          siswaId: siswa.id,
          jenis_sikap: row.getCell(3).value,
          indikator: row.getCell(4).value,
          angka: parseFloat(row.getCell(5).value) || null,
          deskripsi: row.getCell(6).value || '',
          semester: row.getCell(7).value,
          tahun_ajaran: row.getCell(8).value
        });
        success++;
      }
    }
    fs.unlinkSync(filePath);
    res.json({ message: `Berhasil upload ${success} data sikap.` });
  } catch (err) {
    res.status(500).json({ message: 'Gagal upload sikap', error: err.message });
  }
};