"use strict";

/**
 * Seeder: MataPelajarans
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();
    await queryInterface.bulkInsert('MataPelajarans', [
      { id: 1, nama_mapel: 'Matematika', jenis: 'Ujian', createdAt: now, updatedAt: now },
      { id: 2, nama_mapel: 'Bahasa Indonesia', jenis: 'Ujian', createdAt: now, updatedAt: now },
      { id: 3, nama_mapel: 'Ilmu Pengetahuan Alam', jenis: 'Ujian', createdAt: now, updatedAt: now },
      { id: 4, nama_mapel: 'Pendidikan Agama', jenis: 'Ujian', createdAt: now, updatedAt: now },
      { id: 5, nama_mapel: 'Hafalan (Quran)', jenis: 'Hafalan', createdAt: now, updatedAt: now }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('MataPelajarans', { id: [1,2,3,4,5] }, {});
  }
};
