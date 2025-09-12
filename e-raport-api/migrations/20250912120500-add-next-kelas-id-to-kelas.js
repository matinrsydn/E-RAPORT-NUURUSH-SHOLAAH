"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Kelas', 'next_kelas_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Kelas', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Kelas', 'next_kelas_id');
  }
};
