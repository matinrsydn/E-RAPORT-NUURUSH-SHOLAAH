// seeders/20250911-seed-raport-sample-data.js
// Seeder untuk membuat data minimal: TahunAjaran, Siswa, NilaiUjian (nilai), NilaiHafalan (baru), Sikap, Kehadiran

const db = require('../models');

async function run() {
  try {
  // Pastikan skema terbaru diterapkan sebelum membuat data (jalankan sync alter)
  await db.sequelize.sync({ alter: true });
  console.log('DB disinkronkan (seeder) - alter: true');

    // 1. Tahun Ajaran
    let tahun = await db.TahunAjaran.findOne({ where: { nama_ajaran: '2024/2025' } });
    if (!tahun) {
      tahun = await db.TahunAjaran.create({ nama_ajaran: '2024/2025', semester: '1' });
      console.log('TahunAjaran dibuat:', tahun.id);
    }

    // 2. Ambil kelas yang sudah dibuat oleh seeder guru
    let kelas = await db.Kelas.findOne({ where: { nama_kelas: 'Kelas A' } });
    if (!kelas) {
      kelas = await db.Kelas.create({ nama_kelas: 'Kelas A' });
      console.log('Membuat kelas A');
    }

    // 3. Buat siswa contoh
    let siswa = await db.Siswa.findOne({ where: { nis: 'SISWA-001' } });
    if (!siswa) {
      siswa = await db.Siswa.create({
        nama: 'Ahmad',
        nis: 'SISWA-001',
        tempat_lahir: 'Bandung',
        tanggal_lahir: new Date('2008-05-10'),
        jenis_kelamin: 'Laki-laki',
        agama: 'Islam',
        alamat: 'Jl. Contoh',
        kelas_id: kelas.id,
        kamar_id: null
      });
      console.log('Siswa dibuat:', siswa.id);
    }

    // 4. NilaiUjian (single nilai per mapel)
    const mapel = await db.MataPelajaran.findOne();
    if (mapel) {
      const nilaiData = {
        siswa_id: siswa.id,
        mapel_id: mapel.id,
        nilai: 85.5,
        semester: tahun.semester,
        tahun_ajaran_id: tahun.id,
        mapel_text: mapel.nama_mapel
      };
      const existing = await db.NilaiUjian.findOne({ where: { siswa_id: siswa.id, mapel_id: mapel.id, semester: tahun.semester, tahun_ajaran_id: tahun.id } });
      if (!existing) {
        await db.NilaiUjian.create(nilaiData);
        console.log('NilaiUjian dibuat.');
      }
    } else {
      console.log('Tidak ada MataPelajaran ditemukan, lewati pembuatan nilai ujian contoh.');
    }

    // 5. NilaiHafalan (baru) - align with current NilaiHafalan model fields
    // model fields: siswa_id, mapel_id, tahun_ajaran_id, semester, nilai, predikat, mapel_text
    if (mapel) {
      const hafalanData = {
        siswa_id: siswa.id,
        mapel_id: mapel.id,
        predikat: 'Tercapai',
        semester: tahun.semester,
        tahun_ajaran_id: tahun.id,
        mapel_text: mapel.nama_mapel
      };
      const hafalanWhere = { siswa_id: siswa.id, mapel_id: mapel.id, semester: tahun.semester, tahun_ajaran_id: tahun.id };
      const existingHaf = await db.NilaiHafalan.findOne({ where: hafalanWhere });
      if (!existingHaf) {
        await db.NilaiHafalan.create(hafalanData);
        console.log('NilaiHafalan dibuat.');
      }
    } else {
      console.log('Tidak ada MataPelajaran ditemukan, lewati pembuatan nilai hafalan contoh.');
    }

    // 6. Sikap minimal
    const indikator = await db.IndikatorSikap.findOne();
    if (indikator) {
      const sikapData = {
        siswa_id: siswa.id,
        indikator_sikap_id: indikator.id,
        indikator_text: indikator.nama_indikator || 'Disiplin',
        nilai: 85,
        semester: tahun.semester,
        tahun_ajaran_id: tahun.id
      };
      const existSikap = await db.Sikap.findOne({ where: { siswa_id: siswa.id, indikator_sikap_id: indikator.id, semester: tahun.semester, tahun_ajaran_id: tahun.id } });
      if (!existSikap) {
        await db.Sikap.create(sikapData);
        console.log('Sikap dibuat.');
      }
    } else {
      console.log('Tidak ada indikator sikap, lewati pembuatan sikap contoh.');
    }

    // 7. Kehadiran minimal
    const kehadiranData = {
      siswa_id: siswa.id,
      indikator_text: 'Kehadiran',
      izin: 1,
      sakit: 0,
      absen: 2,
      semester: tahun.semester,
      tahun_ajaran_id: tahun.id
    };
    const existKeh = await db.Kehadiran.findOne({ where: { siswa_id: siswa.id, indikator_text: 'Kehadiran', semester: tahun.semester, tahun_ajaran_id: tahun.id } });
    if (!existKeh) {
      await db.Kehadiran.create(kehadiranData);
      console.log('Kehadiran dibuat.');
    }

    console.log('Seeder raport sample data selesai.');
    process.exit(0);
  } catch (err) {
    console.error('Gagal menjalankan seeder raport sample:', err);
    process.exit(1);
  }
}

run();
