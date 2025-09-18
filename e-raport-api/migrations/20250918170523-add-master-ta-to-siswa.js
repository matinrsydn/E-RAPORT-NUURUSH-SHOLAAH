'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Tambah kolom master_tahun_ajaran_id ke table Siswas
    await queryInterface.addColumn('Siswas', 'master_tahun_ajaran_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'MasterTahunAjarans',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 2. Backfill data dari siswa_kelas_histories yang paling lama
    await queryInterface.sequelize.query(`
      UPDATE Siswas s
      INNER JOIN (
        SELECT siswa_id, master_tahun_ajaran_id
        FROM siswa_kelas_histories h1
        WHERE createdAt = (
          SELECT MIN(createdAt)
          FROM siswa_kelas_histories h2
          WHERE h2.siswa_id = h1.siswa_id
        )
      ) first_history ON s.id = first_history.siswa_id
      SET s.master_tahun_ajaran_id = first_history.master_tahun_ajaran_id
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Siswas', 'master_tahun_ajaran_id');
  }
};