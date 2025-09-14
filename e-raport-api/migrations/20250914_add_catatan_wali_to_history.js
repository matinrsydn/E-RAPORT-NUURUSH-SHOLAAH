"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add two nullable TEXT columns to store teacher notes
    await queryInterface.addColumn('siswa_kelas_histories', 'catatan_akademik', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('siswa_kelas_histories', 'catatan_sikap', { type: Sequelize.TEXT, allowNull: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('siswa_kelas_histories', 'catatan_akademik');
    await queryInterface.removeColumn('siswa_kelas_histories', 'catatan_sikap');
  }
};
