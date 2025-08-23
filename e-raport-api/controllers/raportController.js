// e-raport-api/controllers/raportController.js

const db = require('../models');

// ==========================================================================================
// BARU: FUNGSI UNTUK MENYIMPAN DATA DARI HALAMAN VALIDASI
// ==========================================================================================
exports.saveValidatedRaport = async (req, res) => {
    // Ambil data yang sudah divalidasi dari body request
    const { validatedData } = req.body;

    // Pastikan data tidak kosong
    if (!validatedData || validatedData.length === 0) {
        return res.status(400).json({ message: "Tidak ada data untuk disimpan." });
    }

    const transaction = await db.sequelize.transaction(); // Mulai transaksi database

    try {
        // --- Siapkan semua data untuk disimpan ---
        const nilaiUjianToCreate = [];
        const nilaiHafalanToCreate = [];
        const kehadiranToCreate = [];
        const sikapToCreate = [];

        // Loop melalui setiap baris data yang valid dari frontend
        validatedData.forEach(item => {
            // Asumsikan struktur data dari frontend seperti ini
            // Sesuaikan jika perlu
            if (item.nilaiUjian) nilaiUjianToCreate.push(...item.nilaiUjian);
            if (item.nilaiHafalan) nilaiHafalanToCreate.push(...item.nilaiHafalan);
            if (item.kehadiran) kehadiranToCreate.push(...item.kehadiran);
            if (item.sikap) sikapToCreate.push(item.sikap);
        });

        // --- Lakukan operasi database secara massal ---
        
        // 1. Simpan/Update Nilai Ujian
        if (nilaiUjianToCreate.length > 0) {
            await db.NilaiUjian.bulkCreate(nilaiUjianToCreate, {
                transaction,
                updateOnDuplicate: ['pengetahuan_angka', 'keterampilan_angka', 'updatedAt']
            });
        }

        // 2. Simpan/Update Nilai Hafalan
        if (nilaiHafalanToCreate.length > 0) {
            await db.NilaiHafalan.bulkCreate(nilaiHafalanToCreate, {
                transaction,
                updateOnDuplicate: ['nilai_angka', 'updatedAt']
            });
        }

        // 3. Simpan/Update Kehadiran
        if (kehadiranToCreate.length > 0) {
            await db.Kehadiran.bulkCreate(kehadiranToCreate, {
                transaction,
                updateOnDuplicate: ["sakit", "izin", "absen", 'updatedAt']
            });
        }
        
        // 4. Simpan/Update Sikap (menggunakan upsert)
        if (sikapToCreate.length > 0) {
            for (const sikap of sikapToCreate) {
                await db.Sikap.upsert(sikap, { transaction });
            }
        }
        
        // Jika semua operasi di atas berhasil, commit transaksi
        await transaction.commit();

        res.status(200).json({ message: 'Data raport berhasil disimpan.' });

    } catch (error) {
        // Jika ada satu saja error, batalkan semua perubahan
        await transaction.rollback();

        // Kirim pesan error yang jelas ke frontend untuk debugging
        console.error("GAGAL MENYIMPAN RAPORT DARI HALAMAN VALIDASI:", error);
        res.status(500).json({
            message: 'Terjadi kesalahan saat menyimpan data.',
            error: error.message
        });
    }
};


// ==========================================================================================
// FUNGSI-FUNGSI LAMA ANDA (TETAP DIPERTAHANKAN)
// ==========================================================================================

// Mengambil data raport lengkap untuk satu siswa pada periode tertentu
exports.getRaportData = async (req, res) => {
    const { siswaId, tahunAjaran, semester } = req.params;
    const tahunAjaranFormatted = `${tahunAjaran}/${parseInt(tahunAjaran) + 1}`;
    let semesterFormatted = semester === '1' ? 'Ganjil' : 'Genap';

    try {
        const [nilaiUjian, nilaiHafalan, semuaKehadiran, sikap] = await Promise.all([
            db.NilaiUjian.findAll({ where: { siswa_id: siswaId, tahun_ajaran: tahunAjaranFormatted, semester: semester }, include: [{ model: db.MataPelajaran, as: 'mapel', attributes: ['nama_mapel'] }] }),
            db.NilaiHafalan.findAll({ where: { siswa_id: siswaId, tahun_ajaran: tahunAjaranFormatted, semester: semester }, include: [{ model: db.MataPelajaran, as: 'mapel', attributes: ['nama_mapel'] }] }),
            db.Kehadiran.findAll({ where: { siswa_id: siswaId, tahun_ajaran: tahunAjaranFormatted, semester: semesterFormatted } }),
            db.Sikap.findAll({ where: { siswa_id: siswaId, tahun_ajaran: tahunAjaranFormatted, semester: semesterFormatted } })
        ]);

        const rekapKehadiran = semuaKehadiran.reduce((acc, curr) => {
            acc.sakit += curr.sakit || 0;
            acc.izin += curr.izin || 0;
            acc.alpha += curr.absen || 0;
            if (!acc.id && curr.id) acc.id = curr.id;
            return acc;
        }, { id: null, sakit: 0, izin: 0, alpha: 0 });

        res.status(200).json({
            nilaiUjian: nilaiUjian.map(n => ({ id: n.id, nama_mapel: n.mapel?.nama_mapel || 'N/A', pengetahuan_angka: n.pengetahuan_angka, keterampilan_angka: n.keterampilan_angka })),
            nilaiHafalan: nilaiHafalan.map(n => ({ id: n.id, kategori: n.kategori || 'Hafalan', nilai: n.nilai_angka, nilai_angka: n.nilai_angka })),
            kehadiran: semuaKehadiran.length > 0 ? rekapKehadiran : null,
            sikap: sikap.map(s => ({ id: s.id, jenis_sikap: s.jenis_sikap, indikator: s.indikator, angka: s.angka, deskripsi: s.deskripsi }))
        });
    } catch (error) {
        console.error("Error fetching raport data:", error);
        res.status(500).json({ message: "Gagal mengambil data raport.", error: error.message });
    }
};

// Fungsi-fungsi update individual lainnya...
exports.updateNilaiUjian = async (req, res) => { /* ...kode Anda... */ };
exports.updateNilaiHafalan = async (req, res) => { /* ...kode Anda... */ };
exports.updateKehadiran = async (req, res) => { /* ...kode Anda... */ };

// --- FUNGSI-FUNGSI UNTUK UPDATE DATA ---

exports.updateNilaiUjian = async (req, res) => {
    try {
        const { id } = req.params;
        const { pengetahuan_angka, keterampilan_angka } = req.body;
        
        console.log(`UPDATE NILAI UJIAN: id=${id}`, req.body);
        
        const nilai = await db.NilaiUjian.findByPk(id);
        if (!nilai) return res.status(404).json({ message: "Data nilai tidak ditemukan." });

        nilai.pengetahuan_angka = pengetahuan_angka;
        nilai.keterampilan_angka = keterampilan_angka;
        await nilai.save();
        
        res.status(200).json(nilai);
    } catch (error) {
        console.error("Error update nilai ujian:", error);
        res.status(500).json({ message: "Gagal update nilai ujian.", error: error.message });
    }
};

exports.updateNilaiHafalan = async (req, res) => {
    try {
        const { id } = req.params;
        const { nilai } = req.body; // Dari frontend
        
        console.log(`UPDATE NILAI HAFALAN: id=${id}`, req.body);
        
        const nilaiHafalan = await db.NilaiHafalan.findByPk(id);
        if (!nilaiHafalan) return res.status(404).json({ message: "Data nilai hafalan tidak ditemukan." });

        // Gunakan 'nilai_angka' sesuai dengan model
        nilaiHafalan.nilai_angka = nilai;
        await nilaiHafalan.save();

        res.status(200).json(nilaiHafalan);
    } catch (error) {
        console.error("Error update nilai hafalan:", error);
        res.status(500).json({ message: "Gagal update nilai hafalan.", error: error.message });
    }
};

exports.updateKehadiran = async (req, res) => {
    try {
        const { id } = req.params;
        const { sakit, izin, alpha } = req.body;
        
        console.log(`UPDATE KEHADIRAN: id=${id}`, req.body);
        
        const kehadiran = await db.Kehadiran.findByPk(id);
        if (!kehadiran) return res.status(404).json({ message: "Data kehadiran tidak ditemukan." });

        kehadiran.sakit = sakit || 0;
        kehadiran.izin = izin || 0;
        kehadiran.absen = alpha || 0; // Gunakan field 'absen' sesuai model, bukan 'alpha'
        await kehadiran.save();

        res.status(200).json(kehadiran);
    } catch (error) {
        console.error("Error update kehadiran:", error);
        res.status(500).json({ message: "Gagal update kehadiran.", error: error.message });
    }
};