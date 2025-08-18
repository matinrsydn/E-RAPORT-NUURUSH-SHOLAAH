'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MataPelajaran extends Model {
    static associate(models) {
      MataPelajaran.hasMany(models.NilaiUjian, { foreignKey: 'mataPelajaranId' });
      MataPelajaran.hasMany(models.NilaiHafalan, { foreignKey: 'mataPelajaranId' });
    }
  }
  MataPelajaran.init({
    nama_mapel: DataTypes.STRING,
    kitab: DataTypes.STRING
  }, { sequelize, modelName: 'MataPelajaran' });
  return MataPelajaran;
};