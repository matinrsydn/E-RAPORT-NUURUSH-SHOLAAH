const db = require('../models');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Download template Excel LENGKAP dengan multiple sheets
// Perbaikan pada excelController.js - fungsi downloadCompleteTemplate

// Upload data dari multi-sheet Excel
exports.uploadCompleteData = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }

    // Helper function to get cell value safely
    function getCellValue(worksheet, row, col) {
        const cell = worksheet.getRow(row).getCell(col);
        if (!cell || cell.value === null || cell.value === undefined) {
            return '';
        }
        if (typeof cell.value === 'object' && cell.value.richText) {
            return cell.value.richText.map(rt => rt.text).join('').trim();
        }
        if (typeof cell.value === 'object' && cell.value.result) {
            return String(cell.value.result).trim();
        }
        return String(cell.value).trim();
    }

    const filePath = req.file.path;
    const transaction = await db.sequelize.transaction();

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        const results = {
            nilai_ujian: { success: 0, errors: 0, skipped: 0 },
            hafalan: { success: 0, errors: 0, skipped: 0 },
            kehadiran: { success: 0, errors: 0, skipped: 0 },
            sikap: { success: 0, errors: 0, skipped: 0 }
        };

        const cache = {
            siswa: {},
            tahunAjaran: {},
            indikatorKehadiran: {},
            indikatorSikap: {}
        };

        // Cache helpers
        const findSiswa = async (nis) => {
            if (!cache.siswa[nis]) cache.siswa[nis] = await db.Siswa.findOne({ where: { nis } });
            return cache.siswa[nis];
        };
        const findTahunAjaran = async (nama_ajaran, semester) => {
            const key = `${nama_ajaran}-${semester}`;
            if (!cache.tahunAjaran[key]) cache.tahunAjaran[key] = await db.TahunAjaran.findOne({ where: { nama_ajaran, semester, status: 'aktif' } });
            return cache.tahunAjaran[key];
        };
        const findIndikatorKehadiran = async (nama_kegiatan) => {
            if (!cache.indikatorKehadiran[nama_kegiatan]) cache.indikatorKehadiran[nama_kegiatan] = await db.IndikatorKehadiran.findOne({ where: { nama_kegiatan } });
            return cache.indikatorKehadiran[nama_kegiatan];
        };
        const findIndikatorSikap = async (jenis_sikap, indikator) => {
            const key = `${jenis_sikap}-${indikator}`;
            if (!cache.indikatorSikap[key]) {
                cache.indikatorSikap[key] = await db.IndikatorSikap.findOne({ where: { jenis_sikap, indikator, is_active: 1 } });
            }
            return cache.indikatorSikap[key];
        };
        
        // ========== 1. PROSES SHEET NILAI UJIAN ==========
        const nilaiWorksheet = workbook.getWorksheet('Template Nilai Ujian');
    if (nilaiWorksheet) {
      const toNumberOrNull = (v) => {
        if (v === null || v === undefined || v === '') return null;
        const n = parseFloat(v);
        return isNaN(n) ? null : n;
      };
      const computeFinalNilai = (p, k) => {
        const a = toNumberOrNull(p);
        const b = toNumberOrNull(k);
        if (a !== null && b !== null) return (a + b) / 2;
        if (a !== null) return a;
        if (b !== null) return b;
        return null;
      };

            for (let i = 2; i <= nilaiWorksheet.rowCount; i++) {
        const nis = getCellValue(nilaiWorksheet, i, 1);
        const nama_mapel = getCellValue(nilaiWorksheet, i, 3); // Ambil NAMA MAPEL (kolom ke-3)
        const tahun_ajaran_str = getCellValue(nilaiWorksheet, i, 7); // Kolom ke-7
        const semester = getCellValue(nilaiWorksheet, i, 6); // Kolom ke-6

        if (!nis || !nama_mapel) { results.nilai_ujian.skipped++; continue; }

        const siswa = await findSiswa(nis);
        // Cari mapel berdasarkan NAMA dan JENIS
        const mapel = await db.MataPelajaran.findOne({ where: { nama_mapel: nama_mapel, jenis: 'Ujian' } });
        const tahunAjaran = await findTahunAjaran(tahun_ajaran_str, semester);

        if (siswa && mapel && tahunAjaran) {
          // PERUBAHAN: baca satu kolom 'Nilai' dan simpan langsung
          const finalNilai = toNumberOrNull(getCellValue(nilaiWorksheet, i, 4)); // Kolom ke-4 (Nilai)

          await db.NilaiUjian.upsert({
            siswa_id: siswa.id,
            mapel_id: mapel.id,
            tahun_ajaran_id: tahunAjaran.id,
            semester,
            nilai: finalNilai,
            mapel_text: mapel.nama_mapel
          }, { transaction });
          results.nilai_ujian.success++;
        } else {
          results.nilai_ujian.errors++;
        }
      }
    }

        // ========== 2. PROSES SHEET HAFALAN ==========
        const hafalanWorksheet = workbook.getWorksheet('Template Hafalan');
        if (hafalanWorksheet) {
            for (let i = 2; i <= hafalanWorksheet.rowCount; i++) {
                const nis = getCellValue(hafalanWorksheet, i, 1);
                const nama_mapel = getCellValue(hafalanWorksheet, i, 3); // Ambil NAMA MAPEL (kolom ke-3)
                const tahun_ajaran_str = getCellValue(hafalanWorksheet, i, 6); // Kolom ke-6
                const semester = getCellValue(hafalanWorksheet, i, 5); // Kolom ke-5
                
                if (!nis || !nama_mapel) { results.hafalan.skipped++; continue; }

                const siswa = await findSiswa(nis);
                // Cari mapel berdasarkan NAMA dan JENIS
                const mapel = await db.MataPelajaran.findOne({ where: { nama_mapel: nama_mapel, jenis: 'Hafalan' } });
                const tahunAjaran = await findTahunAjaran(tahun_ajaran_str, semester);

                if (siswa && mapel && tahunAjaran) {
                    await db.NilaiHafalan.upsert({
                        siswa_id: siswa.id,
                        mapel_id: mapel.id,
                        tahun_ajaran_id: tahunAjaran.id,
                        semester,
                        nilai: parseFloat(getCellValue(hafalanWorksheet, i, 4)) || null, // Kolom ke-4
                        mapel_text: mapel.nama_mapel
                    }, { transaction });
                    results.hafalan.success++;
                } else {
                    results.hafalan.errors++;
                }
            }
        }
        
        // ... (Sisa fungsi untuk sheet Kehadiran dan Sikap tetap sama)
        // ========== 3. PROSES SHEET KEHADIRAN ==========
        const kehadiranWorksheet = workbook.getWorksheet('Template Kehadiran');
        if (kehadiranWorksheet) {
            for (let i = 2; i <= kehadiranWorksheet.rowCount; i++) {
                const nis = getCellValue(kehadiranWorksheet, i, 1);
                const kegiatan_text = getCellValue(kehadiranWorksheet, i, 3);
                const tahun_ajaran_str = getCellValue(kehadiranWorksheet, i, 8);
                const semester = getCellValue(kehadiranWorksheet, i, 7);

                if (!nis || !kegiatan_text) { results.kehadiran.skipped++; continue; }

                const siswa = await findSiswa(nis);
                const indikator = await findIndikatorKehadiran(kegiatan_text);
                const tahunAjaran = await findTahunAjaran(tahun_ajaran_str, semester);
                
                if (siswa && tahunAjaran) {
                    await db.Kehadiran.upsert({
                        siswa_id: siswa.id,
                        tahun_ajaran_id: tahunAjaran.id,
                        semester,
                        indikatorkehadirans_id: indikator ? indikator.id : null,
                        indikator_text: kegiatan_text,
                        izin: parseInt(getCellValue(kehadiranWorksheet, i, 4), 10) || 0,
                        sakit: parseInt(getCellValue(kehadiranWorksheet, i, 5), 10) || 0,
                        absen: parseInt(getCellValue(kehadiranWorksheet, i, 6), 10) || 0,
                    }, { transaction });
                    results.kehadiran.success++;
                } else {
                    results.kehadiran.errors++;
                }
            }
        }

        // ========== 4. PROSES SHEET SIKAP ==========
        const sikapWorksheet = workbook.getWorksheet('Template Sikap');
        if (sikapWorksheet) {
            for (let i = 2; i <= sikapWorksheet.rowCount; i++) {
                const nis = getCellValue(sikapWorksheet, i, 1);
                const jenis_sikap = getCellValue(sikapWorksheet, i, 3);
                const indikator_text = getCellValue(sikapWorksheet, i, 4);
                const tahun_ajaran_str = getCellValue(sikapWorksheet, i, 8);
                const semester = getCellValue(sikapWorksheet, i, 7);

                if (!nis || !indikator_text) { results.sikap.skipped++; continue; }

                const siswa = await findSiswa(nis);
                const indikator = await findIndikatorSikap(jenis_sikap, indikator_text);
                const tahunAjaran = await findTahunAjaran(tahun_ajaran_str, semester);

                if (siswa && tahunAjaran) {
                    const nilai_from_excel = getCellValue(sikapWorksheet, i, 5);
                    const finalNilai = (nilai_from_excel !== '' && !isNaN(parseFloat(nilai_from_excel)))
                        ? parseFloat(nilai_from_excel) 
                        : null;

                    await db.Sikap.upsert({
                        siswa_id: siswa.id,
                        tahun_ajaran_id: tahunAjaran.id,
                        semester,
                        indikator_sikap_id: indikator ? indikator.id : null,
                        indikator_text: indikator_text,
                        nilai: finalNilai,
                        deskripsi: getCellValue(sikapWorksheet, i, 6) || '',
                    }, { transaction });
                    results.sikap.success++;
                } else {
                    results.sikap.errors++;
                }
            }
        }


        await transaction.commit();
        res.status(200).json({ message: 'Data berhasil diimpor.', results });

    } catch (error) {
        await transaction.rollback();
        console.error('Error processing complete excel file:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat memproses file.', error: error.message });
    } finally {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
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
      { header: 'Nilai', key: 'nilai', width: 20 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 }
    ];

    let currentRow = 2;
    for (const siswa of siswaList) {
      const startRow = currentRow;
      
      for (const mapel of mapelList) {
        sheet.addRow({
          nis: '',
          nama_siswa: '',
          kode_mapel: mapel.kode_mapel || `MP${mapel.id}`,
          nama_mapel: mapel.nama_mapel,
          semester,
          tahun_ajaran
        });
        currentRow++;
      }
      
      const endRow = currentRow - 1;
      
      // Merge cells untuk NIS dan Nama
      try {
        const nisRange = `A${startRow}:A${endRow}`;
        const namaRange = `B${startRow}:B${endRow}`;
        
        sheet.mergeCells(nisRange);
        sheet.mergeCells(namaRange);
        
        sheet.getCell(`A${startRow}`).value = siswa.nis;
        sheet.getCell(`A${startRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
        
        sheet.getCell(`B${startRow}`).value = siswa.nama;
        sheet.getCell(`B${startRow}`).alignment = { vertical: 'middle', horizontal: 'left' };
        
      } catch (error) {
        console.error(`Error merging cells untuk ${siswa.nama}:`, error.message);
      }
    }

    // Apply styling
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Template_Nilai_Ujian_MergeCells.xlsx"`);
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
        const toNumberOrNull = (v) => {
          if (v === null || v === undefined || v === '') return null;
          const n = parseFloat(v);
          return isNaN(n) ? null : n;
        };
        const computeFinalNilai = (p, k) => {
          const a = toNumberOrNull(p);
          const b = toNumberOrNull(k);
          if (a !== null && b !== null) return (a + b) / 2;
          if (a !== null) return a;
          if (b !== null) return b;
          return null;
        };

        const p = toNumberOrNull(row.getCell(5).value);
        const k = toNumberOrNull(row.getCell(6).value);
        const finalNilai = computeFinalNilai(p, k);

        await db.NilaiUjian.upsert({
          siswa_id: siswa.id,
          mapel_id: mapel.id,
          // PERUBAHAN: simpan final gabungan ke kolom `nilai`
          nilai: finalNilai,
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

    let currentRow = 2;
    for (const siswa of siswaList) {
      const startRow = currentRow;
      
      for (const indikator of indikatorList) {
        sheet.addRow({
          nis: '',
          nama: '',
          kegiatan: indikator.nama_kegiatan,
          izin: 0,
          sakit: 0,
          absen: 0,
          semester,
          tahun_ajaran
        });
        currentRow++;
      }
      
      const endRow = currentRow - 1;
      
      // Merge cells
      try {
        const nisRange = `A${startRow}:A${endRow}`;
        const namaRange = `B${startRow}:B${endRow}`;
        
        sheet.mergeCells(nisRange);
        sheet.mergeCells(namaRange);
        
        sheet.getCell(`A${startRow}`).value = siswa.nis;
        sheet.getCell(`A${startRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
        
        sheet.getCell(`B${startRow}`).value = siswa.nama;
        sheet.getCell(`B${startRow}`).alignment = { vertical: 'middle', horizontal: 'left' };
        
      } catch (error) {
        console.error(`Error merging cells untuk ${siswa.nama}:`, error.message);
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Template_Kehadiran_MergeCells.xlsx"`);
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


const applySheetStyling = (sheet) => {
  // Styling untuk baris header
  const headerRow = sheet.getRow(1);
  headerRow.font = {
    bold: true,
    color: { argb: 'FFFFFFFF' } // Teks putih
  };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F81BD' } // Latar belakang biru tua
  };
  headerRow.alignment = {
    vertical: 'middle',
    horizontal: 'center'
  };

  // Menambahkan border ke semua sel, termasuk yang kosong
  sheet.eachRow({ includeEmpty: true }, function(row, rowNumber) { // PERUBAHAN: dari false menjadi true
    // Hanya proses sampai baris terakhir yang digunakan
    if (rowNumber > sheet.lastRow.number) {
        return;
    }
    row.eachCell({ includeEmpty: true }, function(cell, colNumber) { // PERUBAHAN: dari false menjadi true
        // Hanya proses sampai kolom terakhir yang punya header
        if (colNumber > sheet.columns.length) {
            return;
        }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });
};

// Fungsi untuk merge cell (jika belum ada)
const mergeCellsForStudent = (sheet, startRow, endRow, siswa) => {
  if (startRow > endRow) return;

  sheet.mergeCells(`A${startRow}:A${endRow}`);
  sheet.mergeCells(`B${startRow}:B${endRow}`);

  const nisCell = sheet.getCell(`A${startRow}`);
  nisCell.value = siswa.nis;
  nisCell.alignment = { vertical: 'middle', horizontal: 'center' };

  const namaCell = sheet.getCell(`B${startRow}`);
  namaCell.value = siswa.nama;
  namaCell.alignment = { vertical: 'middle', horizontal: 'left' };
};

// Helper untuk membersihkan nama file (jika belum ada)
const sanitizeFilename = (name) => {
    if (!name) return 'file';
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
};

exports.downloadCompleteTemplate = async (req, res) => {
    try {
        const { kelas_id, tahun_ajaran_id } = req.query;

        if (!kelas_id || !tahun_ajaran_id) {
            return res.status(400).json({ message: 'Parameter kelas_id dan tahun_ajaran_id wajib diisi.' });
        }

        // 1. Get Master Data
        const siswaList = await db.Siswa.findAll({ where: { kelas_id }, order: [['nama', 'ASC']] });
        if (siswaList.length === 0) {
            return res.status(404).json({ message: 'Tidak ada siswa di kelas ini.' });
        }
        const kelasInfo = await db.Kelas.findByPk(kelas_id);
        const tahunAjaranInfo = await db.TahunAjaran.findByPk(tahun_ajaran_id);
        if (!tahunAjaranInfo) {
            return res.status(404).json({ message: 'Data Tahun Ajaran tidak ditemukan.' });
        }

        // Ambil entri kurikulum, sekarang termasuk data Kitab
        const kurikulumEntries = await db.Kurikulum.findAll({
            where: {
                kelas_id: kelas_id,
                tahun_ajaran_id: tahun_ajaran_id,
                semester: tahunAjaranInfo.semester
            },
            include: [ // --- PERUBAHAN ---: Sertakan model Kitab
                { model: db.MataPelajaran, as: 'mapel' },
                { model: db.Kitab, as: 'kitab' }
            ],
            order: [
                [{ model: db.MataPelajaran, as: 'mapel' }, 'nama_mapel', 'ASC']
            ]
        });
        
        // --- PERUBAHAN ---: Pisahkan seluruh entri kurikulum, bukan hanya mapel-nya
        const kurikulumUjian = kurikulumEntries.filter(k => k.mapel && k.mapel.jenis === 'Ujian');
        const kurikulumHafalan = kurikulumEntries.filter(k => k.mapel && k.mapel.jenis === 'Hafalan');
        
        const indikatorKehadiran = await db.IndikatorKehadiran.findAll({ where: { is_active: true }, order: [['nama_kegiatan', 'ASC']] });
        const indikatorSikap = await db.IndikatorSikap.findAll({ where: { is_active: true }, order: [['jenis_sikap', 'ASC'], ['indikator', 'ASC']] });

        const workbook = new ExcelJS.Workbook();

        // 2. Create "Template Nilai Ujian" Sheet
        const sheetNilai = workbook.addWorksheet('Template Nilai Ujian');
    sheetNilai.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Siswa', key: 'nama', width: 25 },
      { header: 'Nama Mapel', key: 'nama_mapel', width: 25 },
      { header: 'Kitab', key: 'kitab', width: 20 }, // --- PERUBAHAN ---: Tambah kolom Kitab
      { header: 'Nilai', key: 'nilai', width: 15 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 },
    ];
        let currentRowNilai = 2;
        siswaList.forEach(siswa => {
            const startRow = currentRowNilai;
            // --- PERUBAHAN ---: Loop melalui kurikulumUjian
            kurikulumUjian.forEach(kurikulum => {
                sheetNilai.addRow({
                    nama_mapel: kurikulum.mapel.nama_mapel,
                    kitab: kurikulum.kitab ? kurikulum.kitab.nama_kitab : '-', // --- PERUBAHAN ---: Isi nama kitab
                    semester: tahunAjaranInfo.semester,
                    tahun_ajaran: tahunAjaranInfo.nama_ajaran
                });
                currentRowNilai++;
            });
            mergeCellsForStudent(sheetNilai, startRow, currentRowNilai - 1, siswa);
        });
        applySheetStyling(sheetNilai);

        // 3. Create "Template Hafalan" Sheet
        const sheetHafalan = workbook.addWorksheet('Template Hafalan');
        sheetHafalan.columns = [
            { header: 'NIS', key: 'nis', width: 15 },
            { header: 'Nama Siswa', key: 'nama', width: 25 },
            { header: 'Nama Mapel', key: 'nama_mapel', width: 25 },
            { header: 'Kitab', key: 'kitab', width: 20 }, // --- PERUBAHAN ---: Tambah kolom Kitab
            { header: 'Nilai', key: 'nilai', width: 10 },
            { header: 'Semester', key: 'semester', width: 12 },
            { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 },
        ];
        let currentRowHafalan = 2;
        siswaList.forEach(siswa => {
            const startRow = currentRowHafalan;
            // --- PERUBAHAN ---: Loop melalui kurikulumHafalan
            kurikulumHafalan.forEach(kurikulum => {
                sheetHafalan.addRow({
                    nama_mapel: kurikulum.mapel.nama_mapel,
                    kitab: kurikulum.kitab ? kurikulum.kitab.nama_kitab : '-', // --- PERUBAHAN ---: Isi nama kitab
                    semester: tahunAjaranInfo.semester,
                    tahun_ajaran: tahunAjaranInfo.nama_ajaran
                });
                currentRowHafalan++;
            });
            mergeCellsForStudent(sheetHafalan, startRow, currentRowHafalan - 1, siswa);
        });
        applySheetStyling(sheetHafalan);
        
        // ... (Sisa fungsi untuk sheet Kehadiran dan Sikap tetap sama)
        // 4. Create "Template Kehadiran" Sheet
        const sheetKehadiran = workbook.addWorksheet('Template Kehadiran');
        sheetKehadiran.columns = [
            { header: 'NIS', key: 'nis', width: 15 },
            { header: 'Nama Siswa', key: 'nama', width: 25 },
            { header: 'Kegiatan', key: 'kegiatan', width: 25 },
            { header: 'Izin', key: 'izin', width: 10 },
            { header: 'Sakit', key: 'sakit', width: 10 },
            { header: 'Absen', key: 'absen', width: 10 },
            { header: 'Semester', key: 'semester', width: 12 },
            { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 },
        ];
        let currentRowKehadiran = 2;
        siswaList.forEach(siswa => {
            const startRow = currentRowKehadiran;
            indikatorKehadiran.forEach(ind => {
                sheetKehadiran.addRow({
                    kegiatan: ind.nama_kegiatan,
                    semester: tahunAjaranInfo.semester,
                    tahun_ajaran: tahunAjaranInfo.nama_ajaran
                });
                currentRowKehadiran++;
            });
            mergeCellsForStudent(sheetKehadiran, startRow, currentRowKehadiran - 1, siswa);
        });
        applySheetStyling(sheetKehadiran);

        // 5. Create "Template Sikap" Sheet
        const sheetSikap = workbook.addWorksheet('Template Sikap');
        sheetSikap.columns = [
            { header: 'NIS', key: 'nis', width: 15 },
            { header: 'Nama Siswa', key: 'nama', width: 25 },
            { header: 'Jenis Sikap', key: 'jenis', width: 15 },
            { header: 'Indikator', key: 'indikator', width: 30 },
            { header: 'Nilai', key: 'nilai', width: 10 },
            { header: 'Deskripsi (Catatan Wali Kelas)', key: 'deskripsi', width: 40 }, // Header diubah
            { header: 'Semester', key: 'semester', width: 12 },
            { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 },
        ];
        let currentRowSikap = 2;
        siswaList.forEach(siswa => {
            const startRow = currentRowSikap;
            indikatorSikap.forEach(ind => {
                sheetSikap.addRow({
                    // Tidak ada deskripsi per baris lagi
                    jenis: ind.jenis_sikap,
                    indikator: ind.indikator,
                    semester: tahunAjaranInfo.semester,
                    tahun_ajaran: tahunAjaranInfo.nama_ajaran
                });
                currentRowSikap++;
            });
            const endRow = currentRowSikap - 1;
            // Gabungkan sel NIS, Nama, dan Deskripsi
            mergeCellsForStudent(sheetSikap, startRow, endRow, siswa);
            if (startRow <= endRow) {
                sheetSikap.mergeCells(`F${startRow}:F${endRow}`);
                sheetSikap.getCell(`F${startRow}`).alignment = { vertical: 'top', horizontal: 'left' };
            }
        });
        applySheetStyling(sheetSikap);

        // 6. Send the file
        const fileName = `Template-Lengkap-${sanitizeFilename(kelasInfo.nama_kelas)}-Semester-${tahunAjaranInfo.semester}-${sanitizeFilename(tahunAjaranInfo.nama_ajaran)}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        
        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('Error creating complete template:', err);
        res.status(500).json({ message: 'Gagal membuat template lengkap', error: err.message });
    }
};
