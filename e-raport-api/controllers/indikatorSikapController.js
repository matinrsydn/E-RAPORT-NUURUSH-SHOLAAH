const { IndikatorSikap } = require('../models');

// Mendapatkan semua indikator sikap
exports.getAllIndikator = async (req, res) => {
  try {
    const indikator = await IndikatorSikap.findAll();
    res.json(indikator);
  } catch (error) {
    res.status(500).json({ message: 'Error saat mengambil data indikator', error: error.message });
  }
};

// Membuat indikator baru
exports.createIndikator = async (req, res) => {
  try {
    const newIndikator = await IndikatorSikap.create(req.body);
    res.status(201).json(newIndikator);
  } catch (error) {
    res.status(500).json({ message: 'Error saat membuat indikator', error: error.message });
  }
};

// Memperbarui indikator
exports.updateIndikator = async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await IndikatorSikap.update(req.body, { where: { id } });
    if (updated) {
      const updatedIndikator = await IndikatorSikap.findByPk(id);
      res.json(updatedIndikator);
    } else {
      res.status(404).json({ message: 'Indikator tidak ditemukan' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error saat memperbarui indikator', error: error.message });
  }
};

// Menghapus indikator
exports.deleteIndikator = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await IndikatorSikap.destroy({ where: { id } });
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Indikator tidak ditemukan' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error saat menghapus indikator', error: error.message });
  }
};
