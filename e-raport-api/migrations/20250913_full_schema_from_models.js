"use strict";

/**
 * Migration: Create all tables from models as of 2025-09-13
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create tables in dependency order
    // 1. Master tables
    await queryInterface.createTable('MasterTahunAjarans', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nama_ajaran: { type: Sequelize.STRING, allowNull: false, unique: true },
      // Use lowercase enum values for consistency with other tables
      status: { type: Sequelize.ENUM('aktif','nonaktif'), defaultValue: 'nonaktif' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.createTable('kepalapesantrens', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nama: { type: Sequelize.STRING },
      nip: { type: Sequelize.STRING },
      tanda_tangan: { type: Sequelize.STRING },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    // 2. Tahun/Periode
    await queryInterface.createTable('TahunAjarans', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nama_ajaran: { type: Sequelize.STRING, allowNull: false },
      semester: { type: Sequelize.ENUM('1','2'), allowNull: false },
      status: { type: Sequelize.ENUM('aktif','nonaktif'), defaultValue: 'nonaktif' },
      master_tahun_ajaran_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'MasterTahunAjarans', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('TahunAjarans', ['nama_ajaran','semester'], { unique: true, name: 'tahun_ajarans_nama_ajaran_semester' });
    // 3. Basic lookups
    await queryInterface.createTable('IndikatorKehadirans', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nama_kegiatan: { type: Sequelize.STRING },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.createTable('indikatorsikaps', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      jenis_sikap: { type: Sequelize.ENUM('Spiritual','Sosial') },
      indikator: { type: Sequelize.STRING },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.createTable('kamars', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nama_kamar: { type: Sequelize.STRING },
      kapasitas: { type: Sequelize.INTEGER },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.createTable('gurus', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nama: { type: Sequelize.STRING },
      nip: { type: Sequelize.STRING },
      jenis_kelamin: { type: Sequelize.ENUM('Laki-laki','Perempuan') },
      tempat_lahir: { type: Sequelize.STRING },
      tanggal_lahir: { type: Sequelize.DATE },
      telepon: { type: Sequelize.STRING },
      alamat: { type: Sequelize.TEXT },
      // normalize enum casing to lowercase
      status: { type: Sequelize.ENUM('aktif','nonaktif') }, 
      tanda_tangan: { type: Sequelize.STRING },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    // 4. Kelas, Siswa
    await queryInterface.createTable('kelas', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nama_kelas: { type: Sequelize.STRING },
      kapasitas: { type: Sequelize.INTEGER },
      wali_kelas_id: { type: Sequelize.INTEGER, references: { model: 'gurus', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      // self-referential FK to indicate the 'next' class (for promotion flows)
      next_kelas_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'kelas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.createTable('Siswas', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nama: { type: Sequelize.STRING },
      nis: { type: Sequelize.STRING, allowNull: false, unique: true },
      tempat_lahir: { type: Sequelize.STRING },
      tanggal_lahir: { type: Sequelize.DATE },
      jenis_kelamin: { type: Sequelize.ENUM('Laki-laki','Perempuan') },
      agama: { type: Sequelize.STRING },
      alamat: { type: Sequelize.TEXT },
      kelas_id: { type: Sequelize.INTEGER, references: { model: 'kelas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      kamar_id: { type: Sequelize.INTEGER, references: { model: 'kamars', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
  // removed redundant 'kamar' text field; prefer joining kamar_id -> kamars.nama_kamar when name is needed
      kota_asal: { type: Sequelize.STRING },
      nama_ayah: { type: Sequelize.STRING },
      pekerjaan_ayah: { type: Sequelize.STRING },
      alamat_ayah: { type: Sequelize.TEXT },
      nama_ibu: { type: Sequelize.STRING },
      pekerjaan_ibu: { type: Sequelize.STRING },
      alamat_ibu: { type: Sequelize.TEXT },
      nama_wali: { type: Sequelize.STRING },
      pekerjaan_wali: { type: Sequelize.STRING },
      alamat_wali: { type: Sequelize.TEXT },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    // 5. KelasPeriode junction
    await queryInterface.createTable('kelas_periodes', {
      // Add synthetic primary key to support other FK references and allow unique constraint on the pair
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kelas_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'kelas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      periode_ajaran_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'TahunAjarans', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    // Ensure uniqueness of pair (kelas_id, periode_ajaran_id)
    await queryInterface.addIndex('kelas_periodes', ['kelas_id', 'periode_ajaran_id'], { unique: true, name: 'kelas_periodes_kelas_id_periode_ajaran_id' });
    // 6. Kurikulum
    await queryInterface.createTable('MataPelajarans', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nama_mapel: { type: Sequelize.STRING },
      jenis: { type: Sequelize.ENUM('Ujian','Hafalan') },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.createTable('Kitabs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nama_kitab: { type: Sequelize.STRING },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.createTable('Kurikulums', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      // kelas_periode_id references the synthetic PK 'id' on kelas_periodes
      kelas_periode_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'kelas_periodes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      semester: { type: Sequelize.ENUM('1','2') },
      mapel_id: { type: Sequelize.INTEGER, references: { model: 'MataPelajarans', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'NO ACTION' },
      kitab_id: { type: Sequelize.INTEGER, references: { model: 'Kitabs', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      batas_hafalan: { type: Sequelize.STRING },
      // Removed direct tahun_ajaran_id: relation is derived from kelas_periode -> periode_ajaran
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    // 7. Nilai & related
    await queryInterface.createTable('nilaihafalans', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      siswa_id: { type: Sequelize.INTEGER, references: { model: 'Siswas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'NO ACTION' },
      mapel_id: { type: Sequelize.INTEGER, references: { model: 'MataPelajarans', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'NO ACTION' },
      tahun_ajaran_id: { type: Sequelize.INTEGER, references: { model: 'TahunAjarans', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'NO ACTION' },
      semester: { type: Sequelize.ENUM('1','2'), allowNull: false },
      predikat: { type: Sequelize.ENUM('Tercapai','Tidak Tercapai') },
      mapel_text: { type: Sequelize.STRING },
      deskripsi: { type: Sequelize.TEXT },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('nilaihafalans', ['siswa_id','mapel_id','semester','tahun_ajaran_id'], { unique: true, name: 'nilaihafalans_siswa_id_mapel_id_semester_tahun_ajaran_id' });
    await queryInterface.createTable('nilaiujians', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      siswa_id: { type: Sequelize.INTEGER, references: { model: 'Siswas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'NO ACTION' },
      mapel_id: { type: Sequelize.INTEGER, references: { model: 'MataPelajarans', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'NO ACTION' },
      nilai: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      deskripsi: { type: Sequelize.TEXT },
      semester: { type: Sequelize.ENUM('1','2'), allowNull: false },
      tahun_ajaran_id: { type: Sequelize.INTEGER, references: { model: 'TahunAjarans', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'NO ACTION' },
      mapel_text: { type: Sequelize.STRING },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('nilaiujians', ['siswa_id','mapel_id','semester','tahun_ajaran_id'], { unique: true, name: 'nilaiujians_siswa_id_mapel_id_semester_tahun_ajaran_id' });
    await queryInterface.createTable('kehadirans', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      siswa_id: { type: Sequelize.INTEGER, references: { model: 'Siswas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'NO ACTION' },
      indikatorkehadirans_id: { type: Sequelize.INTEGER, references: { model: 'IndikatorKehadirans', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      indikator_text: { type: Sequelize.STRING },
      izin: { type: Sequelize.INTEGER, defaultValue: 0 },
      sakit: { type: Sequelize.INTEGER, defaultValue: 0 },
      absen: { type: Sequelize.INTEGER, defaultValue: 0 },
      semester: { type: Sequelize.ENUM('1','2'), allowNull: false },
      tahun_ajaran_id: { type: Sequelize.INTEGER, references: { model: 'TahunAjarans', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'NO ACTION' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('kehadirans', ['siswa_id','indikatorkehadirans_id','semester','tahun_ajaran_id'], { unique: true, name: 'unique_kehadiran_siswa' });
    await queryInterface.createTable('sikaps', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      siswa_id: { type: Sequelize.INTEGER, references: { model: 'Siswas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'NO ACTION' },
      indikator_sikap_id: { type: Sequelize.INTEGER, references: { model: 'indikatorsikaps', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      indikator_text: { type: Sequelize.STRING },
      nilai: { type: Sequelize.DECIMAL(4,2) },
      deskripsi: { type: Sequelize.TEXT },
      semester: { type: Sequelize.ENUM('1','2'), allowNull: false },
      tahun_ajaran_id: { type: Sequelize.INTEGER, references: { model: 'TahunAjarans', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('sikaps', ['siswa_id','indikator_sikap_id','semester','tahun_ajaran_id'], { unique: true, name: 'unique_sikap_per_siswa_indikator' });
    await queryInterface.createTable('siswa_kelas_histories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      siswa_id: { type: Sequelize.INTEGER, references: { model: 'Siswas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      kelas_id: { type: Sequelize.INTEGER, references: { model: 'kelas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'NO ACTION' },
      tahun_ajaran_id: { type: Sequelize.INTEGER, references: { model: 'TahunAjarans', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'NO ACTION' },
      note: { type: Sequelize.TEXT },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.createTable('promosi_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tahun_ajaran_from_id: { type: Sequelize.INTEGER, references: { model: 'TahunAjarans', key: 'id' } },
      tahun_ajaran_to_id: { type: Sequelize.INTEGER, references: { model: 'TahunAjarans', key: 'id' } },
      kelas_from_id: { type: Sequelize.INTEGER, references: { model: 'kelas', key: 'id' } },
      kelas_to_id: { type: Sequelize.INTEGER, references: { model: 'kelas', key: 'id' } },
      executed_by: { type: Sequelize.INTEGER },
      note: { type: Sequelize.TEXT },
      createdAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.createTable('SuratKeluars', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nomor_surat: { type: Sequelize.STRING, unique: true },
      siswa_id: { type: Sequelize.INTEGER, references: { model: 'Siswas', key: 'id' } },
      jenis_keluar: { type: Sequelize.ENUM('Pindah','Lulus','DO') },
      tujuan_nama_pesantren: { type: Sequelize.STRING },
      tujuan_alamat_pesantren: { type: Sequelize.TEXT },
      alasan: { type: Sequelize.TEXT },
      tanggal_surat: { type: Sequelize.DATE },
      penanggung_jawab: { type: Sequelize.ENUM('ayah','ibu','wali') },
      penanggung_nama: { type: Sequelize.STRING },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    // DraftNilais table intentionally omitted; Excel parser + upload flow replaced DraftNilais usage.
  },
  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order
    await queryInterface.dropTable('SuratKeluars');
    await queryInterface.dropTable('promosi_logs');
    await queryInterface.dropTable('siswa_kelas_histories');
    await queryInterface.dropTable('sikaps');
    await queryInterface.dropTable('kehadirans');
    await queryInterface.dropTable('nilaiujians');
    await queryInterface.dropTable('nilaihafalans');
    await queryInterface.dropTable('Kurikulums');
    await queryInterface.dropTable('Kitabs');
    await queryInterface.dropTable('MataPelajarans');
    await queryInterface.dropTable('kelas_periodes');
    await queryInterface.dropTable('Siswas');
    await queryInterface.dropTable('kelas');
    await queryInterface.dropTable('gurus');
    await queryInterface.dropTable('kamars');
    await queryInterface.dropTable('indikatorsikaps');
    await queryInterface.dropTable('IndikatorKehadirans');
    await queryInterface.dropTable('TahunAjarans');
    await queryInterface.dropTable('kepalapesantrens');
    await queryInterface.dropTable('MasterTahunAjarans');
  }
};
