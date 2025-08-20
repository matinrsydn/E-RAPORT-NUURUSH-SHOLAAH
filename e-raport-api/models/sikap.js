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
    siswa_id: DataTypes.INTEGER, // Diubah dari siswaId
    jenis_sikap: DataTypes.STRING,
    indikator: DataTypes.STRING,
    angka: DataTypes.FLOAT,
    deskripsi: DataTypes.TEXT,
    semester: DataTypes.STRING,
    tahun_ajaran: DataTypes.STRING
  }, { sequelize, modelName: 'Sikap' });
  return Sikap;
};