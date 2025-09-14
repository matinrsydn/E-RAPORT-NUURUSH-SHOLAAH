// file: models/guru.js

'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Guru extends Model {
    static associate(models) {
      Guru.hasOne(models.Kelas, {
        foreignKey: 'wali_kelas_id',
        as: 'kelas_asuhan'
      });
    }
  }
  Guru.init({
    nama: DataTypes.STRING,
    nip: DataTypes.STRING,
    jenis_kelamin: DataTypes.ENUM('Laki-laki', 'Perempuan'),
    tempat_lahir: DataTypes.STRING,
    tanggal_lahir: DataTypes.DATE,
    telepon: DataTypes.STRING,
    alamat: DataTypes.TEXT,
  // normalize enum values to match migration (lowercase)
  status: DataTypes.ENUM('aktif', 'nonaktif'),
    tanda_tangan: DataTypes.STRING
    
  }, {
    sequelize,
    modelName: 'Guru',
    tableName: 'gurus'
  });
  return Guru;
};