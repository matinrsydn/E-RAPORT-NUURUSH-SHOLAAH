"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1) create Tingkatans table
    await queryInterface.createTable('Tingkatans', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      nama_tingkatan: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      urutan: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 2) add tingkatan_id column to kelas
    await queryInterface.addColumn('kelas', 'tingkatan_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Tingkatans', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // remove column then drop table
    await queryInterface.removeColumn('kelas', 'tingkatan_id');
    await queryInterface.dropTable('Tingkatans');
  }
};
