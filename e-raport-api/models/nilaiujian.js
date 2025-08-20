'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class NilaiUjian extends Model {
    static associate(models) {
      // Perbaiki nama foreign key untuk konsistensi
      NilaiUjian.belongsTo(models.Siswa, { 
        foreignKey: 'siswa_id', // Gunakan siswa_id bukan siswaId
        as: 'siswa' 
      });
      NilaiUjian.belongsTo(models.MataPelajaran, { 
        foreignKey: 'mapel_id', // Gunakan mapel_id bukan mataPelajaranId
        as: 'mapel' 
      });
    }
  }
  NilaiUjian.init({
    siswa_id: DataTypes.INTEGER, // Ubah dari siswaId ke siswa_id
    mapel_id: DataTypes.INTEGER, // Ubah dari mataPelajaranId ke mapel_id
    pengetahuan_angka: DataTypes.INTEGER,
    keterampilan_angka: DataTypes.INTEGER,
    semester: DataTypes.STRING,
    tahun_ajaran: DataTypes.STRING
  }, { 
    sequelize, 
    modelName: 'NilaiUjian',
    tableName: 'NilaiUjians' // Pastikan nama tabel konsisten
  });
  return NilaiUjian;
};