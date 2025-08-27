'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Sikaps', 'catatan_wali_kelas');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.addColumn('Sikaps', 'catatan_wali_kelas', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  }
};
