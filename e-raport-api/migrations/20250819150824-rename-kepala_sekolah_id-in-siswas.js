'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.renameColumn('Siswas', 'kepala_sekolah_id', 'kepala_pesantren_id');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.renameColumn('Siswas', 'kepala_pesantren_id', 'kepala_sekolah_id');
  }
};