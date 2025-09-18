'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    try {
      const tables = ['Kelass', 'promosi_logs'];
      for (const table of tables) {
        const [fks] = await queryInterface.sequelize.query(`
          SELECT CONSTRAINT_NAME
          FROM information_schema.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = '${table}'
          AND (COLUMN_NAME = 'kelas_id' OR COLUMN_NAME = 'kelas_from_id' OR COLUMN_NAME = 'kelas_to_id')
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
      throw error;
    }
  },

  async down(queryInterface, _Sequelize) {
    // Add reverting commands here if needed
  }
};