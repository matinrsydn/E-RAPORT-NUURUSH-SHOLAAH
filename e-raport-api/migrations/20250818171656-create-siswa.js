'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Siswas', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nama: {
        type: Sequelize.STRING
      },
      nis: {
        type: Sequelize.STRING,
        unique: true
      },
      tempat_lahir: {
        type: Sequelize.STRING
      },
      tanggal_lahir: {
        type: Sequelize.DATE
      },
      jenis_kelamin: {
        type: Sequelize.STRING
      },
      agama: {
        type: Sequelize.STRING
      },
      alamat: {
        type: Sequelize.TEXT
      },
      kelas: {
        type: Sequelize.STRING
      },
      wali_kelas_id: {
        type: Sequelize.INTEGER,
        references: {
          // PERBAIKAN: Nama tabel diubah menjadi plural 'WaliKelases'
          model: 'WaliKelases',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      kepala_sekolah_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'KepalaSekolahs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      nama_ayah: {
        type: Sequelize.STRING
      },
      pekerjaan_ayah: {
        type: Sequelize.STRING
      },
      alamat_ayah: {
        type: Sequelize.TEXT
      },
      nama_ibu: {
        type: Sequelize.STRING
      },
      pekerjaan_ibu: {
        type: Sequelize.STRING
      },
      alamat_ibu: {
        type: Sequelize.TEXT
      },
      nama_wali: {
        type: Sequelize.STRING
      },
      pekerjaan_wali: {
        type: Sequelize.STRING
      },
      alamat_wali: {
        type: Sequelize.TEXT
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
    await queryInterface.dropTable('Siswas');
  }
};
