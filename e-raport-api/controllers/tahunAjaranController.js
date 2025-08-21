// e-raport-api/controllers/tahunAjaranController.js

const db = require('../models');

exports.getAll = async (req, res) => {
    try {
        const tahunAjaran = await db.TahunAjaran.findAll({
            order: [['nama_ajaran', 'DESC']]
        });
        
        // Format data untuk frontend dengan menambah semester 1 dan 2
        const formattedData = [];
        tahunAjaran.forEach(ta => {
            formattedData.push({
                id: `${ta.id}-1`,
                nama_ajaran: ta.nama_ajaran,
                semester: '1',
                status: ta.status,
                display: `${ta.nama_ajaran} - Semester 1`
            });
            formattedData.push({
                id: `${ta.id}-2`,
                nama_ajaran: ta.nama_ajaran,
                semester: '2',
                status: ta.status,
                display: `${ta.nama_ajaran} - Semester 2`
            });
        });
        
        console.log("FORMATTED TAHUN AJARAN DATA:", formattedData);
        res.json(formattedData);
    } catch (error) {
        console.error('Error get tahun ajaran:', error);
        res.status(500).json({ message: 'Error mengambil tahun ajaran', error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const newTahunAjaran = await db.TahunAjaran.create(req.body);
        res.status(201).json(newTahunAjaran);
    } catch (error) {
        console.error('Error create tahun ajaran:', error);
        res.status(500).json({ message: 'Error membuat tahun ajaran', error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await db.TahunAjaran.update(req.body, {
            where: { id }
        });
        if (updated) {
            const updatedTahunAjaran = await db.TahunAjaran.findByPk(id);
            res.json(updatedTahunAjaran);
        } else {
            res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
        }
    } catch (error) {
        console.error('Error update tahun ajaran:', error);
        res.status(500).json({ message: 'Error update tahun ajaran', error: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await db.TahunAjaran.destroy({ where: { id } });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
        }
    } catch (error) {
        console.error('Error delete tahun ajaran:', error);
        res.status(500).json({ message: 'Error hapus tahun ajaran', error: error.message });
    }
};