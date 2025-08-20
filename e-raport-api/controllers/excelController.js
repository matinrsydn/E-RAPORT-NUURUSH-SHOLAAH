const db = require('../models');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

exports.uploadNilai = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }

    const filePath = path.join(__dirname, '../', req.file.path);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1); // Ambil sheet pertama

    const dataToInsert = [];
    const errors = [];
    let isFirstRow = true;

    // Asumsi header: nis, kode_mapel, pengetahuan_angka, keterampilan_angka, semester, tahun_ajaran
    worksheet.eachRow(async (row, rowNumber) => {
      if (isFirstRow) {
        isFirstRow = false;
        return; // Lewati baris header
      }

      const rowData = {
        nis: row.values[1],
        kode_mapel: row.values[2],
        pengetahuan_angka: parseFloat(row.values[3]),
        keterampilan_angka: parseFloat(row.values[4]),
        semester: row.values[5],
        tahun_ajaran: row.values[6],
      };

      // Validasi data sederhana
      if (!rowData.nis || !rowData.kode_mapel) {
        errors.push(`Data tidak lengkap di baris ${rowNumber}.`);
        return;
      }
      
      dataToInsert.push(rowData);
    });

    if (errors.length > 0) {
      fs.unlinkSync(filePath); // Hapus file jika ada error validasi
      return res.status(400).json({ message: "Validasi gagal", errors });
    }

    if (dataToInsert.length === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ message: "Tidak ada data yang bisa diimpor dari file Excel." });
    }

    // Proses dan simpan ke database
    for (const item of dataToInsert) {
        const siswa = await db.Siswa.findOne({ where: { nis: item.nis } });
        const mapel = await db.MataPelajaran.findOne({ where: { kode_mapel: item.kode_mapel } });

        if (siswa && mapel) {
            await db.NilaiUjian.create({
                siswa_id: siswa.id,
                mapel_id: mapel.id,
                pengetahuan_angka: item.pengetahuan_angka,
                keterampilan_angka: item.keterampilan_angka,
                semester: item.semester,
                tahun_ajaran: item.tahun_ajaran,
            });
        } else {
            console.warn(`Data siswa dengan NIS ${item.nis} atau mapel dengan kode ${item.kode_mapel} tidak ditemukan.`);
        }
    }

    fs.unlinkSync(filePath); // Hapus file setelah berhasil diproses

    res.status(200).json({ message: `${dataToInsert.length} data nilai berhasil diimpor.` });

  } catch (error) {
    console.error('Error processing excel file:', error);
    res.status(500).json({ message: 'Terjadi kesalahan di server saat memproses file.', error: error.message });
  }
};
