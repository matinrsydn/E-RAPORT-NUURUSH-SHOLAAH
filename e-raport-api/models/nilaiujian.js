'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class NilaiUjian extends Model {
    static associate(models) {
      NilaiUjian.belongsTo(models.Siswa, {
        foreignKey: 'siswa_id',
        as: 'siswa'
      });
      NilaiUjian.belongsTo(models.MataPelajaran, {
        foreignKey: 'mapel_id',
        as: 'mapel'
      });
      NilaiUjian.belongsTo(models.TahunAjaran, {
        foreignKey: 'tahun_ajaran_id',
        as: 'tahunAjaran'
      });
    }
  }
  NilaiUjian.init({
    siswa_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    mapel_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    nilai_pengetahuan: {
      type: DataTypes.DECIMAL(5,2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    nilai_keterampilan: {
      type: DataTypes.DECIMAL(5,2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    semester: {
      type: DataTypes.ENUM('1', '2'),
      allowNull: false
    },
    tahun_ajaran_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    mapel_text: {
      type: DataTypes.STRING,
      allowNull: true // Bisa null jika diperlukan
    }
  }, {
    sequelize,
    modelName: 'NilaiUjian',
    tableName: 'nilaiujians',
    indexes: [
      {
        unique: true,
        fields: ['siswa_id', 'mapel_id', 'semester', 'tahun_ajaran_id']
      }
    ]
  });
  return NilaiUjian;
};
