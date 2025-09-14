const db = require('../models');

/**
 * Middleware to resolve a textual `tahun_ajaran` (e.g. '2024/2025') into
 * tahun_ajaran_id by looking up MasterTahunAjaran (and falling back to PeriodeAjaran).
 *
 * It will normalize the result into req.params.tahun_ajaran_id or req.body.tahun_ajaran_id
 * so downstream controllers can rely on numeric FK.
 */
module.exports = async function resolveTahunAjaranId(req, res, next) {
  try {
    // accept multiple common param names: tahun_ajaran, tahunAjaran, tahunAjaranId
    const provided = req.params.tahun_ajaran || req.params.tahunAjaran || req.body?.tahun_ajaran || req.body?.tahunAjaran || req.query?.tahun_ajaran || req.query?.tahunAjaran;
    if (!provided) return next();

    // If an id is already present, nothing to do
    const already = req.params.tahun_ajaran_id || req.params.tahunAjaranId || req.body?.tahun_ajaran_id || req.body?.tahunAjaranId || req.query?.tahun_ajaran_id || req.query?.tahunAjaranId;
    if (already) return next();

    // Try to find in MasterTahunAjaran by name
    let master = await db.MasterTahunAjaran.findOne({ where: { nama_ajaran: provided } });
    if (master) {
      const id = master.id;
      // write back into params/body for controller convenience
      if (req.params) { req.params.tahun_ajaran_id = id; req.params.tahunAjaranId = id; }
      if (req.body) { req.body.tahun_ajaran_id = id; req.body.tahunAjaranId = id; }
      if (req.query) { req.query.tahun_ajaran_id = id; req.query.tahunAjaranId = id; }
      return next();
    }

    // fallback: try PeriodeAjaran (TahunAjarans table) by nama_ajaran
    let periode = await db.PeriodeAjaran.findOne({ where: { nama_ajaran: provided } });
    if (periode) {
      const id = periode.id;
      if (req.params) { req.params.tahun_ajaran_id = id; req.params.tahunAjaranId = id; }
      if (req.body) { req.body.tahun_ajaran_id = id; req.body.tahunAjaranId = id; }
      if (req.query) { req.query.tahun_ajaran_id = id; req.query.tahunAjaranId = id; }
      return next();
    }

    // If not found, continue without modifying — controllers may handle missing ID.
    return next();
  } catch (err) {
    console.error('resolveTahunAjaranId error', err);
    return next(err);
  }
};
