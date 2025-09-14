const db = require('../models');

// GET /api/kelas-periode?kelas_id=...&periode_ajaran_id=...
exports.getByKelasAndPeriode = async (req, res) => {
  try {
    const { kelas_id, periode_ajaran_id } = req.query;
    if (!kelas_id || !periode_ajaran_id) return res.status(400).json({ message: 'kelas_id dan periode_ajaran_id diperlukan' });

    const kp = await db.KelasPeriode.findOne({ where: { kelas_id, periode_ajaran_id } });
    if (!kp) return res.status(404).json({ message: 'KelasPeriode tidak ditemukan' });
    res.json(kp);
  } catch (err) {
    console.error('Error getByKelasAndPeriode:', err);
    res.status(500).json({ message: 'Gagal mengambil kelas_periode', error: err.message });
  }
};

// Optional: list all kelas_periodes for a periode or a kelas
exports.list = async (req, res) => {
  try {
    const where = {};
    if (req.query.periode_ajaran_id) where.periode_ajaran_id = req.query.periode_ajaran_id;
    if (req.query.kelas_id) where.kelas_id = req.query.kelas_id;
    const rows = await db.KelasPeriode.findAll({ where, include: [{ model: db.Kelas, as: 'kelas' }, { model: db.PeriodeAjaran, as: 'periode' }] });
    res.json(rows);
  } catch (err) {
    console.error('Error list KelasPeriode:', err);
    res.status(500).json({ message: 'Gagal mengambil daftar kelas_periode', error: err.message });
  }
};
