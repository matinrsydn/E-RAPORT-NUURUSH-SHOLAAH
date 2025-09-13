"use strict";

/**
 * Seeder: Kelas
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();
    await queryInterface.bulkInsert('Kelas', [
      { id: 1, nama_kelas: 'VII A', kapasitas: 30, wali_kelas_id: null, createdAt: now, updatedAt: now },
      { id: 2, nama_kelas: 'VII B', kapasitas: 30, wali_kelas_id: null, createdAt: now, updatedAt: now },
      { id: 3, nama_kelas: 'VIII A', kapasitas: 32, wali_kelas_id: null, createdAt: now, updatedAt: now },
      { id: 4, nama_kelas: 'VIII B', kapasitas: 32, wali_kelas_id: null, createdAt: now, updatedAt: now },
      { id: 5, nama_kelas: 'IX A', kapasitas: 34, wali_kelas_id: null, createdAt: now, updatedAt: now }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Kelas', { id: [1,2,3,4,5] }, {});
  }
};
