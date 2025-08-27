// e-raport-api/models/indikatorsikap.js

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
      // definisikan asosiasi di sini
      IndikatorSikap.hasMany(models.Sikap, {
        foreignKey: 'indikator_sikap_id',
        as: 'sikap'
      });
    }
  }
  IndikatorSikap.init({
    // PERBAIKAN: Sesuaikan nilai ENUM dengan database
    jenis_sikap: DataTypes.ENUM('Spiritual', 'Sosial'),
    indikator: DataTypes.STRING,
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'IndikatorSikap',
    tableName: 'indikatorsikaps' // Tambahkan nama tabel eksplisit
  });
  return IndikatorSikap;
};