// e-raport-api/models/sikap.js - VERSI DIPERBAIKI SESUAI DB

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
      
      // Relasi ke IndikatorSikap
      Sikap.belongsTo(models.IndikatorSikap, {
        foreignKey: 'indikator_sikap_id',
        as: 'indikator_sikap'
      });

      // 🔥 PERBAIKAN: Tambahkan relasi ke TahunAjaran
      Sikap.belongsTo(models.TahunAjaran, {
        foreignKey: 'tahun_ajaran_id',
        as: 'tahun_ajaran'
      });
    }
  }

  Sikap.init({
    siswa_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    
    // PERBAIKAN: Sesuaikan dengan skema DB (bisa NULL)
    indikator_sikap_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Di DB, ON DELETE SET NULL, jadi harus bisa null
      references: {
        model: 'IndikatorSikaps',
        key: 'id'
      }
    },
    
    indikator_text: {
        type: DataTypes.STRING,
        allowNull: true
    },

    nilai: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true
    },
    
    deskripsi: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    semester: {
      type: DataTypes.ENUM('1', '2'), // Sesuaikan dengan tipe ENUM di DB
      allowNull: false
    },
    
    // 🔥 PERBAIKAN: Ganti `tahun_ajaran` menjadi `tahun_ajaran_id`
    tahun_ajaran_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'TahunAjarans',
        key: 'id'
      }
    },
  }, { 
    sequelize, 
    modelName: 'Sikap',
    tableName: 'sikaps', // Tambahkan nama tabel eksplisit
    
    // 🔥 PENTING: Perbaiki unique constraint
    indexes: [
      {
        unique: true,
        fields: ['siswa_id', 'indikator_sikap_id', 'semester', 'tahun_ajaran_id'],
        name: 'unique_sikap_per_siswa_indikator'
      }
    ]
  });
  
  return Sikap;
};