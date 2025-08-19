    'use strict';
    const { Model } = require('sequelize');
    module.exports = (sequelize, DataTypes) => {
      class Kelas extends Model {
        static associate(models) {
          // Kelas memiliki banyak Siswa
          Kelas.hasMany(models.Siswa, { foreignKey: 'kelas_id' });
          // Kelas dimiliki oleh satu WaliKelas
          Kelas.belongsTo(models.WaliKelas, { foreignKey: 'wali_kelas_id' });
        }
      }
      Kelas.init({
        nama_kelas: DataTypes.STRING,
        kapasitas: DataTypes.INTEGER,
        wali_kelas_id: DataTypes.INTEGER // Pastikan kolom ini ada
      }, {
        sequelize,
        modelName: 'Kelas',
      });
      return Kelas;
    };
    