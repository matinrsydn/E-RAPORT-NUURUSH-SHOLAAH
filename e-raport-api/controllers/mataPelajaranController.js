const db = require('../models');

// Mengambil semua data master mata pelajaran
exports.getAllMapel = async (req, res) => {
    try {
        // Query sederhana tanpa menyebutkan nama kolom secara spesifik
        const mapel = await db.MataPelajaran.findAll({ order: [['nama_mapel', 'ASC']] });
        res.json(mapel);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data mata pelajaran.", error: error.message });
    }
};

// Membuat mata pelajaran baru
exports.createMapel = async (req, res) => {
    try {
        const newMapel = await db.MataPelajaran.create(req.body);
        res.status(201).json(newMapel);
    } catch (error) {
        res.status(400).json({ message: "Gagal membuat mata pelajaran.", error: error.message });
    }
};

// Memperbarui mata pelajaran
exports.updateMapel = async (req, res) => {
    try {
        const [updated] = await db.MataPelajaran.update(req.body, { where: { id: req.params.id } });
        if (updated) {
            const updatedData = await db.MataPelajaran.findByPk(req.params.id);
            return res.status(200).json(updatedData);
        }
        throw new Error('Mata pelajaran tidak ditemukan');
    } catch (error) {
        res.status(404).json({ message: 'Mata pelajaran tidak ditemukan.', error: error.message });
    }
};

// Menghapus mata pelajaran
exports.deleteMapel = async (req, res) => {
    try {
        // PERHATIAN: Menghapus master mapel akan menghapus entri kurikulum terkait
        // karena aturan ON DELETE CASCADE di database.
        const deleted = await db.MataPelajaran.destroy({ where: { id: req.params.id } });
        if (deleted) return res.status(204).send();
        throw new Error('Mata pelajaran tidak ditemukan');
    } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus mata pelajaran.', error: error.message });
    }
};