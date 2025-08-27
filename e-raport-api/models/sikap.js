// e-raport-api/models/sikap.js - VERSI DIPERBAIKI
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Sikap extends Model {
    static associate(models) {
      // Relasi ke Siswa
      Sikap.belongsTo(models.Siswa, { 
        foreignKey: 'siswa_id',
        as: 'siswa'
      });
      
      // 🔥 TAMBAHAN: Relasi ke IndikatorSikap
      Sikap.belongsTo(models.IndikatorSikap, { 
        foreignKey: 'indikator_sikap_id',
        as: 'indikator_sikap'
      });
      
      // Relasi ke WaliKelas dan Kelas (opsional)
      Sikap.belongsTo(models.WaliKelas, { 
        foreignKey: 'wali_kelas_id',
        as: 'wali_kelas'
      });
      
      Sikap.belongsTo(models.Kelas, { 
        foreignKey: 'kelas_id',
        as: 'kelas'
      });
    }
  }

  Sikap.init({
    // ID siswa
    siswa_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Siswas',
        key: 'id'
      }
    },
    
    // 🔥 TAMBAHAN: Foreign key ke IndikatorSikap
    indikator_sikap_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'IndikatorSikaps',
        key: 'id'
      }
    },
    
    // 🔥 TAMBAHAN: Nilai angka untuk sikap (WAJIB)
    angka: {
      type: DataTypes.DECIMAL(4, 2), // Contoh: 8.75
      allowNull: true,
      validate: {
        min: 0,
        max: 10
      }
    },
    
    // Deskripsi/catatan sikap individual (per indikator)
    deskripsi: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Catatan umum dari wali kelas (untuk keseluruhan sikap siswa)
    catatan_wali_kelas: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Periode
    semester: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['1', '2']]
      }
    },
    
    tahun_ajaran: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^\d{4}\/\d{4}$/
      }
    },
    
    // Relasi tambahan
    wali_kelas_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    
    kelas_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, { 
    sequelize, 
    modelName: 'Sikap',
    
    // 🔥 PENTING: Unique constraint untuk mencegah duplikasi
    indexes: [
      {
        unique: true,
        fields: ['siswa_id', 'indikator_sikap_id', 'semester', 'tahun_ajaran'],
        name: 'unique_sikap_per_siswa_indikator'
      }
    ]
  });
  
  return Sikap;
};