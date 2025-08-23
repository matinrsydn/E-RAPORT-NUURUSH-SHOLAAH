// e-raport-api/migrations/YYYYMMDDHHMMSS-add-unique-constraint-to-kehadiran.js
'use strict';
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addConstraint('Kehadirans', {
      fields: ['siswa_id', 'kegiatan', 'semester', 'tahun_ajaran'],
      type: 'unique',
      name: 'kehadiran_unique_constraint'
    });
  },
  async down (queryInterface, Sequelize) {
    await queryInterface.removeConstraint('Kehadirans', 'kehadiran_unique_constraint');
  }
};