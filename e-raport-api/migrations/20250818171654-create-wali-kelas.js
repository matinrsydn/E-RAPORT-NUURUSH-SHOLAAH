'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // PERBAIKAN: Mengubah nama tabel menjadi plural 'WaliKelases'
    await queryInterface.createTable('WaliKelases', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nama: {
        type: Sequelize.STRING
      },
      nip: {
        type: Sequelize.STRING
      },
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
    // PERBAIKAN: Mengubah nama tabel menjadi plural 'WaliKelases'
    await queryInterface.dropTable('WaliKelases');
  }
};
