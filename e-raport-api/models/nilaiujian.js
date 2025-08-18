'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class NilaiUjian extends Model {
    static associate(models) {
      NilaiUjian.belongsTo(models.Siswa, { foreignKey: 'siswaId' });
      NilaiUjian.belongsTo(models.MataPelajaran, { foreignKey: 'mataPelajaranId', as: 'mapel' });
    }
  }
  NilaiUjian.init({
    siswaId: DataTypes.INTEGER,
    mataPelajaranId: DataTypes.INTEGER,
    pengetahuan_angka: DataTypes.INTEGER,
    keterampilan_angka: DataTypes.INTEGER,
    semester: DataTypes.STRING,
    tahun_ajaran: DataTypes.STRING
  }, { sequelize, modelName: 'NilaiUjian' });
  return NilaiUjian;
};