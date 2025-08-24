// e-raport-api/controllers/raportController.js

const db = require('../models');

// ==========================================================================================
// FUNGSI UTAMA UNTUK MENYIMPAN DATA DARI HALAMAN VALIDASI
// ==========================================================================================
exports.saveValidatedRaport = async (req, res) => {
    console.log("📥 saveValidatedRaport HIT");
    
    const { validatedData } = req.body;
    console.log("📦 validatedData:", JSON.stringify(validatedData, null, 2));

    if (!validatedData || validatedData.length === 0) {
        return res.status(400).json({ message: "Tidak ada data untuk disimpan." });
    }

    const transaction = await db.sequelize.transaction();

    try {
        const nilaiUjianToCreate = [];
        const nilaiHafalanToCreate = [];
        const kehadiranToUpdate = {};
        const sikapToUpdate = {};

        for (const item of validatedData) {
            console.log("🔄 Processing item:", item.nis);

            // 1. Cari data siswa berdasarkan NIS
            const siswa = await db.Siswa.findOne({ 
                where: { nis: item.nis },
                include: ['kelas', 'wali_kelas']
            });

            if (!siswa) {
                console.warn(`❌ Siswa dengan NIS ${item.nis} tidak ditemukan`);
                continue;
            }

            console.log("✅ Siswa found:", siswa.id, siswa.nama);

            // 2. Proses Nilai Ujian
            if (item.nilaiUjian && Array.isArray(item.nilaiUjian)) {
                for (const nilai of item.nilaiUjian) {
                    const mapel = await db.MataPelajaran.findOne({ 
                        where: { kode_mapel: nilai.kode_mapel } 
                    });

                    if (!mapel) {
                        console.warn(`❌ Mapel dengan kode ${nilai.kode_mapel} tidak ditemukan`);
                        continue;
                    }

                    console.log("📘 Mapel found:", mapel.id, mapel.nama_mapel);

                    nilaiUjianToCreate.push({
                        siswa_id: siswa.id,
                        mapel_id: mapel.id,
                        pengetahuan_angka: nilai.pengetahuan_angka,
                        keterampilan_angka: nilai.keterampilan_angka,
                        semester: item.semester,
                        tahun_ajaran: item.tahun_ajaran
                    });
                }
            }

            // 3. Proses Nilai Hafalan
            if (item.nilaiHafalan && Array.isArray(item.nilaiHafalan)) {
                for (const nilai of item.nilaiHafalan) {
                    const mapel = await db.MataPelajaran.findOne({ 
                        where: { kode_mapel: nilai.kode_mapel } 
                    });

                    if (!mapel) {
                        console.warn(`❌ Mapel hafalan dengan kode ${nilai.kode_mapel} tidak ditemukan`);
                        continue;
                    }

                    nilaiHafalanToCreate.push({
                        siswa_id: siswa.id,
                        mapel_id: mapel.id,
                        nilai_angka: nilai.nilai_angka,
                        semester: item.semester,
                        tahun_ajaran: item.tahun_ajaran
                    });
                }
            }

            // 4. Proses Kehadiran (DENGAN DEFAULT KEGIATAN)
            if (item.kehadiran && !kehadiranToUpdate[siswa.id]) {
                // 🔥 QUICK FIX: Set default kegiatan jika null
                let kegiatanName = item.kehadiran.kegiatan;
                if (!kegiatanName) {
                    // Ambil kegiatan default dari database
                    try {
                        const defaultKegiatan = await db.IndikatorKehadiran.findOne({
                            order: [['id', 'ASC']]
                        });
                        kegiatanName = defaultKegiatan ? defaultKegiatan.nama_kegiatan : 'Kegiatan Umum';
                        console.log(`⚠️  Menggunakan default kegiatan "${kegiatanName}" untuk siswa ${siswa.nama}`);
                    } catch (err) {
                        kegiatanName = 'Kegiatan Umum';
                        console.warn(`❌ Gagal ambil default kegiatan, gunakan "${kegiatanName}"`);
                    }
                }
                
                kehadiranToUpdate[siswa.id] = {
                    siswa_id: siswa.id,
                    kegiatan: kegiatanName, // 🔥 GUNAKAN KEGIATAN YANG SUDAH DI-SET
                    sakit: item.kehadiran.sakit || 0,
                    izin: item.kehadiran.izin || 0,
                    absen: item.kehadiran.alpha || 0,
                    semester: item.semester === '1' ? 'Ganjil' : 'Genap',
                    tahun_ajaran: item.tahun_ajaran
                };
                
                console.log(`✅ Kehadiran prepared untuk ${siswa.nama} dengan kegiatan: "${kegiatanName}"`);
            }

            // 5. Proses Sikap
            if (item.catatan_sikap && !sikapToUpdate[siswa.id]) {
                sikapToUpdate[siswa.id] = {
                    siswa_id: siswa.id,
                    catatan: item.catatan_sikap,
                    semester: item.semester === '1' ? 'Ganjil' : 'Genap', // Konversi format
                    tahun_ajaran: item.tahun_ajaran,
                    wali_kelas_id: siswa.wali_kelas ? siswa.wali_kelas.id : null,
                    kelas_id: siswa.kelas ? siswa.kelas.id : null
                };
            }
        }

        console.log("📝 Data yang akan disimpan:");
        console.log("- Nilai Ujian:", nilaiUjianToCreate.length);
        console.log("- Nilai Hafalan:", nilaiHafalanToCreate.length);
        console.log("- Kehadiran:", Object.keys(kehadiranToUpdate).length);
        console.log("- Sikap:", Object.keys(sikapToUpdate).length);

        // === OPERASI DATABASE ===
        
        // Simpan Nilai Ujian
        if (nilaiUjianToCreate.length > 0) {
            console.log("💾 Menyimpan nilai ujian...");
            await db.NilaiUjian.bulkCreate(nilaiUjianToCreate, {
                transaction,
                updateOnDuplicate: ['pengetahuan_angka', 'keterampilan_angka', 'updatedAt']
            });
            console.log("✅ Nilai ujian tersimpan");
        }

        // Simpan Nilai Hafalan
        if (nilaiHafalanToCreate.length > 0) {
            console.log("💾 Menyimpan nilai hafalan...");
            await db.NilaiHafalan.bulkCreate(nilaiHafalanToCreate, {
                transaction,
                updateOnDuplicate: ['nilai_angka', 'updatedAt']
            });
            console.log("✅ Nilai hafalan tersimpan");
        }

        // Simpan Kehadiran (KEMBALIKAN KE SIMPLE)
        if (Object.values(kehadiranToUpdate).length > 0) {
            console.log("💾 Menyimpan kehadiran...");
            console.log("Data kehadiran yang akan disimpan:", Object.values(kehadiranToUpdate));
            
            await db.Kehadiran.bulkCreate(Object.values(kehadiranToUpdate), {
                transaction,
                updateOnDuplicate: ['kegiatan', 'sakit', 'izin', 'absen', 'updatedAt']
            });
            console.log("✅ Kehadiran tersimpan");
        }

        // Simpan Sikap
        for (const siswaId in sikapToUpdate) {
            if (sikapToUpdate.hasOwnProperty(siswaId)) {
                console.log("💾 Menyimpan sikap untuk siswa:", siswaId);
                await db.Sikap.upsert(sikapToUpdate[siswaId], { transaction });
            }
        }
        console.log("✅ Sikap tersimpan");

        await transaction.commit();
        
        console.log("🎉 SEMUA DATA BERHASIL TERSIMPAN!");
        
        res.status(200).json({ 
            message: `Data raport berhasil disimpan! (${nilaiUjianToCreate.length} nilai ujian, ${nilaiHafalanToCreate.length} nilai hafalan, ${Object.keys(kehadiranToUpdate).length} kehadiran, ${Object.keys(sikapToUpdate).length} sikap)` 
        });

    } catch (error) {
        await transaction.rollback();
        console.error("❌ GAGAL MENYIMPAN RAPORT:", error);
        res.status(500).json({
            message: 'Terjadi kesalahan saat menyimpan data.',
            error: error.message
        });
    }
};

// ==========================================================================================
// FUNGSI-FUNGSI LAMA (TETAP DIPERTAHANKAN)
// ==========================================================================================

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
        const { nilai } = req.body;
        
        console.log(`UPDATE NILAI HAFALAN: id=${id}`, req.body);
        
        const nilaiHafalan = await db.NilaiHafalan.findByPk(id);
        if (!nilaiHafalan) return res.status(404).json({ message: "Data nilai hafalan tidak ditemukan." });

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
        kehadiran.absen = alpha || 0;
        await kehadiran.save();

        res.status(200).json(kehadiran);
    } catch (error) {
        console.error("Error update kehadiran:", error);
        res.status(500).json({ message: "Gagal update kehadiran.", error: error.message });
    }
};