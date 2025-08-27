// migrations/20250827000001-migrate-existing-sikap-data.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Mengecek data sikap yang perlu dimigrasi...');
      
      // 1. Cek apakah ada data sikap lama yang perlu dimigrasi
      const existingSikaps = await queryInterface.sequelize.query(
        `SELECT * FROM "Sikaps" WHERE indikator_sikap_id IS NULL AND catatan_wali_kelas IS NOT NULL`,
        { 
          type: queryInterface.sequelize.QueryTypes.SELECT,
          transaction 
        }
      );

      if (existingSikaps.length === 0) {
        console.log('✅ Tidak ada data sikap lama yang perlu dimigrasi');
        await transaction.commit();
        return;
      }

      console.log(`📊 Ditemukan ${existingSikaps.length} data sikap lama yang perlu dimigrasi`);

      // 2. Untuk setiap data lama, buat entry baru per indikator sikap
      for (const oldSikap of existingSikaps) {
        console.log(`🔄 Memproses siswa_id: ${oldSikap.siswa_id}`);
        
        // Ambil semua indikator sikap
        const allIndikators = await queryInterface.sequelize.query(
          `SELECT id, jenis_sikap, indikator FROM "IndikatorSikaps" ORDER BY jenis_sikap, indikator`,
          { 
            type: queryInterface.sequelize.QueryTypes.SELECT,
            transaction 
          }
        );

        // Buat entry per indikator dengan nilai default
        for (const indikator of allIndikators) {
          await queryInterface.sequelize.query(
            `INSERT INTO "Sikaps" 
             (siswa_id, indikator_sikap_id, angka, deskripsi, catatan_wali_kelas, 
              semester, tahun_ajaran, wali_kelas_id, kelas_id, "createdAt", "updatedAt") 
             VALUES 
             (:siswa_id, :indikator_id, NULL, '', :catatan, 
              :semester, :tahun_ajaran, :wali_kelas_id, :kelas_id, NOW(), NOW())`,
            {
              replacements: {
                siswa_id: oldSikap.siswa_id,
                indikator_id: indikator.id,
                catatan: oldSikap.catatan_wali_kelas || '',
                semester: oldSikap.semester,
                tahun_ajaran: oldSikap.tahun_ajaran,
                wali_kelas_id: oldSikap.wali_kelas_id,
                kelas_id: oldSikap.kelas_id
              },
              transaction
            }
          );
        }

        // Hapus data lama setelah berhasil dmigrasi
        await queryInterface.sequelize.query(
          `DELETE FROM "Sikaps" WHERE id = :id`,
          {
            replacements: { id: oldSikap.id },
            transaction
          }
        );

        console.log(`✅ Berhasil migrasi data untuk siswa_id: ${oldSikap.siswa_id}`);
      }

      console.log('✅ Migrasi data sikap lama berhasil completed');
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error saat migrasi data sikap:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Rollback migrasi data tidak diimplementasikan');
      console.log('⚠️ Data yang sudah termigrasi tidak bisa dikembalikan ke format lama');
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};