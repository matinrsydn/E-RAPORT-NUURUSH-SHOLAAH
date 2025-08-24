// e-raport-api/debug.js
// Jalankan dengan: node debug.js

const db = require('./models');

async function debugAll() {
  try {
    console.log('='.repeat(50));
    console.log('🔍 STARTING DEBUG SESSION');
    console.log('='.repeat(50));

    // 1. Test database connection
    console.log('\n1️⃣ Testing database connection...');
    await db.sequelize.authenticate();
    console.log('✅ Database connection OK');

    // 2. Check IndikatorKehadiran
    console.log('\n2️⃣ Checking IndikatorKehadiran...');
    const indikator = await db.IndikatorKehadiran.findAll({
      order: [['nama_kegiatan', 'ASC']]
    });
    
    console.log(`📊 Total IndikatorKehadiran: ${indikator.length}`);
    
    if (indikator.length === 0) {
      console.log('❌ TIDAK ADA DATA - Adding default data...');
      
      const defaultKegiatan = [
        'Shalat Berjamaah',
        'Mengaji',
        'Piket',
        'Tahfidz',
        'Sekolah'
      ];
      
      for (const kegiatan of defaultKegiatan) {
        await db.IndikatorKehadiran.create({ nama_kegiatan: kegiatan });
        console.log(`✅ Added: ${kegiatan}`);
      }
    } else {
      console.log('📋 Available IndikatorKehadiran:');
      indikator.forEach((ind, idx) => {
        console.log(`   ${idx + 1}. ID: ${ind.id}, Nama: "${ind.nama_kegiatan}"`);
      });
    }

    // 3. Check Siswa data
    console.log('\n3️⃣ Checking Siswa data...');
    const siswa = await db.Siswa.findAll({
      limit: 5,
      include: ['kelas']
    });
    console.log(`📊 Total Siswa (sample): ${siswa.length}`);
    siswa.forEach(s => {
      console.log(`   - NIS: ${s.nis}, Nama: ${s.nama}, Kelas: ${s.kelas?.nama || 'No Kelas'}`);
    });

    // 4. Check Kehadiran data
    console.log('\n4️⃣ Checking Kehadiran data...');
    const kehadiran = await db.Kehadiran.findAll({
      limit: 10,
      include: [{
        model: db.Siswa,
        attributes: ['nama', 'nis']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📊 Total Kehadiran records (latest 10): ${kehadiran.length}`);
    if (kehadiran.length === 0) {
      console.log('❌ TIDAK ADA DATA KEHADIRAN!');
    } else {
      kehadiran.forEach((record, idx) => {
        console.log(`   ${idx + 1}. ${record.Siswa?.nama} - ${record.kegiatan}: izin=${record.izin}, sakit=${record.sakit}, absen=${record.absen}`);
      });
    }

    // 5. Check DraftNilai
    console.log('\n5️⃣ Checking latest DraftNilai...');
    const drafts = await db.DraftNilai.findAll({
      limit: 3,
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📊 Latest Draft entries: ${drafts.length}`);
    drafts.forEach((draft, idx) => {
      console.log(`   ${idx + 1}. Batch: ${draft.upload_batch_id}, NIS: ${draft.data.nis}, Valid: ${draft.is_valid}`);
      if (draft.data.kehadiran_detail) {
        console.log(`      Kehadiran Detail: ${draft.data.kehadiran_detail.length} items`);
        draft.data.kehadiran_detail.slice(0, 2).forEach(detail => {
          console.log(`        - ${detail.kegiatan}: izin=${detail.izin}, sakit=${detail.sakit}, absen=${detail.absen}`);
        });
      } else {
        console.log(`      ❌ NO kehadiran_detail!`);
      }
    });

    console.log('\n='.repeat(50));
    console.log('✅ DEBUG SESSION COMPLETE');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ DEBUG ERROR:', error);
  } finally {
    process.exit(0);
  }
}

// Jalankan debug
debugAll();