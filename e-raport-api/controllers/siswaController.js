// e-raport-api/controllers/siswaController.js

const { Siswa, WaliKelas, Kelas } = require('../models'); // Hapus KepalaPesantren dari sini

exports.getAllSiswa = async (req, res) => {
    try {
        const siswas = await Siswa.findAll({
            include: [
                // PERBAIKAN: Tambahkan alias yang benar
                { model: Kelas, as: 'kelas', attributes: ['nama_kelas'] },
                { model: WaliKelas, as: 'walikelas', attributes: ['nama'] }
                // Hapus include KepalaPesantren yang tidak valid
            ],
            order: [['nama', 'ASC']]
        });
        res.json(siswas);
    } catch (error) {
        // Tambahkan log error di server untuk mempermudah debugging
        console.error("SERVER ERROR - GET /api/siswa:", error);
        res.status(500).json({ message: "Gagal mengambil data siswa", error: error.message });
    }
};

exports.getSiswaById = async (req, res) => {
    try {
        const siswa = await Siswa.findByPk(req.params.id, {
            include: [
                // PERBAIKAN: Tambahkan alias juga di sini
                { model: Kelas, as: 'kelas', attributes: ['nama_kelas'] },
                { model: WaliKelas, as: 'walikelas', attributes: ['nama'] }
            ]
        });
        if (!siswa) return res.status(404).json({ message: "Siswa tidak ditemukan" });
        res.json(siswa);
    } catch (error) {
        console.error(`SERVER ERROR - GET /api/siswa/${req.params.id}:`, error);
        res.status(500).json({ message: "Gagal mengambil data siswa", error: error.message });
    }
};

// Fungsi create, update, dan delete tidak perlu diubah
exports.createSiswa = async (req, res) => {
    try {
        const newSiswa = await Siswa.create(req.body);
        res.status(201).json(newSiswa);
    } catch (error) {
        res.status(400).json({ message: "Gagal membuat siswa", error: error.message });
    }
};

exports.updateSiswa = async (req, res) => {
    try {
        const [updated] = await Siswa.update(req.body, { where: { id: req.params.id } });
        if (updated) {
            const updatedSiswa = await Siswa.findByPk(req.params.id);
            return res.status(200).json(updatedSiswa);
        }
        throw new Error('Siswa tidak ditemukan');
    } catch (error) {
        res.status(404).json({ message: "Siswa tidak ditemukan", error: error.message });
    }
};

exports.deleteSiswa = async (req, res) => {
    try {
        const deleted = await Siswa.destroy({ where: { id: req.params.id } });
        if (deleted) return res.status(204).send();
        throw new Error('Siswa tidak ditemukan');
    } catch (error) {
        res.status(404).json({ message: "Siswa tidak ditemukan", error: error.message });
    }
};