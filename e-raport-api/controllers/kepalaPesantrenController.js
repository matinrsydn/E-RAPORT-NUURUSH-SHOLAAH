// file: controllers/kepalaPesantrenController.js
const db = require('../models');
const fs = require('fs');
const path = require('path');

const KepalaPesantren = db.KepalaPesantren;
const SIGNATURES_DIR = path.join(__dirname, '../uploads/signatures');

exports.getAll = async (req, res) => res.json(await KepalaPesantren.findAll());

exports.getById = async (req, res) => {
    try {
        const kp = await KepalaPesantren.findByPk(req.params.id);
        if (!kp) return res.status(404).json({ message: 'Not found' });
        res.json(kp);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil data.', error: error.message });
    }
};

exports.create = async (req, res) => res.status(201).json(await KepalaPesantren.create(req.body));

exports.delete = async (req, res) => {
    try {
        const kp = await KepalaPesantren.findByPk(req.params.id);
        if (kp && kp.tanda_tangan) {
            const signaturePath = path.join(SIGNATURES_DIR, kp.tanda_tangan);
            if (fs.existsSync(signaturePath)) {
                fs.unlinkSync(signaturePath);
            }
        }
        await KepalaPesantren.destroy({ where: { id: req.params.id } });
        res.json({ message: 'Delete successful' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus data.', error: error.message });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const data = req.body;

    try {
        const kp = await KepalaPesantren.findByPk(id);
        if (!kp) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: "Kepala Pesantren tidak ditemukan." });
        }

        if (req.file) {
            if (kp.tanda_tangan) {
                const oldPath = path.join(SIGNATURES_DIR, kp.tanda_tangan);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            data.tanda_tangan = req.file.filename;
        }

        await kp.update(data);
        res.json({ message: 'Update successful', kepalaPesantren: kp });

    } catch (error) {
        res.status(500).json({ message: 'Gagal memperbarui data.', error: error.message });
    }
};