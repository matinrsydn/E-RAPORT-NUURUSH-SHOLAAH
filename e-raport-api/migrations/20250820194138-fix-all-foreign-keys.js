// e-raport-api/migrations/20250820194138-fix-all-foreign-keys.js

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Helper function to check if a column exists before renaming
      const renameColumnIfExists = async (tableName, oldName, newName) => {
        const tableDescription = await queryInterface.describeTable(tableName);
        if (tableDescription[oldName]) {
          console.log(`Renaming ${oldName} to ${newName} in ${tableName}`);
          await queryInterface.renameColumn(tableName, oldName, newName, { transaction });
        } else {
          console.log(`Column ${oldName} not found in ${tableName}, skipping rename.`);
        }
      };

      // 1. Rename columns in NilaiUjians table
      await renameColumnIfExists('NilaiUjians', 'siswaId', 'siswa_id');
      await renameColumnIfExists('NilaiUjians', 'mataPelajaranId', 'mapel_id');

      // 2. Rename columns in NilaiHafalans table
      await renameColumnIfExists('NilaiHafalans', 'siswaId', 'siswa_id');
      await renameColumnIfExists('NilaiHafalans', 'mataPelajaranId', 'mapel_id');

      // 3. Rename column in Sikaps table
      await renameColumnIfExists('Sikaps', 'siswaId', 'siswa_id');

      // 4. Rename column in Kehadirans table
      await renameColumnIfExists('Kehadirans', 'siswaId', 'siswa_id');
      
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Revert changes back to camelCase
      await queryInterface.renameColumn('NilaiUjians', 'siswa_id', 'siswaId', { transaction });
      await queryInterface.renameColumn('NilaiUjians', 'mapel_id', 'mataPelajaranId', { transaction });

      await queryInterface.renameColumn('NilaiHafalans', 'siswa_id', 'siswaId', { transaction });
      await queryInterface.renameColumn('NilaiHafalans', 'mapel_id', 'mataPelajaranId', { transaction });

      await queryInterface.renameColumn('Sikaps', 'siswa_id', 'siswaId', { transaction });
      
      await queryInterface.renameColumn('Kehadirans', 'siswa_id', 'siswaId', { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};