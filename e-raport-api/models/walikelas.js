// e-raport-api/models/walikelas.js

'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class WaliKelas extends Model {
    static associate(models) {
      // PERBAIKAN: Tambahkan alias 'as' di sini agar relasi sinkron
      WaliKelas.hasOne(models.Kelas, {
        foreignKey: 'wali_kelas_id',
        as: 'kelas' // <-- Tambahkan baris ini
      });
    }
  }
  WaliKelas.init({
    nama: DataTypes.STRING,
    nip: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'WaliKelas',
  });
  return WaliKelas;
};