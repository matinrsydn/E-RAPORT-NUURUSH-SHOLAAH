"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove old columns
    await queryInterface.removeColumn('Kurikulums', 'kelas_periode_id');
    await queryInterface.removeColumn('Kurikulums', 'semester');

    // Add new columns linking Kurikulum to Tingkatan and PeriodeAjaran
    await queryInterface.addColumn('Kurikulums', 'tingkatan_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'Tingkatans', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addColumn('Kurikulums', 'periode_ajaran_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'TahunAjarans', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the new columns
    await queryInterface.removeColumn('Kurikulums', 'periode_ajaran_id');
    await queryInterface.removeColumn('Kurikulums', 'tingkatan_id');

    // Re-create old columns (best-effort; original constraints restored conservatively)
    await queryInterface.addColumn('Kurikulums', 'kelas_periode_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'KelasPeriodes', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('Kurikulums', 'semester', {
      type: Sequelize.ENUM('1', '2'),
      allowNull: true
    });
  }
};
"use strict";

/**
 * Migration: move Kurikulum from kelas_periode-based to tingkatan+periode_ajaran-based
 * - remove columns: kelas_periode_id, semester
 * - add columns: tingkatan_id (FK -> Tingkatans), periode_ajaran_id (FK -> TahunAjarans)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // remove old columns if they exist
    try {
      await queryInterface.removeColumn('Kurikulums', 'kelas_periode_id');
    } catch (e) {
      // ignore if not exists
    }
    try {
      await queryInterface.removeColumn('Kurikulums', 'semester');
    } catch (e) {
      // ignore if not exists
    }

    // add new foreign keys
    await queryInterface.addColumn('Kurikulums', 'tingkatan_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'Tingkatans', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addColumn('Kurikulums', 'periode_ajaran_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'TahunAjarans', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    // revert: remove added columns, re-add old columns (best-effort)
    try {
      await queryInterface.removeColumn('Kurikulums', 'tingkatan_id');
    } catch (e) {}
    try {
      await queryInterface.removeColumn('Kurikulums', 'periode_ajaran_id');
    } catch (e) {}

    // re-add previous columns as nullable to avoid strict failures
    await queryInterface.addColumn('Kurikulums', 'kelas_periode_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'KelasPerides', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    }).catch(()=>{});

    await queryInterface.addColumn('Kurikulums', 'semester', {
      type: Sequelize.ENUM('1','2'),
      allowNull: true
    }).catch(()=>{});
  }
};
