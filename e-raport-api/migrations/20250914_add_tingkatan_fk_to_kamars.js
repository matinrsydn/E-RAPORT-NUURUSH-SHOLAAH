"use strict";

// Migration neutralized: accidental addition of tingkatan_id to kamars was reverted in code.
// Left as a no-op to avoid accidental execution. If you want to remove this file from git, run:
// git rm migrations/20250914_add_tingkatan_fk_to_kamars.js

module.exports = {
  async up (queryInterface, Sequelize) {
    // no-op
  },

  async down (queryInterface, Sequelize) {
    // no-op
  }
};
