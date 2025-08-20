const db = require('../models');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Download template Excel untuk input nilai ujian
exports.downloadTemplate = async (req, res) => {
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

    // Buat workbook baru
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Input Nilai');

    // Header kolom
    worksheet.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Siswa', key: 'nama_siswa', width: 25 },
      { header: 'Kode Mapel', key: 'kode_mapel', width: 15 },
      { header: 'Nama Mapel', key: 'nama_mapel', width: 25 },
      { header: 'Pengetahuan (Angka)', key: 'pengetahuan_angka', width: 20 },
      { header: 'Keterampilan (Angka)', key: 'keterampilan_angka', width: 20 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Isi data template
    let rowIndex = 2;
    for (const siswa of siswaList) {
      for (const mapel of mataPelajaranList) {
        worksheet.addRow({
          nis: siswa.nis,
          nama_siswa: siswa.nama,
          kode_mapel: `MP${mapel.id.toString().padStart(3, '0')}`,
          nama_mapel: mapel.nama_mapel,
          pengetahuan_angka: '',
          keterampilan_angka: '',
          semester: semester,
          tahun_ajaran: tahun_ajaran
        });
        rowIndex++;
      }
    }

    // Set nama file
    const namaKelas = siswaList[0].Kelas?.nama_kelas || 'Unknown';
    const fileName = `Template_Nilai_${namaKelas}_${semester}_${tahun_ajaran.replace('/', '-')}.xlsx`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Kirim file
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ 
      message: 'Terjadi kesalahan saat membuat template Excel.', 
      error: error.message 
    });
  }
};

// Upload nilai ujian
exports.uploadNilai = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }

    const filePath = path.join(__dirname, '../', req.file.path);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);

    const dataToInsert = [];
    const errors = [];
    let isFirstRow = true;

    // Proses setiap baris
    worksheet.eachRow(async (row, rowNumber) => {
      if (isFirstRow) {
        isFirstRow = false;
        return; // Lewati header
      }

      const rowData = {
        nis: row.values[1],
        kode_mapel: row.values[3],
        pengetahuan_angka: parseFloat(row.values[5]) || null,
        keterampilan_angka: parseFloat(row.values[6]) || null,
        semester: row.values[7],
        tahun_ajaran: row.values[8],
      };

      // Validasi data
      if (!rowData.nis || !rowData.kode_mapel) {
        errors.push(`Data tidak lengkap di baris ${rowNumber}.`);
        return;
      }
      
      dataToInsert.push(rowData);
    });

    if (errors.length > 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ message: "Validasi gagal", errors });
    }

    if (dataToInsert.length === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ 
          message: "Tidak ada data yang bisa diimpor dari file Excel." 
        });
    }

    const transaction = await db.sequelize.transaction();

    try {
      // Proses dan simpan ke database
      for (const item of dataToInsert) {
          const siswa = await db.Siswa.findOne({ 
            where: { nis: item.nis } 
          });

          // Cari mata pelajaran berdasarkan kode
          const mapel = await db.MataPelajaran.findOne({ 
            where: { 
              id: parseInt(item.kode_mapel.replace('MP', '')) 
            } 
          });

          if (siswa && mapel) {
              // Gunakan upsert untuk update atau insert
              await db.NilaiUjian.upsert({
                  siswa_id: siswa.id,
                  mapel_id: mapel.id,
                  pengetahuan_angka: item.pengetahuan_angka,
                  keterampilan_angka: item.keterampilan_angka,
                  semester: item.semester,
                  tahun_ajaran: item.tahun_ajaran,
              }, { transaction });
          } else {
              console.warn(`Siswa NIS ${item.nis} atau mapel kode ${item.kode_mapel} tidak ditemukan.`);
          }
      }

      await transaction.commit();
      fs.unlinkSync(filePath);

      res.status(200).json({ 
        message: `${dataToInsert.length} data nilai berhasil diimpor.` 
      });

    } catch (dbError) {
      await transaction.rollback();
      throw dbError;
    }

  } catch (error) {
    console.error('Error processing excel file:', error);
    res.status(500).json({ 
      message: 'Terjadi kesalahan di server saat memproses file.', 
      error: error.message 
    });
  }
};

// Download template Excel untuk input nilai hafalan
exports.downloadTemplateHafalan = async (req, res) => {
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

    // Ambil mata pelajaran yang memiliki hafalan (biasanya Al-Quran, Hadits, dll)
    const mataPelajaranList = await db.MataPelajaran.findAll({
      where: {
        nama_mapel: {
          [db.Sequelize.Op.iLike]: '%Qur%'
        }
      },
      order: [['nama_mapel', 'ASC']]
    });

    // Jika tidak ada mapel spesifik, ambil semua
    if (mataPelajaranList.length === 0) {
      const allMapel = await db.MataPelajaran.findAll({
        order: [['nama_mapel', 'ASC']]
      });
      mataPelajaranList.push(...allMapel);
    }

    // Buat workbook baru
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Input Hafalan');

    // Header kolom
    worksheet.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Siswa', key: 'nama_siswa', width: 25 },
      { header: 'Kode Mapel', key: 'kode_mapel', width: 15 },
      { header: 'Nama Mapel', key: 'nama_mapel', width: 25 },
      { header: 'Nilai Hafalan', key: 'nilai_hafalan', width: 20 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB6E5FF' }
    };

    // Isi data template
    for (const siswa of siswaList) {
      for (const mapel of mataPelajaranList) {
        worksheet.addRow({
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

    // Set nama file
    const namaKelas = siswaList[0].Kelas?.nama_kelas || 'Unknown';
    const fileName = `Template_Hafalan_${namaKelas}_${semester}_${tahun_ajaran.replace('/', '-')}.xlsx`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Kirim file
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error generating hafalan template:', error);
    res.status(500).json({ 
      message: 'Terjadi kesalahan saat membuat template hafalan.', 
      error: error.message 
    });
  }
};

// Upload nilai hafalan
exports.uploadHafalan = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }

    const filePath = path.join(__dirname, '../', req.file.path);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);

    const dataToInsert = [];
    const errors = [];
    let isFirstRow = true;

    // Proses setiap baris
    worksheet.eachRow(async (row, rowNumber) => {
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

      if (!rowData.nis || !rowData.kode_mapel) {
        errors.push(`Data tidak lengkap di baris ${rowNumber}.`);
        return;
      }
      
      dataToInsert.push(rowData);
    });

    if (errors.length > 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ message: "Validasi gagal", errors });
    }

    if (dataToInsert.length === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ 
          message: "Tidak ada data yang bisa diimpor dari file Excel." 
        });
    }

    const transaction = await db.sequelize.transaction();

    try {
      for (const item of dataToInsert) {
          const siswa = await db.Siswa.findOne({ 
            where: { nis: item.nis } 
          });

          const mapel = await db.MataPelajaran.findOne({ 
            where: { 
              id: parseInt(item.kode_mapel.replace('MP', '')) 
            } 
          });

          if (siswa && mapel) {
              await db.NilaiHafalan.upsert({
                  siswaId: siswa.id,
                  mataPelajaranId: mapel.id,
                  nilai_angka: item.nilai_hafalan,
                  semester: item.semester,
                  tahun_ajaran: item.tahun_ajaran,
              }, { transaction });
          }
      }

      await transaction.commit();
      fs.unlinkSync(filePath);

      res.status(200).json({ 
        message: `${dataToInsert.length} data hafalan berhasil diimpor.` 
      });

    } catch (dbError) {
      await transaction.rollback();
      throw dbError;
    }

  } catch (error) {
    console.error('Error processing hafalan file:', error);
    res.status(500).json({ 
      message: 'Terjadi kesalahan di server saat memproses file hafalan.', 
      error: error.message 
    });
  }
};

// Download template Excel untuk input kehadiran
exports.downloadTemplateKehadiran = async (req, res) => {
  try {
    const { kelas_id, tahun_ajaran, semester } = req.query;

    if (!kelas_id || !tahun_ajaran || !semester) {
      return res.status(400).json({ 
        message: 'Parameter kelas_id, tahun_ajaran, dan semester harus diisi.' 
      });
    }

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

    // Template kegiatan default
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

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Input Kehadiran');

    worksheet.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Siswa', key: 'nama_siswa', width: 25 },
      { header: 'Kegiatan', key: 'kegiatan', width: 25 },
      { header: 'Izin', key: 'izin', width: 10 },
      { header: 'Sakit', key: 'sakit', width: 10 },
      { header: 'Absen', key: 'absen', width: 10 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFE0B6' }
    };

    for (const siswa of siswaList) {
      for (const kegiatan of kegiatanList) {
        worksheet.addRow({
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

    const namaKelas = siswaList[0].Kelas?.nama_kelas || 'Unknown';
    const fileName = `Template_Kehadiran_${namaKelas}_${semester}_${tahun_ajaran.replace('/', '-')}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error generating kehadiran template:', error);
    res.status(500).json({ 
      message: 'Terjadi kesalahan saat membuat template kehadiran.', 
      error: error.message 
    });
  }
};

// Upload kehadiran
exports.uploadKehadiran = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }

    const filePath = path.join(__dirname, '../', req.file.path);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);

    const dataToInsert = [];
    const errors = [];
    let isFirstRow = true;

    worksheet.eachRow(async (row, rowNumber) => {
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

      if (!rowData.nis || !rowData.kegiatan) {
        errors.push(`Data tidak lengkap di baris ${rowNumber}.`);
        return;
      }
      
      dataToInsert.push(rowData);
    });

    if (errors.length > 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ message: "Validasi gagal", errors });
    }

    const transaction = await db.sequelize.transaction();

    try {
      for (const item of dataToInsert) {
          const siswa = await db.Siswa.findOne({ 
            where: { nis: item.nis } 
          });

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
          }
      }

      await transaction.commit();
      fs.unlinkSync(filePath);

      res.status(200).json({ 
        message: `${dataToInsert.length} data kehadiran berhasil diimpor.` 
      });

    } catch (dbError) {
      await transaction.rollback();
      throw dbError;
    }

  } catch (error) {
    console.error('Error processing kehadiran file:', error);
    res.status(500).json({ 
      message: 'Terjadi kesalahan di server saat memproses file kehadiran.', 
      error: error.message 
    });
  }
};

// Download template Excel untuk input sikap
exports.downloadTemplateSikap = async (req, res) => {
  try {
    const { kelas_id, tahun_ajaran, semester } = req.query;

    if (!kelas_id || !tahun_ajaran || !semester) {
      return res.status(400).json({ 
        message: 'Parameter kelas_id, tahun_ajaran, dan semester harus diisi.' 
      });
    }

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

    // Ambil indikator sikap dari database atau gunakan default
    const indikatorSpiritual = await db.IndikatorSikap.findAll({
      where: { jenis_sikap: 'spiritual' }
    });

    const indikatorSosial = await db.IndikatorSikap.findAll({
      where: { jenis_sikap: 'sosial' }
    });

    // Jika tidak ada indikator di database, gunakan default
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

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Input Sikap');

    worksheet.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Siswa', key: 'nama_siswa', width: 25 },
      { header: 'Jenis Sikap', key: 'jenis_sikap', width: 15 },
      { header: 'Indikator', key: 'indikator', width: 25 },
      { header: 'Nilai Angka', key: 'nilai_angka', width: 15 },
      { header: 'Deskripsi', key: 'deskripsi', width: 40 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6B3FF' }
    };

    for (const siswa of siswaList) {
      // Tambah indikator spiritual
      for (const indikator of defaultSpiritual) {
        worksheet.addRow({
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
        worksheet.addRow({
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

    const namaKelas = siswaList[0].Kelas?.nama_kelas || 'Unknown';
    const fileName = `Template_Sikap_${namaKelas}_${semester}_${tahun_ajaran.replace('/', '-')}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error generating sikap template:', error);
    res.status(500).json({ 
      message: 'Terjadi kesalahan saat membuat template sikap.', 
      error: error.message 
    });
  }
};

// Upload sikap
exports.uploadSikap = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }

    const filePath = path.join(__dirname, '../', req.file.path);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);

    const dataToInsert = [];
    const errors = [];
    let isFirstRow = true;

    worksheet.eachRow(async (row, rowNumber) => {
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

      if (!rowData.nis || !rowData.jenis_sikap || !rowData.indikator) {
        errors.push(`Data tidak lengkap di baris ${rowNumber}.`);
        return;
      }
      
      dataToInsert.push(rowData);
    });

    if (errors.length > 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ message: "Validasi gagal", errors });
    }

    const transaction = await db.sequelize.transaction();

    try {
      for (const item of dataToInsert) {
          const siswa = await db.Siswa.findOne({ 
            where: { nis: item.nis } 
          });

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
          }
      }

      await transaction.commit();
      fs.unlinkSync(filePath);

      res.status(200).json({ 
        message: `${dataToInsert.length} data sikap berhasil diimpor.` 
      });

    } catch (dbError) {
      await transaction.rollback();
      throw dbError;
    }

  } catch (error) {
    console.error('Error processing sikap file:', error);
    res.status(500).json({ 
      message: 'Terjadi kesalahan di server saat memproses file sikap.', 
      error: error.message 
    });
  }
};