// e-raport-api/models/kepalapesantren.js

'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class KepalaPesantren extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  KepalaPesantren.init({
    nama: DataTypes.STRING,
    nip: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'KepalaPesantren', // Pastikan modelName sudah diubah
  });
  return KepalaPesantren;
};