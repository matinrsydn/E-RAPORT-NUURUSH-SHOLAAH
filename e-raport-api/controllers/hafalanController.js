const db = require('../models');
const NilaiHafalan = db.NilaiHafalan;
const Siswa = db.Siswa;
const MataPelajaran = db.MataPelajaran;
const { Op } = require("sequelize");

// --- FUNGSI UNTUK MENYIMPAN BANYAK NILAI HAFALAN SEKALIGUS (BULK) ---
exports.bulkUpdateOrInsertHafalan = async (req, res) => {
    const hafalanBatch = req.body;
    const transaction = await db.sequelize.transaction();

    try {
        if (!Array.isArray(hafalanBatch) || hafalanBatch.length === 0) {
            return res.status(400).json({ message: "Data yang dikirim tidak valid." });
        }

        for (const hafalan of hafalanBatch) {
            // Hanya proses jika ada nilai yang diinput (tidak kosong)
            if (hafalan.nilai_angka !== null) {
                let tahunAjaranId = hafalan.tahun_ajaran_id || hafalan.tahunAjaranId || null;
                if (!tahunAjaranId && hafalan.tahun_ajaran) {
                    const ta = await db.PeriodeAjaran.findOne({ where: { nama_ajaran: hafalan.tahun_ajaran, semester: hafalan.semester } });
                    if (ta) tahunAjaranId = ta.id;
                }
                await NilaiHafalan.upsert({
                    siswa_id: hafalan.siswa_id,
                    mapel_id: hafalan.mapel_id,
                    semester: hafalan.semester,
                    tahun_ajaran_id: tahunAjaranId,
                    nilai_angka: hafalan.nilai_angka,
                }, {
                    transaction
                });
            }
        }

        await transaction.commit();
        res.status(200).json({ message: "Nilai hafalan berhasil disimpan." });

    } catch (error) {
        await transaction.rollback();
        console.error("Error saat bulk update nilai hafalan:", error);
        res.status(500).json({ message: "Terjadi kesalahan di server.", error: error.message });
    }
};

// --- FUNGSI UNTUK MENGAMBIL SISWA DAN NILAI HAFALAN BERDASARKAN FILTER ---
exports.getSiswaWithHafalanByFilter = async (req, res) => {
    const { kelas_id, mapel_id, semester } = req.query;
    let tahunAjaranId = req.query.tahun_ajaran_id || req.body?.tahun_ajaran_id || req.params?.tahun_ajaran_id;
    const tahun_ajaran_text = req.query.tahun_ajaran || req.body?.tahun_ajaran || req.params?.tahun_ajaran;

    if (!kelas_id || !mapel_id || !semester || (!tahunAjaranId && !tahun_ajaran_text)) {
        return res.status(400).json({ message: "Semua filter harus diisi." });
    }

    try {
        if (!tahunAjaranId && tahun_ajaran_text) {
            const ta = await db.PeriodeAjaran.findOne({ where: { nama_ajaran: tahun_ajaran_text, semester } });
            if (ta) tahunAjaranId = ta.id;
        }

        const siswaList = await Siswa.findAll({
            where: { kelas_id: kelas_id },
            include: [{
                model: NilaiHafalan,
                as: 'nilai_hafalan',
                where: {
                    mapel_id: mapel_id,
                    semester: semester,
                    tahun_ajaran_id: tahunAjaranId
                },
                required: false // LEFT JOIN, agar siswa tetap tampil meskipun belum ada nilai
            }],
            order: [['nama', 'ASC']]
        });
        res.status(200).json(siswaList);
    } catch (error) {
        console.error("Error fetching siswa with hafalan:", error);
        res.status(500).json({ message: "Gagal mengambil data siswa.", error: error.message });
    }
};

// --- FUNGSI-FUNGSI CRUD STANDAR ---

// 1. Membuat satu entri nilai hafalan baru
exports.createHafalan = async (req, res) => {
    try {
        const { siswa_id, mapel_id, semester, nilai_angka } = req.body;
        let tahunAjaranId = req.body?.tahun_ajaran_id || req.params?.tahun_ajaran_id || req.query?.tahun_ajaran_id;
        const tahun_ajaran_text = req.body?.tahun_ajaran || req.params?.tahun_ajaran || req.query?.tahun_ajaran;
        if (!siswa_id || !mapel_id || !semester || (!tahunAjaranId && !tahun_ajaran_text)) {
            return res.status(400).json({ message: "Data input tidak lengkap." });
        }
        if (!tahunAjaranId && tahun_ajaran_text) {
            const ta = await db.PeriodeAjaran.findOne({ where: { nama_ajaran: tahun_ajaran_text, semester } });
            if (!ta) return res.status(404).json({ message: `Tahun Ajaran ${tahun_ajaran_text} semester ${semester} tidak ditemukan.` });
            tahunAjaranId = ta.id;
        }
        const newHafalan = await NilaiHafalan.create({ siswa_id, mapel_id, semester, tahun_ajaran_id: tahunAjaranId, nilai_angka });
        res.status(201).json(newHafalan);
    } catch (error) {
        console.error("Error membuat nilai hafalan:", error);
        res.status(500).json({ message: "Gagal membuat entri nilai hafalan baru.", error: error.message });
    }
};

// 2. Mengambil semua data nilai hafalan (termasuk nama siswa dan mapel)
exports.getAllHafalan = async (req, res) => {
    try {
        const allHafalan = await NilaiHafalan.findAll({
            include: [
                { model: Siswa, attributes: ['nama', 'nis'] },
                { model: MataPelajaran, as: 'mapel', attributes: ['nama_mapel', 'kitab'] }
            ],
            // Order by the FK column (tahun_ajaran_id) which is the canonical field
            order: [['tahun_ajaran_id', 'DESC'], ['semester', 'DESC']]
        });
        res.status(200).json(allHafalan);
    } catch (error) {
        console.error("Error mengambil semua nilai hafalan:", error);
        res.status(500).json({ message: "Gagal mengambil data nilai hafalan.", error: error.message });
    }
};

// 3. Mengambil satu entri nilai hafalan berdasarkan ID
exports.getHafalanById = async (req, res) => {
    try {
        const { id } = req.params;
        const hafalan = await NilaiHafalan.findByPk(id, {
            include: [
                { model: Siswa },
                { model: MataPelajaran, as: 'mapel' }
            ]
        });
        if (!hafalan) {
            return res.status(404).json({ message: "Data nilai hafalan tidak ditemukan." });
        }
        res.status(200).json(hafalan);
    } catch (error) {
        console.error("Error mengambil nilai hafalan by ID:", error);
        res.status(500).json({ message: "Gagal mengambil data nilai hafalan.", error: error.message });
    }
};

// 4. Memperbarui satu entri nilai hafalan berdasarkan ID
exports.updateHafalan = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await NilaiHafalan.update(req.body, {
            where: { id: id }
        });
        if (updated) {
            const updatedHafalan = await NilaiHafalan.findByPk(id);
            res.status(200).json({ message: "Nilai hafalan berhasil diperbarui.", data: updatedHafalan });
        } else {
            res.status(404).json({ message: "Data nilai hafalan tidak ditemukan." });
        }
    } catch (error) {
        console.error("Error memperbarui nilai hafalan:", error);
        res.status(500).json({ message: "Gagal memperbarui nilai hafalan.", error: error.message });
    }
};

// 5. Menghapus satu entri nilai hafalan berdasarkan ID
exports.deleteHafalan = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await NilaiHafalan.destroy({
            where: { id: id }
        });
        if (deleted) {
            res.status(200).json({ message: "Nilai hafalan berhasil dihapus." });
        } else {
            res.status(404).json({ message: "Data nilai hafalan tidak ditemukan." });
        }
    } catch (error) {
        console.error("Error menghapus nilai hafalan:", error);
        res.status(500).json({ message: "Gagal menghapus nilai hafalan.", error: error.message });
    }
};