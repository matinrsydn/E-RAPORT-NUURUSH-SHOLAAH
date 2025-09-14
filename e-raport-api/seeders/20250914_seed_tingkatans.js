"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const data = [
      { nama_tingkatan: 'Tingkat I', urutan: 1, createdAt: new Date(), updatedAt: new Date() },
      { nama_tingkatan: 'Tingkat II', urutan: 2, createdAt: new Date(), updatedAt: new Date() },
      { nama_tingkatan: 'Tingkat III', urutan: 3, createdAt: new Date(), updatedAt: new Date() }
    ];
    await queryInterface.bulkInsert('Tingkatans', data, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Tingkatans', null, {});
  }
};
