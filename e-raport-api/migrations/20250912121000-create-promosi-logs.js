"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // use lowercase table name for consistency
    await queryInterface.createTable('promosi_logs', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      tahun_ajaran_from_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'TahunAjarans', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      tahun_ajaran_to_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'TahunAjarans', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      kelas_from_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Kelas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
  kelas_to_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Kelas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
  // executed_by kept as nullable integer without FK constraint because Users table not present in schema
  executed_by: { type: Sequelize.INTEGER, allowNull: true },
      note: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
  },
  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('promosi_logs');
  }
};
