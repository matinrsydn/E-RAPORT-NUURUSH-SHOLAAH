const db = require('../models');

// Mengambil semua kitab
exports.getAllKitab = async (req, res) => {
    try {
        const kitabs = await db.Kitab.findAll({ order: [['nama_kitab', 'ASC']] });
        res.json(kitabs);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data kitab.", error: error.message });
    }
};

// Membuat kitab baru
exports.createKitab = async (req, res) => {
    try {
        const newKitab = await db.Kitab.create(req.body);
        res.status(201).json(newKitab);
    } catch (error) {
        res.status(400).json({ message: "Gagal membuat data kitab.", error: error.message });
    }
};

// Memperbarui kitab
exports.updateKitab = async (req, res) => {
    try {
        const [updated] = await db.Kitab.update(req.body, { where: { id: req.params.id } });
        if (updated) {
            const updatedData = await db.Kitab.findByPk(req.params.id);
            return res.status(200).json(updatedData);
        }
        throw new Error('Kitab tidak ditemukan');
    } catch (error) {
        res.status(404).json({ message: 'Kitab tidak ditemukan', error: error.message });
    }
};

// Menghapus kitab
exports.deleteKitab = async (req, res) => {
    try {
        const deleted = await db.Kitab.destroy({ where: { id: req.params.id } });
        if (deleted) return res.status(204).send();
        throw new Error('Kitab tidak ditemukan');
    } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus kitab', error: error.message });
    }
};
