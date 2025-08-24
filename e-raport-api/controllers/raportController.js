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
        let totalKehadiranSaved = 0;
        let totalNilaiUjianSaved = 0;
        let totalNilaiHafalanSaved = 0;
        let totalSikapSaved = 0;

        for (const item of validatedData) {
            console.log(`\n🔄 Processing siswa NIS: ${item.nis}`);
            console.log(`📊 Item keys:`, Object.keys(item));
            console.log(`📊 Kehadiran detail count:`, item.kehadiran_detail?.length || 0);

            // 1. Cari data siswa berdasarkan NIS
            const siswa = await db.Siswa.findOne({ 
                where: { nis: item.nis },
                include: ['kelas', 'wali_kelas']
            });

            if (!siswa) {
                console.warn(`❌ Siswa dengan NIS ${item.nis} tidak ditemukan`);
                continue;
            }

            console.log(`✅ Siswa found: ${siswa.id} - ${siswa.nama}`);

            // 2. Proses Nilai Ujian
            if (item.nilaiUjian && Array.isArray(item.nilaiUjian)) {
                console.log(`📊 Processing ${item.nilaiUjian.length} nilai ujian...`);
                
                for (const nilai of item.nilaiUjian) {
                    const mapel = await db.MataPelajaran.findOne({ 
                        where: { kode_mapel: nilai.kode_mapel } 
                    });

                    if (!mapel) {
                        console.warn(`❌ Mapel dengan kode ${nilai.kode_mapel} tidak ditemukan`);
                        continue;
                    }

                    await db.NilaiUjian.upsert({
                        siswa_id: siswa.id,
                        mapel_id: mapel.id,
                        pengetahuan_angka: nilai.pengetahuan_angka,
                        keterampilan_angka: nilai.keterampilan_angka,
                        semester: item.semester,
                        tahun_ajaran: item.tahun_ajaran
                    }, { transaction });

                    totalNilaiUjianSaved++;
                    console.log(`✅ Nilai ujian saved: ${mapel.nama_mapel}`);
                }
            }

            // 3. Proses Nilai Hafalan
            if (item.nilaiHafalan && Array.isArray(item.nilaiHafalan)) {
                console.log(`📊 Processing ${item.nilaiHafalan.length} nilai hafalan...`);
                
                for (const hafalan of item.nilaiHafalan) {
                    const mapel = await db.MataPelajaran.findOne({ 
                        where: { kode_mapel: hafalan.kode_mapel } 
                    });

                    if (!mapel) {
                        console.warn(`❌ Mapel hafalan dengan kode ${hafalan.kode_mapel} tidak ditemukan`);
                        continue;
                    }

                    await db.NilaiHafalan.upsert({
                        siswa_id: siswa.id,
                        mapel_id: mapel.id,
                        nilai_angka: hafalan.nilai_angka,
                        semester: item.semester,
                        tahun_ajaran: item.tahun_ajaran
                    }, { transaction });

                    totalNilaiHafalanSaved++;
                    console.log(`✅ Nilai hafalan saved: ${mapel.nama_mapel}`);
                }
            }

            // 4. 🔥 PERBAIKAN UTAMA: Proses Kehadiran Detail (Array)
            if (item.kehadiran_detail && Array.isArray(item.kehadiran_detail)) {
                console.log(`📋 🔥 MEMULAI SIMPAN KEHADIRAN untuk ${siswa.nama}...`);
                console.log(`📊 Total kegiatan: ${item.kehadiran_detail.length}`);
                
                // 🔥 Log semua detail yang akan disimpan
                item.kehadiran_detail.forEach((detail, idx) => {
                    console.log(`   ${idx + 1}. ${detail.kegiatan}: izin=${detail.izin}, sakit=${detail.sakit}, absen=${detail.absen || detail.alpha}`);
                });
                
                for (const [index, kegiatanDetail] of item.kehadiran_detail.entries()) {
                    console.log(`\n🔄 Processing kegiatan ${index + 1}/${item.kehadiran_detail.length}:`);
                    console.log(`🔍 Raw detail:`, kegiatanDetail);
                    
                    // 🔥 VALIDASI KEGIATAN
                    if (!kegiatanDetail.kegiatan || String(kegiatanDetail.kegiatan).trim() === '') {
                        console.log(`❌ Kegiatan kosong, skip...`);
                        continue;
                    }
                    
                    // 🔥 PASTIKAN FIELD NAMES DAN TIPE DATA BENAR
                    const kehadiranData = {
                        siswa_id: siswa.id, // ✅ PERBAIKAN: Gunakan siswa_id, bukan siswaId
                        kegiatan: String(kegiatanDetail.kegiatan).trim(),
                        izin: parseInt(kegiatanDetail.izin) || 0,
                        sakit: parseInt(kegiatanDetail.sakit) || 0,
                        absen: parseInt(kegiatanDetail.absen || kegiatanDetail.alpha) || 0,
                        semester: String(item.semester),
                        tahun_ajaran: String(item.tahun_ajaran)
                    };
                    
                    console.log(`💾 Will save to Kehadirans table:`, kehadiranData);
                    
                    try {
                        // 🔥 UPSERT SATU PER SATU UNTUK DEBUGGING LEBIH BAIK
                        const [kehadiranRecord, created] = await db.Kehadiran.upsert(kehadiranData, { 
                            transaction,
                            returning: true 
                        });
                        
                        totalKehadiranSaved++;
                        console.log(`${created ? '🆕' : '🔄'} Kehadiran ${created ? 'CREATED' : 'UPDATED'}: ${kegiatanDetail.kegiatan}`);
                        
                        // 🔥 Log record yang tersimpan
                        if (Array.isArray(kehadiranRecord)) {
                            console.log(`✅ Saved record details:`, {
                                id: kehadiranRecord[0]?.id,
                                siswa_id: kehadiranRecord[0]?.siswa_id,
                                kegiatan: kehadiranRecord[0]?.kegiatan
                            });
                        }
                        
                    } catch (saveError) {
                        console.error(`❌ Error saving kehadiran for ${kegiatanDetail.kegiatan}:`, saveError.message);
                        throw saveError; // Re-throw untuk rollback transaction
                    }
                }
                
                console.log(`📊 Kehadiran selesai untuk ${siswa.nama}: ${item.kehadiran_detail.length} kegiatan`);
                
            } else {
                console.log(`⚠️ Tidak ada kehadiran_detail untuk siswa ${item.nis}`);
                console.log(`📊 Available item keys:`, Object.keys(item));
                console.log(`📊 kehadiran_detail type:`, typeof item.kehadiran_detail);
                console.log(`📊 kehadiran_detail value:`, item.kehadiran_detail);
            }

            // 5. Proses Sikap/Catatan
            if (item.catatan_sikap) {
                console.log(`📝 Processing sikap for ${siswa.nama}...`);
                
                await db.Sikap.upsert({
                    siswa_id: siswa.id, // ✅ PERBAIKAN: Gunakan siswa_id, bukan siswaId
                    catatan: item.catatan_sikap,
                    semester: item.semester,
                    tahun_ajaran: item.tahun_ajaran,
                    wali_kelas_id: siswa.wali_kelas ? siswa.wali_kelas.id : null,
                    kelas_id: siswa.kelas ? siswa.kelas.id : null
                }, { transaction });
                
                totalSikapSaved++;
                console.log(`✅ Catatan sikap saved for ${siswa.nama}`);
            }
        }

        // 🔥 COMMIT TRANSACTION
        await transaction.commit();
        console.log(`🎉 TRANSACTION COMMITTED SUCCESSFULLY`);
        
        // 🔥 VERIFIKASI FINAL: Cek data yang benar-benar tersimpan
        console.log('\n🔍 VERIFIKASI FINAL: Cek data kehadiran yang tersimpan...');
        const semester = validatedData[0]?.semester;
        const tahun_ajaran = validatedData[0]?.tahun_ajaran;
        
        const savedKehadiran = await db.Kehadiran.findAll({
            where: {
                semester: semester,
                tahun_ajaran: tahun_ajaran
            },
            include: [{
                model: db.Siswa,
                attributes: ['nama', 'nis']
            }],
            order: [['siswa_id', 'ASC'], ['kegiatan', 'ASC']]
        });
        
        console.log(`📊 FINAL COUNT: ${savedKehadiran.length} kehadiran records tersimpan`);
        savedKehadiran.forEach((record, idx) => {
            console.log(`${idx + 1}. ${record.Siswa.nama} (${record.Siswa.nis}) - ${record.kegiatan}: izin=${record.izin}, sakit=${record.sakit}, absen=${record.absen}`);
        });

        res.status(200).json({ 
            message: `✅ Data berhasil disimpan!`,
            summary: {
                total_siswa: validatedData.length,
                nilai_ujian: totalNilaiUjianSaved,
                nilai_hafalan: totalNilaiHafalanSaved,
                kehadiran: totalKehadiranSaved,
                sikap: totalSikapSaved
            },
            kehadiran_verification: {
                count: savedKehadiran.length,
                details: savedKehadiran.map(k => ({
                    id: k.id,
                    nis: k.Siswa.nis,
                    nama: k.Siswa.nama,
                    kegiatan: k.kegiatan,
                    totals: { izin: k.izin, sakit: k.sakit, absen: k.absen }
                }))
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error("❌ ERROR in saveValidatedRaport:", error);
        console.error("❌ Error stack:", error.stack);
        res.status(500).json({
            message: 'Terjadi kesalahan saat menyimpan data.',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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