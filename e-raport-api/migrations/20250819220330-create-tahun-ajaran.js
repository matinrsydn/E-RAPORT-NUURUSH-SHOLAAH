'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('TahunAjarans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nama_ajaran: {
        type: Sequelize.STRING,
        allowNull: false
      },
      // --- TAMBAHKAN KOLOM INI SECARA MANUAL ---
      status: {
        type: Sequelize.ENUM('aktif', 'tidak-aktif'),
        allowNull: false,
        defaultValue: 'tidak-aktif'
      },
      // -----------------------------------------
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('TahunAjarans');
  }
};
