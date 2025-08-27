// e-raport-api/models/indikatorkehadiran.js
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class IndikatorKehadiran extends Model {
    static associate(models) {
      // Tidak perlu asosiasi untuk model ini
    }
  }
  IndikatorKehadiran.init({
    nama_kegiatan: DataTypes.STRING,
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'IndikatorKehadiran',
  });

  return IndikatorKehadiran;
};