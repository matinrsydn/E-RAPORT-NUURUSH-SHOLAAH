"use strict";

/**
 * Seeder: Siswas
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();
    await queryInterface.bulkInsert('Siswas', [
      { id: 1, nama: 'Muhammad Rizky', nis: 'S-2024001', tempat_lahir: 'Jakarta', tanggal_lahir: new Date('2010-03-12'), jenis_kelamin: 'Laki-laki', agama: 'Islam', alamat: 'Kel. Merdeka, Jakarta', kelas_id: 1, kamar_id: null, nama_ayah: 'Budi Santoso', pekerjaan_ayah: 'Petani', nama_ibu: 'Siti Aminah', pekerjaan_ibu: 'Ibu Rumah Tangga', createdAt: now, updatedAt: now },
      { id: 2, nama: 'Alya Putri', nis: 'S-2024002', tempat_lahir: 'Bandung', tanggal_lahir: new Date('2010-06-22'), jenis_kelamin: 'Perempuan', agama: 'Islam', alamat: 'Kel. Indah, Bandung', kelas_id: 1, kamar_id: null, nama_ayah: 'Herman', pekerjaan_ayah: 'Pedagang', nama_ibu: 'Maya', pekerjaan_ibu: 'Guru', createdAt: now, updatedAt: now },
      { id: 3, nama: 'Faisal Rahman', nis: 'S-2024003', tempat_lahir: 'Surabaya', tanggal_lahir: new Date('2009-12-01'), jenis_kelamin: 'Laki-laki', agama: 'Islam', alamat: 'Kel. Timur, Surabaya', kelas_id: 2, kamar_id: null, nama_ayah: 'Rahman', pekerjaan_ayah: 'Driver', nama_ibu: 'Lina', pekerjaan_ibu: 'Penjahit', createdAt: now, updatedAt: now },
      { id: 4, nama: 'Nurul Hidayah', nis: 'S-2024004', tempat_lahir: 'Yogyakarta', tanggal_lahir: new Date('2009-08-15'), jenis_kelamin: 'Perempuan', agama: 'Islam', alamat: 'Kel. Sari, Yogyakarta', kelas_id: 3, kamar_id: null, nama_ayah: 'Slamet', pekerjaan_ayah: 'Karyawan', nama_ibu: 'Ratu', pekerjaan_ibu: 'Ibu Rumah Tangga', createdAt: now, updatedAt: now },
      { id: 5, nama: 'Ibrahim', nis: 'S-2024005', tempat_lahir: 'Semarang', tanggal_lahir: new Date('2009-11-20'), jenis_kelamin: 'Laki-laki', agama: 'Islam', alamat: 'Kel. Mawar, Semarang', kelas_id: 4, kamar_id: null, nama_ayah: 'Asep', pekerjaan_ayah: 'Nelayan', nama_ibu: 'Dewi', pekerjaan_ibu: 'Pedagang', createdAt: now, updatedAt: now }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Siswas', { id: [1,2,3,4,5] }, {});
  }
};
