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
    // --- TAMBAHKAN ATRIBUT INI SECARA MANUAL ---
    status: {
      type: DataTypes.ENUM('aktif', 'tidak-aktif'),
      allowNull: false,
      defaultValue: 'tidak-aktif'
    }
    // -------------------------------------------
  }, {
    sequelize,
    modelName: 'TahunAjaran',
  });
  return TahunAjaran;
};
