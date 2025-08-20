'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Ubah nama kolom siswaId menjadi siswa_id
    await queryInterface.renameColumn('NilaiUjians', 'siswaId', 'siswa_id');
    
    // Ubah nama kolom mataPelajaranId menjadi mapel_id
    await queryInterface.renameColumn('NilaiUjians', 'mataPelajaranId', 'mapel_id');
    
    // Tambahkan kode_mapel ke tabel MataPelajarans jika belum ada
    try {
      await queryInterface.addColumn('MataPelajarans', 'kode_mapel', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      });
    } catch (error) {
      // Kolom mungkin sudah ada, abaikan error
      console.log('Column kode_mapel might already exist');
    }
  },

  async down(queryInterface, Sequelize) {
    // Kembalikan nama kolom
    await queryInterface.renameColumn('NilaiUjians', 'siswa_id', 'siswaId');
    await queryInterface.renameColumn('NilaiUjians', 'mapel_id', 'mataPelajaranId');
    
    // Hapus kolom kode_mapel
    try {
      await queryInterface.removeColumn('MataPelajarans', 'kode_mapel');
    } catch (error) {
      console.log('Column kode_mapel might not exist');
    }
  }
};