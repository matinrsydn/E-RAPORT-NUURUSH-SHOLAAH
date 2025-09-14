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

  let promotedCount = 0;

  for (const siswa of siswas) {
      // save history before
  let masterFrom = null; try { const p = await db.PeriodeAjaran.findByPk(fromTaId); if (p) masterFrom = p.master_tahun_ajaran_id || (p.master && p.master.id) || null; } catch(e){}
  await db.SiswaKelasHistory.create({ siswa_id: siswa.id, kelas_id: siswa.kelas_id, master_tahun_ajaran_id: masterFrom, note: 'sebelum promosi' }, { transaction });

      // determine target
      const targetKelasId = await determineTargetKelas(siswa, mode, manualMapping);
      if (!targetKelasId) {
        // skip if cannot determine
        continue;
      }

      // update siswa
      await siswa.update({ kelas_id: targetKelasId }, { transaction });

      // save history after
  let masterTo = null; try { const p2 = await db.PeriodeAjaran.findByPk(toTaId); if (p2) masterTo = p2.master_tahun_ajaran_id || (p2.master && p2.master.id) || null; } catch(e){}
  await db.SiswaKelasHistory.create({ siswa_id: siswa.id, kelas_id: targetKelasId, master_tahun_ajaran_id: masterTo, note: 'setelah promosi' }, { transaction });

      promotedCount += 1;
    }

    if (createdTransaction) await transaction.commit();
    return { promosiLog, promotedCount };
  } catch (err) {
    if (createdTransaction) await transaction.rollback();
    throw err;
  }
}

module.exports = { determineTargetKelas, promoteStudents };
