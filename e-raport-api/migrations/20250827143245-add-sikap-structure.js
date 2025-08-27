// migrations/20250827143245-add-sikap-structure.js - FINAL FIXED VERSION
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Starting Sikap structure migration...');
      
      // 1. FIRST: Check current table structure
      const tableDescription = await queryInterface.describeTable('Sikaps');
      console.log('📋 Current Sikaps table columns:', Object.keys(tableDescription));
      
      // 2. Add missing columns if they don't exist
      if (!tableDescription.indikator_sikap_id) {
        console.log('📋 Adding indikator_sikap_id column...');
        await queryInterface.addColumn('Sikaps', 'indikator_sikap_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'IndikatorSikaps',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        }, { transaction });
      }

      if (!tableDescription.nilai) {
        console.log('📋 Adding nilai column...');
        await queryInterface.addColumn('Sikaps', 'nilai', {
          type: Sequelize.DECIMAL(4, 2),
          allowNull: true
        }, { transaction });
      }

      if (!tableDescription.deskripsi) {
        console.log('📋 Adding deskripsi column...');
        await queryInterface.addColumn('Sikaps', 'deskripsi', {
          type: Sequelize.TEXT,
          allowNull: true
        }, { transaction });
      }

      if (!tableDescription.catatan_wali_kelas) {
        console.log('📋 Adding catatan_wali_kelas column...');
        await queryInterface.addColumn('Sikaps', 'catatan_wali_kelas', {
          type: Sequelize.TEXT,
          allowNull: true
        }, { transaction });
      }

      // 3. NOW check for old data (after columns are added)
      console.log('🔄 Checking for old sikap data to migrate...');
      
      // Check for records that might be old format (have catatan but no indikator_sikap_id)
      const existingSikaps = await queryInterface.sequelize.query(
        `SELECT * FROM Sikaps WHERE indikator_sikap_id IS NULL AND (catatan IS NOT NULL OR catatan_wali_kelas IS NOT NULL)`,
        { 
          type: queryInterface.sequelize.QueryTypes.SELECT,
          transaction 
        }
      );

      if (existingSikaps.length === 0) {
        console.log('✅ No old sikap data found to migrate');
        
        // Add unique constraint if it doesn't exist
        try {
          await queryInterface.addConstraint('Sikaps', {
            fields: ['siswa_id', 'indikator_sikap_id', 'semester', 'tahun_ajaran'],
            type: 'unique',
            name: 'unique_sikap_per_siswa_indikator'
          }, { transaction });
          console.log('✅ Added unique constraint to Sikaps table');
        } catch (error) {
          console.log('⚠️ Unique constraint might already exist or failed to add:', error.message);
        }
        
        await transaction.commit();
        return;
      }

      console.log(`📊 Found ${existingSikaps.length} old sikap records to migrate`);

      // 4. Get all available indikator sikap
      const allIndikators = await queryInterface.sequelize.query(
        `SELECT id, jenis_sikap, indikator FROM IndikatorSikaps ORDER BY jenis_sikap, indikator`,
        { 
          type: queryInterface.sequelize.QueryTypes.SELECT,
          transaction 
        }
      );

      if (allIndikators.length === 0) {
        console.log('⚠️ No IndikatorSikap found. Creating default indikators...');
        
        // Create default indikators if none exist
        const defaultIndikators = [
          ['spiritual', 'Berdoa sebelum dan sesudah melakukan kegiatan'],
          ['spiritual', 'Melaksanakan ibadah sesuai dengan agamanya'],
          ['spiritual', 'Bersyukur atas nikmat dan karunia Allah'],
          ['sosial', 'Menunjukkan sikap responsif dan pro-aktif'],
          ['sosial', 'Menghargai perbedaan pendapat'],
          ['sosial', 'Menunjukkan sikap jujur dalam kehidupan sehari-hari']
        ];

        for (const [jenis, indikator] of defaultIndikators) {
          await queryInterface.sequelize.query(
            `INSERT INTO IndikatorSikaps (jenis_sikap, indikator, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())`,
            {
              replacements: [jenis, indikator],
              transaction
            }
          );
        }

        // Re-fetch the indikators after creating them
        const newIndikators = await queryInterface.sequelize.query(
          `SELECT id, jenis_sikap, indikator FROM IndikatorSikaps ORDER BY jenis_sikap, indikator`,
          { 
            type: queryInterface.sequelize.QueryTypes.SELECT,
            transaction 
          }
        );
        
        allIndikators.push(...newIndikators);
      }

      console.log(`📋 Found ${allIndikators.length} indikator sikap to create entries for`);

      // 5. Migrate each old record
      for (const oldSikap of existingSikaps) {
        console.log(`🔄 Migrating siswa_id: ${oldSikap.siswa_id}`);
        
        // Create entry for each indikator
        for (const indikator of allIndikators) {
          await queryInterface.sequelize.query(
            `INSERT INTO Sikaps 
            (siswa_id, indikator_sikap_id, nilai, deskripsi, catatan_wali_kelas, semester, tahun_ajaran, createdAt, updatedAt)
            VALUES (?, ?, NULL, '', ?, ?, ?, NOW(), NOW())
            `,
            {
              replacements: [
                oldSikap.siswa_id,
                indikator.id,
                oldSikap.catatan_wali_kelas || oldSikap.catatan || '',
                oldSikap.semester,
                oldSikap.tahun_ajaran,
                oldSikap.wali_kelas_id,
                oldSikap.kelas_id
              ],
              transaction
            }
          );
        }

        // Delete old record after successful migration
        await queryInterface.sequelize.query(
          `DELETE FROM Sikaps WHERE id = ?`,
          {
            replacements: [oldSikap.id],
            transaction
          }
        );

        console.log(`✅ Successfully migrated siswa_id: ${oldSikap.siswa_id}`);
      }

      // 6. Add unique constraint
      try {
        await queryInterface.addConstraint('Sikaps', {
          fields: ['siswa_id', 'indikator_sikap_id', 'semester', 'tahun_ajaran'],
          type: 'unique',
          name: 'unique_sikap_per_siswa_indikator'
        }, { transaction });
        console.log('✅ Added unique constraint to Sikaps table');
      } catch (error) {
        console.log('⚠️ Unique constraint might already exist:', error.message);
      }

      console.log('✅ Sikap structure migration completed successfully');
      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error during sikap migration:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Rollback: Removing sikap structure changes...');
      
      // Remove constraint
      try {
        await queryInterface.removeConstraint('Sikaps', 'unique_sikap_per_siswa_indikator', { transaction });
        console.log('✅ Removed unique constraint');
      } catch (error) {
        console.log('⚠️ Constraint might not exist, skipping removal');
      }

      // Remove added columns
      const tableDescription = await queryInterface.describeTable('Sikaps');
      
      if (tableDescription.indikator_sikap_id) {
        await queryInterface.removeColumn('Sikaps', 'indikator_sikap_id', { transaction });
        console.log('✅ Removed indikator_sikap_id column');
      }
      
      if (tableDescription.nilai) {
        await queryInterface.removeColumn('Sikaps', 'nilai', { transaction });
        console.log('✅ Removed nilai column');
      }

      
      if (tableDescription.deskripsi) {
        await queryInterface.removeColumn('Sikaps', 'deskripsi', { transaction });
        console.log('✅ Removed deskripsi column');
      }

      if (tableDescription.catatan_wali_kelas) {
        await queryInterface.removeColumn('Sikaps', 'catatan_wali_kelas', { transaction });
        console.log('✅ Removed catatan_wali_kelas column');
      }

      await transaction.commit();
      console.log('✅ Rollback completed successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error during rollback:', error);
      throw error;
    }
  }
};