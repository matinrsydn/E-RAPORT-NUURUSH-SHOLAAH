// e-raport-api/controllers/indikatorKehadiranController.js
const { IndikatorKehadiran } = require('../models');

// Mengambil semua indikator
exports.getAll = async (req, res) => {
  try {
    const data = await IndikatorKehadiran.findAll({ order: [['nama_kegiatan', 'ASC']] });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data.', error: error.message });
  }
};

// Membuat indikator baru
exports.create = async (req, res) => {
  try {
    const newData = await IndikatorKehadiran.create(req.body);
    res.status(201).json(newData);
  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat data.', error: error.message });
  }
};

// Memperbarui indikator
exports.update = async (req, res) => {
  try {
    const [updated] = await IndikatorKehadiran.update(req.body, { where: { id: req.params.id } });
    if (updated) {
      const updatedData = await IndikatorKehadiran.findByPk(req.params.id);
      res.json(updatedData);
    } else {
      res.status(404).json({ message: 'Data tidak ditemukan.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui data.', error: error.message });
  }
};

// Menghapus indikator
exports.delete = async (req, res) => {
  try {
    const deleted = await IndikatorKehadiran.destroy({ where: { id: req.params.id } });
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Data tidak ditemukan.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus data.', error: error.message });
  }
};