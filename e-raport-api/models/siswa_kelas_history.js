"use strict";
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SiswaKelasHistory extends Model {
    static associate(models) {
      SiswaKelasHistory.belongsTo(models.Siswa, { foreignKey: 'siswa_id', as: 'siswa' });
      SiswaKelasHistory.belongsTo(models.Kelas, { foreignKey: 'kelas_id', as: 'kelas' });
      SiswaKelasHistory.belongsTo(models.TahunAjaran, { foreignKey: 'tahun_ajaran_id', as: 'tahunAjaran' });
    }
  }
  SiswaKelasHistory.init({
    siswa_id: { type: DataTypes.INTEGER, allowNull: false },
    kelas_id: { type: DataTypes.INTEGER, allowNull: false },
    tahun_ajaran_id: { type: DataTypes.INTEGER, allowNull: false },
    note: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'SiswaKelasHistory',
    tableName: 'siswa_kelas_histories'
  });
  return SiswaKelasHistory;
};
