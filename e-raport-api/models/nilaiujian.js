// e-raport-api/models/nilaiujian.js
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
    }
  }
  NilaiUjian.init({
    siswa_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Siswas',
        key: 'id'
      }
    },
    mapel_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'MataPelajarans',
        key: 'id'
      }
    },
    pengetahuan_angka: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    keterampilan_angka: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    semester: {
      type: DataTypes.STRING,
      allowNull: false
    },
    tahun_ajaran: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'NilaiUjian',
    tableName: 'NilaiUjians',
    indexes: [
      {
        unique: true,
        fields: ['siswa_id', 'mapel_id', 'semester', 'tahun_ajaran']
      }
    ]
  });
  return NilaiUjian;
};