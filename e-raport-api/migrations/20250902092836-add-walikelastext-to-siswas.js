'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Perintah untuk MENAMBAHKAN kolom 'wali_kelas_text' ke tabel 'Siswas'
    await queryInterface.addColumn('Siswas', 'wali_kelas_text', {
      type: Sequelize.STRING,
      allowNull: true, // Boleh kosong
      defaultValue: null,
      after: 'wali_kelas_id' // Opsional: meletakkan kolom ini setelah 'wali_kelas_id'
    });
  },

  async down(queryInterface, Sequelize) {
    // Perintah untuk MENGHAPUS kolom 'wali_kelas_text' jika migrasi di-rollback
    await queryInterface.removeColumn('Siswas', 'wali_kelas_text');
  }
};