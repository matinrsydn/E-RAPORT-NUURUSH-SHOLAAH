const db_mp = require('../models');
const MataPelajaran = db_mp.MataPelajaran;

// DIMODIFIKASI: Ambil data berdasarkan jenis (Ujian/Hafalan)
exports.getAllMapel = async (req, res) => {
    const { jenis } = req.query; // Ambil 'jenis' dari query parameter (?jenis=Ujian)
    let whereClause = {};
    if (jenis) {
        whereClause.jenis = jenis;
    }
    try {
        const mapel = await MataPelajaran.findAll({ where: whereClause });
        res.json(mapel);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data", error: error.message });
    }
};

// DIMODIFIKASI: Pastikan 'jenis' disertakan saat membuat data baru
exports.createMapel = async (req, res) => {
    try {
        // Pastikan frontend mengirimkan 'jenis' di dalam req.body
        const newMapel = await MataPelajaran.create(req.body);
        res.status(201).json(newMapel);
    } catch (error) {
        res.status(400).json({ message: "Gagal membuat data, pastikan semua field terisi.", error: error.message });
    }
};

// Fungsi update dan delete tidak perlu diubah secara signifikan
exports.updateMapel = async (req, res) => {
    await MataPelajaran.update(req.body, { where: { id: req.params.id } });
    res.json({ message: 'Update successful' });
};
exports.deleteMapel = async (req, res) => {
    await MataPelajaran.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Delete successful' });
};