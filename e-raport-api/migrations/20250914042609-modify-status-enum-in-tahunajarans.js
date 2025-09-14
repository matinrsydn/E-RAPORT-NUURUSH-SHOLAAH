'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Mengubah definisi ENUM pada kolom 'status' di tabel 'TahunAjarans'
    await queryInterface.changeColumn('TahunAjarans', 'status', {
      type: Sequelize.ENUM('aktif', 'nonaktif'), // <-- Menggunakan nilai yang konsisten
      allowNull: false,
      defaultValue: 'nonaktif'
    });
  },

  async down (queryInterface, Sequelize) {
    // Mengembalikan ke definisi ENUM yang lama jika migrasi dibatalkan
    await queryInterface.changeColumn('TahunAjarans', 'status', {
      type: Sequelize.ENUM('aktif', 'tidak-aktif'),
      allowNull: false,
      defaultValue: 'tidak-aktif'
    });
  }
};