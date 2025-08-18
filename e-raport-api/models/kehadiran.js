'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Kehadiran extends Model {
    static associate(models) {
      Kehadiran.belongsTo(models.Siswa, { foreignKey: 'siswaId' });
    }
  }
  Kehadiran.init({
    siswaId: DataTypes.INTEGER,
    kegiatan: DataTypes.STRING,
    izin: DataTypes.INTEGER,
    sakit: DataTypes.INTEGER,
    absen: DataTypes.INTEGER,
    semester: DataTypes.STRING,
    tahun_ajaran: DataTypes.STRING
  }, { sequelize, modelName: 'Kehadiran' });
  return Kehadiran;
};