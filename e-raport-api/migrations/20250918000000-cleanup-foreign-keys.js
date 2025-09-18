"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Drop all existing foreign key constraints for these tables
      const tables = ['Siswas', 'siswa_kelas_histories', 'nilaiujians', 'nilaihafalans', 'kehadirans', 'sikaps', 'SuratKeluars'];
      
      for (const table of tables) {
        const [fks] = await queryInterface.sequelize.query(`
          SELECT CONSTRAINT_NAME
          FROM information_schema.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = '${table}'
          AND (COLUMN_NAME = 'kelas_id' OR COLUMN_NAME = 'siswa_id')
          AND REFERENCED_TABLE_NAME IS NOT NULL;
        `);

        for (const fk of fks) {
          await queryInterface.sequelize.query(`
            ALTER TABLE ${table} 
            DROP FOREIGN KEY ${fk.CONSTRAINT_NAME};
          `);
        }
      }
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // We don't need a down migration since this is just cleanup
    // The next migration will set up the proper constraints
  }
};