// e-raport-api/controllers/kamarController.js
const db = require('../models');

// GET all
exports.getAllKamar = async (req, res) => {
    try {
        const kamars = await db.Kamar.findAll({ include: [ 'siswa' ] });
        res.json(kamars);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data kamar", error: error.message });
    }
};

// CREATE
exports.createKamar = async (req, res) => {
    try {
        const payload = { ...req.body };
        const newKamar = await db.Kamar.create(payload);
        res.status(201).json(newKamar);
    } catch (error) {
        res.status(400).json({ message: "Gagal membuat kamar", error: error.message });
    }
};

// UPDATE
exports.updateKamar = async (req, res) => {
    try {
        const payload = { ...req.body };
        await db.Kamar.update(payload, { where: { id: req.params.id } });
        res.status(200).json({ message: "Kamar berhasil diperbarui." });
    } catch (error) {
        res.status(400).json({ message: "Gagal memperbarui kamar", error: error.message });
    }
};

// DELETE
exports.deleteKamar = async (req, res) => {
    try {
        await db.Kamar.destroy({ where: { id: req.params.id } });
        res.status(204).send();
    } catch (error) {
        res.status(404).json({ message: "Kamar tidak ditemukan", error: error.message });
    }
};