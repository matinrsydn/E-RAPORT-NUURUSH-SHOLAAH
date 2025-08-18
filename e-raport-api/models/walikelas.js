'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class WaliKelas extends Model {
    static associate(models) {
      WaliKelas.hasMany(models.Siswa, { foreignKey: 'waliKelasId' });
    }
  }
  WaliKelas.init({
    nama: DataTypes.STRING,
    nip: DataTypes.STRING
  }, { sequelize, modelName: 'WaliKelas' });
  return WaliKelas;
};