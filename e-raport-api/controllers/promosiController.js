const db = require('../models');

/**
 * POST /api/promosi/execute
 * Payload shape documented in task. Uses a DB transaction and creates SiswaKelasHistory entries
 * and updates Siswa.kelas_id for promoted students. Logs into PromosiLog.
 */
async function executePromosi(req, res) {
  const body = req.body || {};
  const { periode_ajaran_from_id, kelas_from_id, periode_ajaran_to_id, promotions } = body;

  if (!periode_ajaran_from_id || !periode_ajaran_to_id || !Array.isArray(promotions) || !kelas_from_id) {
    return res.status(400).json({ message: 'Bad request: missing required fields' });
  }

  const t = await db.sequelize.transaction();
  try {
    // create promosi log (kelas_to_id left null here as promotions are per-siswa)
    const promosiLog = await db.PromosiLog.create({
      tahun_ajaran_from_id: periode_ajaran_from_id,
      tahun_ajaran_to_id: periode_ajaran_to_id,
      kelas_from_id: kelas_from_id,
      kelas_to_id: null,
      executed_by: req.user && req.user.id ? req.user.id : null,
      note: body.note || null
    }, { transaction: t });

    for (const p of promotions) {
      const siswaId = Number(p.siswa_id);
      const status = (p.status || '').toString();
      const kelasToId = p.kelas_to_id ? Number(p.kelas_to_id) : null;

      if (!siswaId || !['naik', 'tinggal'].includes(status)) {
        throw new Error('Invalid promotion entry for siswa: ' + JSON.stringify(p));
      }

      if (status === 'naik') {
        // create history for target TA with kelasToId
  // attempt to resolve master TA id for periode_ajaran_to_id
  let masterTaId = null;
  try { const p = await db.PeriodeAjaran.findByPk(periode_ajaran_to_id); if (p) masterTaId = p.master_tahun_ajaran_id || (p.master && p.master.id) || null; } catch(e){}
  await db.SiswaKelasHistory.create({ siswa_id: siswaId, kelas_id: kelasToId, master_tahun_ajaran_id: masterTaId, note: 'promosi: naik' }, { transaction: t });
        // update siswa current kelas
        await db.Siswa.update({ kelas_id: kelasToId }, { where: { id: siswaId }, transaction: t });
      } else {
        // tinggal: record history pointing to same kelas_from_id (they stay in same kelas)
  let masterTaId2 = null;
  try { const p2 = await db.PeriodeAjaran.findByPk(periode_ajaran_to_id); if (p2) masterTaId2 = p2.master_tahun_ajaran_id || (p2.master && p2.master.id) || null; } catch(e){}
  await db.SiswaKelasHistory.create({ siswa_id: siswaId, kelas_id: kelas_from_id, master_tahun_ajaran_id: masterTaId2, note: 'promosi: tinggal' }, { transaction: t });
        // do not update Siswa.kelas_id
      }
    }

    await t.commit();
    return res.json({ success: true, promosiLog: promosiLog.get ? promosiLog.get({ plain: true }) : promosiLog });
  } catch (err) {
    await t.rollback();
    console.error('Error executing promosi:', err);
    return res.status(500).json({ success: false, message: err.message || 'Gagal menjalankan promosi' });
  }
}

module.exports = { executePromosi };
