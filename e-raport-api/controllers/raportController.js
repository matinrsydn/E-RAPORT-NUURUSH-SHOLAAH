// e-raport-api/controllers/raportController.js

const db = require('../models');

// Mengambil data raport lengkap untuk satu siswa pada periode tertentu
exports.getRaportData = async (req, res) => {
    const { siswaId, tahunAjaran, semester } = req.params;
    const tahunAjaranFormatted = `${tahunAjaran}/${parseInt(tahunAjaran) + 1}`;

    console.log(`REQUEST RAPORT DATA: siswaId=${siswaId}, tahunAjaran=${tahunAjaranFormatted}, semester=${semester}`);

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

        console.log("HASIL QUERY RAPORT:", {
            nilaiUjianCount: nilaiUjian.length,
            nilaiHafalanCount: nilaiHafalan.length,
            kehadiranExists: !!kehadiran,
            sikapCount: sikap.length
        });

        // Format data agar mudah digunakan di frontend
        const formattedNilaiUjian = nilaiUjian.map(n => ({
            id: n.id,
            nama_mapel: n.mapel?.nama_mapel || 'Mata Pelajaran Tidak Diketahui',
            pengetahuan_angka: n.pengetahuan_angka,
            keterampilan_angka: n.keterampilan_angka
        }));

        // Format nilai hafalan
        const formattedNilaiHafalan = nilaiHafalan.map(n => ({
            id: n.id,
            kategori: n.kategori || 'Hafalan',
            nilai: n.nilai_angka,
            nilai_angka: n.nilai_angka // Untuk kompatibilitas
        }));

        const responseData = {
            nilaiUjian: formattedNilaiUjian,
            nilaiHafalan: formattedNilaiHafalan,
            kehadiran: kehadiran ? {
                id: kehadiran.id,
                sakit: kehadiran.sakit || 0,
                izin: kehadiran.izin || 0,
                alpha: kehadiran.alpha || kehadiran.absen || 0
            } : null,
            sikap: sikap.map(s => ({
                id: s.id,
                jenis_sikap: s.jenis_sikap,
                indikator: s.indikator,
                angka: s.angka,
                deskripsi: s.deskripsi
            }))
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error("Error fetching raport data:", error);
        res.status(500).json({ 
            message: "Gagal mengambil data raport.", 
            error: error.message,
            details: `siswaId: ${siswaId}, tahunAjaran: ${tahunAjaranFormatted}, semester: ${semester}`
        });
    }
};

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