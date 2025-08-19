'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class IndikatorSikap extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  IndikatorSikap.init({
    jenis_sikap: DataTypes.ENUM('spiritual', 'sosial'),
    indikator: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'IndikatorSikap',
  });
  return IndikatorSikap;
};