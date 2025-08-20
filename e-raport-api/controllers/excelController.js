const db = require('../models');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Download template Excel LENGKAP dengan multiple sheets
exports.downloadCompleteTemplate = async (req, res) => {
  try {
    const { kelas_id, tahun_ajaran, semester } = req.query;

    if (!kelas_id || !tahun_ajaran || !semester) {
      return res.status(400).json({ 
        message: 'Parameter kelas_id, tahun_ajaran, dan semester harus diisi.' 
      });
    }

    // Ambil data siswa berdasarkan kelas
    const siswaList = await db.Siswa.findAll({
      where: { kelas_id: kelas_id },
      include: [
        { model: db.Kelas, attributes: ['nama_kelas'] }
      ],
      order: [['nama', 'ASC']]
    });

    if (siswaList.length === 0) {
      return res.status(404).json({ 
        message: 'Tidak ada siswa ditemukan di kelas ini.' 
      });
    }

    // Ambil semua mata pelajaran
    const mataPelajaranList = await db.MataPelajaran.findAll({
      order: [['nama_mapel', 'ASC']]
    });

    // Ambil mata pelajaran untuk hafalan (yang mengandung 'Qur' atau semua jika tidak ada)
    let mataPelajaranHafalan = await db.MataPelajaran.findAll({
      where: {
        nama_mapel: {
          [db.Sequelize.Op.iLike]: '%Qur%'
        }
      },
      order: [['nama_mapel', 'ASC']]
    });

    if (mataPelajaranHafalan.length === 0) {
      mataPelajaranHafalan = mataPelajaranList;
    }

    // Ambil indikator sikap
    const indikatorSpiritual = await db.IndikatorSikap.findAll({
      where: { jenis_sikap: 'spiritual' }
    });

    const indikatorSosial = await db.IndikatorSikap.findAll({
      where: { jenis_sikap: 'sosial' }
    });

    // Default indikator jika tidak ada di database
    const defaultSpiritual = indikatorSpiritual.length > 0 ? indikatorSpiritual : [
      { indikator: 'Ketaatan Beribadah' },
      { indikator: 'Akhlak Kepada Allah' },
      { indikator: 'Kedisiplinan Shalat' }
    ];

    const defaultSosial = indikatorSosial.length > 0 ? indikatorSosial : [
      { indikator: 'Sopan Santun' },
      { indikator: 'Kerjasama' },
      { indikator: 'Tanggung Jawab' }
    ];

    // Template kegiatan untuk kehadiran
    const kegiatanList = [
      'Shalat Berjamaah',
      'Mengaji Al-Quran',
      'Tahfidz',
      'Kajian Kitab',
      'Sekolah Formal',
      'Piket Harian',
      'Kegiatan Ekstrakurikuler',
      'Rapat Santri'
    ];

    // Buat workbook baru
    const workbook = new ExcelJS.Workbook();
    const namaKelas = siswaList[0].Kelas?.nama_kelas || 'Unknown';

    // ========== SHEET 1: NILAI UJIAN ==========
    const worksheetNilai = workbook.addWorksheet('Template Nilai Ujian');
    worksheetNilai.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Siswa', key: 'nama_siswa', width: 25 },
      { header: 'Kode Mapel', key: 'kode_mapel', width: 15 },
      { header: 'Nama Mapel', key: 'nama_mapel', width: 25 },
      { header: 'Pengetahuan (Angka)', key: 'pengetahuan_angka', width: 20 },
      { header: 'Keterampilan (Angka)', key: 'keterampilan_angka', width: 20 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 }
    ];

    // Style header untuk nilai
    worksheetNilai.getRow(1).font = { bold: true };
    worksheetNilai.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Isi data template nilai
    for (const siswa of siswaList) {
      for (const mapel of mataPelajaranList) {
        worksheetNilai.addRow({
          nis: siswa.nis,
          nama_siswa: siswa.nama,
          kode_mapel: `MP${mapel.id.toString().padStart(3, '0')}`,
          nama_mapel: mapel.nama_mapel,
          pengetahuan_angka: '',
          keterampilan_angka: '',
          semester: semester,
          tahun_ajaran: tahun_ajaran
        });
      }
    }

    // ========== SHEET 2: NILAI HAFALAN ==========
    const worksheetHafalan = workbook.addWorksheet('Template Hafalan');
    worksheetHafalan.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Siswa', key: 'nama_siswa', width: 25 },
      { header: 'Kode Mapel', key: 'kode_mapel', width: 15 },
      { header: 'Nama Mapel', key: 'nama_mapel', width: 25 },
      { header: 'Nilai Hafalan', key: 'nilai_hafalan', width: 20 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 }
    ];

    // Style header untuk hafalan
    worksheetHafalan.getRow(1).font = { bold: true };
    worksheetHafalan.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB6E5FF' }
    };

    // Isi data template hafalan
    for (const siswa of siswaList) {
      for (const mapel of mataPelajaranHafalan) {
        worksheetHafalan.addRow({
          nis: siswa.nis,
          nama_siswa: siswa.nama,
          kode_mapel: `MP${mapel.id.toString().padStart(3, '0')}`,
          nama_mapel: mapel.nama_mapel,
          nilai_hafalan: '',
          semester: semester,
          tahun_ajaran: tahun_ajaran
        });
      }
    }

    // ========== SHEET 3: KEHADIRAN ==========
    const worksheetKehadiran = workbook.addWorksheet('Template Kehadiran');
    worksheetKehadiran.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Siswa', key: 'nama_siswa', width: 25 },
      { header: 'Kegiatan', key: 'kegiatan', width: 25 },
      { header: 'Izin', key: 'izin', width: 10 },
      { header: 'Sakit', key: 'sakit', width: 10 },
      { header: 'Absen', key: 'absen', width: 10 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 }
    ];

    // Style header untuk kehadiran
    worksheetKehadiran.getRow(1).font = { bold: true };
    worksheetKehadiran.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFE0B6' }
    };

    // Isi data template kehadiran
    for (const siswa of siswaList) {
      for (const kegiatan of kegiatanList) {
        worksheetKehadiran.addRow({
          nis: siswa.nis,
          nama_siswa: siswa.nama,
          kegiatan: kegiatan,
          izin: 0,
          sakit: 0,
          absen: 0,
          semester: semester,
          tahun_ajaran: tahun_ajaran
        });
      }
    }

    // ========== SHEET 4: SIKAP ==========
    const worksheetSikap = workbook.addWorksheet('Template Sikap');
    worksheetSikap.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Siswa', key: 'nama_siswa', width: 25 },
      { header: 'Jenis Sikap', key: 'jenis_sikap', width: 15 },
      { header: 'Indikator', key: 'indikator', width: 25 },
      { header: 'Nilai Angka', key: 'nilai_angka', width: 15 },
      { header: 'Deskripsi', key: 'deskripsi', width: 40 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 }
    ];

    // Style header untuk sikap
    worksheetSikap.getRow(1).font = { bold: true };
    worksheetSikap.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6B3FF' }
    };

    // Isi data template sikap
    for (const siswa of siswaList) {
      // Tambah indikator spiritual
      for (const indikator of defaultSpiritual) {
        worksheetSikap.addRow({
          nis: siswa.nis,
          nama_siswa: siswa.nama,
          jenis_sikap: 'spiritual',
          indikator: indikator.indikator,
          nilai_angka: '',
          deskripsi: '',
          semester: semester,
          tahun_ajaran: tahun_ajaran
        });
      }

      // Tambah indikator sosial
      for (const indikator of defaultSosial) {
        worksheetSikap.addRow({
          nis: siswa.nis,
          nama_siswa: siswa.nama,
          jenis_sikap: 'sosial',
          indikator: indikator.indikator,
          nilai_angka: '',
          deskripsi: '',
          semester: semester,
          tahun_ajaran: tahun_ajaran
        });
      }
    }

    // ========== SHEET 5: PANDUAN PENGISIAN ==========
    const worksheetPanduan = workbook.addWorksheet('Panduan Pengisian');
    worksheetPanduan.columns = [
      { header: 'Sheet', key: 'sheet', width: 20 },
      { header: 'Deskripsi', key: 'deskripsi', width: 60 },
      { header: 'Catatan Penting', key: 'catatan', width: 40 }
    ];

    // Style header panduan
    worksheetPanduan.getRow(1).font = { bold: true };
    worksheetPanduan.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCCCCC' }
    };

    // Isi panduan
    const panduanData = [
      {
        sheet: 'Template Nilai Ujian',
        deskripsi: 'Berisi template untuk input nilai pengetahuan dan keterampilan setiap mata pelajaran',
        catatan: 'Isi kolom Pengetahuan (Angka) dan Keterampilan (Angka) dengan nilai 0-100'
      },
      {
        sheet: 'Template Hafalan',
        deskripsi: 'Berisi template untuk input nilai hafalan Al-Quran dan kitab lainnya',
        catatan: 'Isi kolom Nilai Hafalan dengan nilai 0-100'
      },
      {
        sheet: 'Template Kehadiran',
        deskripsi: 'Berisi template untuk input data kehadiran siswa dalam berbagai kegiatan',
        catatan: 'Isi kolom Izin, Sakit, Absen dengan angka (jumlah hari)'
      },
      {
        sheet: 'Template Sikap',
        deskripsi: 'Berisi template untuk input nilai sikap spiritual dan sosial',
        catatan: 'Isi kolom Nilai Angka dengan nilai 0-10, Deskripsi bersifat opsional'
      },
      {
        sheet: 'Panduan Pengisian',
        deskripsi: 'Sheet ini berisi panduan cara mengisi template',
        catatan: 'Jangan mengubah kolom NIS, Nama Siswa, Kode Mapel, Semester, Tahun Ajaran'
      }
    ];

    panduanData.forEach(item => {
      worksheetPanduan.addRow(item);
    });

    // Set nama file
    const fileName = `Template_Lengkap_${namaKelas}_${semester}_${tahun_ajaran.replace('/', '-')}.xlsx`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Kirim file
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error generating complete template:', error);
    res.status(500).json({ 
      message: 'Terjadi kesalahan saat membuat template Excel lengkap.', 
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