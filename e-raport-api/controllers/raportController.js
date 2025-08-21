const db = require('../models');

// Mengambil data raport lengkap untuk satu siswa pada periode tertentu
exports.getRaportData = async (req, res) => {
    const { siswaId, tahunAjaran, semester } = req.params;
    const tahunAjaranFormatted = `${tahunAjaran}/${parseInt(tahunAjaran) + 1}`;

    try {
        // Mengambil semua data secara paralel untuk efisiensi
        const [nilaiUjian, nilaiHafalan, kehadiran, sikap] = await Promise.all([
            // 1. Ambil Nilai Ujian beserta nama mata pelajarannya
            db.NilaiUjian.findAll({
                where: { siswa_id: siswaId, tahun_ajaran: tahunAjaranFormatted, semester },
                include: [{ model: db.MataPelajaran, as: 'mapel', attributes: ['nama_mapel'] }]
            }),
            // 2. Ambil Nilai Hafalan
            db.NilaiHafalan.findAll({
                where: { siswa_id: siswaId, tahun_ajaran: tahunAjaranFormatted, semester }
            }),
            // 3. Ambil Kehadiran
            db.Kehadiran.findOne({
                where: { siswa_id: siswaId, tahun_ajaran: tahunAjaranFormatted, semester }
            }),
            // 4. Ambil Sikap beserta indikatornya
            db.Sikap.findAll({
                where: { siswa_id: siswaId, tahun_ajaran: tahunAjaranFormatted, semester },
                include: [{ model: db.IndikatorSikap, as: 'indikator' }]
            })
        ]);

        // Format data agar mudah digunakan di frontend
        const formattedNilaiUjian = nilaiUjian.map(n => ({
            id: n.id,
            nama_mapel: n.mapel.nama_mapel,
            pengetahuan_angka: n.pengetahuan_angka,
            keterampilan_angka: n.keterampilan_angka
        }));

        res.status(200).json({
            nilaiUjian: formattedNilaiUjian,
            nilaiHafalan,
            kehadiran,
            sikap
        });

    } catch (error) {
        console.error("Error fetching raport data:", error);
        res.status(500).json({ message: "Gagal mengambil data raport.", error: error.message });
    }
};

// --- FUNGSI-FUNGSI UNTUK UPDATE DATA ---

exports.updateNilaiUjian = async (req, res) => {
    try {
        const { id } = req.params;
        const { pengetahuan_angka, keterampilan_angka } = req.body;
        const nilai = await db.NilaiUjian.findByPk(id);
        if (!nilai) return res.status(404).json({ message: "Data nilai tidak ditemukan." });

        nilai.pengetahuan_angka = pengetahuan_angka;
        nilai.keterampilan_angka = keterampilan_angka;
        await nilai.save();
        
        res.status(200).json(nilai);
    } catch (error) {
        res.status(500).json({ message: "Gagal update nilai ujian.", error: error.message });
    }
};

exports.updateNilaiHafalan = async (req, res) => {
    try {
        const { id } = req.params;
        const { nilai: nilaiAngka } = req.body; // 'nilai' adalah nama kolom di db
        const nilai = await db.NilaiHafalan.findByPk(id);
        if (!nilai) return res.status(404).json({ message: "Data nilai hafalan tidak ditemukan." });

        nilai.nilai = nilaiAngka;
        await nilai.save();

        res.status(200).json(nilai);
    } catch (error) {
        res.status(500).json({ message: "Gagal update nilai hafalan.", error: error.message });
    }
};

exports.updateKehadiran = async (req, res) => {
    try {
        const { id } = req.params;
        const { sakit, izin, alpha } = req.body;
        const kehadiran = await db.Kehadiran.findByPk(id);
        if (!kehadiran) return res.status(404).json({ message: "Data kehadiran tidak ditemukan." });

        kehadiran.sakit = sakit;
        kehadiran.izin = izin;
        kehadiran.alpha = alpha;
        await kehadiran.save();

        res.status(200).json(kehadiran);
    } catch (error) {
        res.status(500).json({ message: "Gagal update kehadiran.", error: error.message });
    }
};
