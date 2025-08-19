'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class WaliKelas extends Model {
    static associate(models) {
      WaliKelas.hasMany(models.Siswa, { foreignKey: 'wali_kelas_id', as: 'siswa' });
    }
  }
  WaliKelas.init({
    nama: DataTypes.STRING,
    nip: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'WaliKelas',
    tableName: 'WaliKelases' // PERBAIKAN: Tambahkan ini
  });
  return WaliKelas;
};
