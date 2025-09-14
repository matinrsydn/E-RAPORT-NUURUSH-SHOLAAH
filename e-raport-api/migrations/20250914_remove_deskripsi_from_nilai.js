"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove deskripsi columns if they exist
    try {
      await queryInterface.removeColumn('nilaiujians', 'deskripsi');
    } catch (e) {
      // ignore if column doesn't exist
      console.warn('Column deskripsi on nilaiujians may not exist:', e.message || e);
    }
    try {
      await queryInterface.removeColumn('nilaihafalans', 'deskripsi');
    } catch (e) {
      console.warn('Column deskripsi on nilaihafalans may not exist:', e.message || e);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Re-add deskripsi as TEXT in down migration
    await queryInterface.addColumn('nilaiujians', 'deskripsi', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('nilaihafalans', 'deskripsi', { type: Sequelize.TEXT, allowNull: true });
  }
};
