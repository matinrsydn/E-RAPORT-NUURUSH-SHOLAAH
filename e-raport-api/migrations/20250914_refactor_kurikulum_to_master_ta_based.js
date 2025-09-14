"use strict";

/**
 * Migration: move Kurikulum from periode_ajaran_id -> master_tahun_ajaran_id
 * - remove column periode_ajaran_id
 * - add column master_tahun_ajaran_id (FK -> MasterTahunAjarans)
 * NOTE: This migration assumes you have a MasterTahunAjarans table already.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new column first (best practice) then remove old one.
    // Only add column if it doesn't already exist to make migration idempotent
    const tableDesc = await queryInterface.describeTable('Kurikulums').catch(() => null);
    if (!tableDesc || !tableDesc.master_tahun_ajaran_id) {
      await queryInterface.addColumn('Kurikulums', 'master_tahun_ajaran_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'MasterTahunAjarans', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
    }
    // If you need to backfill existing data, do it here with raw SQL or a script.
    // This migration does NOT attempt to copy periode_ajaran_id -> master_tahun_ajaran_id.

    // Now remove periode_ajaran_id column if present
    if (tableDesc && tableDesc.periode_ajaran_id) {
      await queryInterface.removeColumn('Kurikulums', 'periode_ajaran_id');
    }
  },

  async down(queryInterface, Sequelize) {
    // Best-effort revert: add periode_ajaran_id back as nullable and remove master_tahun_ajaran_id
    const tableDesc = await queryInterface.describeTable('Kurikulums').catch(() => null);
    if (tableDesc && !tableDesc.periode_ajaran_id) {
      await queryInterface.addColumn('Kurikulums', 'periode_ajaran_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'TahunAjarans', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    if (tableDesc && tableDesc.master_tahun_ajaran_id) {
      await queryInterface.removeColumn('Kurikulums', 'master_tahun_ajaran_id');
    }
  }
};
