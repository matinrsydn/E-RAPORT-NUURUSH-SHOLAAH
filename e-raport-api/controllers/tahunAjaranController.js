const { TahunAjaran } = require('../models');

// Mengelola Tahun Ajaran (CRUD)
exports.getAll = async (req, res) => {
    try {
        const tahunAjarans = await TahunAjaran.findAll({ order: [['nama_ajaran', 'DESC']] });
        res.json(tahunAjarans);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        // Jika tahun ajaran baru di-set sebagai 'aktif', nonaktifkan yang lain
        if (req.body.status === 'aktif') {
            await TahunAjaran.update({ status: 'tidak-aktif' }, { where: { status: 'aktif' } });
        }
        const newTahunAjaran = await TahunAjaran.create(req.body);
        res.status(201).json(newTahunAjaran);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        // Jika tahun ajaran ini diaktifkan, nonaktifkan yang lain
        if (req.body.status === 'aktif') {
            await TahunAjaran.update({ status: 'tidak-aktif' }, { where: { status: 'aktif' } });
        }
        await TahunAjaran.update(req.body, { where: { id: req.params.id } });
        const updatedData = await TahunAjaran.findByPk(req.params.id);
        res.json(updatedData);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        await TahunAjaran.destroy({ where: { id: req.params.id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
