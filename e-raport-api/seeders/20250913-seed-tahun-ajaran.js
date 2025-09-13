"use strict";

/**
 * Seeder: TahunAjarans
 * Creates 5 tahun ajaran records (nama_ajaran + semester)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    await queryInterface.bulkInsert('TahunAjarans', [
      { id: 1, nama_ajaran: '2021/2022', semester: '1', status: 'tidak-aktif', createdAt: now, updatedAt: now },
      { id: 2, nama_ajaran: '2021/2022', semester: '2', status: 'tidak-aktif', createdAt: now, updatedAt: now },
      { id: 3, nama_ajaran: '2022/2023', semester: '1', status: 'tidak-aktif', createdAt: now, updatedAt: now },
      { id: 4, nama_ajaran: '2022/2023', semester: '2', status: 'tidak-aktif', createdAt: now, updatedAt: now },
      { id: 5, nama_ajaran: '2024/2025', semester: '1', status: 'aktif', createdAt: now, updatedAt: now }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('TahunAjarans', { id: [1,2,3,4,5] }, {});
  }
};
