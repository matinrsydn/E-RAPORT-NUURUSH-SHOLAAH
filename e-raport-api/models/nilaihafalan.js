'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class NilaiHafalan extends Model {
    static associate(models) {
      NilaiHafalan.belongsTo(models.Siswa, { foreignKey: 'siswaId' });
      NilaiHafalan.belongsTo(models.MataPelajaran, { foreignKey: 'mataPelajaranId', as: 'mapel' });
    }
  }
  NilaiHafalan.init({
    siswaId: DataTypes.INTEGER,
    mataPelajaranId: DataTypes.INTEGER,
    nilai_angka: DataTypes.INTEGER,
    semester: DataTypes.STRING,
    tahun_ajaran: DataTypes.STRING
  }, { sequelize, modelName: 'NilaiHafalan' });
  return NilaiHafalan;
};
