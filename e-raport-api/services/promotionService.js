const db = require('../models');

async function determineTargetKelas(siswa, mode, mapping) {
  // mode: 'auto' -> use Kelas.next_kelas_id, 'manual' -> use mapping[siswa.id]
  if (mode === 'manual' && mapping && mapping[siswa.id]) {
    return mapping[siswa.id];
  }
  // auto mode: lookup kelas.next_kelas_id
  const kelas = await db.Kelas.findByPk(siswa.kelas_id);
  if (!kelas) return null;
  return kelas.next_kelas_id || null;
}

async function promoteStudents({ fromTaId, toTaId, kelasFromId, mode='auto', manualMapping = {}, executedBy = null, note = null }, options = {}) {
  const transaction = options.transaction || await db.sequelize.transaction();
  let createdTransaction = !options.transaction;
  try {
    // Create promosi log
    const promosiLog = await db.PromosiLog.create({ tahun_ajaran_from_id: fromTaId, tahun_ajaran_to_id: toTaId, kelas_from_id: kelasFromId || null, kelas_to_id: null, executed_by: executedBy || null, note: note || null }, { transaction });

    // fetch students in kelasFromId
    const siswas = await db.Siswa.findAll({ where: { kelas_id: kelasFromId } , transaction });

    for (const siswa of siswas) {
      // save history before
      await db.SiswaKelasHistory.create({ siswa_id: siswa.id, kelas_id: siswa.kelas_id, tahun_ajaran_id: fromTaId, note: 'sebelum promosi' }, { transaction });

      // determine target
      const targetKelasId = await determineTargetKelas(siswa, mode, manualMapping);
      if (!targetKelasId) {
        // skip if cannot determine
        continue;
      }

      // update siswa
      await siswa.update({ kelas_id: targetKelasId }, { transaction });

      // save history after
      await db.SiswaKelasHistory.create({ siswa_id: siswa.id, kelas_id: targetKelasId, tahun_ajaran_id: toTaId, note: 'setelah promosi' }, { transaction });
    }

    if (createdTransaction) await transaction.commit();
    return promosiLog;
  } catch (err) {
    if (createdTransaction) await transaction.rollback();
    throw err;
  }
}

module.exports = { determineTargetKelas, promoteStudents };
