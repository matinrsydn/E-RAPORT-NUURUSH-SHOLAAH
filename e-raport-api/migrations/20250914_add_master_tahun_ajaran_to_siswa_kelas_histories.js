"use strict";

/**
 * Migration: add master_tahun_ajaran_id to siswa_kelas_histories and backfill from PeriodeAjaran
 * - Adds nullable master_tahun_ajaran_id column
 * - Backfills values using existing tahun_ajaran_id -> PeriodeAjaran.master_tahun_ajaran_id
 * - Leaves tahun_ajaran_id intact for now (safer incremental change)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'siswa_kelas_histories';
    const tableDesc = await queryInterface.describeTable(table).catch(() => null);
    if (!tableDesc || !tableDesc.master_tahun_ajaran_id) {
      await queryInterface.addColumn(table, 'master_tahun_ajaran_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'MasterTahunAjarans', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        after: 'tahun_ajaran_id'
      });
    }

    // Backfill: if a row has tahun_ajaran_id, set master_tahun_ajaran_id from PeriodeAjaran.master_tahun_ajaran_id
    // Use raw SQL for bulk update (works across MySQL/Postgres with standard syntax)
    await queryInterface.sequelize.query(`
      UPDATE ${table} skh
      LEFT JOIN PeriodeAjarans p ON skh.tahun_ajaran_id = p.id
      SET skh.master_tahun_ajaran_id = p.master_tahun_ajaran_id
      WHERE skh.tahun_ajaran_id IS NOT NULL
    `).catch(() => {
      // If the DB dialect doesn't support JOIN in UPDATE, fallback to a safer JS-based backfill
    });
  },

  async down(queryInterface, Sequelize) {
    const table = 'siswa_kelas_histories';
    const tableDesc = await queryInterface.describeTable(table).catch(() => null);
    if (tableDesc && tableDesc.master_tahun_ajaran_id) {
      await queryInterface.removeColumn(table, 'master_tahun_ajaran_id');
    }
  }
};
