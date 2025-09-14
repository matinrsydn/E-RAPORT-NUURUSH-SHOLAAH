"use strict";

module.exports = (sequelize, DataTypes) => {
  const Tingkatan = sequelize.define('Tingkatan', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nama_tingkatan: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    urutan: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'Tingkatans'
  });

  Tingkatan.associate = function(models) {
    Tingkatan.hasMany(models.Kelas, { foreignKey: 'tingkatan_id', as: 'kelas' });
    // Each Tingkatan can have its own Kurikulum for a given PeriodeAjaran
    Tingkatan.hasMany(models.Kurikulum, { foreignKey: 'tingkatan_id', as: 'kurikulum' });
  };

  return Tingkatan;
};
