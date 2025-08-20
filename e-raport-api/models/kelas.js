    'use strict';
    const { Model } = require('sequelize');
    module.exports = (sequelize, DataTypes) => {
      class Kelas extends Model {
        static associate(models) {
          Kelas.hasMany(models.Siswa, {
            foreignKey: 'kelas_id',
            as: 'siswa'
          });
          // PERBAIKAN: Tambahkan alias 'as' di sini
          Kelas.belongsTo(models.WaliKelas, {
            foreignKey: 'wali_kelas_id',
            as: 'walikelas' // Tambahkan baris ini
          });
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
    