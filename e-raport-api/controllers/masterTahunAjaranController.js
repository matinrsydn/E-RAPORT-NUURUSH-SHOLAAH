const db = require('../models');

exports.getAll = async (req, res) => {
  try {
    const masters = await db.MasterTahunAjaran.findAll({ order: [['nama_ajaran','DESC']] });
    res.json(masters);
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil master tahun ajaran', error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    // Create master and automatically create two PeriodeAjaran (semester 1 & 2)
    const result = await db.sequelize.transaction(async (t) => {
      const m = await db.MasterTahunAjaran.create(req.body, { transaction: t });
      // create two periodes for this master
      const periodes = [
        { nama_ajaran: m.nama_ajaran, semester: '1', master_tahun_ajaran_id: m.id, status: 'nonaktif' },
        { nama_ajaran: m.nama_ajaran, semester: '2', master_tahun_ajaran_id: m.id, status: 'nonaktif' }
      ];
      await db.PeriodeAjaran.bulkCreate(periodes, { transaction: t });
      return m;
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ message: 'Gagal membuat master tahun ajaran', error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    await db.MasterTahunAjaran.update(req.body, { where: { id: req.params.id } });
    const updated = await db.MasterTahunAjaran.findByPk(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Gagal memperbarui master tahun ajaran', error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    // Delete related PeriodeAjaran first to keep DB consistent (migration used SET NULL)
    await db.sequelize.transaction(async (t) => {
      await db.PeriodeAjaran.destroy({ where: { master_tahun_ajaran_id: req.params.id }, transaction: t });
      await db.MasterTahunAjaran.destroy({ where: { id: req.params.id }, transaction: t });
    });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: 'Gagal menghapus master tahun ajaran', error: err.message });
  }
};
