'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Kitab extends Model {
    static associate(models) {
      // Setiap kitab bisa digunakan di banyak entri kurikulum
      Kitab.hasMany(models.Kurikulum, {
        foreignKey: 'kitab_id',
        as: 'kurikulum'
      });
    }
  }
  // Hapus field 'pengarang' dari inisialisasi model
  Kitab.init({
    nama_kitab: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Kitab',
  });
  return Kitab;
};

