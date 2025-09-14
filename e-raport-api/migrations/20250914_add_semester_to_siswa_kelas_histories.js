"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('siswa_kelas_histories', 'semester', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
      after: 'tahun_ajaran_id'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('siswa_kelas_histories', 'semester');
  }
};
