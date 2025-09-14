'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TahunAjaran extends Model {
    static associate(models) {
      // Only add legacy association if Kurikulum model has the foreign key defined.
      if (models.Kurikulum && models.Kurikulum.rawAttributes && models.Kurikulum.rawAttributes.tahun_ajaran_id) {
        TahunAjaran.hasMany(models.Kurikulum, {
          foreignKey: 'tahun_ajaran_id',
          as: 'kurikulum'
        });
      }
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
      type: DataTypes.ENUM('aktif', 'nonaktif'),
      defaultValue: 'nonaktif'
    }
    ,
    master_tahun_ajaran_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'TahunAjaran',
  tableName: 'TahunAjarans',
  indexes: [
    {
      unique: true,
      fields: ['nama_ajaran', 'semester'],
      name: 'tahun_ajarans_nama_ajaran_semester'
    }
  ]
  });
  return TahunAjaran;
};