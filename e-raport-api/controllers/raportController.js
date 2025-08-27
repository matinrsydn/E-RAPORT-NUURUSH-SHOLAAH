// e-raport-api/controllers/raportController.js

const db = require('../models');

// ==========================================================================================
// FUNGSI UTAMA UNTUK MENYIMPAN DATA DARI HALAMAN VALIDASI
// ==========================================================================================
exports.saveValidatedRaport = async (req, res) => {
    const { validatedData } = req.body;

    if (!validatedData || validatedData.length === 0) {
        return res.status(400).json({ message: "Tidak ada data untuk disimpan." });
    }

    const transaction = await db.sequelize.transaction();

    try {
        // Cache untuk optimasi pencarian ID
        const cache = {
            tahunAjaran: {}
        };

        const findTahunAjaran = async (nama_ajaran, semester) => {
            const key = `${nama_ajaran}-${semester}`;
            if (!cache.tahunAjaran[key]) {
                cache.tahunAjaran[key] = await db.TahunAjaran.findOne({
                    where: { nama_ajaran, semester, status: 'aktif' }
                });
            }
            return cache.tahunAjaran[key];
        };

        for (const item of validatedData) {
            const siswa = await db.Siswa.findOne({ where: { nis: item.nis } });
            if (!siswa) continue;

            // Cari TahunAjaran ID yang sesuai
            const tahunAjaran = await findTahunAjaran(item.tahun_ajaran, item.semester);
            if (!tahunAjaran) {
                console.warn(`Tahun Ajaran aktif untuk ${item.tahun_ajaran} semester ${item.semester} tidak ditemukan.`);
                continue; 
            }
            const tahun_ajaran_id = tahunAjaran.id;

            // 1. Proses Nilai Ujian
            if (item.nilaiUjian && Array.isArray(item.nilaiUjian)) {
                for (const nilai of item.nilaiUjian) {
                    const mapel = await db.MataPelajaran.findOne({ 
                        where: { 
                            kode_mapel: nilai.kode_mapel,
                            jenis: 'Ujian' // <-- Tambahkan filter ini
                        } 
                    });
                    if (!mapel) {
                        console.warn(`⚠️  Mapel Ujian dengan kode '${nilai.kode_mapel}' tidak ditemukan/tidak cocok. Data dilewati.`);
                        continue;
                    }

                    await db.NilaiUjian.upsert({
                        siswa_id: siswa.id,
                        mapel_id: mapel.id,
                        tahun_ajaran_id: tahun_ajaran_id,
                        semester: item.semester,
                        nilai_pengetahuan: nilai.pengetahuan_angka,
                        nilai_keterampilan: nilai.keterampilan_angka,
                        mapel_text: mapel.nama_mapel
                    }, { transaction });
                }
            }

            // 2. Proses Nilai Hafalan
            if (item.nilaiHafalan && Array.isArray(item.nilaiHafalan)) {
                for (const hafalan of item.nilaiHafalan) {
                    const mapel = await db.MataPelajaran.findOne({ 
                        where: { 
                            kode_mapel: hafalan.kode_mapel,
                            jenis: 'Hafalan' // <-- Tambahkan filter ini
                        } 
                    });
                    if (!mapel) {
                        console.warn(`⚠️  Mapel Hafalan dengan kode '${hafalan.kode_mapel}' tidak ditemukan/tidak cocok. Data dilewati.`);
                        continue;
                    }
                    
                    await db.NilaiHafalan.upsert({
                        siswa_id: siswa.id,
                        mapel_id: mapel.id,
                        tahun_ajaran_id: tahun_ajaran_id,
                        semester: item.semester,
                        nilai: hafalan.nilai_angka,
                        mapel_text: mapel.nama_mapel
                    }, { transaction });
                }
            }

            // 3. Proses Kehadiran
            if (item.kehadiran_detail && Array.isArray(item.kehadiran_detail)) {
                for (const kegiatanDetail of item.kehadiran_detail) {
                    const indikator = await db.IndikatorKehadiran.findOne({ where: { nama_kegiatan: kegiatanDetail.kegiatan } });

                    await db.Kehadiran.upsert({
                        siswa_id: siswa.id,
                        tahun_ajaran_id: tahun_ajaran_id,
                        semester: item.semester,
                        indikatorkehadirans_id: indikator ? indikator.id : null,
                        indikator_text: kegiatanDetail.kegiatan,
                        izin: parseInt(kegiatanDetail.izin) || 0,
                        sakit: parseInt(kegiatanDetail.sakit) || 0,
                        absen: parseInt(kegiatanDetail.absen || kegiatanDetail.alpha) || 0,
                    }, { transaction });
                }
            }

            // 4. Proses Sikap (LOGIKA DIPERBAIKI)
            if (item.sikap && Array.isArray(item.sikap)) {
                for (const sikapDetail of item.sikap) {
                    console.log(`\n📝 Memproses sikap untuk ${siswa.nama}:`);
                    console.log(`   Jenis: ${sikapDetail.jenis_sikap}`);
                    console.log(`   Indikator: ${sikapDetail.indikator}`);
                    console.log(`   Nilai: ${sikapDetail.nilai}`);

                    // Cari indikator yang cocok di tabel IndikatorSikap
                    const indikator = await db.IndikatorSikap.findOne({
                        where: {
                            // Mengubah input dan kolom database menjadi huruf kecil saat membandingkan
                            [db.Sequelize.Op.and]: [
                                db.sequelize.where(db.sequelize.fn('LOWER', db.sequelize.col('jenis_sikap')), sikapDetail.jenis_sikap.toLowerCase()),
                                { indikator: sikapDetail.indikator },
                                { is_active: 1 }
                            ]
                        }
                    });

                    // PERBAIKAN LOGIC UTAMA:
                    let final_indikator_sikap_id = null;
                    const final_indikator_text = sikapDetail.indikator;
                    
                    if (indikator) {
                        final_indikator_sikap_id = indikator.id;
                        console.log(`✅ Indikator ditemukan di master. ID: ${final_indikator_sikap_id}`);final_indikator_sikap_id = indikator.id;
                        console.log(`✅ Indikator ditemukan di master. ID: ${final_indikator_sikap_id}`);
                    } else {
                        console.log(`⚠️ Indikator tidak ditemukan di master, menggunakan text dari input`);
                    }

                    // PERBAIKAN: Pastikan nilai tidak null
                    const finalNilai = (sikapDetail.nilai !== null && sikapDetail.nilai !== undefined && !isNaN(parseFloat(sikapDetail.nilai)))
                        ? parseFloat(sikapDetail.nilai) 
                        : null;
                    
                    console.log(`💯 Nilai final yang akan disimpan: ${finalNilai}`);

                    await db.Sikap.upsert({
                        siswa_id: siswa.id,
                        tahun_ajaran_id: tahun_ajaran_id,
                        semester: item.semester,
                        indikator_sikap_id: final_indikator_sikap_id, // Terisi jika ditemukan
                        indikator_text: final_indikator_text,         // Selalu dari input
                        nilai: finalNilai,                              // Nilai yang sudah divalidasi
                        deskripsi: sikapDetail.deskripsi || ''
                    }, { transaction });
                    
                    console.log(`✅ Data sikap berhasil disimpan`);
                }
            } else if (item.catatan_sikap) {
                // Fallback jika hanya ada catatan umum
                console.log(`📝 Menyimpan catatan sikap umum untuk ${siswa.nama}`);
                await db.Sikap.upsert({
                    siswa_id: siswa.id,
                    tahun_ajaran_id: tahun_ajaran_id,
                    semester: item.semester,
                    indikator_sikap_id: null,
                    indikator_text: 'Catatan Wali Kelas',
                    nilai: null, // Catatan umum biasanya tidak ada nilai
                    deskripsi: item.catatan_sikap
                }, { transaction });
            }
        }

        await transaction.commit();
        res.status(200).json({ message: `Data raport berhasil disimpan!` });

    } catch (error) {
        await transaction.rollback();
        console.error("❌ ERROR in saveValidatedRaport:", error);
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
    
    console.log("=== DEBUG getRaportData ===");
    console.log("siswaId:", siswaId);
    console.log("tahunAjaran:", tahunAjaran);
    console.log("semester:", semester);
    console.log("tahunAjaranFormatted:", tahunAjaranFormatted);

    try {
        // 🔥 PERBAIKAN 1: Gunakan siswa_id yang konsisten untuk kehadiran
        const kehadiranQuery = {
            siswa_id: siswaId,
            tahun_ajaran: tahunAjaranFormatted,
            // 🔥 PERBAIKAN 2: Coba dua format semester
            [db.Sequelize.Op.or]: [
                { semester: semester },           // angka: 1, 2
                { semester: semester === '1' ? 'Ganjil' : 'Genap' }  // text
            ]
        };

        // 🔥 PERBAIKAN 3: Gunakan siswa_id yang konsisten untuk sikap
        const sikapQuery = {
            siswa_id: siswaId,
            tahun_ajaran: tahunAjaranFormatted,
            // 🔥 PERBAIKAN 4: Coba dua format semester untuk sikap juga
            [db.Sequelize.Op.or]: [
                { semester: semester },
                { semester: semester === '1' ? 'Ganjil' : 'Genap' }
            ]
        };

        console.log("kehadiranQuery:", JSON.stringify(kehadiranQuery, null, 2));
        console.log("sikapQuery:", JSON.stringify(sikapQuery, null, 2));

        const [nilaiUjian, nilaiHafalan, semuaKehadiran, sikap] = await Promise.all([
            db.NilaiUjian.findAll({ 
                where: { 
                    siswa_id: siswaId, 
                    tahun_ajaran: tahunAjaranFormatted, 
                    semester: semester 
                }, 
                include: [{ 
                    model: db.MataPelajaran, 
                    as: 'mapel', 
                    attributes: ['nama_mapel'] 
                }] 
            }),
            db.NilaiHafalan.findAll({ 
                where: { 
                    siswa_id: siswaId, 
                    tahun_ajaran: tahunAjaranFormatted, 
                    semester: semester 
                }, 
                include: [{ 
                    model: db.MataPelajaran, 
                    as: 'mapel', 
                    attributes: ['nama_mapel'] 
                }] 
            }),
            // 🔥 PERBAIKAN: Gunakan query yang lebih fleksibel
            db.Kehadiran.findAll({ 
                where: kehadiranQuery
            }),
            // 🔥 PERBAIKAN: Gunakan query yang lebih fleksibel
            db.Sikap.findAll({ 
                where: sikapQuery
            })
        ]);

        console.log("=== HASIL QUERY ===");
        console.log("nilaiUjian count:", nilaiUjian.length);
        console.log("nilaiHafalan count:", nilaiHafalan.length);
        console.log("semuaKehadiran count:", semuaKehadiran.length);
        console.log("sikap count:", sikap.length);

        // Log detail kehadiran jika ada
        if (semuaKehadiran.length > 0) {
            console.log("Sample kehadiran:", semuaKehadiran[0].toJSON());
        }

        // Log detail sikap jika ada
        if (sikap.length > 0) {
            console.log("Sample sikap:", sikap[0].toJSON());
        }

        // 🔥 PERBAIKAN: Hitung rekap kehadiran dengan lebih hati-hati
        const rekapKehadiran = semuaKehadiran.reduce((acc, curr) => {
            acc.sakit += parseInt(curr.sakit) || 0;
            acc.izin += parseInt(curr.izin) || 0;
            acc.alpha += parseInt(curr.absen) || 0; // absen = alpha
            if (!acc.id && curr.id) acc.id = curr.id;
            return acc;
        }, { id: null, sakit: 0, izin: 0, alpha: 0 });

        console.log("rekapKehadiran:", rekapKehadiran);

        res.status(200).json({
            nilaiUjian: nilaiUjian.map(n => ({ 
                id: n.id, 
                nama_mapel: n.mapel?.nama_mapel || 'N/A', 
                pengetahuan_angka: n.pengetahuan_angka, 
                keterampilan_angka: n.keterampilan_angka 
            })),
            nilaiHafalan: nilaiHafalan.map(n => ({ 
                id: n.id, 
                kategori: n.kategori || 'Hafalan', 
                nilai: n.nilai_angka, 
                nilai_angka: n.nilai_angka 
            })),
            // 🔥 PERBAIKAN: Pastikan kehadiran selalu ada datanya
            kehadiran: rekapKehadiran.id ? rekapKehadiran : {
                id: null,
                sakit: 0,
                izin: 0, 
                alpha: 0
            },
            // 🔥 PERBAIKAN: Format sikap dengan lebih baik
            sikap: sikap.map(s => ({ 
                id: s.id, 
                jenis_sikap: s.jenis_sikap, 
                indikator: s.indikator, 
                angka: s.angka, 
                deskripsi: s.deskripsi || s.catatan || 'Tidak ada catatan'
            })),
            // 🔥 DEBUG: Tambahkan data mentah untuk debugging
            debug: {
                kehadiran_raw: semuaKehadiran.map(k => k.toJSON()),
                sikap_raw: sikap.map(s => s.toJSON()),
                queries: {
                    kehadiranQuery,
                    sikapQuery
                }
            }
        });
        
    } catch (error) {
        console.error("=== ERROR in getRaportData ===");
        console.error("Error details:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({ 
            message: "Gagal mengambil data raport.", 
            error: error.message,
            debug: {
                siswaId,
                tahunAjaran,
                semester,
                tahunAjaranFormatted
            }
        });
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