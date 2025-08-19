'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Siswa extends Model {
    static associate(models) {
      Siswa.belongsTo(models.WaliKelas, { foreignKey: 'wali_kelas_id', as: 'wali_kelas' });
      // PERUBAHAN: Mengganti relasi ke KepalaPesantren
      Siswa.belongsTo(models.KepalaPesantren, { foreignKey: 'kepala_pesantren_id', as: 'kepala_pesantren' });
      Siswa.hasMany(models.NilaiUjian, { foreignKey: 'siswaId', as: 'nilai_ujian', onDelete: 'CASCADE' });
      Siswa.hasMany(models.NilaiHafalan, { foreignKey: 'siswaId', as: 'nilai_hafalan', onDelete: 'CASCADE' });
      Siswa.hasMany(models.Sikap, { foreignKey: 'siswaId', as: 'sikap', onDelete: 'CASCADE' });
      Siswa.hasMany(models.Kehadiran, { foreignKey: 'siswaId', as: 'kehadiran', onDelete: 'CASCADE' });
    }
  }
  Siswa.init({
    nama: DataTypes.STRING,
    nis: DataTypes.STRING,
    tempat_lahir: DataTypes.STRING,
    tanggal_lahir: DataTypes.DATE,
    jenis_kelamin: DataTypes.STRING,
    agama: DataTypes.STRING,
    alamat: DataTypes.TEXT,
    kelas: DataTypes.STRING,
    wali_kelas_id: DataTypes.INTEGER,
    // PERUBAHAN: Mengganti nama kolom foreign key
    kepala_pesantren_id: DataTypes.INTEGER,
    nama_ayah: DataTypes.STRING,
    pekerjaan_ayah: DataTypes.STRING,
    alamat_ayah: DataTypes.TEXT,
    nama_ibu: DataTypes.STRING,
    pekerjaan_ibu: DataTypes.STRING,
    alamat_ibu: DataTypes.TEXT,
    nama_wali: DataTypes.STRING,
    pekerjaan_wali: DataTypes.STRING,
    alamat_wali: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'Siswa',
  });
  return Siswa;
};