const { Siswa, WaliKelas, KepalaPesantren, Kelas } = require('../models'); // Pastikan 'Kelas' di-import

// Mendapatkan semua siswa beserta relasinya
exports.getAllSiswa = async (req, res) => {
    try {
        const siswas = await Siswa.findAll({
            include: [
                { model: Kelas, attributes: ['nama_kelas'] }, // Sertakan model Kelas
                { model: WaliKelas, attributes: ['nama'] },   // Sertakan model WaliKelas
                { model: KepalaPesantren, attributes: ['nama'] }
            ],
            order: [['nama', 'ASC']]
        });
        res.json(siswas);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data siswa", error: error.message });
    }
};

// Mendapatkan siswa tunggal berdasarkan ID
exports.getSiswaById = async (req, res) => {
    try {
        const siswa = await Siswa.findByPk(req.params.id, {
            include: [
                { model: Kelas, attributes: ['nama_kelas'] },
                { model: WaliKelas, attributes: ['nama'] },
                { model: KepalaPesantren, attributes: ['nama'] }
            ]
        });
        if (!siswa) {
            return res.status(404).json({ message: "Siswa tidak ditemukan" });
        }
        res.json(siswa);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data siswa", error: error.message });
    }
};

// Membuat siswa baru
exports.createSiswa = async (req, res) => {
    try {
        const newSiswa = await Siswa.create(req.body);
        res.status(201).json(newSiswa);
    } catch (error) {
        res.status(400).json({ message: "Gagal membuat siswa", error: error.message });
    }
};

// Memperbarui data siswa
exports.updateSiswa = async (req, res) => {
    try {
        const [updated] = await Siswa.update(req.body, {
            where: { id: req.params.id }
        });
        if (updated) {
            const updatedSiswa = await Siswa.findByPk(req.params.id);
            res.status(200).json(updatedSiswa);
        } else {
            res.status(404).json({ message: "Siswa tidak ditemukan" });
        }
    } catch (error) {
        res.status(400).json({ message: "Gagal memperbarui siswa", error: error.message });
    }
};

// Menghapus siswa
exports.deleteSiswa = async (req, res) => {
    try {
        const deleted = await Siswa.destroy({
            where: { id: req.params.id }
        });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ message: "Siswa tidak ditemukan" });
        }
    } catch (error) {
        res.status(500).json({ message: "Gagal menghapus siswa", error: error.message });
    }
};
