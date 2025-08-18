'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MataPelajaran extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  MataPelajaran.init({
    nama_mapel: DataTypes.STRING,
    kitab: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'MataPelajaran',
  });
  return MataPelajaran;
};