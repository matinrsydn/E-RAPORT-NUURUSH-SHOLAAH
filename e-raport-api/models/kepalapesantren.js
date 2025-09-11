// file: models/kepalaPesantren.js

'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class KepalaPesantren extends Model {
    static associate(models) {
      // define association here
    }
  }
  KepalaPesantren.init({
    nama: DataTypes.STRING,
    nip: DataTypes.STRING,
    
    // --- TAMBAHKAN BARIS INI ---
    tanda_tangan: DataTypes.STRING
    
  }, {
    sequelize,
    modelName: 'KepalaPesantren',
    tableName: 'kepalapesantrens'
  });
  return KepalaPesantren;
};