// =========== PERBAIKAN MODEL NILAIHAFALAN.JS ===========
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class NilaiHafalan extends Model {
    static associate(models) {
      NilaiHafalan.belongsTo(models.Siswa, { foreignKey: 'siswaId' });
      NilaiHafalan.belongsTo(models.MataPelajaran, { 
        foreignKey: 'mataPelajaranId', 
        as: 'mapel' 
      });
    }
  }
  NilaiHafalan.init({
    siswaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Siswas',
        key: 'id'
      }
    },
    mataPelajaranId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'MataPelajarans',
        key: 'id'
      }
    },
    nilai_angka: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    semester: {
      type: DataTypes.STRING,
      allowNull: false
    },
    tahun_ajaran: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, { 
    sequelize, 
    modelName: 'NilaiHafalan',
    indexes: [
      {
        unique: true,
        fields: ['siswaId', 'mataPelajaranId', 'semester', 'tahun_ajaran']
      }
    ]
  });
  return NilaiHafalan;
};

// =========== PERBAIKAN MODEL NILAIUJIAN.JS ===========
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class NilaiUjian extends Model {
    static associate(models) {
      NilaiUjian.belongsTo(models.Siswa, { 
        foreignKey: 'siswa_id',
        as: 'siswa' 
      });
      NilaiUjian.belongsTo(models.MataPelajaran, { 
        foreignKey: 'mapel_id',
        as: 'mapel' 
      });
    }
  }
  NilaiUjian.init({
    siswa_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Siswas',
        key: 'id'
      }
    },
    mapel_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'MataPelajarans',
        key: 'id'
      }
    },
    pengetahuan_angka: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    keterampilan_angka: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    semester: {
      type: DataTypes.STRING,
      allowNull: false
    },
    tahun_ajaran: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, { 
    sequelize, 
    modelName: 'NilaiUjian',
    tableName: 'NilaiUjians',
    indexes: [
      {
        unique: true,
        fields: ['siswa_id', 'mapel_id', 'semester', 'tahun_ajaran']
      }
    ]
  });
  return NilaiUjian;
};

// =========== PERBAIKAN MODEL SISWA.JS - UPDATE ASSOCIATIONS ===========
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Siswa extends Model {
    static associate(models) {
      // PERBAIKAN: Konsistensi asosiasi
      Siswa.belongsTo(models.Kelas, { foreignKey: 'kelas_id' });
      Siswa.belongsTo(models.WaliKelas, { foreignKey: 'wali_kelas_id' });
      
      // Gunakan foreign key yang konsisten dengan model NilaiUjian
      Siswa.hasMany(models.NilaiUjian, { 
        foreignKey: 'siswa_id',
        as: 'NilaiUjians' // Untuk include di template controller
      });
      
      // Gunakan foreign key yang konsisten dengan model NilaiHafalan  
      Siswa.hasMany(models.NilaiHafalan, { 
        foreignKey: 'siswaId',
        as: 'NilaiHafalans' // Untuk include di template controller
      });
      
      Siswa.hasMany(models.Sikap, { 
        foreignKey: 'siswaId', 
        as: 'Sikaps',
        onDelete: 'CASCADE' 
      });
      
      Siswa.hasMany(models.Kehadiran, { 
        foreignKey: 'siswaId', 
        as: 'Kehadirans',
        onDelete: 'CASCADE' 
      });
    }
  }
  Siswa.init({
    nama: DataTypes.STRING,
    nis: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    tempat_lahir: DataTypes.STRING,
    tanggal_lahir: DataTypes.DATE,
    jenis_kelamin: DataTypes.STRING,
    agama: DataTypes.STRING,
    alamat: DataTypes.TEXT,
    kelas_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Kelas',
        key: 'id'
      }
    },
    wali_kelas_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'WaliKelas',
        key: 'id'
      }
    },
    kamar: DataTypes.STRING,
    kota_asal: DataTypes.STRING,
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