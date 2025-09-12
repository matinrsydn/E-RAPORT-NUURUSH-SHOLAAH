"use strict";
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PromosiLog extends Model {
    static associate(models) {
      PromosiLog.belongsTo(models.TahunAjaran, { foreignKey: 'tahun_ajaran_from_id', as: 'fromTahunAjaran' });
      PromosiLog.belongsTo(models.TahunAjaran, { foreignKey: 'tahun_ajaran_to_id', as: 'toTahunAjaran' });
      PromosiLog.belongsTo(models.Kelas, { foreignKey: 'kelas_from_id', as: 'kelasFrom' });
      PromosiLog.belongsTo(models.Kelas, { foreignKey: 'kelas_to_id', as: 'kelasTo' });
      // executed_by may reference Users table if exists
    }
  }
  PromosiLog.init({
    tahun_ajaran_from_id: DataTypes.INTEGER,
    tahun_ajaran_to_id: DataTypes.INTEGER,
    kelas_from_id: DataTypes.INTEGER,
    kelas_to_id: DataTypes.INTEGER,
    executed_by: DataTypes.INTEGER,
    note: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'PromosiLog',
    tableName: 'promosi_logs',
    timestamps: true,
    createdAt: true,
    updatedAt: false
  });
  return PromosiLog;
};
