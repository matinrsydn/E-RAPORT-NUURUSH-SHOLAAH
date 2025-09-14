'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the column (will automatically handle any constraints)
    // Wrap in try-catch in case the column doesn't exist
    await queryInterface.removeColumn('kurikulums', 'master_tahun_ajaran_id');
  },

  async down(queryInterface, Sequelize) {
    // Re-add the column
    await queryInterface.addColumn('kurikulums', 'master_tahun_ajaran_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'master_tahun_ajarans',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  }
};