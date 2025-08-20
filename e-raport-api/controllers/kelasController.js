// e-raport-api/controllers/kelasController.js

const db = require('../models');

// Mendapatkan semua data kelas
exports.getAllKelas = async (req, res) => {
  try {
    const kelas = await db.Kelas.findAll({
      include: [
        { model: db.WaliKelas, as: 'walikelas', attributes: ['nama'], required: false },
        { model: db.Siswa, as: 'siswa', attributes: ['id', 'nama'], required: false }
      ],
      order: [['nama_kelas', 'ASC']]
    });
    // DEBUG: Kirim data ke browser
    console.log("DATA DIKIRIM KE FRONTEND:", JSON.stringify(kelas, null, 2));
    res.json(kelas);
  } catch (error) {
    console.error('SERVER ERROR - GET /api/kelas:', error);
    res.status(500).json({ message: 'Gagal mengambil data kelas.', error: error.message });
  }
};

// ... (fungsi createKelas)
exports.createKelas = async (req, res) => {
    try {
        const newKelas = await db.Kelas.create(req.body);
        res.status(201).json(newKelas);
    } catch (error) {
        res.status(500).json({ message: 'Error saat membuat kelas', error: error.message });
    }
};


// Memperbarui data kelas
exports.updateKelas = async (req, res) => {
  try {
    // DEBUG: Lihat data yang diterima dari browser saat Anda menekan "Simpan"
    console.log("===================================");
    console.log("DATA DITERIMA DARI FRONTEND (req.body):", req.body);
    console.log("===================================");

    const { nama_kelas, wali_kelas_id } = req.body;
    const dataToUpdate = {
      nama_kelas,
      wali_kelas_id,
    };

    const [updated] = await db.Kelas.update(dataToUpdate, {
      where: { id: req.params.id }
    });

    if (updated) {
      const updatedKelas = await db.Kelas.findByPk(req.params.id);
      return res.status(200).json(updatedKelas);
    }
    return res.status(404).json({ message: "Kelas tidak ditemukan" });
  } catch (error) {
    console.error(`SERVER ERROR - PUT /api/kelas/${req.params.id}:`, error);
    res.status(500).json({ message: "Gagal memperbarui kelas", error: error.message });
  }
};

// ... (fungsi deleteKelas)
exports.deleteKelas = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await db.Kelas.destroy({ where: { id } });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'Kelas tidak ditemukan' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error saat menghapus kelas', error: error.message });
    }
};