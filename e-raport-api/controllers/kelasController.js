// e-raport-api/controllers/kelasController.js

const db = require('../models');

// Mendapatkan semua data kelas
exports.getAllKelas = async (req, res) => {
  try {
    const kelas = await db.Kelas.findAll({
      include: [
        // === PERUBAHAN DI SINI: Gunakan model 'Guru' ===
        { 
          model: db.Guru, // Menggunakan model Guru yang baru
          as: 'walikelas',      // Alias 'walikelas' ini sudah benar sesuai models/kelas.js
          attributes: ['nama'], 
          required: false 
        },
        // ===============================================
        { 
          model: db.Siswa, 
          as: 'siswa', 
          attributes: ['id', 'nama'], 
          required: false 
        }
      ],
      order: [['nama_kelas', 'ASC']]
    });
    res.json(kelas);
  } catch (error) {
    console.error('SERVER ERROR - GET /api/kelas:', error);
    res.status(500).json({ message: 'Gagal mengambil data kelas.', error: error.message });
  }
};

// TAMBAHKAN FUNGSI INI - Mendapatkan data kelas berdasarkan ID
exports.getKelasById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`REQUEST GET KELAS BY ID: ${id}`);
    
    const kelas = await db.Kelas.findByPk(id, {
      include: [
        { model: db.Guru, as: 'walikelas', attributes: ['nama'], required: false },
        { 
          model: db.Siswa, 
          as: 'siswa', 
          attributes: ['id', 'nama', 'nis', 'jenis_kelamin', 'kamar'], // Tambahkan kolom yang relevan
          required: false,
          // 🔥 PERBAIKAN UTAMA: Tambahkan include untuk Kamar di sini
          include: [{
            model: db.Kamar,
            as: 'infoKamar',
            attributes: ['nama_kamar'],
            required: false
          }]
        }
      ]
    });

    if (!kelas) {
      console.log(`KELAS ID ${id} TIDAK DITEMUKAN`);
      return res.status(404).json({ message: 'Kelas tidak ditemukan' });
    }

    console.log("DATA KELAS DETAIL:", JSON.stringify(kelas, null, 2));
    res.json(kelas);
  } catch (error) {
    console.error('SERVER ERROR - GET /api/kelas/:id:', error);
    res.status(500).json({ message: 'Gagal mengambil detail kelas.', error: error.message });
  }
};

// Fungsi createKelas
exports.createKelas = async (req, res) => {
    try {
        const newKelas = await db.Kelas.create(req.body);
        res.status(201).json(newKelas);
    } catch (error) {
        res.status(500).json({ message: 'Error saat membuat kelas', error: error.message });
    }
};

// Memperbarui data kelas
exports.updateKelas = async (req, res) => {
  try {
    // DEBUG: Lihat data yang diterima dari browser saat Anda menekan "Simpan"
    console.log("===================================");
    console.log("DATA DITERIMA DARI FRONTEND (req.body):", req.body);
    console.log("===================================");

    const { nama_kelas, wali_kelas_id, next_kelas_id } = req.body;
    // Build update payload only with provided fields so we don't overwrite unintentionally
    const dataToUpdate = {};
    if (typeof nama_kelas !== 'undefined') dataToUpdate.nama_kelas = nama_kelas;
    if (typeof wali_kelas_id !== 'undefined') dataToUpdate.wali_kelas_id = wali_kelas_id;
    if (typeof next_kelas_id !== 'undefined') dataToUpdate.next_kelas_id = next_kelas_id;

    console.log(`Attempting to update Kelas id=${req.params.id} with:`, dataToUpdate);

    const [updated] = await db.Kelas.update(dataToUpdate, {
      where: { id: req.params.id }
    });

    if (updated) {
      const updatedKelas = await db.Kelas.findByPk(req.params.id);
      return res.status(200).json(updatedKelas);
    }

    // If we reach here, no rows were updated. Log current kelas for debugging.
    const existing = await db.Kelas.findByPk(req.params.id);
    if (!existing) {
      console.warn(`Update failed: Kelas id=${req.params.id} not found`);
      return res.status(404).json({ message: "Kelas tidak ditemukan" });
    }

    // If the record exists but update returned 0, something else prevented update
    console.warn(`Update did not modify Kelas id=${req.params.id} (no changes or constraint)`);
    return res.status(200).json(existing);
  } catch (error) {
    console.error(`SERVER ERROR - PUT /api/kelas/${req.params.id}:`, error);
    res.status(500).json({ message: "Gagal memperbarui kelas", error: error.message });
  }
};

// Fungsi deleteKelas
exports.deleteKelas = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await db.Kelas.destroy({ where: { id } });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'Kelas tidak ditemukan' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error saat menghapus kelas', error: error.message });
    }
};

exports.promosikanSiswa = async (req, res) => {
    // Data yang kita harapkan dari frontend
    const { ke_kelas_id, siswa_ids } = req.body;

    if (!ke_kelas_id || !Array.isArray(siswa_ids) || siswa_ids.length === 0) {
        return res.status(400).json({ message: "Input tidak lengkap: ID kelas tujuan dan daftar ID siswa wajib diisi." });
    }

    const transaction = await db.sequelize.transaction();
    try {
        const [updatedCount] = await db.Siswa.update(
            { kelas_id: ke_kelas_id }, // Set kelas_id baru
            {
                where: {
                    id: { [Op.in]: siswa_ids } // Hanya untuk siswa yang ID-nya ada di dalam array
                },
                transaction
            }
        );

        await transaction.commit();
        res.status(200).json({ 
            message: `Berhasil mempromosikan ${updatedCount} siswa ke kelas baru.`,
            count: updatedCount
        });
    } catch (error) {
        await transaction.rollback();
        console.error("Error saat promosi siswa:", error);
        res.status(500).json({ message: "Terjadi kesalahan pada server saat memproses kenaikan kelas.", error: error.message });
    }
};