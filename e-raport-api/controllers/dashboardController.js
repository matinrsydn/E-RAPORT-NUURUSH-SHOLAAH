// File: controllers/dashboardController.js
const db = require('../models');
const { sequelize } = require('../models');

// Fungsi untuk mengambil statistik umum
exports.getStats = async (req, res) => {
    try {
        // Mengambil semua data count secara paralel untuk efisiensi
        const [
            siswaCount, 
            guruCount, 
            waliKelasCount, 
            mapelCount, 
            kitabCount, 
            kamarCount
        ] = await Promise.all([
            db.Siswa.count(), // Menghitung total siswa
            db.Guru.count(),  // Menghitung total guru
            // Menghitung jumlah guru unik yang ditugaskan sebagai wali kelas
            db.Kelas.count({ 
                distinct: true,
                col: 'wali_kelas_id' 
            }),
            db.MataPelajaran.count(), // Menghitung total mata pelajaran
            db.Kitab.count(), // Menghitung total kitab
            db.Kamar.count()  // Menghitung total kamar
        ]);
        
        // Kirim semua data statistik yang baru dalam format JSON
        res.status(200).json({
            totalSiswa: siswaCount,
            totalGuru: guruCount,
            totalWaliKelas: waliKelasCount,
            totalMapel: mapelCount,
            totalKitab: kitabCount,
            totalKamar: kamarCount
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ message: "Gagal mengambil data statistik." });
    }
};

// Fungsi untuk mengambil data jumlah siswa per kelas untuk diagram
exports.getSiswaPerKelas = async (req, res) => {
    try {
        const result = await db.Siswa.findAll({
            attributes: [
                // Mengambil nama kelas dari tabel relasi
                [sequelize.col('kelas.nama_kelas'), 'namaKelas'],
                // Menghitung jumlah siswa di setiap grup
                [sequelize.fn('COUNT', sequelize.col('Siswa.id')), 'jumlahSiswa']
            ],
            include: [{
                model: db.Kelas,
                as: 'kelas', // Pastikan alias ini sesuai dengan di model Siswa
                attributes: [] // Tidak perlu mengambil kolom apa pun dari Kelas, hanya untuk join
            }],
            group: ['kelas.nama_kelas'], // Mengelompokkan hasil berdasarkan nama kelas
            order: [['jumlahSiswa', 'DESC']] // Urutkan dari yang terbanyak
        });
        
        // Format data agar mudah digunakan oleh library diagram
        const formattedData = result.map(item => ({
            name: item.getDataValue('namaKelas'),
            Jumlah: item.getDataValue('jumlahSiswa')
        }));

        res.status(200).json(formattedData);
    } catch (error) {
        console.error("Error fetching siswa per kelas:", error);
        res.status(500).json({ message: "Gagal mengambil data diagram." });
    }
};