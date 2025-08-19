const { Kelas, WaliKelas, Siswa } = require('../models');

// Mendapatkan semua data kelas
exports.getAllKelas = async (req, res) => {
  try {
    const kelas = await Kelas.findAll({
      include: [
        { model: WaliKelas, attributes: ['nama'] }, // Sertakan nama wali kelas
        { model: Siswa, attributes: ['id', 'nama'] } // Sertakan data siswa di kelas tsb
      ]
    });
    res.json(kelas);
  } catch (error) {
    res.status(500).json({ message: 'Error saat mengambil data kelas', error: error.message });
  }
};

// Membuat kelas baru
exports.createKelas = async (req, res) => {
  try {
    const newKelas = await Kelas.create(req.body);
    res.status(201).json(newKelas);
  } catch (error) {
    res.status(500).json({ message: 'Error saat membuat kelas', error: error.message });
  }
};

// Memperbarui data kelas
exports.updateKelas = async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Kelas.update(req.body, { where: { id } });
    if (updated) {
      const updatedKelas = await Kelas.findByPk(id);
      res.json(updatedKelas);
    } else {
      res.status(404).json({ message: 'Kelas tidak ditemukan' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error saat memperbarui kelas', error: error.message });
  }
};

// Menghapus kelas
exports.deleteKelas = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Kelas.destroy({ where: { id } });
    if (deleted) {
      res.status(204).send(); // No content
    } else {
      res.status(404).json({ message: 'Kelas tidak ditemukan' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error saat menghapus kelas', error: error.message });
  }
};