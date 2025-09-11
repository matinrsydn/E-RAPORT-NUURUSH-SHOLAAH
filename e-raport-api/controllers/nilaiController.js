const db = require('../models');
const NilaiUjian = db.NilaiUjian;
const Siswa = db.Siswa;
const MataPelajaran = db.MataPelajaran;
const TahunAjaran = db.TahunAjaran;
const { Op } = require("sequelize");

// --- FUNGSI UNTUK MENYIMPAN BANYAK NILAI SEKALIGUS (BULK) ---
exports.bulkUpdateOrInsertNilai = async (req, res) => {
    const nilaiBatch = req.body;
    const transaction = await db.sequelize.transaction();
    try {
        if (!Array.isArray(nilaiBatch) || nilaiBatch.length === 0) {
            return res.status(400).json({ message: "Data yang dikirim tidak valid." });
        }

        for (const nilai of nilaiBatch) {
            // proses hanya jika field nilai diberikan
            if (nilai.nilai !== undefined) {
                await NilaiUjian.upsert({
                    siswa_id: nilai.siswa_id,
                    mapel_id: nilai.mapel_id,
                    semester: nilai.semester,
                    tahun_ajaran: nilai.tahun_ajaran,
                    // Direct store single nilai
                    nilai: nilai.nilai,
                }, { transaction });
            }
        }

        await transaction.commit();
        res.status(200).json({ message: "Nilai berhasil disimpan." });

    } catch (error) {
        await transaction.rollback();
        console.error("Error saat bulk update nilai:", error);
        res.status(500).json({ message: "Terjadi kesalahan di server.", error: error.message });
    }
};

// --- FUNGSI UNTUK MENGAMBIL SISWA DAN NILAI BERDASARKAN FILTER ---
exports.getSiswaWithNilaiByFilter = async (req, res) => {
    const { kelas_id, mapel_id, semester, tahun_ajaran } = req.query;

    // --- TAMBAHKAN LOG INI ---
    console.log("➡️  Request diterima untuk filter nilai:");
    console.log({ kelas_id, mapel_id, semester, tahun_ajaran });
    // -------------------------

    if (!kelas_id || !mapel_id || !semester || !tahun_ajaran) {
        return res.status(400).json({ message: "Semua filter harus diisi." });
    }

    try {
        const tahunAjaranRecord = await db.TahunAjaran.findOne({
            where: {
                nama_ajaran: tahun_ajaran,
                semester: semester
            }
        });

        // --- TAMBAHKAN LOG INI ---
        if (!tahunAjaranRecord) {
            console.error("❌ GAGAL: Tidak ada Tahun Ajaran yang cocok ditemukan di database.");
            return res.status(404).json({ message: `Kombinasi Tahun Ajaran ${tahun_ajaran} dan Semester ${semester} tidak ditemukan.` });
        }
        console.log("✅ SUKSES: Tahun Ajaran ditemukan, ID:", tahunAjaranRecord.id);
        // -------------------------

        const siswaList = await db.Siswa.findAll({
            where: { kelas_id: kelas_id },
            include: [{
                model: db.NilaiUjian,
                as: 'NilaiUjians',
                where: {
                    mapel_id: mapel_id,
                    tahun_ajaran_id: tahunAjaranRecord.id
                },
                required: false
            }],
            order: [['nama', 'ASC']]
        });
        res.status(200).json(siswaList);
    } catch (error) {
        console.error("Error fetching siswa with nilai:", error);
        res.status(500).json({ message: "Gagal mengambil data siswa.", error: error.message });
    }
};

// --- FUNGSI-FUNGSI CRUD STANDAR ---

// 1. Membuat satu entri nilai baru
exports.createNilai = async (req, res) => {
    try {
        const { siswa_id, mapel_id, semester, tahun_ajaran, nilai } = req.body;
        if (!siswa_id || !mapel_id || !semester || !tahun_ajaran) {
            return res.status(400).json({ message: "Data input tidak lengkap." });
        }

        const payload = {
            siswa_id,
            mapel_id,
            semester,
            tahun_ajaran,
            // Direct store single nilai
            nilai: nilai || null
        };

        const newNilai = await NilaiUjian.create(payload);
        res.status(201).json(newNilai);
    } catch (error) {
        console.error("Error membuat nilai:", error);
        res.status(500).json({ message: "Gagal membuat entri nilai baru.", error: error.message });
    }
};

// 2. Mengambil semua data nilai
exports.getAllNilai = async (req, res) => {
    try {
        const allNilai = await NilaiUjian.findAll({
            include: [
                { model: Siswa, as: 'siswa', attributes: ['nama', 'nis'] },
                { model: MataPelajaran, as: 'mapel', attributes: ['nama_mapel'] }
            ],
            order: [['tahun_ajaran', 'DESC'], ['semester', 'DESC']]
        });
        res.status(200).json(allNilai);
    } catch (error) {
        console.error("Error mengambil semua nilai:", error);
        res.status(500).json({ message: "Gagal mengambil data nilai.", error: error.message });
    }
};

// 3. Mengambil satu entri nilai berdasarkan ID
exports.getNilaiById = async (req, res) => {
    try {
        const { id } = req.params;
        const nilai = await NilaiUjian.findByPk(id, {
            include: [
                { model: Siswa, as: 'siswa' },
                { model: MataPelajaran, as: 'mapel' }
            ]
        });
        if (!nilai) {
            return res.status(404).json({ message: "Data nilai tidak ditemukan." });
        }
        res.status(200).json(nilai);
    } catch (error) {
        console.error("Error mengambil nilai by ID:", error);
        res.status(500).json({ message: "Gagal mengambil data nilai.", error: error.message });
    }
};

// 4. Memperbarui satu entri nilai berdasarkan ID
exports.updateNilai = async (req, res) => {
    try {
        const { id } = req.params;
        const { nilai, ...rest } = req.body;
        const updatePayload = { ...rest, nilai: (nilai !== undefined ? nilai : null) };

        const [updated] = await NilaiUjian.update(updatePayload, {
            where: { id: id }
        });
        if (updated) {
            const updatedNilai = await NilaiUjian.findByPk(id);
            res.status(200).json({ message: "Nilai berhasil diperbarui.", data: updatedNilai });
        } else {
            res.status(404).json({ message: "Data nilai tidak ditemukan." });
        }
    } catch (error) {
        console.error("Error memperbarui nilai:", error);
        res.status(500).json({ message: "Gagal memperbarui nilai.", error: error.message });
    }
};

// 5. Menghapus satu entri nilai berdasarkan ID
exports.deleteNilai = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await NilaiUjian.destroy({
            where: { id: id }
        });
        if (deleted) {
            res.status(200).json({ message: "Nilai berhasil dihapus." });
        } else {
            res.status(404).json({ message: "Data nilai tidak ditemukan." });
        }
    } catch (error) {
        console.error("Error menghapus nilai:", error);
        res.status(500).json({ message: "Gagal menghapus nilai.", error: error.message });
    }
};