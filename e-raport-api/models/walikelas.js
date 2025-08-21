'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class WaliKelas extends Model {
    static associate(models) {
      // Benar: Satu Wali Kelas bertanggung jawab atas satu Kelas.
      WaliKelas.hasOne(models.Kelas, {
        foreignKey: 'wali_kelas_id',
        as: 'kelas' 
      });

      // --- TAMBAHKAN RELASI INI ---
      // Satu Wali Kelas memiliki (membawahi) banyak Siswa.
      WaliKelas.hasMany(models.Siswa, {
        foreignKey: 'wali_kelas_id',
        as: 'siswa'
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