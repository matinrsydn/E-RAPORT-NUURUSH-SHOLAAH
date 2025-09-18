'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all unique siswa_id and earliest master_tahun_ajaran_id from siswa_kelas_histories
    const [results] = await queryInterface.sequelize.query(`
      SELECT siswa_id, master_tahun_ajaran_id 
      FROM siswa_kelas_histories h1
      WHERE createdAt = (
        SELECT MIN(createdAt)
        FROM siswa_kelas_histories h2
        WHERE h2.siswa_id = h1.siswa_id
      )
    `);

    // Update each siswa record
    for (const {siswa_id, master_tahun_ajaran_id} of results) {
      await queryInterface.sequelize.query(`
        UPDATE Siswas
        SET master_tahun_ajaran_id = :master_tahun_ajaran_id
        WHERE id = :siswa_id
      `, {
        replacements: { siswa_id, master_tahun_ajaran_id }
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Reset master_tahun_ajaran_id to null for all siswa
    await queryInterface.sequelize.query(`
      UPDATE Siswas
      SET master_tahun_ajaran_id = NULL
    `);
  }
};