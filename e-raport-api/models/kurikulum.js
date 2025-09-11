'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Kurikulum extends Model {
    static associate(models) {
      // Setiap entri kurikulum milik satu...
      Kurikulum.belongsTo(models.TahunAjaran, { foreignKey: 'tahun_ajaran_id', as: 'tahun_ajaran' });
      Kurikulum.belongsTo(models.Kelas, { foreignKey: 'kelas_id', as: 'kelas' });
      Kurikulum.belongsTo(models.MataPelajaran, { foreignKey: 'mapel_id', as: 'mapel' });
      Kurikulum.belongsTo(models.Kitab, { foreignKey: 'kitab_id', as: 'kitab' });
    }
  }
  Kurikulum.init({
    tahun_ajaran_id: DataTypes.INTEGER,
    kelas_id: DataTypes.INTEGER,
    semester: DataTypes.ENUM('1', '2'),
    mapel_id: DataTypes.INTEGER,
    kitab_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Kurikulum',
  });
  return Kurikulum;
};
