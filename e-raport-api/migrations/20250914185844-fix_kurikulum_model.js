'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Get table description to check if table exists and has master_tahun_ajaran_id
    let tableInfo;
    try {
      tableInfo = await queryInterface.describeTable('kurikulums');
    } catch (e) {
      console.log('Table kurikulums does not exist, skipping master_tahun_ajaran_id check');
      return;
    }

    // Step 2: If master_tahun_ajaran_id exists, drop any FK constraints first
    if (tableInfo.master_tahun_ajaran_id) {
      const constraints = await queryInterface.getForeignKeyReferencesForTable('kurikulums');
      for (const constraint of constraints) {
        if (constraint.columnName === 'master_tahun_ajaran_id') {
          await queryInterface.removeConstraint('kurikulums', constraint.constraintName);
        }
      }
      await queryInterface.removeColumn('kurikulums', 'master_tahun_ajaran_id');
    }

    // Step 3: Add tingkatan_id column if it doesn't exist
    if (!tableInfo.tingkatan_id) {
      await queryInterface.addColumn('kurikulums', 'tingkatan_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tingkatans',
          key: 'id'
        }
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Add back master_tahun_ajaran_id and tingkatan_id
    await queryInterface.addColumn('kurikulums', 'master_tahun_ajaran_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'master_tahun_ajarans',
        key: 'id'
      }
    });
  }
};
