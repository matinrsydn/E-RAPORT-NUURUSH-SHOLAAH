'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('sikaps', 'catatan');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('sikaps', 'catatan', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  }
};
