'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class OrangTua extends Model {
    static associate(models) {
      OrangTua.belongsTo(models.Siswa, { foreignKey: 'siswaId' });
    }
  }
  OrangTua.init({
    siswaId: DataTypes.INTEGER,
    nama_ayah: DataTypes.STRING,
    pekerjaan_ayah: DataTypes.STRING,
    alamat_ayah: DataTypes.STRING,
    nama_ibu: DataTypes.STRING,
    pekerjaan_ibu: DataTypes.STRING,
    alamat_ibu: DataTypes.STRING,
    nama_wali: DataTypes.STRING,
    pekerjaan_wali: DataTypes.STRING,
    alamat_wali: DataTypes.STRING,
  }, { sequelize, modelName: 'OrangTua' });
  return OrangTua;
};