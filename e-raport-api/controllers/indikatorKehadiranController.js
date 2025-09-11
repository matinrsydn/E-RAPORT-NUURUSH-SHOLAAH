// File: controllers/indikatorKehadiranController.js
const { IndikatorKehadiran } = require('../models');

// Mendapatkan semua indikator kehadiran
exports.getAll = async (req, res) => {
  try {
    const indikator = await IndikatorKehadiran.findAll({
      order: [['nama_kegiatan', 'ASC']]
    });
    res.json(indikator);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error saat mengambil data indikator kehadiran', 
      error: error.message 
    });
  }
};

// Membuat indikator kehadiran baru
exports.create = async (req, res) => {
  try {
    const { nama_kegiatan } = req.body;
    
    if (!nama_kegiatan) {
      return res.status(400).json({ message: 'Nama kegiatan wajib diisi' });
    }

    const newIndikator = await IndikatorKehadiran.create({ nama_kegiatan });
    res.status(201).json(newIndikator);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error saat membuat indikator kehadiran', 
      error: error.message 
    });
  }
};

// --- FUNGSI UPDATE DIAKTIFKAN KEMBALI ---
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_kegiatan } = req.body;

    if (!nama_kegiatan) {
      return res.status(400).json({ message: 'Nama kegiatan wajib diisi' });
    }

    const [updated] = await IndikatorKehadiran.update(
      { nama_kegiatan }, 
      { where: { id } }
    );
    
    if (updated) {
      const updatedIndikator = await IndikatorKehadiran.findByPk(id);
      res.json(updatedIndikator);
    } else {
      res.status(404).json({ message: 'Indikator kehadiran tidak ditemukan' });
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Error saat memperbarui indikator kehadiran', 
      error: error.message 
    });
  }
};

// --- FUNGSI DELETE DIAKTIFKAN KEMBALI ---
// PERHATIAN: Hapus permanen hanya jika yakin tidak ada data kehadiran yang masih terkait.
// Jika ragu, lebih baik gunakan sistem aktif/nonaktif.
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await IndikatorKehadiran.destroy({ where: { id } });
    
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Indikator kehadiran tidak ditemukan' });
    }
  } catch (error) {
    // Tangani error jika ada foreign key constraint (data masih dipakai)
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({ message: 'Gagal menghapus: Indikator ini masih digunakan pada data kehadiran siswa.' });
    }
    res.status(500).json({ 
      message: 'Error saat menghapus indikator kehadiran', 
      error: error.message 
    });
  }
};


// --- FUNGSI AKTIFASI/NONAKTIFASI (TETAP ADA) ---

exports.deactivate = async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await IndikatorKehadiran.update(
      { is_active: false },
      { where: { id } }
    );
    if (updated) {
      const updatedIndikator = await IndikatorKehadiran.findByPk(id);
      res.json(updatedIndikator);
    } else {
      res.status(404).json({ message: 'Indikator tidak ditemukan' });
    }
  } catch (error) {
    res.status(500).json({
      message: 'Error saat menonaktifkan indikator',
      error: error.message
    });
  }
};

exports.activate = async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await IndikatorKehadiran.update(
      { is_active: true },
      { where: { id } }
    );
    if (updated) {
      const updatedIndikator = await IndikatorKehadiran.findByPk(id);
      res.json(updatedIndikator);
    } else {
      res.status(404).json({ message: 'Indikator tidak ditemukan' });
    }
  } catch (error) {
    res.status(500).json({
      message: 'Error saat mengaktifkan indikator',
      error: error.message
    });
  }
};