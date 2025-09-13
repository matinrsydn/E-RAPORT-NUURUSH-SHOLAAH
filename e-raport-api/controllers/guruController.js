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
        if (data.tanggal_lahir === '' || data.tanggal_lahir === 'Invalid date') {
            data.tanggal_lahir = null;
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
    const data = req.body; // Data teks dari form

    try {
        const guru = await db.Guru.findByPk(guruId);
        if (!guru) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: "Guru tidak ditemukan." });
        }

        // Logika untuk menangani file tanda tangan baru
        if (req.file) {
            // Hapus file tanda tangan lama jika ada
            if (guru.tanda_tangan) {
                const oldSignaturePath = path.join(SIGNATURES_DIR, guru.tanda_tangan);
                if (fs.existsSync(oldSignaturePath)) {
                    fs.unlinkSync(oldSignaturePath);
                }
            }
            // Simpan nama file yang baru diunggah ke database
            data.tanda_tangan = req.file.filename;
        }

            // Normalize tanggal_lahir: treat empty or invalid dates as null
            if ('tanggal_lahir' in data && (data.tanggal_lahir === '' || data.tanggal_lahir === 'Invalid date')) {
                data.tanggal_lahir = null;
            }

            // Normalize enum fields: do not attempt to write empty string into ENUM columns
            // MySQL will reject/trim empty string for ENUMs; convert empty string to null instead.
            if ('jenis_kelamin' in data) {
                if (data.jenis_kelamin === '') {
                    data.jenis_kelamin = null;
                }
            }

        await guru.update(data);
        
        // Kirim kembali data guru yang sudah ter-update
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
        const kelasTerkait = await db.Kelas.findOne({ where: { wali_kelas_id: req.params.id } });
        if (kelasTerkait) {
            return res.status(409).json({ message: `Gagal menghapus. Guru ini masih menjadi wali kelas untuk ${kelasTerkait.nama_kelas}.` });
        }
        await db.Guru.destroy({ where: { id: req.params.id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus guru.', error: error.message });
    }
};

