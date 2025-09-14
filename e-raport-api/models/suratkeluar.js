"use strict";

module.exports = (sequelize, DataTypes) => {
  const SuratKeluar = sequelize.define('SuratKeluar', {
    nomor_surat: { type: DataTypes.STRING, unique: true },
    siswa_id: { type: DataTypes.INTEGER, allowNull: false },
    jenis_keluar: { type: DataTypes.ENUM('Pindah', 'Lulus', 'DO'), allowNull: false },
    tujuan_nama_pesantren: { type: DataTypes.STRING },
    tujuan_alamat_pesantren: { type: DataTypes.TEXT },
    alasan: { type: DataTypes.TEXT },
    tanggal_surat: { type: DataTypes.DATEONLY },
    // who is responsible for the student on the letter (ayah|ibu|wali)
    penanggung_jawab: { type: DataTypes.ENUM('ayah','ibu','wali'), allowNull: true },
    // overridable name for the responsible person
    penanggung_nama: { type: DataTypes.STRING, allowNull: true }
  }, {
    tableName: 'SuratKeluars'
  });

  SuratKeluar.associate = function(models) {
    SuratKeluar.belongsTo(models.Siswa, { foreignKey: 'siswa_id', as: 'siswa' });
  };

  return SuratKeluar;
};
