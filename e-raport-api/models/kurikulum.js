'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Kurikulum extends Model {
    static associate(models) {
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
