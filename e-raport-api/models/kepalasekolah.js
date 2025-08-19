'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class KepalaSekolah extends Model {
    static associate(models) {
      KepalaSekolah.hasMany(models.Siswa, { foreignKey: 'kepala_sekolah_id', as: 'siswa' });
    }
  }
  KepalaSekolah.init({
    nama: DataTypes.STRING,
    nip: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'KepalaSekolah',
    tableName: 'KepalaSekolahs' // PERBAIKAN: Tambahkan ini
  });
  return KepalaSekolah;
};
