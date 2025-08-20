const db = require('../models');
const Kehadiran = db.Kehadiran;
const Siswa = db.Siswa;
const { Op } = require("sequelize");

// --- FUNGSI UNTUK MENYIMPAN BANYAK DATA KEHADIRAN SEKALIGUS (BULK) ---
exports.bulkUpdateOrInsertKehadiran = async (req, res) => {
    const kehadiranBatch = req.body;
    const transaction = await db.sequelize.transaction();

    try {
        if (!Array.isArray(kehadiranBatch) || kehadiranBatch.length === 0) {
            return res.status(400).json({ message: "Data yang dikirim tidak valid." });
        }

        for (const kehadiran of kehadiranBatch) {
            // Hanya proses jika ada data yang diinput
            if (kehadiran.kegiatan) {
                await Kehadiran.upsert({
                    siswaId: kehadiran.siswa_id,
                    kegiatan: kehadiran.kegiatan,
                    izin: kehadiran.izin || 0,
                    sakit: kehadiran.sakit || 0,
                    absen: kehadiran.absen || 0,
                    semester: kehadiran.semester,
                    tahun_ajaran: kehadiran.tahun_ajaran,
                }, {
                    transaction
                });
            }
        }

        await transaction.commit();
        res.status(200).json({ message: "Data kehadiran berhasil disimpan." });

    } catch (error) {
        await transaction.rollback();
        console.error("Error saat bulk update kehadiran:", error);
        res.status(500).json({ message: "Terjadi kesalahan di server.", error: error.message });
    }
};

// --- FUNGSI UNTUK MENGAMBIL SISWA DAN KEHADIRAN BERDASARKAN FILTER ---
exports.getSiswaWithKehadiranByFilter = async (req, res) => {
    const { kelas_id, semester, tahun_ajaran } = req.query;

    if (!kelas_id || !semester || !tahun_ajaran) {
        return res.status(400).json({ message: "Semua filter harus diisi." });
    }

    try {
        const siswaList = await Siswa.findAll({
            where: { kelas_id: kelas_id },
            include: [{
                model: Kehadiran,
                as: 'kehadiran',
                where: {
                    semester: semester,
                    tahun_ajaran: tahun_ajaran
                },
                required: false // LEFT JOIN, agar siswa tetap tampil meskipun belum ada data kehadiran
            }],
            order: [['nama', 'ASC']]
        });
        res.status(200).json(siswaList);
    } catch (error) {
        console.error("Error fetching siswa with kehadiran:", error);
        res.status(500).json({ message: "Gagal mengambil data siswa.", error: error.message });
    }
};

// --- FUNGSI UNTUK MENGAMBIL TEMPLATE KEGIATAN KEHADIRAN ---
exports.getTemplateKegiatan = async (req, res) => {
    try {
        // Template default kegiatan yang sering digunakan di pondok pesantren
        const templateKegiatan = [
            'Shalat Berjamaah',
            'Mengaji Al-Quran',
            'Tahfidz',
            'Kajian Kitab',
            'Sekolah Formal',
            'Piket Harian',
            'Kegiatan Ekstrakurikuler',
            'Rapat Santri'
        ];
        
        res.status(200).json(templateKegiatan);
    } catch (error) {
        console.error("Error mengambil template kegiatan:", error);
        res.status(500).json({ message: "Gagal mengambil template kegiatan.", error: error.message });
    }
};

// --- FUNGSI-FUNGSI CRUD STANDAR ---

// 1. Membuat satu entri kehadiran baru
exports.createKehadiran = async (req, res) => {
    try {
        const { siswaId, kegiatan, semester, tahun_ajaran } = req.body;
        if (!siswaId || !kegiatan || !semester || !tahun_ajaran) {
            return res.status(400).json({ message: "Data input tidak lengkap." });
        }
        const newKehadiran = await Kehadiran.create(req.body);
        res.status(201).json(newKehadiran);
    } catch (error) {
        console.error("Error membuat data kehadiran:", error);
        res.status(500).json({ message: "Gagal membuat entri kehadiran baru.", error: error.message });
    }
};

// 2. Mengambil semua data kehadiran (termasuk nama siswa)
exports.getAllKehadiran = async (req, res) => {
    try {
        const allKehadiran = await Kehadiran.findAll({
            include: [
                { model: Siswa, attributes: ['nama', 'nis'] }
            ],
            order: [['tahun_ajaran', 'DESC'], ['semester', 'DESC']]
        });
        res.status(200).json(allKehadiran);
    } catch (error) {
        console.error("Error mengambil semua data kehadiran:", error);
        res.status(500).json({ message: "Gagal mengambil data kehadiran.", error: error.message });
    }
};

// 3. Mengambil satu entri kehadiran berdasarkan ID
exports.getKehadiranById = async (req, res) => {
    try {
        const { id } = req.params;
        const kehadiran = await Kehadiran.findByPk(id, {
            include: [
                { model: Siswa }
            ]
        });
        if (!kehadiran) {
            return res.status(404).json({ message: "Data kehadiran tidak ditemukan." });
        }
        res.status(200).json(kehadiran);
    } catch (error) {
        console.error("Error mengambil kehadiran by ID:", error);
        res.status(500).json({ message: "Gagal mengambil data kehadiran.", error: error.message });
    }
};

// 4. Memperbarui satu entri kehadiran berdasarkan ID
exports.updateKehadiran = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await Kehadiran.update(req.body, {
            where: { id: id }
        });
        if (updated) {
            const updatedKehadiran = await Kehadiran.findByPk(id);
            res.status(200).json({ message: "Data kehadiran berhasil diperbarui.", data: updatedKehadiran });
        } else {
            res.status(404).json({ message: "Data kehadiran tidak ditemukan." });
        }
    } catch (error) {
        console.error("Error memperbarui kehadiran:", error);
        res.status(500).json({ message: "Gagal memperbarui kehadiran.", error: error.message });
    }
};

// 5. Menghapus satu entri kehadiran berdasarkan ID
exports.deleteKehadiran = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Kehadiran.destroy({
            where: { id: id }
        });
        if (deleted) {
            res.status(200).json({ message: "Data kehadiran berhasil dihapus." });
        } else {
            res.status(404).json({ message: "Data kehadiran tidak ditemukan." });
        }
    } catch (error) {
        console.error("Error menghapus kehadiran:", error);
        res.status(500).json({ message: "Gagal menghapus kehadiran.", error: error.message });
    }
};

// 6. Mengambil rangkuman kehadiran per siswa
exports.getRangkumanKehadiran = async (req, res) => {
    try {
        const { siswa_id, semester, tahun_ajaran } = req.query;
        
        if (!siswa_id || !semester || !tahun_ajaran) {
            return res.status(400).json({ message: "Parameter siswa_id, semester, dan tahun_ajaran wajib diisi." });
        }

        const kehadiran = await Kehadiran.findAll({
            where: {
                siswaId: siswa_id,
                semester: semester,
                tahun_ajaran: tahun_ajaran
            },
            include: [
                { model: Siswa, attributes: ['nama', 'nis'] }
            ]
        });

        // Hitung total keseluruhan
        const totalIzin = kehadiran.reduce((sum, k) => sum + k.izin, 0);
        const totalSakit = kehadiran.reduce((sum, k) => sum + k.sakit, 0);
        const totalAbsen = kehadiran.reduce((sum, k) => sum + k.absen, 0);
        const totalKeseluruhan = totalIzin + totalSakit + totalAbsen;

        res.status(200).json({
            siswa: kehadiran.length > 0 ? kehadiran[0].Siswa : null,
            detail_kegiatan: kehadiran,
            rangkuman: {
                total_izin: totalIzin,
                total_sakit: totalSakit,
                total_absen: totalAbsen,
                total_keseluruhan: totalKeseluruhan
            }
        });
    } catch (error) {
        console.error("Error mengambil rangkuman kehadiran:", error);
        res.status(500).json({ message: "Gagal mengambil rangkuman kehadiran.", error: error.message });
    }
};