'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class KelasPeriode extends Model {
    static associate(models) {
      // synthetic PK 'id' allows other models to reference a specific kelas_periode
      KelasPeriode.belongsTo(models.Kelas, { foreignKey: 'kelas_id', as: 'kelas' });
      KelasPeriode.belongsTo(models.PeriodeAjaran, { foreignKey: 'periode_ajaran_id', as: 'periode' });
    }
  }

  KelasPeriode.init({
    // id is handled by migration (autoIncrement primary key)
    kelas_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    periode_ajaran_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'KelasPeriode',
    tableName: 'kelas_periodes'
  });

  return KelasPeriode;
};
