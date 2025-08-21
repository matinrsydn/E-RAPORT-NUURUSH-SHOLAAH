// e-raport-api/controllers/siswaController.js
const db = require('../models');

// Mengambil SEMUA siswa dengan data yang BENAR
exports.getAllSiswa = async (req, res) => {
    try {
        const siswas = await db.Siswa.findAll({
            include: [
                {
                    model: db.Kelas,
                    as: 'kelas', // Ambil data Kelas
                    include: [{
                        model: db.WaliKelas,
                        as: 'walikelas' // Ambil data WaliKelas DARI DALAM Kelas
                    }]
                }
            ],
            order: [['nama', 'ASC']]
        });
        res.json(siswas);
    } catch (error) {
        console.error("SERVER ERROR - GET /api/siswa:", error);
        res.status(500).json({ message: "Gagal mengambil data siswa", error: error.message });
    }
};

// Mengambil SATU siswa dengan data yang BENAR (untuk cetak/download)
exports.getSiswaById = async (req, res) => {
    try {
        const siswa = await db.Siswa.findByPk(req.params.id, {
            include: [
                {
                    model: db.Kelas,
                    as: 'kelas',
                    // WAJIB: Memasukkan data WaliKelas ke dalam Kelas
                    include: [{
                        model: db.WaliKelas,
                        as: 'walikelas'
                    }]
                },
            ],
        });
        if (!siswa) return res.status(404).json({ message: "Siswa tidak ditemukan" });
        res.json(siswa);
    } catch (error) {
        console.error(`SERVER ERROR - GET /api/siswa/${req.params.id}:`, error);
        res.status(500).json({ message: "Gagal mengambil data siswa", error: error.message });
    }
};


// --- FUNGSI CREATE, UPDATE, DELETE (TIDAK PERLU DIUBAH) ---

exports.createSiswa = async (req, res) => {
    try {
        const newSiswa = await db.Siswa.create(req.body);
        res.status(201).json(newSiswa);
    } catch (error) {
        res.status(400).json({ message: "Gagal membuat siswa", error: error.message });
    }
};

exports.updateSiswa = async (req, res) => {
    try {
        const [updated] = await db.Siswa.update(req.body, { where: { id: req.params.id } });
        if (updated) {
            const updatedSiswa = await db.Siswa.findByPk(req.params.id);
            return res.status(200).json(updatedSiswa);
        }
        throw new Error('Siswa tidak ditemukan');
    } catch (error) {
        res.status(404).json({ message: "Siswa tidak ditemukan", error: error.message });
    }
};

exports.deleteSiswa = async (req, res) => {
    try {
        const deleted = await db.Siswa.destroy({ where: { id: req.params.id } });
        if (deleted) return res.status(204).send();
        throw new Error('Siswa tidak ditemukan');
    } catch (error) {
        res.status(404).json({ message: "Siswa tidak ditemukan", error: error.message });
    }
};