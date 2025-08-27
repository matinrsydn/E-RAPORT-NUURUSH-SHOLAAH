'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Tambah kolom baru
    await queryInterface.addColumn('kehadirans', 'indikatorkehadirans_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // sementara null agar data bisa dimigrasi dulu
    });

    // 2. Migrasi data lama (mapping kegiatan -> indikator)
    // ⚠️ Catatan: pastikan nama kegiatan di DB persis sama dengan tabel indikatorkehadirans
    await queryInterface.sequelize.query(`
      UPDATE kehadirans k
      JOIN indikatorkehadirans i ON k.kegiatan = i.nama_kegiatan
      SET k.indikatorkehadirans_id = i.id
    `);

    // 3. Hapus kolom lama
    await queryInterface.removeColumn('kehadirans', 'kegiatan');

    // 4. Tambah foreign key
    await queryInterface.addConstraint('kehadirans', {
      fields: ['indikatorkehadirans_id'],
      type: 'foreign key',
      name: 'fk_kehadirans_indikator',
      references: {
        table: 'indikatorkehadirans',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
  },

  async down(queryInterface, Sequelize) {
    // Rollback step by step

    // 1. Tambah kembali kolom kegiatan
    await queryInterface.addColumn('kehadirans', 'kegiatan', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // 2. Isi data kegiatan dari indikator (balikin mapping)
    await queryInterface.sequelize.query(`
      UPDATE kehadirans k
      JOIN indikatorkehadirans i ON k.indikatorkehadirans_id = i.id
      SET k.kegiatan = i.nama_kegiatan
    `);

    // 3. Hapus foreign key
    await queryInterface.removeConstraint('kehadirans', 'fk_kehadirans_indikator');

    // 4. Hapus kolom indikatorkehadirans_id
    await queryInterface.removeColumn('kehadirans', 'indikatorkehadirans_id');
  }
};
