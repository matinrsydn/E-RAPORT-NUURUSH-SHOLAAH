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

    const filePath = req.file.path;
    const transaction = await db.sequelize.transaction();

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        const results = {
            nilai_ujian: { success: 0, errors: 0 },
            hafalan: { success: 0, errors: 0 },
            kehadiran: { success: 0, errors: 0 },
            sikap: { success: 0, errors: 0 }
        };

        // Cache untuk optimasi pencarian ID
        const cache = {
            siswa: {},
            mapel: {},
            tahunAjaran: {},
            indikatorKehadiran: {},
            indikatorSikap: {}
        };

        // Helper untuk mencari ID dengan cache
        const findSiswa = async (nis) => {
            if (!cache.siswa[nis]) cache.siswa[nis] = await db.Siswa.findOne({ where: { nis } });
            return cache.siswa[nis];
        };
        const findMapel = async (kode_mapel) => {
            if (!cache.mapel[kode_mapel]) cache.mapel[kode_mapel] = await db.MataPelajaran.findOne({ where: { kode_mapel } });
            return cache.mapel[kode_mapel];
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
                cache.indikatorSikap[key] = await db.IndikatorSikap.findOne({ 
                    where: { 
                        jenis_sikap: jenis_sikap, // Pastikan case-sensitive match
                        indikator: indikator,
                        is_active: 1
                    } 
                });
                
                // DEBUG: Log hasil pencarian
                console.log(`🔍 Mencari indikator: jenis='${jenis_sikap}', indikator='${indikator}'`);
                console.log(`📋 Hasil:`, cache.indikatorSikap[key] ? 'DITEMUKAN' : 'TIDAK DITEMUKAN');
                if (cache.indikatorSikap[key]) {
                    console.log(`   ID: ${cache.indikatorSikap[key].id}, Indikator: ${cache.indikatorSikap[key].indikator}`);
                }
            }
            return cache.indikatorSikap[key];
        };

        // ========== 1. PROSES SHEET NILAI UJIAN ==========
        const nilaiWorksheet = workbook.getWorksheet('Template Nilai Ujian');
        if (nilaiWorksheet) {
            for (let i = 2; i <= nilaiWorksheet.rowCount; i++) {
                const nis = getCellValue(nilaiWorksheet, i, 1);
                const kode_mapel = getCellValue(nilaiWorksheet, i, 3);
                const nama_mapel_text = getCellValue(nilaiWorksheet, i, 4); // Ambil nama mapel dari excel
                const tahun_ajaran_str = getCellValue(nilaiWorksheet, i, 8);
                const semester = getCellValue(nilaiWorksheet, i, 7);

                const siswa = await findSiswa(nis);
                const mapel = await findMapel(kode_mapel);
                const tahunAjaran = await findTahunAjaran(tahun_ajaran_str, semester);

                if (siswa && mapel && tahunAjaran) {
                    await db.NilaiUjian.upsert({
                        siswa_id: siswa.id,
                        mapel_id: mapel.id,
                        tahun_ajaran_id: tahunAjaran.id,
                        semester,
                        nilai_pengetahuan: parseFloat(getCellValue(nilaiWorksheet, i, 5)) || null,
                        nilai_keterampilan: parseFloat(getCellValue(nilaiWorksheet, i, 6)) || null,
                        mapel_text: nama_mapel_text // Simpan teks historis
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
                const kode_mapel = getCellValue(hafalanWorksheet, i, 3);
                const nama_mapel_text = getCellValue(hafalanWorksheet, i, 4);
                const tahun_ajaran_str = getCellValue(hafalanWorksheet, i, 7);
                const semester = getCellValue(hafalanWorksheet, i, 6);

                const siswa = await findSiswa(nis);
                const mapel = await findMapel(kode_mapel);
                const tahunAjaran = await findTahunAjaran(tahun_ajaran_str, semester);

                if (siswa && mapel && tahunAjaran) {
                    await db.NilaiHafalan.upsert({
                        siswa_id: siswa.id,
                        mapel_id: mapel.id,
                        tahun_ajaran_id: tahunAjaran.id,
                        semester,
                        nilai: parseFloat(getCellValue(hafalanWorksheet, i, 5)) || null,
                        mapel_text: nama_mapel_text // Simpan teks historis
                    }, { transaction });
                    results.hafalan.success++;
                } else {
                    results.hafalan.errors++;
                }
            }
        }
        
        // ========== 3. PROSES SHEET KEHADIRAN ==========
        const kehadiranWorksheet = workbook.getWorksheet('Template Kehadiran');
        if (kehadiranWorksheet) {
            for (let i = 2; i <= kehadiranWorksheet.rowCount; i++) {
                const nis = getCellValue(kehadiranWorksheet, i, 1);
                const kegiatan_text = getCellValue(kehadiranWorksheet, i, 3);
                const tahun_ajaran_str = getCellValue(kehadiranWorksheet, i, 8);
                const semester = getCellValue(kehadiranWorksheet, i, 7);

                const siswa = await findSiswa(nis);
                const indikator = await findIndikatorKehadiran(kegiatan_text);
                const tahunAjaran = await findTahunAjaran(tahun_ajaran_str, semester);
                
                if (siswa && tahunAjaran && kegiatan_text) {
                    await db.Kehadiran.upsert({
                        siswa_id: siswa.id,
                        tahun_ajaran_id: tahunAjaran.id,
                        semester,
                        indikatorkehadirans_id: indikator ? indikator.id : null,
                        indikator_text: kegiatan_text, // Selalu simpan teks historis
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

        // ========== 4. PROSES SHEET SIKAP (DIPERBAIKI) ==========
        const sikapWorksheet = workbook.getWorksheet('Template Sikap');
        if (sikapWorksheet) {
            for (let i = 2; i <= sikapWorksheet.rowCount; i++) {
                const nis = getCellValue(sikapWorksheet, i, 1);
                const jenis_sikap = getCellValue(sikapWorksheet, i, 3);
                const indikator_text_from_excel = getCellValue(sikapWorksheet, i, 4);
                const nilai_from_excel = getCellValue(sikapWorksheet, i, 5); // PERBAIKAN: Ambil nilai dari kolom 5
                const deskripsi_from_excel = getCellValue(sikapWorksheet, i, 6);
                const tahun_ajaran_str = getCellValue(sikapWorksheet, i, 8);
                const semester = getCellValue(sikapWorksheet, i, 7);

                console.log(`\n📝 Memproses baris ${i}:`);
                console.log(`   NIS: ${nis}`);
                console.log(`   Jenis: ${jenis_sikap}`);
                console.log(`   Indikator dari Excel: ${indikator_text_from_excel}`);
                console.log(`   Nilai dari Excel: ${nilai_from_excel}`);

                const siswa = await findSiswa(nis);
                const indikator = await findIndikatorSikap(jenis_sikap, indikator_text_from_excel);
                const tahunAjaran = await findTahunAjaran(tahun_ajaran_str, semester);

                if (siswa && tahunAjaran && indikator_text_from_excel) {
                    // PERBAIKAN LOGIC UTAMA:
                    let final_indikator_sikap_id = null;
                    const final_indikator_text = indikator_text_from_excel; 
                    
                    if (indikator) {
                        // Jika ditemukan di master data
                        final_indikator_sikap_id = indikator.id;
                        console.log(`✅ Indikator ditemukan di master. ID: ${final_indikator_sikap_id}`);
                        
                        console.log(`✅ Indikator ditemukan di master:`)
                        console.log(`   ID: ${final_indikator_sikap_id}`)
                        console.log(`   Text dari master: ${final_indikator_text}`)
                    } else {
                        // Jika tidak ditemukan di master data
                        console.log(`⚠️ Indikator tidak ditemukan di master, menggunakan text dari Excel`)
                    }

                    const finalNilai = (nilai_from_excel !== null && nilai_from_excel !== '' && !isNaN(parseFloat(nilai_from_excel)))
                        ? parseFloat(nilai_from_excel) 
                        : null;

                    console.log(`💯 Nilai final yang akan disimpan: ${finalNilai}`);

                    await db.Sikap.upsert({
                        siswa_id: siswa.id,
                        tahun_ajaran_id: tahunAjaran.id,
                        semester,
                        indikator_sikap_id: final_indikator_sikap_id,
                        indikator_text: final_indikator_text,
                        nilai: finalNilai,
                        deskripsi: deskripsi_from_excel || '',
                    }, { transaction });
                    
                    results.sikap.success++;
                    console.log(`✅ Data sikap berhasil disimpan untuk ${siswa.nama}`);
                } else {
                    results.sikap.errors++;
                    console.log(`❌ Gagal memproses data sikap untuk NIS: ${nis}`);
                    if (!siswa) console.log(`   - Siswa tidak ditemukan`);
                    if (!tahunAjaran) console.log(`   - Tahun ajaran tidak ditemukan`);
                    if (!indikator_text_from_excel) console.log(`   - Indikator text kosong`);
                }
            }
        }

        function getCellValue(worksheet, row, col) {
            const cell = worksheet.getRow(row).getCell(col);
            if (!cell || cell.value === null || cell.value === undefined) {
                return '';
            }
            
            // Handle different cell types
            if (typeof cell.value === 'object' && cell.value.text) {
                return String(cell.value.text).trim();
            } else if (typeof cell.value === 'string') {
                return cell.value.trim();
            } else {
                return String(cell.value).trim();
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
      { header: 'Pengetahuan (Angka)', key: 'pengetahuan', width: 20 },
      { header: 'Keterampilan (Angka)', key: 'keterampilan', width: 20 },
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

// Perbaikan untuk fungsi downloadCompleteTemplate
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

    // ========== HELPER FUNCTION UNTUK MERGE CELLS ==========
    const mergeCellsForStudent = (sheet, startRow, endRow, siswa) => {
      if (endRow <= startRow) return;
      
      try {
        // Merge NIS (kolom A)
        const nisRange = `A${startRow}:A${endRow}`;
        sheet.mergeCells(nisRange);
        const nisCell = sheet.getCell(`A${startRow}`);
        nisCell.alignment = { vertical: 'middle', horizontal: 'center' };
        nisCell.value = siswa.nis;
        
        // Merge Nama Siswa (kolom B)  
        const namaRange = `B${startRow}:B${endRow}`;
        sheet.mergeCells(namaRange);
        const namaCell = sheet.getCell(`B${startRow}`);
        namaCell.alignment = { vertical: 'middle', horizontal: 'left' };
        namaCell.value = siswa.nama;
        
        console.log(`✅ Merged cells untuk ${siswa.nama}: Baris ${startRow}-${endRow}`);
      } catch (error) {
        console.error(`❌ Error merging cells untuk ${siswa.nama}:`, error.message);
      }
    };

    // HELPER FUNCTION UNTUK STYLING
    const applySheetStyling = (sheet) => {
      // Format header
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Apply border ke semua cells
      for (let rowIndex = 1; rowIndex <= sheet.rowCount; rowIndex++) {
        const row = sheet.getRow(rowIndex);
        for (let colIndex = 1; colIndex <= sheet.columnCount; colIndex++) {
          const cell = row.getCell(colIndex);
          if (!cell.border) {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          }
        }
      }
    };

    // ========== Sheet Nilai Ujian dengan Merge Cells ==========
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

    let currentRowUjian = 2;
    for (const siswa of siswaList) {
      const startRowUjian = currentRowUjian;
      
      for (const mapel of mapelList) {
        sheetUjian.addRow({ 
          nis: '', // Kosongkan dulu, akan diisi saat merge
          nama_siswa: '', // Kosongkan dulu, akan diisi saat merge
          kode_mapel: mapel.kode_mapel || `MP${mapel.id}`,
          nama_mapel: mapel.nama_mapel, 
          semester, 
          tahun_ajaran 
        });
        currentRowUjian++;
      }
      
      const endRowUjian = currentRowUjian - 1;
      mergeCellsForStudent(sheetUjian, startRowUjian, endRowUjian, siswa);
    }
    
    applySheetStyling(sheetUjian);
    console.log(`✅ Sheet Nilai Ujian selesai dengan merge cells`);

    // ========== Sheet Hafalan dengan Merge Cells ==========
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

    let currentRowHafalan = 2;
    for (const siswa of siswaList) {
      const startRowHafalan = currentRowHafalan;
      
      for (const mapel of mapelList) {
        sheetHafalan.addRow({ 
          nis: '',
          nama_siswa: '',
          kode_mapel: mapel.kode_mapel || `MP${mapel.id}`,
          nama_mapel: mapel.nama_mapel, 
          semester, 
          tahun_ajaran 
        });
        currentRowHafalan++;
      }
      
      const endRowHafalan = currentRowHafalan - 1;
      mergeCellsForStudent(sheetHafalan, startRowHafalan, endRowHafalan, siswa);
    }
    
    applySheetStyling(sheetHafalan);
    console.log(`✅ Sheet Hafalan selesai dengan merge cells`);

    // ========== Sheet Kehadiran dengan Merge Cells ==========
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

    let currentRowKehadiran = 2;
    
    // Gunakan data dari database atau default
    const kegiatanList = indikatorKehadiran.length > 0 
      ? indikatorKehadiran 
      : [
          { nama_kegiatan: 'Shalat Berjamaah' },
          { nama_kegiatan: 'Mengaji' },
          { nama_kegiatan: 'Piket' },
          { nama_kegiatan: 'Tahfidz' },
          { nama_kegiatan: 'Sekolah' }
        ];

    for (const siswa of siswaList) {
      const startRowKehadiran = currentRowKehadiran;
      
      for (const kegiatan of kegiatanList) {
        const namaKegiatan = kegiatan.nama_kegiatan || kegiatan;
        sheetKehadiran.addRow({ 
          nis: '',
          nama: '',
          kegiatan: namaKegiatan,
          izin: 0, 
          sakit: 0, 
          absen: 0, 
          semester, 
          tahun_ajaran 
        });
        currentRowKehadiran++;
      }
      
      const endRowKehadiran = currentRowKehadiran - 1;
      mergeCellsForStudent(sheetKehadiran, startRowKehadiran, endRowKehadiran, siswa);
    }
    
    applySheetStyling(sheetKehadiran);
    console.log(`✅ Sheet Kehadiran selesai dengan merge cells`);

    // ========== Sheet Sikap dengan Merge Cells (Termasuk Deskripsi) ==========
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

    let currentRowSikap = 2;
    for (const siswa of siswaList) {
      const startRowSikap = currentRowSikap;
      
      // Tambahkan indikator spiritual
      for (const ind of indikatorSpiritual) {
        sheetSikap.addRow({ 
          nis: '',
          nama: '',
          jenis: 'spiritual', 
          indikator: ind.indikator, 
          semester, 
          tahun_ajaran 
        });
        currentRowSikap++;
      }
      
      // Tambahkan indikator sosial
      for (const ind of indikatorSosial) {
        sheetSikap.addRow({ 
          nis: '',
          nama: '',
          jenis: 'sosial', 
          indikator: ind.indikator, 
          semester, 
          tahun_ajaran 
        });
        currentRowSikap++;
      }
      
      const endRowSikap = currentRowSikap - 1;
      
      // Merge NIS dan Nama
      mergeCellsForStudent(sheetSikap, startRowSikap, endRowSikap, siswa);
      
      // Merge Deskripsi (kolom F)
      if (endRowSikap > startRowSikap) {
        try {
          const deskripsiRange = `F${startRowSikap}:F${endRowSikap}`;
          sheetSikap.mergeCells(deskripsiRange);
          const deskripsiCell = sheetSikap.getCell(`F${startRowSikap}`);
          deskripsiCell.alignment = { 
            vertical: 'top', 
            horizontal: 'left',
            wrapText: true 
          };
          console.log(`✅ Merged deskripsi untuk ${siswa.nama}: ${deskripsiRange}`);
        } catch (error) {
          console.error(`❌ Error merging deskripsi untuk ${siswa.nama}:`, error.message);
        }
      }
    }
    
    applySheetStyling(sheetSikap);
    console.log(`✅ Sheet Sikap selesai dengan merge cells untuk NIS, Nama, dan Deskripsi`);

    // Response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Template_Complete_with_MergeCells.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();

    console.log(`🎉 Template lengkap dengan merge cells berhasil dibuat untuk ${siswaList.length} siswa`);

  } catch (err) {
    console.error('Error creating complete template:', err);
    res.status(500).json({ message: 'Gagal membuat template lengkap', error: err.message });
  }
};