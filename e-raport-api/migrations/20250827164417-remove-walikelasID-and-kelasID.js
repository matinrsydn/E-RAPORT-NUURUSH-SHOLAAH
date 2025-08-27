'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Sikaps', 'wali_kelas_id');
    await queryInterface.removeColumn('Sikaps', 'kelas_id');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('Sikaps', 'wali_kelas_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn('Sikaps', 'kelas_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  }
};
