const db = require('../models');
const NilaiUjian = db.NilaiUjian;
const Siswa = db.Siswa;
const MataPelajaran = db.MataPelajaran;
const PeriodeAjaran = db.PeriodeAjaran || db.TahunAjaran;
const MasterTahunAjaran = db.MasterTahunAjaran || null;
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
                // Resolve tahun_ajaran -> tahun_ajaran_id when needed
                let tahunAjaranId = null;
                if (nilai.tahun_ajaran_id) {
                    tahunAjaranId = nilai.tahun_ajaran_id;
                } else if (nilai.tahun_ajaran) {
                    // Resolve in a backward compatible way: prefer master -> periode
                    let ta = null;
                    if (MasterTahunAjaran) {
                        const master = await MasterTahunAjaran.findOne({ where: { nama_ajaran: nilai.tahun_ajaran } });
                        if (master) ta = await PeriodeAjaran.findOne({ where: { master_tahun_ajaran_id: master.id, semester: nilai.semester } });
                    }
                    // fallback: try legacy nama_ajaran on PeriodeAjaran
                    if (!ta) ta = await PeriodeAjaran.findOne({ where: { nama_ajaran: nilai.tahun_ajaran, semester: nilai.semester } });
                    if (ta) tahunAjaranId = ta.id;
                }

                // If tahunAjaranId could not be resolved, skip this row (or you may want to throw)
                if (!tahunAjaranId) {
                    console.warn(`Skipping nilai for siswa_id=${nilai.siswa_id}: tidak bisa menemukan tahun ajaran untuk '${nilai.tahun_ajaran || nilai.tahun_ajaran_id}' semester ${nilai.semester}`);
                    continue;
                }

                // Accept either numeric 'nilai' (backwards compat) or 'predikat'/'deskripsi'
                const numericNilai = (nilai.nilai !== undefined && !isNaN(parseFloat(nilai.nilai))) ? parseFloat(nilai.nilai) : null;
                const predikat = nilai.predikat || (numericNilai !== null ? (numericNilai === 100 ? 'Sempurna' : numericNilai >= 90 ? 'Sangat Baik' : numericNilai >= 80 ? 'Baik' : numericNilai >= 70 ? 'Cukup' : 'Kurang') : null);
                // NilaiUjian model stores numeric nilai only; predikat is derived at read-time
                await NilaiUjian.upsert({
                    siswa_id: nilai.siswa_id,
                    mapel_id: nilai.mapel_id,
                    semester: nilai.semester,
                    tahun_ajaran_id: tahunAjaranId,
                    nilai: numericNilai
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
    const { kelas_id, mapel_id, semester } = req.query;
    // prefer numeric FK if middleware provided it (check params too)
    let tahunAjaranId = req.query.tahun_ajaran_id || req.body?.tahun_ajaran_id || req.params?.tahun_ajaran_id;
    // fallback to legacy textual param (maintained for backward compatibility)
    const tahun_ajaran_text = req.query.tahun_ajaran || req.body?.tahun_ajaran || req.params?.tahun_ajaran;

    // --- LOG REQUEST ---
    console.log("➡️  Request diterima untuk filter nilai:", { kelas_id, mapel_id, semester, tahunAjaranId, tahun_ajaran_text });
    // -------------------------

    if (!kelas_id || !mapel_id || !semester || (!tahunAjaranId && !tahun_ajaran_text)) {
        return res.status(400).json({ message: "Semua filter harus diisi." });
    }

    try {
        // If an id was provided (by middleware or client), use it. Otherwise resolve the textual value.
        let tahunAjaranRecord = null;
        if (tahunAjaranId) {
            tahunAjaranRecord = await db.PeriodeAjaran.findByPk(tahunAjaranId);
        } else {
            if (MasterTahunAjaran) {
                const master = await MasterTahunAjaran.findOne({ where: { nama_ajaran: tahun_ajaran_text } });
                if (master) {
                    tahunAjaranRecord = await db.PeriodeAjaran.findOne({ where: { master_tahun_ajaran_id: master.id, semester } });
                }
            }
            if (!tahunAjaranRecord) {
                tahunAjaranRecord = await db.PeriodeAjaran.findOne({ where: { nama_ajaran: tahun_ajaran_text, semester } });
            }
        }

        if (!tahunAjaranRecord) {
            console.error("❌ GAGAL: Tidak ada Tahun Ajaran yang cocok ditemukan di database.");
            return res.status(404).json({ message: `Kombinasi Tahun Ajaran ${tahun_ajaran_text} dan Semester ${semester} tidak ditemukan.` });
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
    const { siswa_id, mapel_id, semester, nilai } = req.body;
        // prefer numeric id from middleware/client
        let tahunAjaranId = req.body?.tahun_ajaran_id || req.params?.tahun_ajaran_id || req.query?.tahun_ajaran_id;
        const tahun_ajaran_text = req.body?.tahun_ajaran || req.params?.tahun_ajaran || req.query?.tahun_ajaran;
        if (!siswa_id || !mapel_id || !semester || (!tahunAjaranId && !tahun_ajaran_text)) {
            return res.status(400).json({ message: "Data input tidak lengkap." });
        }
        if (!tahunAjaranId && tahun_ajaran_text) {
            const ta = await PeriodeAjaran.findOne({ where: { nama_ajaran: String(tahun_ajaran_text), semester } });
            if (!ta) return res.status(404).json({ message: `Tahun Ajaran ${tahun_ajaran_text} semester ${semester} tidak ditemukan.` });
            tahunAjaranId = ta.id;
        }

        const numericNilai = (nilai !== undefined && !isNaN(parseFloat(nilai))) ? parseFloat(nilai) : null;
        // NilaiUjian model stores numeric nilai; predikat is derived on read so we don't persist it
        const payload = {
            siswa_id,
            mapel_id,
            semester,
            tahun_ajaran_id: tahunAjaranId,
            nilai: numericNilai
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
            // Order by foreign key tahun_ajaran_id (model uses that column). If you want to order by readable name,
            // include TahunAjaran and order by its nama_ajaran instead.
            order: [['tahun_ajaran_id', 'DESC'], ['semester', 'DESC']]
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
    const numericNilaiUpd = (nilai !== undefined && !isNaN(parseFloat(nilai))) ? parseFloat(nilai) : null;
    // Do not persist predikat; it's derived at read-time
    const updatePayload = { ...rest, nilai: numericNilaiUpd };

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