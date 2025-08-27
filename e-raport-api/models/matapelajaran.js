'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MataPelajaran extends Model {
    static associate(models) {
      MataPelajaran.hasMany(models.NilaiUjian, {
        foreignKey: 'mapel_id',
        as: 'nilai_ujian'
      });
      MataPelajaran.hasMany(models.NilaiHafalan, {
        foreignKey: 'mapel_id',
        as: 'nilai_hafalan'
      });
    }
  }
  MataPelajaran.init({
    nama_mapel: DataTypes.STRING,
    kitab: DataTypes.STRING,
    kode_mapel: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },

    // ======================= TAMBAHKAN INI =======================
    jenis: {
      type: DataTypes.ENUM('Ujian', 'Hafalan'),
      allowNull: false,
      comment: 'Jenis mata pelajaran'
    }
    // =============================================================

  }, {
    sequelize,
    modelName: 'MataPelajaran',
    hooks: {
      beforeCreate: async (mapel, options) => {
        if (!mapel.kode_mapel) {
          const lastKode = await MataPelajaran.max('kode_mapel');
          if (lastKode) {
            const lastNum = parseInt(lastKode.replace('MP', ''), 10);
            const nextNum = lastNum + 1;
            mapel.kode_mapel = `MP${nextNum.toString().padStart(3, '0')}`;
          } else {
            mapel.kode_mapel = 'MP001';
          }
        }
      }
    }
  });
  return MataPelajaran;
};