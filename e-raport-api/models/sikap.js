// e-raport-api/models/sikap.js
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Sikap extends Model {
    static associate(models) {
      Sikap.belongsTo(models.Siswa, { foreignKey: 'siswa_id' });
    }
  }
  Sikap.init({
    siswa_id: DataTypes.INTEGER,
    catatan: DataTypes.TEXT, // Ini adalah catatan dari wali kelas
    semester: DataTypes.STRING,
    tahun_ajaran: DataTypes.STRING,
    // Kolom tambahan yang mungkin berguna
    wali_kelas_id: DataTypes.INTEGER, 
    kelas_id: DataTypes.INTEGER
  }, { 
    sequelize, 
    modelName: 'Sikap' 
  });
  return Sikap;
};