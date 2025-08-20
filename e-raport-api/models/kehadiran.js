// e-raport-api/models/kehadiran.js
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Kehadiran extends Model {
    static associate(models) {
      Kehadiran.belongsTo(models.Siswa, { foreignKey: 'siswa_id' });
    }
  }
  Kehadiran.init({
    siswa_id: DataTypes.INTEGER, // Diubah dari siswaId
    kegiatan: DataTypes.STRING,
    izin: DataTypes.INTEGER,
    sakit: DataTypes.INTEGER,
    absen: DataTypes.INTEGER,
    semester: DataTypes.STRING,
    tahun_ajaran: DataTypes.STRING
  }, { sequelize, modelName: 'Kehadiran' });
  return Kehadiran;
};