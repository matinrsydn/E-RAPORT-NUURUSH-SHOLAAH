'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TahunAjaran extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  TahunAjaran.init({
    nama_ajaran: DataTypes.STRING,
    semester: {
      type: DataTypes.ENUM('1', '2'),
      allowNull: false,
      defaultValue: '1'
    },
    status: {
      type: DataTypes.ENUM('aktif', 'tidak-aktif'),
      allowNull: false,
      defaultValue: 'tidak-aktif'
    }
  }, {
    sequelize,
    modelName: 'TahunAjaran',
  });

  return TahunAjaran;
};
