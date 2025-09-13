const promotionService = require('../services/promotionService');
const db = require('../models');

async function promote(req, res) {
  const { fromTaId, toTaId, kelasFromId, mode, manualMapping, executedBy, note } = req.body;
  const t = await db.sequelize.transaction();
  try {
    const log = await promotionService.promoteStudents({ fromTaId, toTaId, kelasFromId, mode, manualMapping, executedBy, note }, { transaction: t });
    await t.commit();
    res.json({ success: true, log });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Gagal menjalankan promosi' });
  }
}

async function listLogs(req, res) {
  try {
    const logs = await db.PromosiLog.findAll({ order: [['createdAt', 'DESC']] });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal mengambil logs' });
  }
}

async function promoteAllForTahun(req, res) {
  // Expect { fromTaId, toTaId, mode, manualMapping }
  const { fromTaId, toTaId, mode='auto', manualMapping = {}, executedBy = null, note = null } = req.body;
  const t = await db.sequelize.transaction();
  try {
    // Find distinct kelas ids which have history entries for fromTaId
    const kelasRows = await db.SiswaKelasHistory.findAll({ where: { tahun_ajaran_id: fromTaId }, attributes: [[db.Sequelize.fn('DISTINCT', db.Sequelize.col('kelas_id')), 'kelas_id']], transaction: t });
    const kelasIds = (kelasRows || []).map(r => r.kelas_id).filter(Boolean);

    // If none found, fallback to promoting across all kelas (could be empty)
    const targets = kelasIds.length ? kelasIds : (await db.Kelas.findAll({ attributes: ['id'], transaction: t })).map(k=>k.id);

    const results = [];
    for (const kelasFromId of targets) {
      const log = await promotionService.promoteStudents({ fromTaId, toTaId, kelasFromId, mode, manualMapping, executedBy, note }, { transaction: t });
      results.push(log);
    }

    await t.commit();
    res.json({ success: true, results });
  } catch (err) {
    await t.rollback();
    console.error('promoteAllForTahun error', err);
    res.status(500).json({ success: false, message: err.message || 'Gagal menjalankan promosi untuk seluruh tahun' });
  }
}

module.exports = { promote, listLogs, promoteAllForTahun };
