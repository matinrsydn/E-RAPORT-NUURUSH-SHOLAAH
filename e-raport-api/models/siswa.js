// e-raport-api/models/siswa.js
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Siswa extends Model {
    static associate(models) {
      Siswa.belongsTo(models.Kelas, { foreignKey: 'kelas_id', as: 'kelas' });
      Siswa.belongsTo(models.WaliKelas, { foreignKey: 'wali_kelas_id' });

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
        model: 'Kelas',
        key: 'id'
      }
    },
    wali_kelas_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'WaliKelas',
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