const db = require('../models');
const Siswa = db.Siswa;

// GET all siswas
exports.getAllSiswa = async (req, res) => {
    try {
        const siswas = await Siswa.findAll({
            include: ['wali_kelas', 'kepala_sekolah'] // Hapus 'orang_tua' dari sini
        });
        res.json(siswas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET siswa by ID
exports.getSiswaById = async (req, res) => {
    try {
        const siswa = await Siswa.findByPk(req.params.id, {
            include: ['wali_kelas', 'kepala_sekolah'] // Hapus 'orang_tua' dari sini
        });
        if (siswa) {
            res.json(siswa);
        } else {
            res.status(404).json({ message: 'Siswa not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// CREATE a new siswa
exports.createSiswa = async (req, res) => {
    try {
        // Semua data sekarang ada di req.body
        const siswa = await Siswa.create(req.body);
        res.status(201).json(siswa);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// UPDATE a siswa
exports.updateSiswa = async (req, res) => {
    try {
        const [updated] = await Siswa.update(req.body, {
            where: { id: req.params.id }
        });
        if (updated) {
            const updatedSiswa = await Siswa.findByPk(req.params.id);
            res.status(200).json(updatedSiswa);
        } else {
            res.status(404).json({ message: 'Siswa not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// DELETE a siswa
exports.deleteSiswa = async (req, res) => {
    try {
        const deleted = await Siswa.destroy({
            where: { id: req.params.id }
        });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'Siswa not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
