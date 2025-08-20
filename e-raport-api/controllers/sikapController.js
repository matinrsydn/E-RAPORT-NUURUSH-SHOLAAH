const db = require('../models');
const Sikap = db.Sikap;
const Siswa = db.Siswa;
const IndikatorSikap = db.IndikatorSikap;
const { Op } = require("sequelize");

// --- FUNGSI UNTUK MENYIMPAN BANYAK NILAI SIKAP SEKALIGUS (BULK) ---
exports.bulkUpdateOrInsertSikap = async (req, res) => {
    const sikapBatch = req.body;
    const transaction = await db.sequelize.transaction();

    try {
        if (!Array.isArray(sikapBatch) || sikapBatch.length === 0) {
            return res.status(400).json({ message: "Data yang dikirim tidak valid." });
        }

        for (const sikap of sikapBatch) {
            // Hanya proses jika ada nilai yang diinput (tidak kosong)
            if (sikap.angka !== null) {
                await Sikap.upsert({
                    siswaId: sikap.siswa_id,
                    jenis_sikap: sikap.jenis_sikap,
                    indikator: sikap.indikator,
                    angka: sikap.angka,
                    deskripsi: sikap.deskripsi || '',
                    semester: sikap.semester,
                    tahun_ajaran: sikap.tahun_ajaran,
                }, {
                    transaction
                });
            }
        }

        await transaction.commit();
        res.status(200).json({ message: "Nilai sikap berhasil disimpan." });

    } catch (error) {
        await transaction.rollback();
        console.error("Error saat bulk update nilai sikap:", error);
        res.status(500).json({ message: "Terjadi kesalahan di server.", error: error.message });
    }
};

// --- FUNGSI UNTUK MENGAMBIL SISWA DAN NILAI SIKAP BERDASARKAN FILTER ---
exports.getSiswaWithSikapByFilter = async (req, res) => {
    const { kelas_id, jenis_sikap, semester, tahun_ajaran } = req.query;

    if (!kelas_id || !jenis_sikap || !semester || !tahun_ajaran) {
        return res.status(400).json({ message: "Semua filter harus diisi." });
    }

    try {
        const siswaList = await Siswa.findAll({
            where: { kelas_id: kelas_id },
            include: [{
                model: Sikap,
                as: 'sikap',
                where: {
                    jenis_sikap: jenis_sikap,
                    semester: semester,
                    tahun_ajaran: tahun_ajaran
                },
                required: false // LEFT JOIN, agar siswa tetap tampil meskipun belum ada nilai
            }],
            order: [['nama', 'ASC']]
        });
        res.status(200).json(siswaList);
    } catch (error) {
        console.error("Error fetching siswa with sikap:", error);
        res.status(500).json({ message: "Gagal mengambil data siswa.", error: error.message });
    }
};

// --- FUNGSI UNTUK MENGAMBIL DESKRIPSI SIKAP SISWA BERDASARKAN FILTER ---
exports.getDeskripsiSikapByFilter = async (req, res) => {
    const { siswa_id, semester, tahun_ajaran } = req.query;

    if (!siswa_id || !semester || !tahun_ajaran) {
        return res.status(400).json({ message: "Semua filter harus diisi." });
    }

    try {
        const sikapSpiritual = await Sikap.findAll({
            where: {
                siswaId: siswa_id,
                jenis_sikap: 'spiritual',
                semester: semester,
                tahun_ajaran: tahun_ajaran
            }
        });

        const sikapSosial = await Sikap.findAll({
            where: {
                siswaId: siswa_id,
                jenis_sikap: 'sosial',
                semester: semester,
                tahun_ajaran: tahun_ajaran
            }
        });

        // Ambil deskripsi unik untuk setiap jenis sikap
        const deskripsiSpiritual = sikapSpiritual.length > 0 ? sikapSpiritual[0].deskripsi : '';
        const deskripsiSosial = sikapSosial.length > 0 ? sikapSosial[0].deskripsi : '';

        res.status(200).json({
            spiritual: {
                indikator: sikapSpiritual,
                deskripsi: deskripsiSpiritual
            },
            sosial: {
                indikator: sikapSosial,
                deskripsi: deskripsiSosial
            }
        });
    } catch (error) {
        console.error("Error fetching deskripsi sikap:", error);
        res.status(500).json({ message: "Gagal mengambil deskripsi sikap.", error: error.message });
    }
};

// --- FUNGSI UNTUK UPDATE DESKRIPSI SIKAP SISWA ---
exports.updateDeskripsiSikap = async (req, res) => {
    const { siswa_id, semester, tahun_ajaran, jenis_sikap, deskripsi } = req.body;
    const transaction = await db.sequelize.transaction();

    try {
        if (!siswa_id || !semester || !tahun_ajaran || !jenis_sikap) {
            return res.status(400).json({ message: "Data input tidak lengkap." });
        }

        // Update semua record sikap dengan jenis yang sama untuk siswa tersebut
        await Sikap.update(
            { deskripsi: deskripsi },
            {
                where: {
                    siswaId: siswa_id,
                    jenis_sikap: jenis_sikap,
                    semester: semester,
                    tahun_ajaran: tahun_ajaran
                },
                transaction
            }
        );

        await transaction.commit();
        res.status(200).json({ message: "Deskripsi sikap berhasil diperbarui." });

    } catch (error) {
        await transaction.rollback();
        console.error("Error saat update deskripsi sikap:", error);
        res.status(500).json({ message: "Terjadi kesalahan di server.", error: error.message });
    }
};

// --- FUNGSI-FUNGSI CRUD STANDAR ---

// 1. Membuat satu entri nilai sikap baru
exports.createSikap = async (req, res) => {
    try {
        const { siswaId, jenis_sikap, indikator, angka, semester, tahun_ajaran } = req.body;
        if (!siswaId || !jenis_sikap || !indikator || !semester || !tahun_ajaran) {
            return res.status(400).json({ message: "Data input tidak lengkap." });
        }
        const newSikap = await Sikap.create(req.body);
        res.status(201).json(newSikap);
    } catch (error) {
        console.error("Error membuat nilai sikap:", error);
        res.status(500).json({ message: "Gagal membuat entri nilai sikap baru.", error: error.message });
    }
};

// 2. Mengambil semua data nilai sikap (termasuk nama siswa)
exports.getAllSikap = async (req, res) => {
    try {
        const allSikap = await Sikap.findAll({
            include: [
                { model: Siswa, attributes: ['nama', 'nis'] }
            ],
            order: [['tahun_ajaran', 'DESC'], ['semester', 'DESC'], ['jenis_sikap', 'ASC']]
        });
        res.status(200).json(allSikap);
    } catch (error) {
        console.error("Error mengambil semua nilai sikap:", error);
        res.status(500).json({ message: "Gagal mengambil data nilai sikap.", error: error.message });
    }
};

// 3. Mengambil satu entri nilai sikap berdasarkan ID
exports.getSikapById = async (req, res) => {
    try {
        const { id } = req.params;
        const sikap = await Sikap.findByPk(id, {
            include: [
                { model: Siswa }
            ]
        });
        if (!sikap) {
            return res.status(404).json({ message: "Data nilai sikap tidak ditemukan." });
        }
        res.status(200).json(sikap);
    } catch (error) {
        console.error("Error mengambil nilai sikap by ID:", error);
        res.status(500).json({ message: "Gagal mengambil data nilai sikap.", error: error.message });
    }
};

// 4. Memperbarui satu entri nilai sikap berdasarkan ID
exports.updateSikap = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await Sikap.update(req.body, {
            where: { id: id }
        });
        if (updated) {
            const updatedSikap = await Sikap.findByPk(id);
            res.status(200).json({ message: "Nilai sikap berhasil diperbarui.", data: updatedSikap });
        } else {
            res.status(404).json({ message: "Data nilai sikap tidak ditemukan." });
        }
    } catch (error) {
        console.error("Error memperbarui nilai sikap:", error);
        res.status(500).json({ message: "Gagal memperbarui nilai sikap.", error: error.message });
    }
};

// 5. Menghapus satu entri nilai sikap berdasarkan ID
exports.deleteSikap = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Sikap.destroy({
            where: { id: id }
        });
        if (deleted) {
            res.status(200).json({ message: "Nilai sikap berhasil dihapus." });
        } else {
            res.status(404).json({ message: "Data nilai sikap tidak ditemukan." });
        }
    } catch (error) {
        console.error("Error menghapus nilai sikap:", error);
        res.status(500).json({ message: "Gagal menghapus nilai sikap.", error: error.message });
    }
};