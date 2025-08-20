const db = require('../models');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Download template Excel untuk input nilai
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
          kode_mapel: `MP${mapel.id.toString().padStart(3, '0')}`, // Generate kode mapel
          nama_mapel: mapel.nama_mapel,
          pengetahuan_angka: '', // Kosong untuk diisi
          keterampilan_angka: '', // Kosong untuk diisi
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
        kode_mapel: row.values[3], // Ambil dari kolom kode_mapel
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
                  siswa_id: siswa.id, // Perbaiki nama field
                  mapel_id: mapel.id, // Perbaiki nama field
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
      fs.unlinkSync(filePath); // Hapus file setelah berhasil

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