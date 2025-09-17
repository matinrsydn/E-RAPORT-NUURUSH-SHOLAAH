'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Update any existing 'Lulus' records to 'Pindah'
    await queryInterface.sequelize.query(`
      UPDATE SuratKeluars 
      SET jenis_keluar = 'Pindah' 
      WHERE jenis_keluar = 'Lulus'
    `);

    // 2. Drop the existing ENUM type and recreate it
    await queryInterface.sequelize.query(`
      ALTER TABLE SuratKeluars 
      MODIFY COLUMN jenis_keluar ENUM('Pindah', 'DO') NOT NULL DEFAULT 'Pindah'
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to original ENUM
    await queryInterface.sequelize.query(`
      ALTER TABLE SuratKeluars 
      MODIFY COLUMN jenis_keluar ENUM('Pindah', 'Lulus', 'DO') NOT NULL DEFAULT 'Pindah'
    `);
  }
};