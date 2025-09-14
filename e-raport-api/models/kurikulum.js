'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Kurikulum extends Model {
    static associate(models) {
      // Refactored: Kurikulum now links to Tingkatan only, as curriculum structure is tied to education level only
      Kurikulum.belongsTo(models.Tingkatan, { foreignKey: 'tingkatan_id', as: 'tingkatan' });
      Kurikulum.belongsTo(models.MataPelajaran, { foreignKey: 'mapel_id', as: 'mapel' });
      Kurikulum.belongsTo(models.Kitab, { foreignKey: 'kitab_id', as: 'kitab' });
    }
  }
  Kurikulum.init({
    // Link to Tingkatan instead of per-kelas periode
    tingkatan_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    mapel_id: DataTypes.INTEGER,
    kitab_id: { // kitab_id bisa null, karena mapel Ujian mungkin tidak pakai kitab
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // --- TAMBAHKAN KOLOM INI ---
    // Menyimpan target, contoh: "Juz 30", "Bab Thaharah", "Hadits ke-20"
    batas_hafalan: {
      type: DataTypes.STRING,
      allowNull: true // Hanya diisi untuk mapel jenis Hafalan
    }
  }, {
    sequelize,
    modelName: 'Kurikulum',
  });
  return Kurikulum;
};
