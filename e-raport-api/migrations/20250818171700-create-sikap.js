// e-raport-api/migrations/....-create-sikap.js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Sikaps', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      siswa_id: { // Ganti dari siswaId
        type: Sequelize.INTEGER
      },
      catatan: { // Ganti dari kolom-kolom lama
        type: Sequelize.TEXT
      },
      semester: {
        type: Sequelize.STRING
      },
      tahun_ajaran: {
        type: Sequelize.STRING
      },
      wali_kelas_id: { // Tambahan
        type: Sequelize.INTEGER
      },
      kelas_id: { // Tambahan
        type: Sequelize.INTEGER
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
    await queryInterface.dropTable('Sikaps');
  }
};