'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MataPelajaran extends Model {
    static associate(models) {
      // Setiap mata pelajaran bisa ada di banyak entri kurikulum
      MataPelajaran.hasMany(models.Kurikulum, {
        foreignKey: 'mapel_id',
        as: 'kurikulum'
      });
    }
  }
  MataPelajaran.init({
    // Hapus 'kitab' dan 'kode_mapel' dari sini
    nama_mapel: DataTypes.STRING,
    jenis: DataTypes.ENUM('Ujian', 'Hafalan')
  }, {
    sequelize,
    modelName: 'MataPelajaran',
  });
  return MataPelajaran;
};