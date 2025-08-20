const db = require('../models');
const NilaiUjian = db.NilaiUjian;
const Siswa = db.Siswa;
const MataPelajaran = db.MataPelajaran;
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
            // Hanya proses jika ada nilai yang diinput (tidak kosong)
            if (nilai.pengetahuan_angka !== null || nilai.keterampilan_angka !== null) {
                await NilaiUjian.upsert({
                    siswa_id: nilai.siswa_id, // Gunakan siswa_id
                    mapel_id: nilai.mapel_id, // Gunakan mapel_id
                    semester: nilai.semester,
                    tahun_ajaran: nilai.tahun_ajaran,
                    pengetahuan_angka: nilai.pengetahuan_angka,
                    keterampilan_angka: nilai.keterampilan_angka,
                }, {
                    transaction
                });
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

    if (!kelas_id || !mapel_id || !semester || !tahun_ajaran) {
        return res.status(400).json({ message: "Semua filter harus diisi." });
    }

    try {
        const siswaList = await Siswa.findAll({
            where: { kelas_id: kelas_id },
            include: [{
                model: NilaiUjian,
                as: 'nilai_ujian',
                where: {
                    mapel_id: mapel_id, // Gunakan mapel_id
                    semester: semester,
                    tahun_ajaran: tahun_ajaran
                },
                required: false // LEFT JOIN
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
        const { siswa_id, mapel_id, semester, tahun_ajaran, pengetahuan_angka, keterampilan_angka } = req.body;
        if (!siswa_id || !mapel_id || !semester || !tahun_ajaran) {
            return res.status(400).json({ message: "Data input tidak lengkap." });
        }
        const newNilai = await NilaiUjian.create(req.body);
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
        const [updated] = await NilaiUjian.update(req.body, {
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