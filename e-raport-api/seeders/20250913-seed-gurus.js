"use strict";

/**
 * Seeder: Gurus
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();
    await queryInterface.bulkInsert('gurus', [
      { id: 1, nama: 'H. Ahmad Fauzi', nip: 'G-001', jenis_kelamin: 'Laki-laki', tempat_lahir: 'Solo', tanggal_lahir: new Date('1978-04-12'), telepon: '081234000001', alamat: 'Solo', status: 'Aktif', tanda_tangan: null, createdAt: now, updatedAt: now },
      { id: 2, nama: 'Siti Mariam', nip: 'G-002', jenis_kelamin: 'Perempuan', tempat_lahir: 'Yogyakarta', tanggal_lahir: new Date('1985-09-03'), telepon: '081234000002', alamat: 'Yogyakarta', status: 'Aktif', tanda_tangan: null, createdAt: now, updatedAt: now },
      { id: 3, nama: 'Drs. Budi Santoso', nip: 'G-003', jenis_kelamin: 'Laki-laki', tempat_lahir: 'Bandung', tanggal_lahir: new Date('1975-01-20'), telepon: '081234000003', alamat: 'Bandung', status: 'Aktif', tanda_tangan: null, createdAt: now, updatedAt: now },
      { id: 4, nama: 'Ust. Rudi Hartono', nip: 'G-004', jenis_kelamin: 'Laki-laki', tempat_lahir: 'Jakarta', tanggal_lahir: new Date('1980-11-11'), telepon: '081234000004', alamat: 'Jakarta', status: 'Aktif', tanda_tangan: null, createdAt: now, updatedAt: now },
      { id: 5, nama: 'Ny. Lina Susanti', nip: 'G-005', jenis_kelamin: 'Perempuan', tempat_lahir: 'Semarang', tanggal_lahir: new Date('1982-06-22'), telepon: '081234000005', alamat: 'Semarang', status: 'Aktif', tanda_tangan: null, createdAt: now, updatedAt: now }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('gurus', { id: [1,2,3,4,5] }, {});
  }
};
