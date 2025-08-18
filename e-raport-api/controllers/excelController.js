const readXlsxFile = require('read-excel-file/node');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const upload = multer({ dest: 'uploads/excel_imports/' });

exports.uploadNilai = [
    upload.single('fileNilai'),
    async (req, res) => {
        const { siswaId, semester, tahun_ajaran } = req.body;
        const filePath = req.file.path;

        if (!siswaId || !semester || !tahun_ajaran) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: 'Siswa, Semester, dan Tahun Ajaran harus diisi.' });
        }

        const t = await db.sequelize.transaction();
        try {
            await db.NilaiUjian.destroy({ where: { siswaId, semester, tahun_ajaran }, transaction: t });
            await db.NilaiHafalan.destroy({ where: { siswaId, semester, tahun_ajaran }, transaction: t });
            await db.Sikap.destroy({ where: { siswaId, semester, tahun_ajaran }, transaction: t });
            await db.Kehadiran.destroy({ where: { siswaId, semester, tahun_ajaran }, transaction: t });

            const mapelDb = await db.MataPelajaran.findAll();
            const mapelMap = new Map(mapelDb.map(m => [m.nama_mapel.toLowerCase(), m.id]));

            const rowsUjian = await readXlsxFile(filePath, { sheet: 'Nilai Ujian' });
            rowsUjian.shift();
            for (const row of rowsUjian) {
                const mataPelajaranId = mapelMap.get(row[0]?.toString().toLowerCase());
                if (mataPelajaranId) {
                    await db.NilaiUjian.create({ siswaId, semester, tahun_ajaran, mataPelajaranId, pengetahuan_angka: row[1], keterampilan_angka: row[2] }, { transaction: t });
                }
            }

            const rowsHafalan = await readXlsxFile(filePath, { sheet: 'Nilai Hafalan' });
            rowsHafalan.shift();
            for (const row of rowsHafalan) {
                 const mataPelajaranId = mapelMap.get(row[0]?.toString().toLowerCase());
                 if(mataPelajaranId) {
                    await db.NilaiHafalan.create({ siswaId, semester, tahun_ajaran, mataPelajaranId, nilai_angka: row[1] }, { transaction: t });
                 }
            }
            
            const rowsSikap = await readXlsxFile(filePath, { sheet: 'Sikap' });
            rowsSikap.shift();
            for(const row of rowsSikap){
                await db.Sikap.create({ siswaId, semester, tahun_ajaran, jenis_sikap: row[0], indikator: row[1], angka: row[2] }, { transaction: t });
            }

            const rowsKehadiran = await readXlsxFile(filePath, { sheet: 'Kehadiran' });
            rowsKehadiran.shift();
            for(const row of rowsKehadiran){
                 await db.Kehadiran.create({ siswaId, semester, tahun_ajaran, kegiatan: row[0], izin: row[1], sakit: row[2], absen: row[3] }, { transaction: t });
            }

            await t.commit();
            fs.unlinkSync(filePath);
            res.status(200).json({ message: 'Data nilai dari Excel berhasil diimpor.' });

        } catch (error) {
            await t.rollback();
            fs.unlinkSync(filePath);
            res.status(500).json({ message: 'Gagal memproses file Excel.', error: error.message });
        }
    }
];