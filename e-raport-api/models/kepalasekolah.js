'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class KepalaSekolah extends Model {
    static associate(models) {
      KepalaSekolah.hasMany(models.Siswa, { foreignKey: 'kepalaSekolahId' });
    }
  }
  KepalaSekolah.init({
    nama: DataTypes.STRING,
    nip: DataTypes.STRING
  }, { sequelize, modelName: 'KepalaSekolah' });
  return KepalaSekolah;
};