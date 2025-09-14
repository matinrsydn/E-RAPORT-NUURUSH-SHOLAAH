const db = require('../models');

exports.getAll = async (req, res) => {
  try {
    const list = await db.Tingkatan.findAll({ order: [['urutan', 'ASC'], ['nama_tingkatan', 'ASC']] });
    res.json(list);
  } catch (err) {
    console.error('Error getAll Tingkatan:', err);
    res.status(500).json({ message: 'Gagal mengambil data tingkatan', error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { nama_tingkatan, urutan } = req.body;
    if (!nama_tingkatan) return res.status(400).json({ message: 'nama_tingkatan wajib diisi' });
    const newRow = await db.Tingkatan.create({ nama_tingkatan, urutan: typeof urutan === 'undefined' ? 0 : urutan });
    res.status(201).json(newRow);
  } catch (err) {
    console.error('Error create Tingkatan:', err);
    res.status(500).json({ message: 'Gagal membuat tingkatan', error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    console.log(`➡️ Incoming ${req.method} /api/tingkatans/${id} - update handler`);
    const payload = {};
    if (typeof req.body.nama_tingkatan !== 'undefined') payload.nama_tingkatan = req.body.nama_tingkatan;
    if (typeof req.body.urutan !== 'undefined') payload.urutan = req.body.urutan;
    const [updated] = await db.Tingkatan.update(payload, { where: { id } });
    if (!updated) return res.status(404).json({ message: 'Tingkatan tidak ditemukan' });
    const updatedRow = await db.Tingkatan.findByPk(id);
    res.json(updatedRow);
  } catch (err) {
    console.error('Error update Tingkatan:', err);
    res.status(500).json({ message: 'Gagal memperbarui tingkatan', error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await db.Tingkatan.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: 'Tingkatan tidak ditemukan' });
    res.status(204).send();
  } catch (err) {
    console.error('Error delete Tingkatan:', err);
    res.status(500).json({ message: 'Gagal menghapus tingkatan', error: err.message });
  }
};
