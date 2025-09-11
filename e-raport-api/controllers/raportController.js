// e-raport-api/controllers/raportController.js

const db = require('../models');

// ==========================================================================================
// FUNGSI UTAMA UNTUK MENYIMPAN DATA DARI HALAMAN VALIDASI
// ==========================================================================================
exports.saveValidatedRaport = async (req, res) => {
    const { validatedData } = req.body;
    const transaction = await db.sequelize.transaction();

    try {
        if (!validatedData || validatedData.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Tidak ada data valid untuk disimpan.' });
        }

        for (const item of validatedData) {
            const tahunAjaranDb = await db.TahunAjaran.findOne({
                where: {
                    nama_ajaran: item.tahun_ajaran,
                    semester: item.semester,
                    status: 'aktif'
                }
            });

            if (!tahunAjaranDb) {
                console.warn(`Tahun Ajaran aktif untuk ${item.tahun_ajaran} semester ${item.semester} tidak ditemukan. Melewati siswa NIS ${item.nis}.`);
                continue;
            }
            const tahun_ajaran_id = tahunAjaranDb.id;

            const siswaDb = await db.Siswa.findOne({ where: { nis: item.nis } });
            if (!siswaDb) {
                console.warn(`Siswa dengan NIS ${item.nis} tidak ditemukan. Melewati.`);
                continue;
            }
            const siswa_id = siswaDb.id;

            // 1. HAPUS SEMUA DATA LAMA UNTUK SISWA INI DI SEMESTER INI
            const deleteWhere = {
                siswa_id,
                tahun_ajaran_id,
                semester: item.semester
            };

            console.log(`Menghapus data lama untuk Siswa ID: ${siswa_id}, Tahun Ajaran ID: ${tahun_ajaran_id}, Semester: ${item.semester}`);
            await db.NilaiUjian.destroy({ where: deleteWhere, transaction });
            await db.NilaiHafalan.destroy({ where: deleteWhere, transaction });
            await db.Kehadiran.destroy({ where: deleteWhere, transaction });
            await db.Sikap.destroy({ where: deleteWhere, transaction });

            // 2. SISIPKAN DATA BARU DARI EXCEL
            // Menggunakan bulkCreate agar lebih efisien

            // 2a. Sisipkan Nilai Ujian
            if (item.nilaiUjian && item.nilaiUjian.length > 0) {
                const nilaiUjianToCreate = [];
                for (const nilai of item.nilaiUjian) {
                    const mapel = await db.MataPelajaran.findOne({ where: { nama_mapel: nilai.nama_mapel, jenis: 'Ujian' } });
                    if (mapel) {
                        nilaiUjianToCreate.push({
                            siswa_id,
                            mapel_id: mapel.id,
                            // PERUBAHAN: gunakan nilai tunggal dari data
                            nilai: (nilai.nilai !== undefined && !isNaN(parseFloat(nilai.nilai))) ? parseFloat(nilai.nilai) : null,
                            semester: item.semester,
                            tahun_ajaran_id,
                            mapel_text: mapel.nama_mapel
                        });
                    }
                }
                if(nilaiUjianToCreate.length > 0) await db.NilaiUjian.bulkCreate(nilaiUjianToCreate, { transaction });
            }

            // 2b. Sisipkan Nilai Hafalan
            if (item.nilaiHafalan && item.nilaiHafalan.length > 0) {
                const nilaiHafalanToCreate = [];
                for (const hafalan of item.nilaiHafalan) {
                    const mapel = await db.MataPelajaran.findOne({ where: { nama_mapel: hafalan.nama_mapel, jenis: 'Hafalan' } });
                    if (mapel) {
                        nilaiHafalanToCreate.push({
                            siswa_id,
                            mapel_id: mapel.id,
                            nilai: hafalan.nilai_angka,
                            semester: item.semester,
                            tahun_ajaran_id,
                            mapel_text: mapel.nama_mapel
                        });
                    }
                }
                if(nilaiHafalanToCreate.length > 0) await db.NilaiHafalan.bulkCreate(nilaiHafalanToCreate, { transaction });
            }

            // 2c. Sisipkan Kehadiran
            if (item.kehadiran_detail && item.kehadiran_detail.length > 0) {
                const kehadiranToCreate = [];
                for (const kegiatan of item.kehadiran_detail) {
                    const indikator = await db.IndikatorKehadiran.findOne({ where: { nama_kegiatan: kegiatan.kegiatan } });
                    kehadiranToCreate.push({
                        siswa_id,
                        indikatorkehadirans_id: indikator ? indikator.id : null,
                        indikator_text: kegiatan.kegiatan,
                        izin: kegiatan.izin,
                        sakit: kegiatan.sakit,
                        absen: kegiatan.absen,
                        semester: item.semester,
                        tahun_ajaran_id
                    });
                }
                if(kehadiranToCreate.length > 0) await db.Kehadiran.bulkCreate(kehadiranToCreate, { transaction });
            }

            // 2d. Sisipkan Sikap
            if (item.sikap) {
                const sikapToCreate = [];
                if(item.sikap.detail && item.sikap.detail.length > 0) {
                    for (const sikapDetail of item.sikap.detail) {
                        const indikator = await db.IndikatorSikap.findOne({ where: { indikator: sikapDetail.indikator, is_active: 1 } });
                        sikapToCreate.push({
                            siswa_id,
                            tahun_ajaran_id,
                            semester: item.semester,
                            indikator_sikap_id: indikator ? indikator.id : null,
                            indikator_text: sikapDetail.indikator,
                            nilai: sikapDetail.nilai
                        });
                    }
                }
                if (item.sikap.catatan_walikelas) {
                     sikapToCreate.push({
                        siswa_id,
                        tahun_ajaran_id,
                        semester: item.semester,
                        indikator_text: 'Catatan Wali Kelas',
                        deskripsi: item.sikap.catatan_walikelas
                    });
                }
                if(sikapToCreate.length > 0) await db.Sikap.bulkCreate(sikapToCreate, { transaction });
            }
        }
        
        // Hapus draf setelah berhasil disimpan
        const batchIds = [...new Set(validatedData.map(d => d.upload_batch_id).filter(id => id))];
        if (batchIds.length > 0) {
            await db.DraftNilai.destroy({ where: { upload_batch_id: batchIds }, transaction });
        }

        await transaction.commit();
        
        res.status(200).json({ 
            message: 'Data raport berhasil diperbarui (data lama digantikan).',
            processed_count: validatedData.length
        });

    } catch (error) {
        await transaction.rollback();
        console.error("ERROR in saveValidatedRaport:", error);
        res.status(500).json({ 
            message: 'Gagal menyimpan data raport.', 
            error: error.message 
        });
    }
};


// ==========================================================================================
// FUNGSI-FUNGSI LAMA (TETAP DIPERTAHANKAN)
// ==========================================================================================

exports.getRaportData = async (req, res) => {
    const { siswaId, tahunAjaran, semester } = req.params;
    const tahunAjaranFormatted = `${tahunAjaran}/${parseInt(tahunAjaran) + 1}`;

    try {
        const tahunAjaranRecord = await db.TahunAjaran.findOne({
            where: {
                nama_ajaran: tahunAjaranFormatted,
                semester: semester,
                status: 'aktif'
            }
        });

        if (!tahunAjaranRecord) {
            return res.status(404).json({
                message: `Data Tahun Ajaran untuk ${tahunAjaranFormatted} semester ${semester} tidak ditemukan atau tidak aktif.`
            });
        }
        const tahunAjaranId = tahunAjaranRecord.id;

        const [nilaiUjian, nilaiHafalan, kehadiranDetail, semuaSikap] = await Promise.all([
            db.NilaiUjian.findAll({
                where: { siswa_id: siswaId, tahun_ajaran_id: tahunAjaranId, semester: semester },
                include: [{ model: db.MataPelajaran, as: 'mapel', attributes: ['nama_mapel'] }],
                order: [['mapel_text', 'ASC']]
            }),
            db.NilaiHafalan.findAll({
                where: { siswa_id: siswaId, tahun_ajaran_id: tahunAjaranId, semester: semester },
                include: [{ model: db.MataPelajaran, as: 'mapel', attributes: ['nama_mapel'] }],
                order: [['mapel_text', 'ASC']]
            }),
            // 🔥 PERUBAHAN: Ambil semua data kehadiran, jangan direkap
            db.Kehadiran.findAll({
                where: { siswa_id: siswaId, tahun_ajaran_id: tahunAjaranId, semester: semester },
                order: [['indikator_text', 'ASC']]
            }),
            // Ambil semua data sikap
            db.Sikap.findAll({
                where: { siswa_id: siswaId, tahun_ajaran_id: tahunAjaranId, semester: semester }
            })
        ]);

        // 🔥 PERUBAHAN: Pisahkan antara Sikap per Indikator dan Catatan Wali Kelas
        const sikapDetail = semuaSikap.filter(s => s.indikator_sikap_id !== null);
        const catatanWaliKelas = semuaSikap.find(s => s.indikator_text === 'Catatan Wali Kelas') || { deskripsi: '', id: null };

        res.status(200).json({
            nilaiUjian: nilaiUjian.map(n => ({
                id: n.id,
                nama_mapel: n.mapel?.nama_mapel || n.mapel_text,
                // PERUBAHAN: kirim nilai tunggal dan predikat dinamis
                nilai: n.nilai,
                predikat: (function(val){
                    const v = parseFloat(val);
                    if (val === null || val === undefined || isNaN(v)) return '-';
                    if (v === 100) return 'Sempurna';
                    if (v >= 90) return 'Sangat Baik';
                    if (v >= 80) return 'Baik';
                    if (v >= 70) return 'Cukup';
                    return 'Kurang';
                })(n.nilai)
            })),
            nilaiHafalan: nilaiHafalan.map(n => ({
                id: n.id,
                kategori: n.mapel?.nama_mapel || n.mapel_text,
                nilai_angka: n.nilai
            })),
            // Kirim data kehadiran sebagai array detail
            kehadiranDetail: kehadiranDetail.map(k => ({
                id: k.id,
                kegiatan: k.indikator_text,
                sakit: k.sakit,
                izin: k.izin,
                absen: k.absen
            })),
            // Kirim data sikap yang sudah dipisah
            sikapDetail: sikapDetail.map(s => ({
                id: s.id,
                indikator: s.indikator_text,
                nilai: s.nilai,
            })),
            catatanWaliKelas: {
                id: catatanWaliKelas.id,
                deskripsi: catatanWaliKelas.deskripsi
            }
        });

    } catch (error) {
        console.error("ERROR in getRaportData:", error);
        res.status(500).json({
            message: "Terjadi kesalahan saat mengambil data raport.",
            error: error.message,
        });
    }
};

exports.updateNilaiUjian = async (req, res) => {
    try {
    const { id } = req.params;
    const { nilai: newNilai } = req.body;

    console.log(`UPDATE NILAI UJIAN: id=${id}`, req.body);

    const nilaiRecord = await db.NilaiUjian.findByPk(id);
    if (!nilaiRecord) return res.status(404).json({ message: "Data nilai tidak ditemukan." });

    nilaiRecord.nilai = (newNilai !== undefined && !isNaN(parseFloat(newNilai))) ? parseFloat(newNilai) : null;
    await nilaiRecord.save();

    res.status(200).json(nilaiRecord);
    } catch (error) {
        console.error("Error update nilai ujian:", error);
        res.status(500).json({ message: "Gagal update nilai ujian.", error: error.message });
    }
};

exports.updateNilaiHafalan = async (req, res) => {
    try {
        const { id } = req.params;
        // 🔥 PERBAIKAN: Baca properti 'nilai_angka' dari body, bukan 'nilai'
        const { nilai_angka } = req.body; 
        
        const nilaiHafalan = await db.NilaiHafalan.findByPk(id);
        if (!nilaiHafalan) return res.status(404).json({ message: "Data nilai hafalan tidak ditemukan." });

        // Kolom di database Anda bernama 'nilai'
        nilaiHafalan.nilai = nilai_angka; // Gunakan nilai dari 'nilai_angka'
        await nilaiHafalan.save();

        res.status(200).json(nilaiHafalan);
    } catch (error) {
        console.error("Error update nilai hafalan:", error);
        res.status(500).json({ message: "Gagal update nilai hafalan.", error: error.message });
    }
};


exports.updateKehadiran = async (req, res) => {
    try {
        const { id } = req.params;
        // Ambil data sakit, izin, dan absen langsung dari body
        const { sakit, izin, absen } = req.body;

        const [updated] = await db.Kehadiran.update(
            {
                sakit: sakit || 0,
                izin: izin || 0,
                absen: absen || 0
            },
            {
                where: { id: id }
            }
        );

        if (updated) {
            const updatedKehadiran = await db.Kehadiran.findByPk(id);
            return res.status(200).json(updatedKehadiran);
        }
        
        return res.status(404).json({ message: "Data kehadiran tidak ditemukan." });

    } catch (error) {
        console.error("Error update kehadiran:", error);
        res.status(500).json({ message: "Gagal update kehadiran.", error: error.message });
    }
};

exports.updateSikap = async (req, res) => {
    try {
        const { id } = req.params;
        const { nilai } = req.body; // Hanya nilai yang bisa diubah

        const sikap = await db.Sikap.findByPk(id);
        if (!sikap) return res.status(404).json({ message: "Data sikap tidak ditemukan." });

        sikap.nilai = nilai;
        await sikap.save();
        
        res.status(200).json(sikap);
    } catch (error) {
        res.status(500).json({ message: "Gagal update nilai sikap.", error: error.message });
    }
};

// FUNGSI BARU UNTUK UPDATE CATATAN WALI KELAS
exports.updateCatatanWaliKelas = async (req, res) => {
    try {
        const { id } = req.params;
        const { deskripsi } = req.body;

        const catatan = await db.Sikap.findByPk(id);
        if (!catatan) return res.status(404).json({ message: "Data catatan tidak ditemukan." });

        catatan.deskripsi = deskripsi;
        await catatan.save();
        
        res.status(200).json(catatan);
    } catch (error) {
        res.status(500).json({ message: "Gagal update catatan.", error: error.message });
    }
};
