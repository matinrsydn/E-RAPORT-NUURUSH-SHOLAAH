const db = require('../models');

// Mengambil semua data tahun ajaran
exports.getAll = async (req, res) => {
  try {
    const tahunAjarans = await db.TahunAjaran.findAll({
      order: [['nama_ajaran', 'DESC'], ['semester', 'ASC']]
    });
    res.json(tahunAjarans);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil data tahun ajaran.", error: error.message });
  }
};

// Membuat tahun ajaran baru
exports.create = async (req, res) => {
    try {
        // Langsung teruskan semua data dari body request
        const newTahunAjaran = await db.TahunAjaran.create(req.body);
        res.status(201).json(newTahunAjaran);
    } catch (error) {
        // Tangani error jika ada, misalnya karena duplikasi
        res.status(400).json({ message: 'Gagal membuat data. Pastikan kombinasi Tahun Ajaran dan Semester unik.', error: error.message });
    }
};

// Memperbarui tahun ajaran
exports.update = async (req, res) => {
    try {
        await db.TahunAjaran.update(req.body, { where: { id: req.params.id } });
        const updatedData = await db.TahunAjaran.findByPk(req.params.id);
        res.status(200).json(updatedData);
    } catch (error) {
        res.status(500).json({ message: 'Gagal memperbarui data.', error: error.message });
    }
};

// Menghapus tahun ajaran
exports.delete = async (req, res) => {
    const tahunAjaranId = req.params.id;
    try {
        const kurikulumTerkait = await db.Kurikulum.findOne({ where: { tahun_ajaran_id: tahunAjaranId } });
        if (kurikulumTerkait) {
            return res.status(409).json({
                message: 'Gagal menghapus. Tahun Ajaran ini masih digunakan dalam data Kurikulum.'
            });
        }
        await db.TahunAjaran.destroy({ where: { id: tahunAjaranId } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus data.', error: error.message });
    }
};