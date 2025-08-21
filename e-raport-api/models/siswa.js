'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Siswa extends Model {
    static associate(models) {
      // Relasi ke Kelas
      Siswa.belongsTo(models.Kelas, {
        foreignKey: 'kelas_id',
        as: 'kelas'
      });

      // --- INI BAGIAN YANG HILANG ---
      // Tambahkan relasi ke WaliKelas di sini
      Siswa.belongsTo(models.WaliKelas, {
        foreignKey: 'wali_kelas_id',
        as: 'wali_kelas'
      });
      // -----------------------------

      // Relasi ke tabel nilai dan lainnya
      Siswa.hasMany(models.NilaiUjian, {
        foreignKey: 'siswa_id',
        as: 'NilaiUjians'
      });
      Siswa.hasMany(models.NilaiHafalan, {
        foreignKey: 'siswa_id',
        as: 'NilaiHafalans'
      });
      Siswa.hasMany(models.Sikap, {
        foreignKey: 'siswa_id',
        as: 'Sikaps',
        onDelete: 'CASCADE'
      });
      Siswa.hasMany(models.Kehadiran, {
        foreignKey: 'siswa_id',
        as: 'Kehadirans',
        onDelete: 'CASCADE'
      });
    }
  }
  Siswa.init({
    nama: DataTypes.STRING,
    nis: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    tempat_lahir: DataTypes.STRING,
    tanggal_lahir: DataTypes.DATE,
    jenis_kelamin: DataTypes.STRING,
    agama: DataTypes.STRING,
    alamat: DataTypes.TEXT,
    kelas_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Kelas', // Nama tabel, bukan model
        key: 'id'
      }
    },
    wali_kelas_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'WaliKelas', // Nama tabel, bukan model
        key: 'id'
      }
    },
    kamar: DataTypes.STRING,
    kota_asal: DataTypes.STRING,
    nama_ayah: DataTypes.STRING,
    pekerjaan_ayah: DataTypes.STRING,
    alamat_ayah: DataTypes.TEXT,
    nama_ibu: DataTypes.STRING,
    pekerjaan_ibu: DataTypes.STRING,
    alamat_ibu: DataTypes.TEXT,
    nama_wali: DataTypes.STRING,
    pekerjaan_wali: DataTypes.STRING,
    alamat_wali: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'Siswa',
  });
  return Siswa;
};
