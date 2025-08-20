'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MataPelajaran extends Model {
    static associate(models) {
      MataPelajaran.hasMany(models.NilaiUjian, { 
        foreignKey: 'mapel_id', // Perbaiki foreign key
        as: 'nilai_ujian' 
      });
      MataPelajaran.hasMany(models.NilaiHafalan, { 
        foreignKey: 'mapel_id', // Perbaiki foreign key 
        as: 'nilai_hafalan'
      });
    }
  }
  MataPelajaran.init({
    nama_mapel: DataTypes.STRING,
    kitab: DataTypes.STRING,
    kode_mapel: { // Tambahkan field kode_mapel
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    }
  }, { 
    sequelize, 
    modelName: 'MataPelajaran',
    hooks: {
      beforeCreate: (mapel, options) => {
        // Auto-generate kode_mapel jika tidak ada
        if (!mapel.kode_mapel) {
          mapel.kode_mapel = `MP${mapel.id?.toString().padStart(3, '0') || '000'}`;
        }
      }
    }
  });
  return MataPelajaran;
};