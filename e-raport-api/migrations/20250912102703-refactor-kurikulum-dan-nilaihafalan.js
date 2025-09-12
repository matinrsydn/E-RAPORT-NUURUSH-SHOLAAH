'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Bagian ini menjelaskan perubahan yang akan diterapkan ke database.
     */
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Tambah kolom 'batas_hafalan' ke tabel 'Kurikulums'
      await queryInterface.addColumn('Kurikulums', 'batas_hafalan', {
        type: Sequelize.STRING,
        allowNull: true,
        after: 'kitab_id' // Opsional: menempatkan kolom setelah kolom kitab_id
      }, { transaction });

      // 2. Hapus kolom-kolom yang tidak perlu dari 'NilaiHafalans'
      await queryInterface.removeColumn('NilaiHafalans', 'nama_mapel_hafalan', { transaction });
      await queryInterface.removeColumn('NilaiHafalans', 'nama_kitab', { transaction });
      await queryInterface.removeColumn('NilaiHafalans', 'batas', { transaction });

      // 3. Tambah kolom 'nilai' ke 'NilaiHafalans'
      await queryInterface.addColumn('NilaiHafalans', 'nilai', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        after: 'mapel_id'
      }, { transaction });

      // 4. Ubah tipe data kolom 'predikat' menjadi ENUM 'Tercapai' / 'Tidak Tercapai'
      await queryInterface.changeColumn('NilaiHafalans', 'predikat', {
          type: Sequelize.ENUM('Tercapai', 'Tidak Tercapai'),
          allowNull: true
      }, { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down (queryInterface, Sequelize) {
    /**
     * Bagian ini menjelaskan cara MEMBATALKAN perubahan di atas.
     */
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Kembalikan kolom 'predikat' seperti semula
      await queryInterface.changeColumn('NilaiHafalans', 'predikat', {
        type: Sequelize.ENUM('Tercapai', 'Tidak Tercapai'),
        allowNull: true
      }, { transaction });
      
      // 2. Hapus kolom 'nilai' yang baru
      await queryInterface.removeColumn('NilaiHafalans', 'nilai', { transaction });

      // 3. Tambahkan kembali kolom-kolom yang tadi dihapus
      await queryInterface.addColumn('NilaiHafalans', 'batas', { type: Sequelize.INTEGER, allowNull: true }, { transaction });
      await queryInterface.addColumn('NilaiHafalans', 'nama_kitab', { type: Sequelize.STRING, allowNull: true }, { transaction });
      await queryInterface.addColumn('NilaiHafalans', 'nama_mapel_hafalan', { type: Sequelize.STRING, allowNull: true }, { transaction });

      // 4. Hapus kolom 'batas_hafalan' dari 'Kurikulums'
      await queryInterface.removeColumn('Kurikulums', 'batas_hafalan', { transaction });
      
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
