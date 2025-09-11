// e-raport-api/controllers/waliKelasController.js

const db = require('../models');

// Mengambil semua data Wali Kelas beserta kelas yang diajar
exports.getAllWaliKelas = async (req, res) => {
    try {
        const waliKelas = await db.WaliKelas.findAll({
            // PERBAIKAN: Tambahkan include dengan alias yang benar
            include: [{
                model: db.Kelas,
                as: 'kelas', // Menggunakan alias 'kelas' yang didefinisikan di model WaliKelas
                attributes: ['id', 'nama_kelas'],
                required: false // Gunakan 'required: false' (LEFT JOIN) agar wali kelas yang belum punya kelas tetap tampil
            }],
            order: [['nama', 'ASC']]
        });
        res.json(waliKelas);
    } catch (error) {
        console.error("SERVER ERROR - GET /api/wali-kelas:", error);
        res.status(500).json({ message: "Gagal mengambil data wali kelas", error: error.message });
    }
};

// Mengambil satu data Wali Kelas
exports.getWaliKelasById = async (req, res) => {
    try {
        const waliKelas = await db.WaliKelas.findByPk(req.params.id);
        if (!waliKelas) return res.status(404).json({ message: 'Wali Kelas tidak ditemukan' });
        res.json(waliKelas);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil data', error: error.message });
    }
};

// Membuat data Wali Kelas baru
exports.createWaliKelas = async (req, res) => {
    try {
        const newWaliKelas = await db.WaliKelas.create(req.body);
        res.status(201).json(newWaliKelas);
    } catch (error) {
        res.status(400).json({ message: 'Gagal membuat data', error: error.message });
    }
};

// Memperbarui data Wali Kelas
exports.updateWaliKelas = async (req, res) => {
    try {
        const [updated] = await db.WaliKelas.update(req.body, { where: { id: req.params.id } });
        if (updated) {
            const updatedData = await db.WaliKelas.findByPk(req.params.id);
            return res.status(200).json(updatedData);
        }
        throw new Error('Data tidak ditemukan');
    } catch (error) {
        res.status(404).json({ message: 'Data tidak ditemukan', error: error.message });
    }
};

// Menghapus data Wali Kelas
exports.deleteWaliKelas = async (req, res) => {
    const waliKelasId = req.params.id;
    const transaction = await db.sequelize.transaction(); 

    try {
        // ====================================================================
        // === PERUBAHAN UTAMA: Cek ke tabel Kelas, bukan Siswa ===
        // ====================================================================
        const kelasTerkait = await db.Kelas.findOne({
            where: { wali_kelas_id: waliKelasId },
            transaction
        });

        // JIKA ADA kelas yang terkait, batalkan operasi dan kirim pesan error
        if (kelasTerkait) {
            await transaction.rollback();
            return res.status(409).json({
                message: `Gagal menghapus. Wali kelas ini masih ditugaskan di ${kelasTerkait.nama_kelas}.`
            });
        }

        // JIKA TIDAK ADA kelas terkait, lanjutkan proses penghapusan
        await db.WaliKelas.destroy({
            where: { id: waliKelasId },
            transaction
        });

        await transaction.commit();
        res.status(204).send();

    } catch (error) {
        await transaction.rollback();
        console.error("SERVER ERROR - DELETE /api/wali-kelas:", error);
        res.status(500).json({ message: 'Terjadi kegagalan di server', error: error.message });
    }
};