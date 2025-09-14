// e-raport-api/controllers/raportController.js

let db = require('../models');
const fs = require('fs');
const path = require('path');
const { parseExcelFile } = require('./excelParser');

// ==========================================================================================
// FUNGSI UTAMA UNTUK MENYIMPAN DATA DARI HALAMAN VALIDASI
// ==========================================================================================
exports.saveValidatedRaport = async (req, res) => {
    const { validatedData } = req.body || {};
    const transaction = await db.sequelize.transaction();

    const skippedRows = [];
    let processedCount = 0;

    try {
        if (!validatedData || validatedData.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Tidak ada data valid untuk disimpan.' });
        }

        for (let idx = 0; idx < validatedData.length; idx++) {
            const item = validatedData[idx] || {};

            // Basic input validation per-row: collect missing fields but don't abort entire batch
            const missing = [];
            if (!item.nis) missing.push('nis');
            if (!item.semester) missing.push('semester');
            const providedTahunId = item.tahun_ajaran_id || req.body?.tahun_ajaran_id || null;
            if (!providedTahunId && !item.tahun_ajaran) missing.push('tahun_ajaran or tahun_ajaran_id');

            if (missing.length > 0) {
                skippedRows.push({ index: idx, nis: item.nis || null, missing });
                console.warn(`Skipping row index=${idx} nis=${item.nis || 'unknown'} missing=${missing.join(',')}`);
                continue; // skip only this row
            }

            // Resolve PeriodeAjaran: prefer numeric id, then Master -> Periode, fallback to legacy nama_ajaran
            let tahunAjaranDb = null;
            if (providedTahunId) {
                try {
                    tahunAjaranDb = await db.PeriodeAjaran.findByPk(Number(providedTahunId));
                } catch (e) {
                    tahunAjaranDb = null;
                }
            }
            const Master = db.MasterTahunAjaran || null;
            if (!tahunAjaranDb) {
                if (Master && item.tahun_ajaran) {
                    const master = await Master.findOne({ where: { nama_ajaran: item.tahun_ajaran } });
                    if (master) tahunAjaranDb = await db.PeriodeAjaran.findOne({ where: { master_tahun_ajaran_id: master.id, semester: item.semester, status: 'aktif' } });
                }
            }
            if (!tahunAjaranDb && item.tahun_ajaran) {
                tahunAjaranDb = await db.PeriodeAjaran.findOne({ where: { nama_ajaran: item.tahun_ajaran, semester: item.semester, status: 'aktif' } });
            }

            if (!tahunAjaranDb) {
                skippedRows.push({ index: idx, nis: item.nis || null, missing: ['tahun_ajaran not found'] });
                console.warn(`Tahun Ajaran aktif untuk ${item.tahun_ajaran || providedTahunId} semester ${item.semester} tidak ditemukan. Skipping siswa NIS ${item.nis}.`);
                continue;
            }
            const tahun_ajaran_id = tahunAjaranDb.id;
            const master_tahun_ajaran_id = tahunAjaranDb.master_tahun_ajaran_id || (tahunAjaranDb.master && tahunAjaranDb.master.id) || null;

            const siswaDb = await db.Siswa.findOne({ where: { nis: item.nis } });
            if (!siswaDb) {
                skippedRows.push({ index: idx, nis: item.nis || null, missing: ['siswa not found'] });
                console.warn(`Siswa dengan NIS ${item.nis} tidak ditemukan. Skipping.`);
                continue;
            }
            const siswa_id = siswaDb.id;

            // 1. HAPUS SEMUA DATA LAMA UNTUK SISWA INI DI SEMESTER INI
            const deleteWhere = { siswa_id, tahun_ajaran_id, semester: item.semester };

            console.log(`Menghapus data lama untuk Siswa ID: ${siswa_id}, Tahun Ajaran ID: ${tahun_ajaran_id}, Semester: ${item.semester}`);
            if (db.NilaiUjian && typeof db.NilaiUjian.destroy === 'function') await db.NilaiUjian.destroy({ where: deleteWhere, transaction });
            if (db.NilaiHafalan && typeof db.NilaiHafalan.destroy === 'function') await db.NilaiHafalan.destroy({ where: deleteWhere, transaction });
            if (db.Kehadiran && typeof db.Kehadiran.destroy === 'function') await db.Kehadiran.destroy({ where: deleteWhere, transaction });
            if (db.Sikap && typeof db.Sikap.destroy === 'function') await db.Sikap.destroy({ where: deleteWhere, transaction });

            // 2. SISIPKAN DATA BARU DARI EXCEL

            // 2a. Sisipkan Nilai Ujian (preserve mapel_text if mapel missing)
            if (item.nilaiUjian && item.nilaiUjian.length > 0) {
                const nilaiUjianToCreate = [];
                for (const nilai of item.nilaiUjian) {
                    const mapel = await db.MataPelajaran.findOne({ where: { nama_mapel: nilai.nama_mapel, jenis: 'Ujian' } });
                    const mapelId = mapel ? mapel.id : null;
                    const mapelName = mapel ? mapel.nama_mapel : (nilai.nama_mapel || null);
                    const finalNilai = nilai.nilai !== undefined ? (isNaN(parseFloat(nilai.nilai)) ? null : parseFloat(nilai.nilai)) : null;
                    const predikat = (nilai.predikat || (finalNilai !== null ? (finalNilai === 100 ? 'Sempurna' : finalNilai >= 90 ? 'Sangat Baik' : finalNilai >= 80 ? 'Baik' : finalNilai >= 70 ? 'Cukup' : 'Kurang') : null)) || null;
                    // NilaiUjian no longer stores 'deskripsi'; only store numeric nilai
                    nilaiUjianToCreate.push({ siswa_id, mapel_id: mapelId, nilai: finalNilai, predikat, semester: item.semester, tahun_ajaran_id, mapel_text: mapelName });
                }
                if (nilaiUjianToCreate.length > 0) {
                    const map = new Map();
                    for (const v of nilaiUjianToCreate) {
                        const key = `${v.siswa_id}-${v.mapel_id || 'null'}-${v.semester}-${v.tahun_ajaran_id}`;
                        if (!map.has(key)) map.set(key, v);
                    }
                    await db.NilaiUjian.bulkCreate(Array.from(map.values()), { transaction });
                }
            }

            // 2b. Sisipkan Nilai Hafalan
            if (item.nilaiHafalan && item.nilaiHafalan.length > 0) {
                const nilaiHafalanToCreate = [];
                for (const hafalan of item.nilaiHafalan) {
                    const mapel = await db.MataPelajaran.findOne({ where: { nama_mapel: hafalan.nama_mapel, jenis: 'Hafalan' } });
                    const mapelId = mapel ? mapel.id : null;
                    const mapelName = mapel ? mapel.nama_mapel : (hafalan.nama_mapel || null);
                    const finalNilaiH = hafalan.nilai_angka !== undefined ? (isNaN(parseFloat(hafalan.nilai_angka)) ? null : parseFloat(hafalan.nilai_angka)) : null;
                    let predikatH = (hafalan.predikat || (finalNilaiH !== null ? (finalNilaiH === 100 ? 'Sempurna' : finalNilaiH >= 90 ? 'Sangat Baik' : finalNilaiH >= 80 ? 'Baik' : finalNilaiH >= 70 ? 'Cukup' : 'Kurang') : null)) || null;
                    if (predikatH) {
                        const p = String(predikatH).toLowerCase();
                        if (p.includes('sempurna') || p.includes('sangat') || p.includes('baik') || p.includes('cukup') || p.includes('tercapai')) {
                            predikatH = 'Tercapai';
                        } else {
                            predikatH = 'Tidak Tercapai';
                        }
                    }
                    // Store numeric nilai (nilai_angka) along with predikat. deskripsi removed.
                    nilaiHafalanToCreate.push({ siswa_id, mapel_id: mapelId, predikat: predikatH, semester: item.semester, tahun_ajaran_id, mapel_text: mapelName, nilai: finalNilaiH });
                }
                if (nilaiHafalanToCreate.length > 0) {
                    const map = new Map();
                    for (const v of nilaiHafalanToCreate) {
                        const key = `${v.siswa_id}-${v.mapel_id || 'null'}-${v.semester}-${v.tahun_ajaran_id}`;
                        if (!map.has(key)) map.set(key, v);
                    }
                    await db.NilaiHafalan.bulkCreate(Array.from(map.values()), { transaction });
                }
            }

            // 2c. Sisipkan Kehadiran
            if (item.kehadiran_detail && item.kehadiran_detail.length > 0) {
                const kehadiranToCreate = [];
                for (const kegiatan of item.kehadiran_detail) {
                    const indikator = await db.IndikatorKehadiran.findOne({ where: { nama_kegiatan: kegiatan.kegiatan } });
                    kehadiranToCreate.push({ siswa_id, indikatorkehadirans_id: indikator ? indikator.id : null, indikator_text: kegiatan.kegiatan, izin: kegiatan.izin, sakit: kegiatan.sakit, absen: kegiatan.absen, semester: item.semester, tahun_ajaran_id });
                }
                if (kehadiranToCreate.length > 0) await db.Kehadiran.bulkCreate(kehadiranToCreate, { transaction });
            }

            // 2d. Sisipkan Sikap
            if (item.sikap) {
                const sikapToCreate = [];
                if (item.sikap.detail && item.sikap.detail.length > 0) {
                    for (const sikapDetail of item.sikap.detail) {
                        const indikator = await db.IndikatorSikap.findOne({ where: { indikator: sikapDetail.indikator, is_active: 1 } });
                        sikapToCreate.push({ siswa_id, tahun_ajaran_id, semester: item.semester, indikator_sikap_id: indikator ? indikator.id : null, indikator_text: sikapDetail.indikator, nilai: sikapDetail.nilai });
                    }
                }
                if (item.sikap.catatan_walikelas) {
                    // Catatan wali kelas is stored as a Sikap entry with indikator_text 'Catatan Wali Kelas'
                    sikapToCreate.push({ siswa_id, tahun_ajaran_id, semester: item.semester, indikator_text: 'Catatan Wali Kelas', deskripsi: item.sikap.catatan_walikelas });
                }
                if (sikapToCreate.length > 0) await db.Sikap.bulkCreate(sikapToCreate, { transaction });
            }

            // 2e. Update SiswaKelasHistory with Catatan Wali (if provided by parser)
            try {
                if (item.processed_data && (item.processed_data.catatan_akademik || item.processed_data.catatan_sikap)) {
                    // Try to find/create history that matches siswa + tahun_ajaran_id + semester
                    const targetSemester = item.semester || null;
                    let history = null;

                    // Try to match history by master_tahun_ajaran_id and semester, fall back to semester only or latest
                    if (master_tahun_ajaran_id && targetSemester) {
                        history = await db.SiswaKelasHistory.findOne({ where: { siswa_id, master_tahun_ajaran_id, semester: targetSemester } });
                    }
                    if (!history && master_tahun_ajaran_id) {
                        history = await db.SiswaKelasHistory.findOne({ where: { siswa_id, master_tahun_ajaran_id } });
                    }
                    if (!history && targetSemester) {
                        history = await db.SiswaKelasHistory.findOne({ where: { siswa_id, semester: targetSemester } });
                    }
                    if (!history) {
                        history = await db.SiswaKelasHistory.findOne({ where: { siswa_id }, order: [['id', 'DESC']] });
                    }

                    if (history) {
                        // update fields and ensure semester/tahun_ajaran are set to target values if provided
                        if (typeof item.processed_data.catatan_akademik !== 'undefined' && item.processed_data.catatan_akademik !== null) history.catatan_akademik = item.processed_data.catatan_akademik;
                        if (typeof item.processed_data.catatan_sikap !== 'undefined' && item.processed_data.catatan_sikap !== null) history.catatan_sikap = item.processed_data.catatan_sikap;
                        if (master_tahun_ajaran_id) history.master_tahun_ajaran_id = master_tahun_ajaran_id;
                        if (targetSemester) history.semester = targetSemester;
                        await history.save({ transaction });
                    } else {
                        // Create a new history row if none exists for this student/TA/semester
                        await db.SiswaKelasHistory.create({
                            siswa_id,
                            kelas_id: siswaDb.kelas_id || null,
                            master_tahun_ajaran_id: master_tahun_ajaran_id || null,
                            semester: targetSemester || null,
                            catatan_akademik: item.processed_data.catatan_akademik || null,
                            catatan_sikap: item.processed_data.catatan_sikap || null
                        }, { transaction });
                    }
                }
            } catch (histErr) {
                console.warn('Failed to update/create SiswaKelasHistory with catatan wali for siswa', siswa_id, histErr.message);
                // do not abort entire batch on history save failure; record as skipped row
                skippedRows.push({ index: idx, nis: item.nis || null, missing: ['failed to save history notes'] });
            }

            processedCount += 1;
        }

        // Hapus draf setelah berhasil disimpan for processed rows
        const batchIds = [...new Set(validatedData.map(d => d.upload_batch_id).filter(id => id))];

        if (processedCount === 0) {
            // Nothing processed successfully
            await transaction.rollback();
            return res.status(400).json({ message: 'Semua baris tidak valid.', skipped_rows: skippedRows });
        }

        // No draft cleanup required anymore: upload flow commits directly to final tables.
        // We intentionally do not persist skipped/invalid rows. Client receives validation
        // feedback in the response JSON so DraftNilai is no longer used.

        await transaction.commit();

        res.status(200).json({ message: 'Data raport berhasil diperbarui (data lama digantikan).', processed_count: processedCount, skipped_count: skippedRows.length, skipped_rows: skippedRows });
    } catch (error) {
        await transaction.rollback();
        console.error('ERROR in saveValidatedRaport:', error);
        res.status(500).json({ message: 'Gagal menyimpan data raport.', error: error.message });
    }
};

// Test helper: allow tests to inject a mock DB object
exports.__setDb = (newDb) => { db = newDb; };

// --- NEW: Return a list of raport batches / summary for management UI ---
exports.getRaportList = async (req, res) => {
    try {
        // DraftNilai table no longer used; return an empty array as placeholder.
        // The frontend should rely on upload history stored/managed elsewhere if needed.
        res.status(200).json([]);
    } catch (error) {
        console.error('ERROR in getRaportList:', error);
        res.status(500).json({ message: 'Gagal mengambil daftar raport.', error: error.message });
    }
};


// ==========================================================================================
// FUNGSI-FUNGSI LAMA (TETAP DIPERTAHANKAN)
// ==========================================================================================

exports.getRaportData = async (req, res) => {
    const { siswaId, tahunAjaran, semester } = req.params;
    const tahunAjaranFormatted = `${tahunAjaran}/${parseInt(tahunAjaran) + 1}`;

    try {
        const tahunAjaranRecord = await db.PeriodeAjaran.findOne({
            where: {
                nama_ajaran: tahunAjaranFormatted,
                semester: semester,
                status: 'aktif'
            }
        });

        if (!tahunAjaranRecord) {
            return res.status(404).json({
                message: `Data Tahun Ajaran untuk ${tahunAjaranFormatted} semester ${semester} tidak ditemukan atau tidak aktif.`
            });
        }
        const tahunAjaranId = tahunAjaranRecord.id;

        const [nilaiUjian, nilaiHafalan, kehadiranDetail, semuaSikap] = await Promise.all([
            db.NilaiUjian.findAll({
                where: { siswa_id: siswaId, tahun_ajaran_id: tahunAjaranId, semester: semester },
                include: [{ model: db.MataPelajaran, as: 'mapel', attributes: ['nama_mapel'] }],
                order: [['mapel_text', 'ASC']]
            }),
            db.NilaiHafalan.findAll({
                where: { siswa_id: siswaId, tahun_ajaran_id: tahunAjaranId, semester: semester },
                include: [{ model: db.MataPelajaran, as: 'mapel', attributes: ['nama_mapel'] }],
                order: [['mapel_text', 'ASC']]
            }),
            // 🔥 PERUBAHAN: Ambil semua data kehadiran, jangan direkap
            db.Kehadiran.findAll({
                where: { siswa_id: siswaId, tahun_ajaran_id: tahunAjaranId, semester: semester },
                order: [['indikator_text', 'ASC']]
            }),
            // Ambil semua data sikap
            db.Sikap.findAll({
                where: { siswa_id: siswaId, tahun_ajaran_id: tahunAjaranId, semester: semester }
            })
        ]);

        // 🔥 PERUBAHAN: Pisahkan antara Sikap per Indikator dan Catatan Wali Kelas
        const sikapDetail = semuaSikap.filter(s => s.indikator_sikap_id !== null);
        const catatanWaliKelas = semuaSikap.find(s => s.indikator_text === 'Catatan Wali Kelas') || { deskripsi: '', id: null };

        res.status(200).json({
            nilaiUjian: nilaiUjian.map(n => ({
                id: n.id,
                nama_mapel: n.mapel?.nama_mapel || n.mapel_text,
                // PERUBAHAN: kirim nilai tunggal dan predikat dinamis
                nilai: n.nilai,
                predikat: (function(val){
                    const v = parseFloat(val);
                    if (val === null || val === undefined || isNaN(v)) return '-';
                    if (v === 100) return 'Sempurna';
                    if (v >= 90) return 'Sangat Baik';
                    if (v >= 80) return 'Baik';
                    if (v >= 70) return 'Cukup';
                    return 'Kurang';
                })(n.nilai)
            })),
            nilaiHafalan: nilaiHafalan.map(n => ({
                id: n.id,
                kategori: n.mapel?.nama_mapel || n.mapel_text,
                predikat: n.predikat
            })),
            // Kirim data kehadiran sebagai array detail
            kehadiranDetail: kehadiranDetail.map(k => ({
                id: k.id,
                kegiatan: k.indikator_text,
                sakit: k.sakit,
                izin: k.izin,
                absen: k.absen
            })),
            // Kirim data sikap yang sudah dipisah
            sikapDetail: sikapDetail.map(s => ({
                id: s.id,
                indikator: s.indikator_text,
                nilai: s.nilai,
            })),
            catatanWaliKelas: {
                id: catatanWaliKelas.id,
                deskripsi: catatanWaliKelas.deskripsi
            }
        });

    } catch (error) {
        console.error("ERROR in getRaportData:", error);
        res.status(500).json({
            message: "Terjadi kesalahan saat mengambil data raport.",
            error: error.message,
        });
    }
};

exports.updateNilaiUjian = async (req, res) => {
    try {
    const { id } = req.params;
    const { nilai: newNilai } = req.body;

    console.log(`UPDATE NILAI UJIAN: id=${id}`, req.body);

    const nilaiRecord = await db.NilaiUjian.findByPk(id);
    if (!nilaiRecord) return res.status(404).json({ message: "Data nilai tidak ditemukan." });

    nilaiRecord.nilai = (newNilai !== undefined && !isNaN(parseFloat(newNilai))) ? parseFloat(newNilai) : null;
    await nilaiRecord.save();

    res.status(200).json(nilaiRecord);
    } catch (error) {
        console.error("Error update nilai ujian:", error);
        res.status(500).json({ message: "Gagal update nilai ujian.", error: error.message });
    }
};

exports.updateNilaiHafalan = async (req, res) => {
    try {
        const { id } = req.params;
        // 🔥 PERBAIKAN: Baca properti 'nilai_angka' dari body, bukan 'nilai'
        const { nilai_angka } = req.body; 
        
        const nilaiHafalan = await db.NilaiHafalan.findByPk(id);
        if (!nilaiHafalan) return res.status(404).json({ message: "Data nilai hafalan tidak ditemukan." });

        // Update predikat/deskripsi for NilaiHafalan model (no numeric 'nilai' column)
        // Accept nilai_angka from client but convert to predikat if provided
        let predikatVal = null;
        if (typeof nilai_angka !== 'undefined' && nilai_angka !== null) {
            const v = parseFloat(nilai_angka);
            if (!isNaN(v)) {
                predikatVal = (v === 100 ? 'Tercapai' : v >= 70 ? 'Tercapai' : 'Tidak Tercapai');
            }
        }
        if (predikatVal) nilaiHafalan.predikat = predikatVal;
        if (typeof req.body.deskripsi !== 'undefined') nilaiHafalan.deskripsi = req.body.deskripsi;
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
        // Ambil data sakit, izin, dan absen langsung dari body
        const { sakit, izin, absen } = req.body;

        const [updated] = await db.Kehadiran.update(
            {
                sakit: sakit || 0,
                izin: izin || 0,
                absen: absen || 0
            },
            {
                where: { id: id }
            }
        );

        if (updated) {
            const updatedKehadiran = await db.Kehadiran.findByPk(id);
            return res.status(200).json(updatedKehadiran);
        }
        
        return res.status(404).json({ message: "Data kehadiran tidak ditemukan." });

    } catch (error) {
        console.error("Error update kehadiran:", error);
        res.status(500).json({ message: "Gagal update kehadiran.", error: error.message });
    }
};

exports.updateSikap = async (req, res) => {
    try {
        const { id } = req.params;
        const { nilai } = req.body; // Hanya nilai yang bisa diubah

        const sikap = await db.Sikap.findByPk(id);
        if (!sikap) return res.status(404).json({ message: "Data sikap tidak ditemukan." });

        sikap.nilai = nilai;
        await sikap.save();
        
        res.status(200).json(sikap);
    } catch (error) {
        res.status(500).json({ message: "Gagal update nilai sikap.", error: error.message });
    }
};

// FUNGSI BARU UNTUK UPDATE CATATAN WALI KELAS
exports.updateCatatanWaliKelas = async (req, res) => {
    try {
        const { id } = req.params;
        const { deskripsi } = req.body;

        const catatan = await db.Sikap.findByPk(id);
        if (!catatan) return res.status(404).json({ message: "Data catatan tidak ditemukan." });

        catatan.deskripsi = deskripsi;
        await catatan.save();
        
        res.status(200).json(catatan);
    } catch (error) {
        res.status(500).json({ message: "Gagal update catatan.", error: error.message });
    }
};

// Handler to accept uploaded Excel, parse it and save directly (replaces draft flow)
exports.uploadAndSave = async (req, res) => {
    if (!req.file || !req.file.path) {
        return res.status(400).json({ message: 'File tidak ditemukan pada request.' });
    }

    const filePath = req.file.path;

    try {
        const parsed = await parseExcelFile(filePath);

        // Determine mode: preview (default) vs commit
        const wantCommit = (req.query && (req.query.commit === '1' || req.query.commit === 'true' || req.query.confirm === '1' || req.query.confirm === 'true' || req.query.save === '1')) || (req.body && req.body.commit === true);

        if (!wantCommit) {
            // Preview mode: return parsing + validation results to client
            return res.status(200).json({ message: 'Parsed Excel (preview)', parsed });
        }

        // Commit mode: build validatedData and reuse saveValidatedRaport
        const validatedData = parsed
            .filter(p => p.is_valid)
            .map(p => {
                const d = p.data;
                return {
                    nis: d.nis,
                    nama_siswa: d.nama_siswa,
                    semester: String(d.semester),
                    tahun_ajaran: d.tahun_ajaran,
                    nilaiUjian: d.nilai_ujian || [],
                    nilaiHafalan: d.nilai_hafalan || [],
                    kehadiran_detail: d.kehadiran_detail || [],
                    sikap: d.sikap || {},
                    upload_batch_id: Date.now().toString()
                };
            });

        req.body = req.body || {};
        req.body.validatedData = validatedData;

        await exports.saveValidatedRaport(req, res);

    } catch (err) {
        console.error('ERROR in uploadAndSave:', err);
        return res.status(500).json({ message: 'Gagal memproses file Excel.', error: err.message });
    } finally {
        // Cleanup uploaded file
        try {
            if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {
            console.warn('Gagal menghapus file sementara:', filePath, e.message);
        }
    }
};
