'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class NilaiHafalan extends Model {
    static associate(models) {
      NilaiHafalan.belongsTo(models.Siswa, { foreignKey: 'siswa_id', as: 'siswa' });
      NilaiHafalan.belongsTo(models.MataPelajaran, { foreignKey: 'mapel_id', as: 'mapel' });
      NilaiHafalan.belongsTo(models.TahunAjaran, { foreignKey: 'tahun_ajaran_id', as: 'tahunAjaran' });
    }
  }
  NilaiHafalan.init({
    siswa_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    mapel_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    nilai: {
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
    modelName: 'NilaiHafalan',
    tableName: 'nilaihafalans',
    indexes: [
      {
        unique: true,
        fields: ['siswa_id', 'mapel_id', 'semester', 'tahun_ajaran_id']
      }
    ]
  });
  return NilaiHafalan;
};
