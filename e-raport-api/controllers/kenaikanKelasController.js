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

module.exports = { promote, listLogs };
