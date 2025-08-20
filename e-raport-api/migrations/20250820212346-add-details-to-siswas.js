// e-raport-api/migrations/YYYYMMDDHHMMSS-add-details-to-siswas.js

'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    // Helper function untuk menambahkan kolom HANYA jika belum ada
    const addColumnIfNotExists = async (tableName, columnName, attributes) => {
      const tableDescription = await queryInterface.describeTable(tableName);
      if (!tableDescription[columnName]) {
        console.log(`Adding column ${columnName} to ${tableName}...`);
        await queryInterface.addColumn(tableName, columnName, attributes, { transaction });
      } else {
        console.log(`Column ${columnName} already exists in ${tableName}, skipping.`);
      }
    };

    try {
      await addColumnIfNotExists('Siswas', 'kamar', { type: Sequelize.STRING, allowNull: true });
      await addColumnIfNotExists('Siswas', 'kota_asal', { type: Sequelize.STRING, allowNull: true });
      await addColumnIfNotExists('Siswas', 'nama_ayah', { type: Sequelize.STRING, allowNull: true });
      await addColumnIfNotExists('Siswas', 'pekerjaan_ayah', { type: Sequelize.STRING, allowNull: true });
      await addColumnIfNotExists('Siswas', 'alamat_ayah', { type: Sequelize.TEXT, allowNull: true });
      await addColumnIfNotExists('Siswas', 'nama_ibu', { type: Sequelize.STRING, allowNull: true });
      await addColumnIfNotExists('Siswas', 'pekerjaan_ibu', { type: Sequelize.STRING, allowNull: true });
      await addColumnIfNotExists('Siswas', 'alamat_ibu', { type: Sequelize.TEXT, allowNull: true });
      await addColumnIfNotExists('Siswas', 'nama_wali', { type: Sequelize.STRING, allowNull: true });
      await addColumnIfNotExists('Siswas', 'pekerjaan_wali', { type: Sequelize.STRING, allowNull: true });
      await addColumnIfNotExists('Siswas', 'alamat_wali', { type: Sequelize.TEXT, allowNull: true });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down (queryInterface, Sequelize) {
    // Fungsi down tetap sama, untuk menghapus kolom jika migrasi dibatalkan
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('Siswas', 'kamar', { transaction });
      await queryInterface.removeColumn('Siswas', 'kota_asal', { transaction });
      await queryInterface.removeColumn('Siswas', 'nama_ayah', { transaction });
      await queryInterface.removeColumn('Siswas', 'pekerjaan_ayah', { transaction });
      await queryInterface.removeColumn('Siswas', 'alamat_ayah', { transaction });
      await queryInterface.removeColumn('Siswas', 'nama_ibu', { transaction });
      await queryInterface.removeColumn('Siswa', 'pekerjaan_ibu', { transaction });
      await queryInterface.removeColumn('Siswa', 'alamat_ibu', { transaction });
      await queryInterface.removeColumn('Siswa', 'nama_wali', { transaction });
      await queryInterface.removeColumn('Siswa', 'pekerjaan_wali', { transaction });
      await queryInterface.removeColumn('Siswa', 'alamat_wali', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};