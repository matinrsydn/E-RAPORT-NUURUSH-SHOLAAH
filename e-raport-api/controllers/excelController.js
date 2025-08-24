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
      // Perbaikan untuk bagian PROSES SHEET KEHADIRAN di uploadCompleteData
      // ========== PROSES SHEET KEHADIRAN ==========
      // ========== PROSES SHEET KEHADIRAN ==========
      const kehadiranWorksheet = workbook.getWorksheet('Template Kehadiran');
      if (kehadiranWorksheet) {
          const kehadiranData = [];
          
          console.log(`📊 Total baris di sheet kehadiran: ${kehadiranWorksheet.rowCount}`);
          console.log(`📊 Total kolom di sheet kehadiran: ${kehadiranWorksheet.columnCount}`);
          
          // 🔥 DEBUGGING: Cek header dulu
          const headerRow = kehadiranWorksheet.getRow(1);
          console.log('📋 Header row values:', headerRow.values);
          
          // 🔥 DEBUGGING: Lihat beberapa baris pertama
          for (let rowNum = 2; rowNum <= Math.min(5, kehadiranWorksheet.rowCount); rowNum++) {
              const debugRow = kehadiranWorksheet.getRow(rowNum);
              console.log(`🔍 Debug Baris ${rowNum}:`, {
                  values: debugRow.values,
                  cell1: debugRow.getCell(1).value,
                  cell2: debugRow.getCell(2).value,
                  cell3: debugRow.getCell(3).value,
                  cell4: debugRow.getCell(4).value,
                  cell5: debugRow.getCell(5).value,
                  cell6: debugRow.getCell(6).value,
                  cell7: debugRow.getCell(7).value,
                  cell8: debugRow.getCell(8).value,
              });
          }
          
          // 🔥 METODE ALTERNATIF: Gunakan worksheetjson
          const worksheetJSON = [];
          kehadiranWorksheet.eachRow((row, rowNumber) => {
              if (rowNumber === 1) return; // Skip header
              
              // 🔥 PERBAIKAN: Coba beberapa cara baca data
              const method1 = {
                  nis: row.values[1],
                  nama_siswa: row.values[2],
                  kegiatan: row.values[3],
                  izin: row.values[4],
                  sakit: row.values[5],
                  absen: row.values[6],
                  semester: row.values[7],
                  tahun_ajaran: row.values[8],
              };
              
              const method2 = {
                  nis: row.getCell(1).value,
                  nama_siswa: row.getCell(2).value,
                  kegiatan: row.getCell(3).value,
                  izin: row.getCell(4).value,
                  sakit: row.getCell(5).value,
                  absen: row.getCell(6).value,
                  semester: row.getCell(7).value,
                  tahun_ajaran: row.getCell(8).value,
              };
              
              console.log(`🔍 Baris ${rowNumber} - Method1:`, method1);
              console.log(`🔍 Baris ${rowNumber} - Method2:`, method2);
              
              // 🔥 GUNAKAN METHOD YANG LEBIH RELIABLE
              const rowData = {
                  nis: method2.nis || method1.nis,
                  nama_siswa: method2.nama_siswa || method1.nama_siswa,
                  kegiatan: method2.kegiatan || method1.kegiatan,
                  izin: parseInt(method2.izin || method1.izin, 10) || 0,
                  sakit: parseInt(method2.sakit || method1.sakit, 10) || 0,
                  absen: parseInt(method2.absen || method1.absen, 10) || 0,
                  semester: method2.semester || method1.semester,
                  tahun_ajaran: method2.tahun_ajaran || method1.tahun_ajaran,
              };
              
              console.log(`✨ Final rowData baris ${rowNumber}:`, rowData);
              
              // 🔥 VALIDASI: Pastikan data tidak kosong
              if (rowData.nis && rowData.kegiatan) {
                  kehadiranData.push(rowData);
                  console.log(`✅ Data ditambahkan: ${rowData.nis} - ${rowData.kegiatan} (izin:${rowData.izin}, sakit:${rowData.sakit}, absen:${rowData.absen})`);
              } else {
                  console.log(`❌ Data diabaikan baris ${rowNumber}:`, rowData);
              }
          });

          console.log(`📊 RINGKASAN: ${kehadiranData.length} data kehadiran akan diproses`);
          
          // 🔥 DEBUGGING: Tampilkan semua data yang akan diproses
          kehadiranData.forEach((item, index) => {
              console.log(`📋 Data ${index + 1}:`, item);
          });

          // 🔥 PROSES PENYIMPANAN
          for (const item of kehadiranData) {
              const siswa = await db.Siswa.findOne({ where: { nis: item.nis } });
              if (siswa) {
                  try {
                      console.log(`🔄 Akan menyimpan: Siswa ${siswa.nama} - Kegiatan "${item.kegiatan}" - izin:${item.izin}, sakit:${item.sakit}, absen:${item.absen}`);
                      
                      // 🔥 CEK: Apakah record sudah ada
                      const existingRecord = await db.Kehadiran.findOne({
                          where: {
                              siswa_id: siswa.id,
                              kegiatan: item.kegiatan,
                              semester: item.semester,
                              tahun_ajaran: item.tahun_ajaran
                          }
                      });
                      
                      if (existingRecord) {
                          console.log(`🔄 Record sudah ada, akan diupdate:`, existingRecord.toJSON());
                          await existingRecord.update({
                              izin: item.izin,
                              sakit: item.sakit,
                              absen: item.absen
                          }, { transaction });
                          console.log(`✅ Record berhasil diupdate untuk ${siswa.nama} - ${item.kegiatan}`);
                      } else {
                          console.log(`🆕 Membuat record baru`);
                          const newRecord = await db.Kehadiran.create({
                              siswa_id: siswa.id,
                              kegiatan: item.kegiatan,
                              izin: item.izin,
                              sakit: item.sakit,
                              absen: item.absen,
                              semester: item.semester,
                              tahun_ajaran: item.tahun_ajaran,
                          }, { transaction });
                          console.log(`✅ Record baru berhasil dibuat:`, newRecord.toJSON());
                      }
                      
                      results.kehadiran.success++;
                      
                  } catch (error) {
                      console.error(`❌ Error menyimpan kehadiran untuk ${siswa.nama} - ${item.kegiatan}:`, error);
                      results.kehadiran.errors.push(`NIS ${item.nis} - ${item.kegiatan}: ${error.message}`);
                  }
              } else {
                  console.log(`⚠️ Siswa dengan NIS ${item.nis} tidak ditemukan`);
                  results.kehadiran.errors.push(`NIS ${item.nis} tidak ditemukan dalam database`);
              }
          }
          
          // 🔥 DEBUGGING: Cek hasil akhir di database
          console.log('🔍 VERIFIKASI: Cek data yang tersimpan di database');
          const allKehadiran = await db.Kehadiran.findAll({
              where: {
                  semester: kehadiranData[0]?.semester,
                  tahun_ajaran: kehadiranData[0]?.tahun_ajaran
              },
              include: [{
                  model: db.Siswa,
                  attributes: ['nama', 'nis']
              }]
          });
          
          console.log('📋 Data kehadiran yang tersimpan di database:');
          allKehadiran.forEach(record => {
              console.log(`- ${record.Siswa.nama} (${record.Siswa.nis}) - ${record.kegiatan}: izin=${record.izin}, sakit=${record.sakit}, absen=${record.absen}`);
          });
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

// Perbaikan untuk fungsi downloadCompleteTemplate
exports.downloadCompleteTemplate = async (req, res) => {
  try {
    const { kelas_id, tahun_ajaran, semester } = req.query;

    if (!kelas_id || !tahun_ajaran || !semester) {
      return res.status(400).json({ message: 'Parameter kelas_id, tahun_ajaran, semester wajib diisi.' });
    }

    const siswaList = await db.Siswa.findAll({ where: { kelas_id }, order: [['nama', 'ASC']] });
    const mapelList = await db.MataPelajaran.findAll({ order: [['nama_mapel', 'ASC']] });
    
    // 🔥 PERBAIKAN: Ambil data indikator kehadiran dari tabel IndikatorKehadiran
    const indikatorKehadiran = await db.IndikatorKehadiran.findAll({ order: [['nama_kegiatan', 'ASC']] });
    
    const indikatorSpiritual = await db.IndikatorSikap.findAll({ where: { jenis_sikap: 'spiritual' } });
    const indikatorSosial = await db.IndikatorSikap.findAll({ where: { jenis_sikap: 'sosial' } });

    if (siswaList.length === 0) {
      return res.status(404).json({ message: 'Tidak ada siswa di kelas ini.' });
    }

    // 🔥 VALIDASI: Pastikan ada data indikator kehadiran
    if (indikatorKehadiran.length === 0) {
      return res.status(404).json({ message: 'Tidak ada data Indikator Kehadiran. Silakan tambahkan terlebih dahulu di menu Master Data.' });
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
        sheetUjian.addRow({ 
          nis: siswa.nis, 
          nama_siswa: siswa.nama, 
          kode_mapel: mapel.kode_mapel || `MP${mapel.id}`, // 🔥 PERBAIKAN: Pastikan kode_mapel ada
          nama_mapel: mapel.nama_mapel, 
          semester, 
          tahun_ajaran 
        });
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
        sheetHafalan.addRow({ 
          nis: siswa.nis, 
          nama_siswa: siswa.nama, 
          kode_mapel: mapel.kode_mapel || `MP${mapel.id}`, // 🔥 PERBAIKAN: Pastikan kode_mapel ada
          nama_mapel: mapel.nama_mapel, 
          semester, 
          tahun_ajaran 
        });
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

    console.log('🔄 Membuat template kehadiran...');
    console.log(`📊 Jumlah siswa: ${siswaList.length}`);
    console.log(`📊 Jumlah indikator kehadiran: ${indikatorKehadiran.length}`);

    // 🔥 DEBUGGING: Tampilkan data indikator kehadiran
    console.log('📋 Indikator kehadiran yang akan digunakan:');
    indikatorKehadiran.forEach((ind, index) => {
      console.log(`${index + 1}. ID: ${ind.id}, Nama: "${ind.nama_kegiatan}"`);
    });

    // 🔥 PERBAIKAN: Validasi data indikator kehadiran
    if (indikatorKehadiran.length === 0) {
      console.log('❌ TIDAK ADA INDIKATOR KEHADIRAN!');
      // Buat default data jika tidak ada
      const defaultKegiatan = [
        'Shalat Berjamaah',
        'Mengaji',
        'Piket',
        'Tahfidz',
        'Sekolah'
      ];
      
      console.log('🔄 Menggunakan kegiatan default...');
      let rowCount = 0;
      for (const siswa of siswaList) {
        for (const kegiatan of defaultKegiatan) {
          const rowData = { 
            nis: siswa.nis, 
            nama: siswa.nama, 
            kegiatan: kegiatan,
            izin: 0, 
            sakit: 0, 
            absen: 0, 
            semester, 
            tahun_ajaran 
          };
          
          sheetKehadiran.addRow(rowData);
          rowCount++;
          
          console.log(`📝 Baris ${rowCount}: ${siswa.nama} - ${kegiatan}`);
        }
      }
      console.log(`✅ Template kehadiran selesai (default) dengan ${rowCount} baris data`);
      
    } else {
      // 🔥 GUNAKAN DATA DARI DATABASE
      let rowCount = 0;
      for (const siswa of siswaList) {
        for (const indikator of indikatorKehadiran) {
          // 🔥 VALIDASI: Pastikan nama_kegiatan tidak null
          const namaKegiatan = indikator.nama_kegiatan;
          if (!namaKegiatan || namaKegiatan.trim() === '') {
            console.log(`⚠️ Indikator ID ${indikator.id} memiliki nama_kegiatan kosong!`);
            continue;
          }
          
          const rowData = { 
            nis: siswa.nis, 
            nama: siswa.nama, 
            kegiatan: namaKegiatan.trim(), // Trim whitespace
            izin: 0, 
            sakit: 0, 
            absen: 0, 
            semester, 
            tahun_ajaran 
          };
          
          sheetKehadiran.addRow(rowData);
          rowCount++;
          
          // Debug setiap beberapa baris
          if (rowCount <= 5 || rowCount % 10 === 0) {
            console.log(`📝 Baris ${rowCount}: ${siswa.nama} - ${namaKegiatan}`);
          }
        }
      }
      console.log(`✅ Template kehadiran selesai dengan ${rowCount} baris data`);
    }

    // 🔥 TAMBAHAN: Format template agar lebih jelas
    const headerRow = sheetKehadiran.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 🔥 TAMBAHAN: Validasi data - cek beberapa baris terakhir
    const lastRowNum = sheetKehadiran.rowCount;
    console.log(`🔍 VALIDASI TEMPLATE - Total rows: ${lastRowNum}`);
    if (lastRowNum > 1) {
      for (let i = Math.max(2, lastRowNum - 2); i <= lastRowNum; i++) {
        const checkRow = sheetKehadiran.getRow(i);
        console.log(`Row ${i}: NIS=${checkRow.getCell(1).value}, Nama=${checkRow.getCell(2).value}, Kegiatan="${checkRow.getCell(3).value}"`);
      }
    }

    // 🔥 TAMBAHAN: Proteksi kolom yang tidak boleh diubah
    sheetKehadiran.getColumn(1).protection = { locked: true }; // NIS
    sheetKehadiran.getColumn(2).protection = { locked: true }; // Nama
    sheetKehadiran.getColumn(7).protection = { locked: true }; // Semester
    sheetKehadiran.getColumn(8).protection = { locked: true }; // Tahun Ajaran

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
        sheetSikap.addRow({ 
          nis: siswa.nis, 
          nama: siswa.nama, 
          jenis: 'spiritual', 
          indikator: ind.indikator, 
          semester, 
          tahun_ajaran 
        });
      }
      for (const ind of indikatorSosial) {
        sheetSikap.addRow({ 
          nis: siswa.nis, 
          nama: siswa.nama, 
          jenis: 'sosial', 
          indikator: ind.indikator, 
          semester, 
          tahun_ajaran 
        });
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
