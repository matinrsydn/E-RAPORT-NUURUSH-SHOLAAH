'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TahunAjaran extends Model {
    static associate(models) {
      TahunAjaran.hasMany(models.Kurikulum, {
        foreignKey: 'tahun_ajaran_id',
        as: 'kurikulum'
      });
    }
  }
  TahunAjaran.init({
    nama_ajaran: {
      type: DataTypes.STRING,
      allowNull: false
    },
    semester: {
      type: DataTypes.ENUM('1', '2'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('aktif', 'tidak-aktif'),
      defaultValue: 'tidak-aktif'
    }
  }, {
    sequelize,
    modelName: 'TahunAjaran',
    indexes: [
        {
            unique: true,
            fields: ['nama_ajaran', 'semester']
        }
    ]
  });
  return TahunAjaran;
};