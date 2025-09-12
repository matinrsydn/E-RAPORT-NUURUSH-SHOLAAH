// models/kelas.js
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Kelas extends Model {
    static associate(models) {
      // 🔥 PASTIKAN RELASI INI MENGGUNAKAN 'Guru'
      Kelas.belongsTo(models.Guru, {
        foreignKey: 'wali_kelas_id',
        as: 'walikelas' // Alias ini sudah benar sesuai controller
      });

      Kelas.hasMany(models.Siswa, {
        foreignKey: 'kelas_id',
        as: 'siswa'
      });
    }
  }
  Kelas.init({
    nama_kelas: DataTypes.STRING,
    kapasitas: DataTypes.INTEGER,
    wali_kelas_id: DataTypes.INTEGER,
    next_kelas_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Kelas',
    tableName: 'kelas'
  });
  return Kelas;
};