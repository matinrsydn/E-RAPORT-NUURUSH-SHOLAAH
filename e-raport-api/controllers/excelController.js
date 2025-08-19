const ExcelJS = require('exceljs');
const db = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Konfigurasi Multer untuk menyimpan file sementara
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/excel/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Nama file unik
    }
});
const upload = multer({ storage: storage });

exports.uploadNilai = [
    upload.single('excel-file'),
    async (req, res) => {
        if (!req.file) {
            return res.status(400).send('Tidak ada file yang diunggah.');
        }

        const filePath = req.file.path;
        const { semester, tahun_ajaran } = req.body;
        let transaction; // Deklarasikan transaksi di luar blok try

        try {
            // Mulai transaksi database
            transaction = await db.sequelize.transaction();

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);

            // Proses Sheet: Nilai Ujian
            const nilaiUjianSheet = workbook.getWorksheet('Nilai Ujian');
            if (nilaiUjianSheet) {
                for (let i = 2; i <= nilaiUjianSheet.rowCount; i++) {
                    const row = nilaiUjianSheet.getRow(i);
                    const nis = row.getCell('A').value;
                    const nama_mapel = row.getCell('B').value;
                    const pengetahuan_angka = row.getCell('C').value;
                    const keterampilan_angka = row.getCell('D').value;

                    if (nis && nama_mapel) {
                        const siswa = await db.Siswa.findOne({ where: { nis } });
                        const mapel = await db.MataPelajaran.findOne({ where: { nama_mapel } });

                        if (siswa && mapel) {
                            await db.NilaiUjian.create({
                                siswaId: siswa.id,
                                mapelId: mapel.id,
                                semester,
                                tahun_ajaran,
                                pengetahuan_angka,
                                keterampilan_angka
                            }, { transaction });
                        }
                    }
                }
            }

            // Proses Sheet: Nilai Hafalan
            const nilaiHafalanSheet = workbook.getWorksheet('Nilai Hafalan');
            if (nilaiHafalanSheet) {
                 for (let i = 2; i <= nilaiHafalanSheet.rowCount; i++) {
                    const row = nilaiHafalanSheet.getRow(i);
                    const nis = row.getCell('A').value;
                    const nama_mapel = row.getCell('B').value;
                    const nilai_angka = row.getCell('C').value;

                     if (nis && nama_mapel) {
                        const siswa = await db.Siswa.findOne({ where: { nis } });
                        const mapel = await db.MataPelajaran.findOne({ where: { nama_mapel } });

                        if (siswa && mapel) {
                            await db.NilaiHafalan.create({
                                siswaId: siswa.id,
                                mapelId: mapel.id,
                                semester,
                                tahun_ajaran,
                                nilai_angka
                            }, { transaction });
                        }
                    }
                }
            }

            // Proses Sheet: Sikap
            const sikapSheet = workbook.getWorksheet('Sikap');
            if (sikapSheet) {
                for (let i = 2; i <= sikapSheet.rowCount; i++) {
                    const row = sikapSheet.getRow(i);
                    const nis = row.getCell('A').value;
                    const jenis_sikap = row.getCell('B').value;
                    const indikator = row.getCell('C').value;
                    const angka = row.getCell('D').value;
                    const deskripsi = row.getCell('E').value;

                    if (nis && jenis_sikap && indikator) {
                       const siswa = await db.Siswa.findOne({ where: { nis } });
                       if (siswa) {
                           await db.Sikap.create({
                               siswaId: siswa.id,
                               semester,
                               tahun_ajaran,
                               jenis_sikap,
                               indikator,
                               angka,
                               deskripsi
                           }, { transaction });
                       }
                    }
                }
            }

            // Proses Sheet: Kehadiran
            const kehadiranSheet = workbook.getWorksheet('Kehadiran');
            if (kehadiranSheet) {
                for (let i = 2; i <= kehadiranSheet.rowCount; i++) {
                    const row = kehadiranSheet.getRow(i);
                    const nis = row.getCell('A').value;
                    const kegiatan = row.getCell('B').value;
                    const izin = row.getCell('C').value || 0;
                    const sakit = row.getCell('D').value || 0;
                    const absen = row.getCell('E').value || 0;

                    if (nis && kegiatan) {
                        const siswa = await db.Siswa.findOne({ where: { nis } });
                        if (siswa) {
                            await db.Kehadiran.create({
                                siswaId: siswa.id,
                                semester,
                                tahun_ajaran,
                                kegiatan,
                                izin,
                                sakit,
                                absen
                            }, { transaction });
                        }
                    }
                }
            }

            // Commit transaksi jika semua proses berhasil
            await transaction.commit();
            res.status(200).json({ message: 'Data berhasil diimpor dari Excel.' });

        } catch (error) {
            // Rollback transaksi jika terjadi error
            if (transaction) await transaction.rollback();
            console.error('Error importing Excel:', error);
            res.status(500).json({ message: 'Terjadi kesalahan saat mengimpor data.', error: error.message });
        } finally {
            // Selalu hapus file sementara setelah selesai
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    }
];
