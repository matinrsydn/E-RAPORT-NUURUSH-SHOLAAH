'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Sikap extends Model {
    static associate(models) {
      Sikap.belongsTo(models.Siswa, { foreignKey: 'siswaId' });
    }
  }
  Sikap.init({
    siswaId: DataTypes.INTEGER,
    jenis_sikap: DataTypes.STRING, // 'Spiritual' atau 'Sosial'
    indikator: DataTypes.STRING,
    angka: DataTypes.FLOAT,
    deskripsi: DataTypes.TEXT,
    semester: DataTypes.STRING,
    tahun_ajaran: DataTypes.STRING
  }, { sequelize, modelName: 'Sikap' });
  return Sikap;
};