// e-raport-api/models/nilaihafalan.js
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class NilaiHafalan extends Model {
    static associate(models) {
      NilaiHafalan.belongsTo(models.Siswa, { foreignKey: 'siswa_id' });
      NilaiHafalan.belongsTo(models.MataPelajaran, {
        foreignKey: 'mapel_id',
        as: 'mapel'
      });
    }
  }
  NilaiHafalan.init({
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
    nilai_angka: {
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
    modelName: 'NilaiHafalan',
    indexes: [
      {
        unique: true,
        fields: ['siswa_id', 'mapel_id', 'semester', 'tahun_ajaran']
      }
    ]
  });
  return NilaiHafalan;
};