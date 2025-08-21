'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DraftNilai extends Model {
    static associate(models) {
      // Tidak perlu asosiasi untuk tabel sementara ini
    }
  }
  DraftNilai.init({
    upload_batch_id: DataTypes.STRING,
    row_number: DataTypes.INTEGER,
    data: DataTypes.JSON,
    is_valid: DataTypes.BOOLEAN,
    validation_errors: DataTypes.JSON
  }, {
    sequelize,
    modelName: 'DraftNilai',
  });
  return DraftNilai;
};