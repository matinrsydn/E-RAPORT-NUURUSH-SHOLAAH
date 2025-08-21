'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DraftNilais', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      upload_batch_id: { // Pengenal unik untuk setiap sesi upload
        type: Sequelize.STRING,
        allowNull: false,
      },
      row_number: { // Nomor baris di Excel untuk referensi
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      data: { // Data asli dari Excel dalam format JSON
        type: Sequelize.JSON,
        allowNull: false,
      },
      is_valid: { // Status validasi
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      validation_errors: { // Pesan error jika tidak valid
        type: Sequelize.JSON,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('DraftNilais');
  }
};