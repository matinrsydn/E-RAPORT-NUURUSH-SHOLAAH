"use strict";

/**
 * Safe backfill migration for Kurikulums.master_tahun_ajaran_id
 * Steps:
 * 1. Add nullable master_tahun_ajaran_id (no FK yet)
 * 2. Backfill values from TahunAjarans (PeriodeAjaran -> master_tahun_ajaran_id)
 * 3. (Optional) If all rows are backfilled, make column NOT NULL and add FK
 * 4. Remove periode_ajaran_id column
 *
 * This migration is cautious and will not fail if re-run.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'Kurikulums';
    // 1) Add nullable column if not exists
    const tableDesc = await queryInterface.describeTable(table).catch(() => null);
    if (!tableDesc || !tableDesc.master_tahun_ajaran_id) {
      await queryInterface.addColumn(table, 'master_tahun_ajaran_id', {
        type: Sequelize.INTEGER,
        allowNull: true // start nullable until we ensure backfill
      });
    }

    // 2) Backfill: set Kurikulums.master_tahun_ajaran_id = TahunAjarans.master_tahun_ajaran_id
    // using PeriodeAjaran (table: TahunAjarans) as the bridge
    // Note: Using raw SQL for portability and performance
    await queryInterface.sequelize.query(`
      UPDATE Kurikulums k
      JOIN TahunAjarans p ON k.periode_ajaran_id = p.id
      SET k.master_tahun_ajaran_id = p.master_tahun_ajaran_id
      WHERE k.periode_ajaran_id IS NOT NULL AND (k.master_tahun_ajaran_id IS NULL OR k.master_tahun_ajaran_id = 0)
    `);

    // 3) If all rows now have master_tahun_ajaran_id, make it NOT NULL and add FK
    const [[{ missing }]] = await queryInterface.sequelize.query(`
      SELECT COUNT(*) as missing FROM Kurikulums WHERE master_tahun_ajaran_id IS NULL
    `);
    if (Number(missing) === 0) {
      // alter column to NOT NULL and add FK constraint
      await queryInterface.changeColumn(table, 'master_tahun_ajaran_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'MasterTahunAjarans', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
      // Drop periode_ajaran_id if exists
      if (tableDesc && tableDesc.periode_ajaran_id) {
        await queryInterface.removeColumn(table, 'periode_ajaran_id');
      }
    } else {
      // Not all rows backfilled. Leave column nullable and do not drop periode_ajaran_id.
      console.warn(`Backfill left ${missing} Kurikulum rows without master_tahun_ajaran_id`);
    }
  },

  async down(queryInterface, Sequelize) {
    const table = 'Kurikulums';
    const tableDesc = await queryInterface.describeTable(table).catch(() => null);
    if (tableDesc && tableDesc.master_tahun_ajaran_id) {
      // Remove FK by changing to simple integer if it's constrained
      try {
        await queryInterface.changeColumn(table, 'master_tahun_ajaran_id', {
          type: Sequelize.INTEGER,
          allowNull: true
        });
      } catch (e) {
        // ignore - not all dialects support changeColumn with FK removal
      }
      await queryInterface.removeColumn(table, 'master_tahun_ajaran_id');
    }
    // Attempt to re-add periode_ajaran_id if missing
    if (!tableDesc || !tableDesc.periode_ajaran_id) {
      await queryInterface.addColumn(table, 'periode_ajaran_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'TahunAjarans', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }
  }
};
