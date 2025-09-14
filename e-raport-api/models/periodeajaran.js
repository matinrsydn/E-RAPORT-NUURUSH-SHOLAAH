"use strict";
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PeriodeAjaran extends Model {
    static associate(models) {
      PeriodeAjaran.belongsTo(models.MasterTahunAjaran, { foreignKey: 'master_tahun_ajaran_id', as: 'master' });
      // legacy associations: only register if the target model actually defines these foreign keys
      if (models.Kurikulum && models.Kurikulum.rawAttributes) {
        if (models.Kurikulum.rawAttributes.tahun_ajaran_id) {
          PeriodeAjaran.hasMany(models.Kurikulum, { foreignKey: 'tahun_ajaran_id', as: 'kurikulum' });
        }
        if (models.Kurikulum.rawAttributes.periode_ajaran_id) {
          PeriodeAjaran.hasMany(models.Kurikulum, { foreignKey: 'periode_ajaran_id', as: 'kurikulum_by_periode' });
        }
      }
      PeriodeAjaran.hasMany(models.NilaiUjian, { foreignKey: 'tahun_ajaran_id', as: 'nilaiUjian' });
      PeriodeAjaran.hasMany(models.NilaiHafalan, { foreignKey: 'tahun_ajaran_id', as: 'nilaiHafalan' });
      PeriodeAjaran.hasMany(models.Sikap, { foreignKey: 'tahun_ajaran_id', as: 'sikap' });
      PeriodeAjaran.hasMany(models.Kehadiran, { foreignKey: 'tahun_ajaran_id', as: 'kehadiran' });
      // SiswaKelasHistory will be updated to reference periode_ajaran_id in later step
      if (models.Kelas && models.KelasPeriode) {
        PeriodeAjaran.belongsToMany(models.Kelas, { through: models.KelasPeriode, foreignKey: 'periode_ajaran_id', otherKey: 'kelas_id', as: 'kelas' });
      }
    }
  }
  PeriodeAjaran.init({
    nama_ajaran: {
      type: DataTypes.STRING,
      allowNull: false
    },
    semester: {
      type: DataTypes.ENUM('1','2'),
      allowNull: false
    },
    status: {
      // normalize status values to 'aktif' / 'nonaktif'
      type: DataTypes.ENUM('aktif','nonaktif'),
      defaultValue: 'nonaktif'
    },
    master_tahun_ajaran_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'PeriodeAjaran',
    tableName: 'TahunAjarans'
  });
  return PeriodeAjaran;
};
