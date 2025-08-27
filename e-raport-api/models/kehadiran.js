'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Kehadiran extends Model {
    static associate(models) {
      Kehadiran.belongsTo(models.Siswa, {
        foreignKey: 'siswa_id',
        as: 'siswa'
      });
      Kehadiran.belongsTo(models.IndikatorKehadiran, {
        foreignKey: 'indikatorkehadirans_id',
        as: 'indikator'
      });
      Kehadiran.belongsTo(models.TahunAjaran, {
        foreignKey: 'tahun_ajaran_id',
        as: 'tahunAjaran'
      });
    }
  }

  Kehadiran.init({
    siswa_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    indikatorkehadirans_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    indikator_text: {
      type: DataTypes.STRING,
      allowNull: true
    },
    izin: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    sakit: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    absen: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    semester: {
      type: DataTypes.ENUM('1', '2'),
      allowNull: false
    },
    tahun_ajaran_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Kehadiran',
    tableName: 'kehadirans',
    indexes: [
      {
        unique: true,
        fields: ['siswa_id', 'indikatorkehadirans_id', 'semester', 'tahun_ajaran_id']
      }
    ]
  });

  return Kehadiran;
};
