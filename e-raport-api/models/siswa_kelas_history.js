"use strict";
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SiswaKelasHistory extends Model {
    static associate(models) {
      SiswaKelasHistory.belongsTo(models.Siswa, { foreignKey: 'siswa_id', as: 'siswa' });
      SiswaKelasHistory.belongsTo(models.Kelas, { foreignKey: 'kelas_id', as: 'kelas' });
      // Prefer master_tahun_ajaran_id going forward. PeriodeAjaran (tahun_ajaran_id) was removed from DB.
      SiswaKelasHistory.belongsTo(models.MasterTahunAjaran, { foreignKey: 'master_tahun_ajaran_id', as: 'masterTahunAjaran' });
    }
  }
  SiswaKelasHistory.init({
    siswa_id: { type: DataTypes.INTEGER, allowNull: false },
    kelas_id: { type: DataTypes.INTEGER, allowNull: false },
    // DB no longer contains `tahun_ajaran_id`. Use master_tahun_ajaran_id instead.
    master_tahun_ajaran_id: { type: DataTypes.INTEGER, allowNull: true },
    semester: { type: DataTypes.ENUM('1', '2'), allowNull: true },
    note: DataTypes.TEXT,
    catatan_akademik: { type: DataTypes.TEXT, allowNull: true },
    catatan_sikap: { type: DataTypes.TEXT, allowNull: true }
  }, {
    sequelize,
    modelName: 'SiswaKelasHistory',
    tableName: 'siswa_kelas_histories'
  });
  return SiswaKelasHistory;
};
