// seeders/20250911-seed-gurus-with-ttd.js
// Seeder sederhana yang membuat tanda tangan guru (file) dan record Guru + Kelas menggunakan Sequelize inline code.

const path = require('path');
const fs = require('fs');
const db = require('../models');

async function run() {
  try {
    // Pastikan direktori signatures ada
    const sigDir = path.resolve(__dirname, '..', 'uploads', 'signatures');
    if (!fs.existsSync(sigDir)) {
      fs.mkdirSync(sigDir, { recursive: true });
      console.log('Membuat direktori signatures:', sigDir);
    }

    // Buat placeholder ttd (jika belum ada)
    const placeholderSource = path.resolve(__dirname, 'assets', 'placeholder_ttd.png');
    const placeholderDest = path.resolve(sigDir, 'placeholder_ttd.png');

    // Jika ada file asset placeholder di seeders/assets, salin; kalau tidak, buat placeholder kosong minimal
    if (fs.existsSync(placeholderSource) && !fs.existsSync(placeholderDest)) {
      fs.copyFileSync(placeholderSource, placeholderDest);
      console.log('Menyalin placeholder ttd dari assets.');
    } else if (!fs.existsSync(placeholderDest)) {
      // Buat file PNG kosong kecil (1x1 transparent) untuk placeholder agar controller tidak gagal
      const emptyPng = Buffer.from(
        '89504e470d0a1a0a0000000d4948445200000001000000010806000000' +
        '1f15c4890000000a49444154789c6360000002000100' +
        '05fe02fea10000000049454e44ae426082',
        'hex'
      );
      fs.writeFileSync(placeholderDest, emptyPng);
      console.log('Membuat placeholder_ttd.png baru di signatures.');
    }

    // Buat record Guru jika belum ada
    const guruData = {
      nama: 'Ustadz Hadi',
      nip: 'GURU-001',
      jenis_kelamin: 'Laki-laki',
      tempat_lahir: 'Jakarta',
      tanggal_lahir: new Date('1980-01-01'),
      telepon: '08123456789',
      alamat: 'Jl. Contoh No.1',
      status: 'Aktif',
      tanda_tangan: 'placeholder_ttd.png' // nama file di uploads/signatures
    };

    let guru = await db.Guru.findOne({ where: { nip: guruData.nip } });
    if (!guru) {
      guru = await db.Guru.create(guruData);
      console.log('Guru dibuat dengan ID:', guru.id);
    } else {
      console.log('Guru sudah ada, melewatkan pembuatan.');
    }

    // Buat kelas yang diasuh oleh guru
    const kelasData = {
      nama_kelas: 'Kelas A',
      wali_kelas_id: guru.id
    };

    let kelas = await db.Kelas.findOne({ where: { nama_kelas: kelasData.nama_kelas } });
    if (!kelas) {
      kelas = await db.Kelas.create(kelasData);
      console.log('Kelas dibuat dengan ID:', kelas.id);
    } else {
      // Pastikan wali_kelas_id terpasang
      if (kelas.wali_kelas_id !== guru.id) {
        kelas.wali_kelas_id = guru.id;
        await kelas.save();
        console.log('Memperbarui wali_kelas_id pada kelas yang sudah ada.');
      } else {
        console.log('Kelas sudah ada dan wali kelas sesuai.');
      }
    }

    console.log('Seeder guru + ttd selesai.');
    process.exit(0);
  } catch (err) {
    console.error('Gagal menjalankan seeder:', err);
    process.exit(1);
  }
}

run();
