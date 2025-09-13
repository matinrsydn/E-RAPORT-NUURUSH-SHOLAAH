// Proper sequelize-cli seeder: buat placeholder tanda tangan dan satu guru + satu kelas jika belum ada
const path = require('path');
const fs = require('fs');
const db = require('../models');

async function ensureSignaturesDir() {
  const sigDir = path.resolve(__dirname, '..', 'uploads', 'signatures');
  if (!fs.existsSync(sigDir)) fs.mkdirSync(sigDir, { recursive: true });

  const placeholderSource = path.resolve(__dirname, 'assets', 'placeholder_ttd.png');
  const placeholderDest = path.resolve(sigDir, 'placeholder_ttd.png');

  if (fs.existsSync(placeholderSource) && !fs.existsSync(placeholderDest)) {
    fs.copyFileSync(placeholderSource, placeholderDest);
  } else if (!fs.existsSync(placeholderDest)) {
    const emptyPng = Buffer.from(
      '89504e470d0a1a0a0000000d4948445200000001000000010806000000' +
      '1f15c4890000000a49444154789c6360000002000100' +
      '05fe02fea10000000049454e44ae426082',
      'hex'
    );
    fs.writeFileSync(placeholderDest, emptyPng);
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    // Pastikan direktori signatures dan placeholder ada
    await ensureSignaturesDir();

    // Buat guru jika belum ada
    const guruData = {
      nama: 'Ustadz Hadi',
      nip: 'GURU-001',
      jenis_kelamin: 'Laki-laki',
      tempat_lahir: 'Jakarta',
      tanggal_lahir: new Date('1980-01-01'),
      telepon: '08123456789',
      alamat: 'Jl. Contoh No.1',
      status: 'Aktif',
      tanda_tangan: 'placeholder_ttd.png'
    };

    const [guru, created] = await db.Guru.findOrCreate({ where: { nip: guruData.nip }, defaults: guruData });

    // Buat kelas yang diasuh oleh guru (jika belum ada)
    const kelasData = { nama_kelas: 'Kelas A', wali_kelas_id: guru.id };
    const [kelas, kelasCreated] = await db.Kelas.findOrCreate({ where: { nama_kelas: kelasData.nama_kelas }, defaults: kelasData });

    // Jika kelas sudah ada tapi wali_kelas_id belum sesuai, perbarui
    if (!kelasCreated && kelas.wali_kelas_id !== guru.id) {
      kelas.wali_kelas_id = guru.id;
      await kelas.save();
    }
  },

  async down(queryInterface, Sequelize) {
    // Hapus kelas 'Kelas A' (jika masih ada)
    await db.Kelas.destroy({ where: { nama_kelas: 'Kelas A' } });
    // Hapus guru dengan nip 'GURU-001'
    await db.Guru.destroy({ where: { nip: 'GURU-001' } });

    // Jangan hapus placeholder file karena mungkin digunakan di seeder lain
  }
};
