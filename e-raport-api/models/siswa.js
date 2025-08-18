'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Siswa extends Model {
    static associate(models) {
      Siswa.belongsTo(models.WaliKelas, { foreignKey: 'waliKelasId', as: 'wali_kelas' });
      Siswa.belongsTo(models.KepalaSekolah, { foreignKey: 'kepalaSekolahId', as: 'kepala_sekolah' });
      Siswa.hasOne(models.OrangTua, { foreignKey: 'siswaId', as: 'orang_tua' });
      Siswa.hasMany(models.NilaiUjian, { foreignKey: 'siswaId', as: 'nilai_ujian' });
      Siswa.hasMany(models.NilaiHafalan, { foreignKey: 'siswaId', as: 'nilai_hafalan' });
      Siswa.hasMany(models.Sikap, { foreignKey: 'siswaId', as: 'sikap' });
      Siswa.hasMany(models.Kehadiran, { foreignKey: 'siswaId', as: 'kehadiran' });
    }
  }
  Siswa.init({
    nama: DataTypes.STRING,
    nis: { type: DataTypes.STRING, unique: true },
    nisn: DataTypes.STRING,
    tempat_lahir: DataTypes.STRING,
    tanggal_lahir: DataTypes.DATE,
    jenis_kelamin: DataTypes.STRING,
    agama: DataTypes.STRING,
    alamat: DataTypes.STRING,
    kota_asal: DataTypes.STRING,
    kamar: DataTypes.STRING,
    kelas: DataTypes.STRING,
    waliKelasId: DataTypes.INTEGER,
    kepalaSekolahId: DataTypes.INTEGER
  }, { sequelize, modelName: 'Siswa' });
  return Siswa;
};