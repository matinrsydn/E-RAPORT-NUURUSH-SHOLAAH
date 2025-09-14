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
      // Association to Tingkatan
      if (models.Tingkatan) {
        Kelas.belongsTo(models.Tingkatan, { foreignKey: 'tingkatan_id', as: 'tingkatan' });
      }
      // Many-to-many to PeriodeAjaran via KelasPeriode
      if (models.PeriodeAjaran && models.KelasPeriode) {
        Kelas.belongsToMany(models.PeriodeAjaran, { through: models.KelasPeriode, foreignKey: 'kelas_id', otherKey: 'periode_ajaran_id', as: 'periodes' });
      }
    }
  }
  Kelas.init({
    nama_kelas: DataTypes.STRING,
    kapasitas: DataTypes.INTEGER,
    wali_kelas_id: DataTypes.INTEGER,
    tingkatan_id: DataTypes.INTEGER,
    next_kelas_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Kelas',
    tableName: 'kelas'
  });
  return Kelas;
};