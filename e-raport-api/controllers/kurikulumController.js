const db = require('../models');

// GET /api/kurikulum?tingkatan_id=1
// New behavior: only require tingkatan_id since kurikulum is tied to tingkatan, not tahun ajaran
exports.getKurikulum = async (req, res) => {
  try {
    const { tingkatan_id } = req.query;

    if (!tingkatan_id) return res.status(400).json({ message: 'Parameter tingkatan_id diperlukan.' });

    const rows = await db.Kurikulum.findAll({
      where: { tingkatan_id },
      include: [
        { model: db.MataPelajaran, as: 'mapel' },
        { model: db.Kitab, as: 'kitab' }
      ],
      order: [[{ model: db.MataPelajaran, as: 'mapel' }, 'nama_mapel', 'ASC']]
    });
    res.json(rows);
  } catch (err) {
    console.error('Error getKurikulum:', err);
    res.status(500).json({ message: 'Gagal mengambil data kurikulum', error: err.message });
  }
};

// POST /api/kurikulum  { tingkatan_id, mapel_ids }
// New behavior: require only tingkatan_id in payload since kurikulum is tied to tingkatan, not tahun ajaran
exports.createKurikulum = async (req, res) => {
  try {
    const body = req.body || {};

    const tingkatanId = body.tingkatan_id;

    if (!tingkatanId) return res.status(400).json({ message: 'Payload tidak valid: perlu tingkatan_id.' });

    // Normalize mapel ids (allow single mapel_id or array)
    let mapelIds = [];
    if (Array.isArray(body.mapel_ids)) mapelIds = body.mapel_ids.map(Number);
    else if (body.mapel_id) mapelIds = [Number(body.mapel_id)];

    if (mapelIds.length === 0) return res.status(400).json({ message: 'Tidak ada mapel yang dipilih.' });

    // Avoid duplicates for this tingkatan
    const existing = await db.Kurikulum.findAll({ where: { tingkatan_id: tingkatanId } });
    const existingIds = new Set(existing.map(e => Number(e.mapel_id)));

    const toInsert = [];
    for (const mid of mapelIds) {
      if (!existingIds.has(Number(mid))) {
        const row = { tingkatan_id: tingkatanId, mapel_id: mid };
        if (body.kitab_id) row.kitab_id = body.kitab_id;
        if (body.batas_hafalan) row.batas_hafalan = body.batas_hafalan;
        toInsert.push(row);
      }
    }

    if (toInsert.length === 0) return res.status(200).json({ message: 'Tidak ada mapel baru untuk ditambahkan.', inserted: 0 });

    const created = await db.Kurikulum.bulkCreate(toInsert);
    res.status(201).json({ message: 'Kurikulum berhasil ditambahkan.', inserted: created.length, created });
  } catch (err) {
    console.error('Error createKurikulum:', err);
    res.status(500).json({ message: 'Gagal membuat kurikulum', error: err.message });
  }
};

// PUT /api/kurikulum/:id
exports.updateKurikulum = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = {};
    if (typeof req.body.kitab_id !== 'undefined') payload.kitab_id = req.body.kitab_id;
    if (typeof req.body.batas_hafalan !== 'undefined') payload.batas_hafalan = req.body.batas_hafalan;
    if (Object.keys(payload).length === 0) return res.status(400).json({ message: 'Tidak ada field yang diupdate.' });
    const [updated] = await db.Kurikulum.update(payload, { where: { id } });
    if (!updated) return res.status(404).json({ message: 'Kurikulum tidak ditemukan.' });
    const updatedRow = await db.Kurikulum.findByPk(id);
    res.json(updatedRow);
  } catch (err) {
    console.error('Error updateKurikulum:', err);
    res.status(500).json({ message: 'Gagal memperbarui kurikulum', error: err.message });
  }
};

// DELETE /api/kurikulum/:id OR DELETE /api/kurikulum with body { kurikulum_id }
exports.deleteKurikulum = async (req, res) => {
  try {
    const id = req.params?.id || req.body?.kurikulum_id;
    if (!id) return res.status(400).json({ message: 'Parameter kurikulum_id atau :id diperlukan.' });

    const deleted = await db.Kurikulum.destroy({ where: { id } });
    if (deleted) return res.status(200).json({ message: 'Kurikulum dihapus.' });
    return res.status(404).json({ message: 'Kurikulum tidak ditemukan.' });
  } catch (err) {
    console.error('Error deleteKurikulum:', err);
    res.status(500).json({ message: 'Gagal menghapus kurikulum', error: err.message });
  }
};

