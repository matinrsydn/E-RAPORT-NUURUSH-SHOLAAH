"use strict";
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MasterTahunAjaran extends Model {
    static associate(models) {
        // Prefer the PeriodeAjaran model (maps to table 'TahunAjarans') for clarity.
        // Keep the association name 'periodes' so code using that alias continues to work.
        MasterTahunAjaran.hasMany(models.PeriodeAjaran, {
        foreignKey: 'master_tahun_ajaran_id',
        as: 'periodes'
      });
      // Note: Kurikulum is no longer linked to MasterTahunAjaran - it only links to Tingkatan
    }
  }
  MasterTahunAjaran.init({
    nama_ajaran: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    status: {
      // normalized to lowercase values to match migration (aktif/nonaktif)
      type: DataTypes.ENUM('aktif','nonaktif'),
      defaultValue: 'nonaktif'
    }
  }, {
    sequelize,
    modelName: 'MasterTahunAjaran',
    tableName: 'MasterTahunAjarans'
  });
  return MasterTahunAjaran;
};
