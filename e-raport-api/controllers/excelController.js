const db = require('../models');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Download template Excel LENGKAP dengan multiple sheets
// Perbaikan pada excelController.js - fungsi downloadCompleteTemplate

// Upload data dari multi-sheet Excel
exports.uploadCompleteData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }

    const filePath = req.file.path;
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
        nilaiWorksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header
          const rowData = {
            nis: row.values[1],
            kode_mapel: row.values[3],
            pengetahuan_angka: parseFloat(row.values[5]) || null,
            keterampilan_angka: parseFloat(row.values[6]) || null,
            semester: row.values[7],
            tahun_ajaran: row.values[8],
          };
          if (rowData.nis && rowData.kode_mapel && (rowData.pengetahuan_angka !== null || rowData.keterampilan_angka !== null)) {
            nilaiData.push(rowData);
          }
        });

        for (const item of nilaiData) {
          const siswa = await db.Siswa.findOne({ where: { nis: item.nis } });
          const mapel = await db.MataPelajaran.findOne({ where: { id: parseInt(item.kode_mapel.replace('MP', ''), 10) } });
          if (siswa && mapel) {
            await db.NilaiUjian.upsert({
              siswa_id: siswa.id, // PERBAIKAN: Gunakan snake_case
              mapel_id: mapel.id, // PERBAIKAN: Gunakan snake_case
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
          hafalanWorksheet.eachRow((row, rowNumber) => {
              if (rowNumber === 1) return;
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

          for (const item of hafalanData) {
              const siswa = await db.Siswa.findOne({ where: { nis: item.nis } });
              const mapel = await db.MataPelajaran.findOne({ where: { id: parseInt(item.kode_mapel.replace('MP', ''), 10) } });
              if (siswa && mapel) {
                  await db.NilaiHafalan.upsert({
                      siswa_id: siswa.id,        // PERBAIKAN: Gunakan snake_case
                      mapel_id: mapel.id,  // PERBAIKAN: Gunakan snake_case
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
          kehadiranWorksheet.eachRow((row, rowNumber) => {
              if (rowNumber === 1) return;
              const rowData = {
                  nis: row.values[1],
                  kegiatan: row.values[3],
                  izin: parseInt(row.values[4], 10) || 0,
                  sakit: parseInt(row.values[5], 10) || 0,
                  absen: parseInt(row.values[6], 10) || 0,
                  semester: row.values[7],
                  tahun_ajaran: row.values[8],
              };
              if (rowData.nis && rowData.kegiatan) {
                  kehadiranData.push(rowData);
              }
          });

          for (const item of kehadiranData) {
              const siswa = await db.Siswa.findOne({ where: { nis: item.nis } });
              if (siswa) {
                  await db.Kehadiran.upsert({
                      siswa_id: siswa.id, // PERBAIKAN: Gunakan snake_case
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
          sikapWorksheet.eachRow((row, rowNumber) => {
              if (rowNumber === 1) return;
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

          for (const item of sikapData) {
              const siswa = await db.Siswa.findOne({ where: { nis: item.nis } });
              if (siswa) {
                  await db.Sikap.upsert({
                      siswa_id: siswa.id, // PERBAIKAN: Gunakan snake_case
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
      fs.unlinkSync(filePath); // Hapus file setelah diproses

      res.status(200).json({
        message: 'Data berhasil diimpor dari template lengkap.',
        results: results
      });

    } catch (dbError) {
      await transaction.rollback();
      throw dbError; // Lempar error untuk ditangkap oleh blok catch luar
    }

  } catch (error) {
    console.error('Error processing complete excel file:', error);
    if (req.file) { // Pastikan file dihapus jika terjadi error
        const filePath = req.file.path;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
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

    const filePath = req.file.path;
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
    const filePath = req.file.path;
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
    const indikatorList = await db.IndikatorKehadiran.findAll({ order: [['nama_kegiatan', 'ASC']] });

    if (indikatorList.length === 0) {
      return res.status(404).json({ message: 'Tidak ada data Indikator Kehadiran. Silakan tambahkan terlebih dahulu di menu Master Data.' });
    }

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
      for (const indikator of indikatorList) {
        sheet.addRow({
          nis: siswa.nis,
          nama: siswa.nama,
          kegiatan: indikator.nama_kegiatan, // ✅ ambil dari tabel
          izin: 0,
          sakit: 0,
          absen: 0,
          semester,
          tahun_ajaran
        });
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
    const filePath = req.file.path;
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
    const filePath = req.file.path;5
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

exports.downloadCompleteTemplate = async (req, res) => {
  try {
    const { kelas_id, tahun_ajaran, semester } = req.query;

    if (!kelas_id || !tahun_ajaran || !semester) {
      return res.status(400).json({ message: 'Parameter kelas_id, tahun_ajaran, semester wajib diisi.' });
    }

    const siswaList = await db.Siswa.findAll({ where: { kelas_id }, order: [['nama', 'ASC']] });
    const mapelList = await db.MataPelajaran.findAll({ order: [['nama_mapel', 'ASC']] });
    const indikatorKehadiran = await db.IndikatorKehadiran.findAll({ order: [['nama_kegiatan', 'ASC']] });
    const indikatorSpiritual = await db.IndikatorSikap.findAll({ where: { jenis_sikap: 'spiritual' } });
    const indikatorSosial = await db.IndikatorSikap.findAll({ where: { jenis_sikap: 'sosial' } });

    if (siswaList.length === 0) {
      return res.status(404).json({ message: 'Tidak ada siswa di kelas ini.' });
    }

    const workbook = new ExcelJS.Workbook();

    // ========== Sheet Nilai Ujian ==========
    const sheetUjian = workbook.addWorksheet('Template Nilai Ujian');
    sheetUjian.columns = [
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
        sheetUjian.addRow({ nis: siswa.nis, nama_siswa: siswa.nama, kode_mapel: mapel.kode_mapel, nama_mapel: mapel.nama_mapel, semester, tahun_ajaran });
      }
    }

    // ========== Sheet Hafalan ==========
    const sheetHafalan = workbook.addWorksheet('Template Hafalan');
    sheetHafalan.columns = [
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
        sheetHafalan.addRow({ nis: siswa.nis, nama_siswa: siswa.nama, kode_mapel: mapel.kode_mapel, nama_mapel: mapel.nama_mapel, semester, tahun_ajaran });
      }
    }

    // ========== Sheet Kehadiran ==========
    const sheetKehadiran = workbook.addWorksheet('Template Kehadiran');
    sheetKehadiran.columns = [
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
      for (const indikator of indikatorKehadiran) {
        sheetKehadiran.addRow({ nis: siswa.nis, nama: siswa.nama, kegiatan: indikator.nama_kegiatan, izin: 0, sakit: 0, absen: 0, semester, tahun_ajaran });
      }
    }

    // ========== Sheet Sikap ==========
    const sheetSikap = workbook.addWorksheet('Template Sikap');
    sheetSikap.columns = [
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
        sheetSikap.addRow({ nis: siswa.nis, nama: siswa.nama, jenis: 'spiritual', indikator: ind.indikator, semester, tahun_ajaran });
      }
      for (const ind of indikatorSosial) {
        sheetSikap.addRow({ nis: siswa.nis, nama: siswa.nama, jenis: 'sosial', indikator: ind.indikator, semester, tahun_ajaran });
      }
    }

    // Response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Template_Complete.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Error creating complete template:', err);
    res.status(500).json({ message: 'Gagal membuat template lengkap', error: err.message });
  }
};
