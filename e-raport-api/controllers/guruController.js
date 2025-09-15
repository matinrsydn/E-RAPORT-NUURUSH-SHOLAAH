const db = require('../models');
const fs = require('fs');
const path = require('path');

const SIGNATURES_DIR = path.join(__dirname, '../uploads/signatures');

// Pastikan direktori final ada
if (!fs.existsSync(SIGNATURES_DIR)) {
    fs.mkdirSync(SIGNATURES_DIR, { recursive: true });
}

// Mengambil semua data guru beserta kelas yang diasuh
exports.getAllGuru = async (req, res) => {
    try {
        const gurus = await db.Guru.findAll({
            include: [{ 
                model: db.Kelas, 
                as: 'kelas_asuhan', 
                attributes: ['id', 'nama_kelas'] 
            }],
            order: [['nama', 'ASC']]
        });
        res.json(gurus);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data guru.", error: error.message });
    }
};

// Mengambil detail satu guru
exports.getGuruById = async (req, res) => {
    try {
        const guru = await db.Guru.findByPk(req.params.id, {
            include: [{ model: db.Kelas, as: 'kelas_asuhan' }]
        });
        if (!guru) return res.status(404).json({ message: "Guru tidak ditemukan." });
        res.json(guru);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data guru.", error: error.message });
    }
};

// Membuat data guru baru
exports.createGuru = async (req, res) => {
    try {
        const data = req.body;

        // PERBAIKAN: Tambahkan pengecekan data kosong
        if (!data || Object.keys(data).length === 0) {
            return res.status(400).json({ message: "Data tidak boleh kosong." });
        }

        // PERBAIKAN: Normalisasi data agar sesuai dengan model
        // 1. Normalisasi tanggal_lahir
        if ('tanggal_lahir' in data && (data.tanggal_lahir === '' || data.tanggal_lahir === 'Invalid date')) {
            data.tanggal_lahir = null;
        }
        // 2. Normalisasi untuk ENUM jenis_kelamin
        if ('jenis_kelamin' in data && data.jenis_kelamin === '') {
            data.jenis_kelamin = null;
        }
        // 3. Normalisasi untuk ENUM status (beri nilai default jika kosong)
        if (!data.status || data.status === '') {
            data.status = 'aktif';
        }

        const newGuru = await db.Guru.create(data);
        res.status(201).json(newGuru);
    } catch (error) {
        res.status(400).json({ message: "Gagal membuat data guru.", error: error.message });
    }
};

// Memperbarui data guru
exports.updateGuru = async (req, res) => {
    const guruId = req.params.id;
    const data = req.body;

    try {
        const guru = await db.Guru.findByPk(guruId);
        if (!guru) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: "Guru tidak ditemukan." });
        }

        // Logika untuk menangani file tanda tangan baru
        if (req.file) {
            if (guru.tanda_tangan) {
                const oldSignaturePath = path.join(SIGNATURES_DIR, guru.tanda_tangan);
                if (fs.existsSync(oldSignaturePath)) {
                    fs.unlinkSync(oldSignaturePath);
                }
            }
            data.tanda_tangan = req.file.filename;
        }

        // Normalisasi data agar sesuai model
        if ('tanggal_lahir' in data && (data.tanggal_lahir === '' || data.tanggal_lahir === 'Invalid date')) {
            data.tanggal_lahir = null;
        }
        if ('jenis_kelamin' in data && data.jenis_kelamin === '') {
            data.jenis_kelamin = null;
        }
        if ('status' in data && data.status === '') {
            data.status = null;
        }

        await guru.update(data);
        
        const updatedGuru = await db.Guru.findByPk(guruId, {
            include: [{ model: db.Kelas, as: 'kelas_asuhan' }]
        });

        return res.status(200).json({ message: 'Data guru berhasil diperbarui.', guru: updatedGuru });

    } catch (error) {
        console.error("SERVER ERROR - PUT /api/guru:", error);
        res.status(500).json({ message: 'Gagal memperbarui data guru.', error: error.message });
    }
};

// Menghapus data guru
exports.deleteGuru = async (req, res) => {
    try {
        const guru = await db.Guru.findByPk(req.params.id);
        if (!guru) {
            return res.status(404).json({ message: "Guru tidak ditemukan." });
        }

        // Cek keterkaitan dengan kelas
        const kelasTerkait = await db.Kelas.findOne({ where: { wali_kelas_id: req.params.id } });
        if (kelasTerkait) {
            return res.status(409).json({ message: `Gagal menghapus. Guru ini masih menjadi wali kelas untuk ${kelasTerkait.nama_kelas}.` });
        }
        
        // Hapus file tanda tangan jika ada
        if (guru.tanda_tangan) {
            const signaturePath = path.join(SIGNATURES_DIR, guru.tanda_tangan);
            if (fs.existsSync(signaturePath)) {
                fs.unlinkSync(signaturePath);
            }
        }
        
        await guru.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus guru.', error: error.message });
    }
};