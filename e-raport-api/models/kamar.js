// e-raport-api/models/kamar.js
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Kamar extends Model {
    static associate(models) {
      // Setiap kamar bisa memiliki banyak siswa
      Kamar.hasMany(models.Siswa, {
        foreignKey: 'kamar_id',
        as: 'siswa'
      });
    }
  }
  Kamar.init({
    nama_kamar: DataTypes.STRING,
    kapasitas: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Kamar',
    tableName: 'kamars'
  });
  return Kamar;
};