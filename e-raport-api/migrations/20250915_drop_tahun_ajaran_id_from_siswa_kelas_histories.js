"use strict";

/**
 * Migration: drop tahun_ajaran_id from siswa_kelas_histories
 * IMPORTANT: Run only after verifying master_tahun_ajaran_id is populated for all rows.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'siswa_kelas_histories';
    const tableDesc = await queryInterface.describeTable(table).catch(() => null);
    if (tableDesc && tableDesc.tahun_ajaran_id) {
      // remove foreign key constraint if exists (best-effort)
      try {
        await queryInterface.removeConstraint(table, 'siswa_kelas_histories_tahun_ajaran_id_foreign');
      } catch (e) { /* ignore if constraint name differs */ }
      await queryInterface.removeColumn(table, 'tahun_ajaran_id');
    }
  },

  async down(queryInterface, Sequelize) {
    const table = 'siswa_kelas_histories';
    const tableDesc = await queryInterface.describeTable(table).catch(() => null);
    if (!tableDesc || !tableDesc.tahun_ajaran_id) {
      await queryInterface.addColumn(table, 'tahun_ajaran_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'PeriodeAjarans', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }
  }
};
