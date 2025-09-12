"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // use lowercase table name to match project's naming convention
    await queryInterface.createTable('siswa_kelas_histories', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      siswa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Siswas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      kelas_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Kelas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tahun_ajaran_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'TahunAjarans', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      note: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },
  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('siswa_kelas_histories');
  }
};
