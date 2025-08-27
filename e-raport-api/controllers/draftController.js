const db = require('../models');
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

/**
 * Helper function untuk "membersihkan" dan mengambil nilai dari sel Excel.
 */
const getCellValue = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) {
        return null;
    }
    if (cell.value && typeof cell.value === 'object' && cell.value.result !== undefined) {
        return cell.value.result;
    }
    if (cell.value && typeof cell.value === 'object' && cell.value.richText) {
        return cell.value.richText.map(rt => rt.text).join('');
    }
    return cell.value;
};

/**
 * Helper function untuk melakukan validasi setiap baris data dari Excel.
 */
async function validateRow(rowData) {
    const errors = [];

    const siswa = await db.Siswa.findOne({ 
        where: { nis: rowData.nis },
        include: ['kelas', 'wali_kelas']
    });
    if (!siswa) {
        errors.push(`Siswa dengan NIS '${rowData.nis}' tidak ditemukan.`);
    }

    const [mapel, created] = await db.MataPelajaran.findOrCreate({
        where: { kode_mapel: rowData.kode_mapel },
        defaults: {
            nama_mapel: rowData.nama_mapel || `Mapel Otomatis ${rowData.kode_mapel}`
        }
    });

    if (created) {
        console.log(`INFO: Mata pelajaran baru otomatis dibuat: Kode='${rowData.kode_mapel}', Nama='${rowData.nama_mapel}'`);
    }
    
    // Validasi nilai
    if (rowData.pengetahuan_angka === null || isNaN(parseFloat(rowData.pengetahuan_angka))) {
        errors.push(`Nilai Pengetahuan '${rowData.pengetahuan_angka}' bukan angka yang valid.`);
    }
    if (rowData.keterampilan_angka === null || isNaN(parseFloat(rowData.keterampilan_angka))) {
        errors.push(`Nilai Keterampilan '${rowData.keterampilan_angka}' bukan angka yang valid.`);
    }
    
    // Validasi kehadiran
    const sakit = rowData.sakit === null || rowData.sakit === undefined ? 0 : rowData.sakit;
    const izin = rowData.izin === null || rowData.izin === undefined ? 0 : rowData.izin;
    const alpha = rowData.alpha === null || rowData.alpha === undefined ? 0 : rowData.alpha;
    if (isNaN(parseInt(sakit))) {
        errors.push(`Jumlah Sakit '${sakit}' bukan angka yang valid.`);
    }
    if (isNaN(parseInt(izin))) {
        errors.push(`Jumlah Izin '${izin}' bukan angka yang valid.`);
    }
    if (isNaN(parseInt(alpha))) {
        errors.push(`Jumlah Alpha '${alpha}' bukan angka yang valid.`);
    }
    
    // Validasi semester dan tahun ajaran
    const semesterStr = String(rowData.semester || '');
    if (!rowData.semester || !['1', '2'].includes(semesterStr)) {
        errors.push(`Semester '${rowData.semester}' tidak valid. Harus 1 atau 2.`);
    }
    if (!rowData.tahun_ajaran || !/^\d{4}\/\d{4}$/.test(String(rowData.tahun_ajaran))) {
        errors.push(`Format Tahun Ajaran '${rowData.tahun_ajaran}' tidak valid. Contoh: 2023/2024.`);
    }

    return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : null,
        siswaId: siswa ? siswa.id : null,
        mapelId: mapel ? mapel.id : null,
        kelas_id: siswa && siswa.kelas ? siswa.kelas.id : null,
        wali_kelas_id: siswa && siswa.wali_kelas ? siswa.wali_kelas.id : null,
    };
}

/**
 * 🔥 PERBAIKAN UTAMA: Upload dan validasi dengan kehadiran detail per kegiatan
 */
exports.uploadAndValidate = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'File tidak ditemukan.' });
        }

        const upload_batch_id = uuidv4();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);

        console.log('🔄 Memulai proses parsing Excel dengan kehadiran detail...');

        // 🔥 STRUKTUR BARU: Data gabungan per siswa
        const combinedData = {};

        // Helper untuk memproses setiap baris dan menggabungkan data per siswa (NIS)
        const processSheet = async (sheetName, dataProcessor) => {
            const worksheet = workbook.getWorksheet(sheetName);
            if (!worksheet) {
                console.warn(`Sheet "${sheetName}" tidak ditemukan, dilewati.`);
                return;
            }

            console.log(`📋 Memproses sheet: ${sheetName}`);
            for (let i = 2; i <= worksheet.rowCount; i++) {
                const row = worksheet.getRow(i);
                const nis = getCellValue(row.getCell('A'));
                if (!nis) continue;

                if (!combinedData[nis]) {
                    combinedData[nis] = {
                        nis: nis,
                        nama_siswa: getCellValue(row.getCell('B')),
                        row_number: i,
                        nilai_ujian: [],
                        nilai_hafalan: [],
                        kehadiran_detail: [], // 🔥 BARU: Array detail per kegiatan
                        kehadiran_summary: { sakit: 0, izin: 0, alpha: 0 }, // 🔥 BARU: Total agregat
                        sikap: [],
                        catatan_walikelas: null,
                        semester: null,
                        tahun_ajaran: null
                    };
                }
                await dataProcessor(row, combinedData[nis]);
            }
        };

        // 1. Proses Sheet Nilai Ujian
        await processSheet('Template Nilai Ujian', async (row, siswaData) => {
            const nilaiData = {
                kode_mapel: getCellValue(row.getCell('C')),
                nama_mapel: getCellValue(row.getCell('D')),
                pengetahuan_angka: getCellValue(row.getCell('E')),
                keterampilan_angka: getCellValue(row.getCell('F')),
                semester: getCellValue(row.getCell('G')),
                tahun_ajaran: getCellValue(row.getCell('H')),
            };
            siswaData.nilai_ujian.push(nilaiData);
            
            // Set semester dan tahun ajaran global
            if (!siswaData.semester) siswaData.semester = nilaiData.semester;
            if (!siswaData.tahun_ajaran) siswaData.tahun_ajaran = nilaiData.tahun_ajaran;
        });

        // 2. Proses Sheet Nilai Hafalan
        await processSheet('Template Hafalan', async (row, siswaData) => {
            const hafalanData = {
                kode_mapel: getCellValue(row.getCell('C')),
                nama_mapel: getCellValue(row.getCell('D')),
                nilai_angka: getCellValue(row.getCell('E')),
                semester: getCellValue(row.getCell('F')),
                tahun_ajaran: getCellValue(row.getCell('G')),
            };
            siswaData.nilai_hafalan.push(hafalanData);
            
            if (!siswaData.semester) siswaData.semester = hafalanData.semester;
            if (!siswaData.tahun_ajaran) siswaData.tahun_ajaran = hafalanData.tahun_ajaran;
        });

        // 3. 🔥 PERBAIKAN UTAMA: Proses Sheet Kehadiran dengan detail per kegiatan
        await processSheet('Template Kehadiran', async (row, siswaData) => {
            const nis = getCellValue(row.getCell('A'));
            const nama = getCellValue(row.getCell('B'));
            const kegiatan = getCellValue(row.getCell('C')); // Kolom C = Kegiatan
            const izin = parseInt(getCellValue(row.getCell('D')) || 0, 10);
            const sakit = parseInt(getCellValue(row.getCell('E')) || 0, 10);
            const absen = parseInt(getCellValue(row.getCell('F')) || 0, 10);
            const semester = getCellValue(row.getCell('G'));
            const tahun_ajaran = getCellValue(row.getCell('H'));
            
            console.log(`🔍 RAW EXCEL DATA - Row: NIS=${nis}, Nama="${nama}", Kegiatan="${kegiatan}", Izin=${izin}, Sakit=${sakit}, Absen=${absen}`);
            
            // 🔥 PERBAIKAN: Pastikan kegiatan tidak null atau undefined
            if (!kegiatan || kegiatan === null || kegiatan === undefined || String(kegiatan).trim() === '') {
                console.log(`❌ KEGIATAN KOSONG atau NULL untuk NIS ${nis}, row data:`, {
                    raw_kegiatan: kegiatan,
                    kegiatan_type: typeof kegiatan,
                    cell_value: getCellValue(row.getCell('C')),
                    raw_cell: row.getCell('C').value
                });
                return; // Skip baris ini
            }
            
            // 🔥 PERBAIKAN: Trim dan clean kegiatan name
            const cleanKegiatan = String(kegiatan).trim();
            if (!cleanKegiatan) {
                console.log(`❌ KEGIATAN KOSONG setelah trim untuk NIS ${nis}`);
                return;
            }
            
            // 🔥 VALIDASI: Pastikan ada nilai kehadiran yang tidak nol
            if (izin === 0 && sakit === 0 && absen === 0) {
                console.log(`⚠️ SEMUA NILAI NOL untuk ${nis} - ${cleanKegiatan}, tapi tetap disimpan sebagai record`);
            }
            
            // 🔥 SIMPAN DETAIL PER KEGIATAN (bahkan jika nilai 0, tetap simpan untuk konsistensi)
            const detailItem = {
                kegiatan: cleanKegiatan,
                izin,
                sakit,
                absen
            };
            
            siswaData.kehadiran_detail.push(detailItem);
            
            console.log(`✅ DETAIL DITAMBAHKAN untuk ${nis}:`, detailItem);
            console.log(`📊 Current kehadiran_detail length: ${siswaData.kehadiran_detail.length}`);
            
            // 🔥 UPDATE TOTAL AGREGAT
            siswaData.kehadiran_summary.izin += izin;
            siswaData.kehadiran_summary.sakit += sakit;
            siswaData.kehadiran_summary.alpha += absen; // Ini tetap alpha untuk konsistensi internal
            
            console.log(`📈 UPDATED SUMMARY for ${nis}:`, siswaData.kehadiran_summary);
            
            // Set semester dan tahun ajaran
            if (!siswaData.semester) siswaData.semester = semester;
            if (!siswaData.tahun_ajaran) siswaData.tahun_ajaran = tahun_ajaran;
        });

        // 🔥 TAMBAHAN: Log final check sebelum membuat draft entries
        console.log('\n🔍 FINAL KEHADIRAN CHECK SEBELUM DRAFT:');
        for (const nis in combinedData) {
            const siswa = combinedData[nis];
            console.log(`\n--- SISWA ${nis} (${siswa.nama_siswa}) ---`);
            console.log(`Kehadiran Detail Count: ${siswa.kehadiran_detail?.length || 0}`);
            if (siswa.kehadiran_detail && siswa.kehadiran_detail.length > 0) {
                siswa.kehadiran_detail.forEach((detail, idx) => {
                    console.log(`  ${idx + 1}. ${detail.kegiatan}: izin=${detail.izin}, sakit=${detail.sakit}, absen=${detail.absen}`);
                });
            } else {
                console.log(`  ❌ TIDAK ADA KEHADIRAN DETAIL!`);
            }
            console.log(`Kehadiran Summary:`, siswa.kehadiran_summary);
        }

        // Setelah proses semua sheet, tambahkan ini sebelum membuat draftEntries:

        // 🔥 FINAL VALIDATION: Cek struktur data sebelum disimpan
        console.log('\n🔍 FINAL DATA STRUCTURE CHECK:');
        for (const nis in combinedData) {
            const siswa = combinedData[nis];
            console.log(`\n--- SISWA ${nis} (${siswa.nama_siswa}) ---`);
            console.log(`Kehadiran Detail Count: ${siswa.kehadiran_detail?.length || 0}`);
            console.log(`Kehadiran Detail:`, JSON.stringify(siswa.kehadiran_detail, null, 2));
            console.log(`Kehadiran Summary:`, JSON.stringify(siswa.kehadiran_summary, null, 2));
            console.log(`Semester: ${siswa.semester}, Tahun: ${siswa.tahun_ajaran}`);
            
            // 🔥 VALIDASI: Pastikan struktur data ada
            if (!siswa.kehadiran_detail) {
                console.log(`❌ KEHADIRAN_DETAIL UNDEFINED untuk ${nis}!`);
                siswa.kehadiran_detail = [];
            }
            if (!siswa.kehadiran_summary) {
                console.log(`❌ KEHADIRAN_SUMMARY UNDEFINED untuk ${nis}!`);
                siswa.kehadiran_summary = { izin: 0, sakit: 0, alpha: 0 };
            }
        }

        // 4. Proses Sheet Sikap
        await processSheet('Template Sikap', async (row, siswaData) => {
            const jenis_sikap = getCellValue(row.getCell('C')); // Kolom C = Jenis Sikap
            const indikator = getCellValue(row.getCell('D'));   // Kolom D = Indikator
            const nilai = getCellValue(row.getCell('E'));       // Kolom E = Nilai
            const deskripsi = getCellValue(row.getCell('F'));   // Kolom F = Deskripsi
            const semester = getCellValue(row.getCell('G'));    // Kolom G = Semester
            const tahun_ajaran = getCellValue(row.getCell('H')); // Kolom H = Tahun Ajaran

            console.log(`📝 Memproses sikap untuk ${siswaData.nis}:`);
            console.log(`   Jenis: ${jenis_sikap}, Indikator: ${indikator}, Nilai: ${nilai}`);

            // Pastikan ada data sikap yang valid
            if (jenis_sikap && indikator) {
                const sikapData = {
                    jenis_sikap: jenis_sikap,
                    indikator: indikator,
                    nilai: nilai ? parseFloat(nilai) : null,
                    deskripsi: deskripsi || '',
                    semester: semester,
                    tahun_ajaran: tahun_ajaran
                };
                
                siswaData.sikap.push(sikapData);
                console.log(`✅ Data sikap ditambahkan:`, sikapData);
            } else {
                console.log(`⚠️ Data sikap tidak lengkap, dilewati`);
            }

            // Set semester dan tahun ajaran global
            if (!siswaData.semester && semester) siswaData.semester = semester;
            if (!siswaData.tahun_ajaran && tahun_ajaran) siswaData.tahun_ajaran = tahun_ajaran;
        });

        // 🔥 LOG DEBUGGING: Tampilkan hasil parsing
        console.log('📋 HASIL PARSING KEHADIRAN:');
        for (const nis in combinedData) {
            const siswa = combinedData[nis];
            console.log(`NIS ${nis} (${siswa.nama_siswa}):`);
            console.log(`  - Total: izin=${siswa.kehadiran_summary.izin}, sakit=${siswa.kehadiran_summary.sakit}, alpha=${siswa.kehadiran_summary.alpha}`);
            console.log(`  - Detail (${siswa.kehadiran_detail.length} kegiatan):`);
            siswa.kehadiran_detail.forEach(detail => {
                console.log(`    • ${detail.kegiatan}: izin=${detail.izin}, sakit=${detail.sakit}, absen=${detail.absen}`);
            });
        }

        // 5. Buat draft entries dengan struktur baru
        const draftEntries = [];
        for (const nis in combinedData) {
            const siswaData = combinedData[nis];
            
            // Validasi siswa
            const siswaDb = await db.Siswa.findOne({ 
                where: { nis: siswaData.nis }, 
                include: ['kelas', 'wali_kelas'] 
            });

            const validation = { isValid: true, errors: [] };
            if (!siswaDb) {
                validation.isValid = false;
                validation.errors.push(`Siswa dengan NIS '${siswaData.nis}' tidak ditemukan.`);
            }

            // 🔥 STRUKTUR DATA BARU dengan kehadiran detail
            const rowData = {
                nis: siswaData.nis,
                nama_siswa: siswaData.nama_siswa,
                semester: siswaData.semester,
                tahun_ajaran: siswaData.tahun_ajaran,
                nilai_ujian: siswaData.nilai_ujian,
                nilai_hafalan: siswaData.nilai_hafalan,
                kehadiran_detail: siswaData.kehadiran_detail,
                kehadiran_summary: siswaData.kehadiran_summary,
                sikap: siswaData.sikap, // 🔥 PERBAIKAN: Gunakan array sikap, bukan catatan_walikelas
                catatan_sikap: siswaData.catatan_walikelas // Tetap simpan catatan umum jika ada
            };

            console.log(`💾 Data untuk NIS ${nis}:`, {
                kehadiran_detail_count: rowData.kehadiran_detail.length,
                kehadiran_summary: rowData.kehadiran_summary
            });

            draftEntries.push({
                upload_batch_id,
                row_number: siswaData.row_number,
                data: rowData,
                is_valid: validation.isValid,
                validation_errors: validation.errors.length > 0 ? validation.errors : null,
                processed_data: {
                    siswa_id: siswaDb ? siswaDb.id : null,
                    kelas_id: siswaDb && siswaDb.kelas ? siswaDb.kelas.id : null,
                    wali_kelas_id: siswaDb && siswaDb.wali_kelas ? siswaDb.wali_kelas.id : null
                }
            });
        }
        
        // Simpan ke database
        await db.DraftNilai.bulkCreate(draftEntries);
        fs.unlinkSync(req.file.path);

        console.log(`✅ Berhasil membuat ${draftEntries.length} draft entries`);

        res.status(200).json({
            message: 'File berhasil diunggah dan divalidasi dengan kehadiran detail.',
            upload_batch_id: upload_batch_id,
            total_entries: draftEntries.length,
            valid_entries: draftEntries.filter(entry => entry.is_valid).length
        });

    } catch (error) {
        console.error("❌ Error during upload and validation:", error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ 
            message: 'Terjadi kesalahan pada server.', 
            error: error.message 
        });
    }
};

/**
 * Mengambil semua data dari tabel draft berdasarkan ID batch unggahan.
 */
exports.getDraftData = async (req, res) => {
    try {
        const { batchId } = req.params;
        const draftData = await db.DraftNilai.findAll({
            where: { upload_batch_id: batchId },
            order: [['row_number', 'ASC']]
        });
        res.status(200).json(draftData);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil data draft.', error: error.message });
    }
};

/**
 * Mengambil semua batch draft yang tersedia
 */
exports.getAllDraftBatches = async (req, res) => {
    try {
        const batches = await db.DraftNilai.findAll({
            attributes: [
                'upload_batch_id',
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total_rows'],
                [db.sequelize.fn('SUM', db.sequelize.literal('CASE WHEN is_valid = true THEN 1 ELSE 0 END')), 'valid_rows'],
                [db.sequelize.fn('MIN', db.sequelize.col('createdAt')), 'uploaded_at']
            ],
            group: ['upload_batch_id'],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json(batches);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil daftar draft.', error: error.message });
    }
};

/**
 * Mengambil data lengkap untuk preview satu raport siswa.
 */
exports.getRaportPreview = async (req, res) => {
    try {
        const { nis, semester, tahun_ajaran } = req.params;

        const siswa = await db.Siswa.findOne({ 
            where: { nis },
            include: [
                { model: db.Kelas, as: 'kelas' },
                { model: db.WaliKelas, as: 'wali_kelas' }
            ]
        });

        if (!siswa) {
            return res.status(404).json({ message: "Siswa tidak ditemukan" });
        }

        const nilaiUjian = await db.NilaiUjian.findAll({ 
            where: { siswa_id: siswa.id, semester, tahun_ajaran }, 
            include: [{ model: db.MataPelajaran, as: 'mapel' }]
        });
        
        // 🔥 PERBAIKAN: Ambil semua kehadiran detail per kegiatan
        const kehadiran = await db.Kehadiran.findAll({ 
            where: { siswa_id: siswa.id, semester, tahun_ajaran },
            order: [['kegiatan', 'ASC']]
        });
        
        const sikap = await db.Sikap.findAll({ 
            where: { siswa_id: siswa.id, semester, tahun_ajaran }
        });
        
        res.status(200).json({
            siswa,
            nilaiUjian,
            kehadiran, // Ini sekarang array dengan detail per kegiatan
            sikap
        });
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data preview raport.", error: error.message });
    }
};

/**
 * 🔥 PERBAIKAN UTAMA: Konfirmasi dan simpan dengan kehadiran detail
 */
exports.confirmAndSave = async (req, res) => {
    const { batchId } = req.params;
    const transaction = await db.sequelize.transaction();

    try {
        const validDrafts = await db.DraftNilai.findAll({
            where: { upload_batch_id: batchId, is_valid: true },
            transaction
        });

        if (validDrafts.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Tidak ada data valid untuk disimpan.' });
        }

        console.log(`🔄 Memproses ${validDrafts.length} draft valid...`);

        for (const draft of validDrafts) {
            const draftItem = draft.get({ plain: true });
            const { data, processed_data } = draftItem;

            if (!processed_data || !processed_data.siswa_id) {
                console.warn(`⚠️ Melewati draft tanpa siswa_id: ${draftItem.id}`);
                continue;
            }

            const { siswa_id, kelas_id, wali_kelas_id } = processed_data;
            const { semester, tahun_ajaran } = data;

            console.log(`📝 Memproses siswa ID: ${siswa_id} (${data.nama_siswa})`);

            // 1. Simpan Nilai Ujian
            if (data.nilai_ujian && Array.isArray(data.nilai_ujian)) {
                for (const nilai of data.nilai_ujian) {
                    const mapel = await db.MataPelajaran.findOne({ 
                        where: { 
                            kode_mapel: nilai.kode_mapel,
                            jenis: 'Ujian' // <-- Tambahkan filter ini
                        } 
                    });
                    if (mapel) {
                        await db.NilaiUjian.upsert({
                            siswa_id,
                            mapel_id: mapel.id,
                            pengetahuan_angka: nilai.pengetahuan_angka,
                            keterampilan_angka: nilai.keterampilan_angka,
                            semester,
                            tahun_ajaran,
                            mapel_text: mapel.nama_mapel
                        }, { transaction });
                        console.log(`✅ Nilai ujian: ${mapel.nama_mapel}`);
                    }
                }
            }
            
            // 2. Simpan Nilai Hafalan
            if (data.nilai_hafalan && Array.isArray(data.nilai_hafalan)) {
                for (const hafalan of data.nilai_hafalan) {
                    const mapel = await db.MataPelajaran.findOne({ 
                        where: { 
                            kode_mapel: hafalan.kode_mapel,
                            jenis: 'Hafalan' // <-- Tambahkan filter ini
                        } 
                    });
                    if (mapel) {
                        await db.NilaiHafalan.upsert({
                            siswa_id,
                            mapel_id: mapel.id,
                            nilai_angka: hafalan.nilai_angka,
                            semester,
                            tahun_ajaran,
                            mapel_text: mapel.nama_mapel
                        }, { transaction });
                        console.log(`✅ Nilai hafalan: ${mapel.nama_mapel}`);
                    }
                }
            }

            // 3. 🔥 PERBAIKAN UTAMA: Simpan Kehadiran Detail per Kegiatan
            if (data.kehadiran_detail && Array.isArray(data.kehadiran_detail)) {
                console.log(`📋 Menyimpan ${data.kehadiran_detail.length} kegiatan kehadiran...`);
                
                for (const kegiatan of data.kehadiran_detail) {
                    await db.Kehadiran.upsert({
                        siswa_id,
                        kegiatan: kegiatan.kegiatan,
                        izin: kegiatan.izin,
                        sakit: kegiatan.sakit,
                        absen: kegiatan.absen,
                        semester,
                        tahun_ajaran
                    }, { transaction });
                    
                    console.log(`✅ Kehadiran: ${kegiatan.kegiatan} (izin:${kegiatan.izin}, sakit:${kegiatan.sakit}, absen:${kegiatan.absen})`);
                }
            }

            // 4. Simpan Sikap
            if (data.sikap && Array.isArray(data.sikap)) {
                console.log(`📝 Menyimpan ${data.sikap.length} data sikap...`);
                
                for (const sikapDetail of data.sikap) {
                    // Cari indikator di master data
                    const indikator = await db.IndikatorSikap.findOne({
                        where: {
                            jenis_sikap: sikapDetail.jenis_sikap,
                            indikator: sikapDetail.indikator,
                            is_active: 1
                        }
                    });

                    let final_indikator_sikap_id = null;
                    const final_indikator_text = sikapDetail.indikator;
                    
                    if (indikator) {
                        final_indikator_sikap_id = indikator.id;
                        console.log(`✅ Indikator ditemukan di master: ID=${indikator.id}`);
                    } else {
                        console.log(`⚠️ Indikator '${sikapDetail.indikator}' tidak ditemukan di master, ID akan diisi NULL.`);
                    }

                    const finalNilai = (sikapDetail.nilai !== null && sikapDetail.nilai !== undefined && !isNaN(parseFloat(sikapDetail.nilai)))
                        ? parseFloat(sikapDetail.nilai)
                        : null;

                    // Cari tahun ajaran ID
                    const tahunAjaranDb = await db.TahunAjaran.findOne({
                        where: { 
                            nama_ajaran: tahun_ajaran, 
                            semester: semester,
                            status: 'aktif' 
                        }
                    });

                    if (tahunAjaranDb) {
                        await db.Sikap.upsert({
                            siswa_id,
                            tahun_ajaran_id: tahunAjaranDb.id,
                            semester,
                            indikator_sikap_id: final_indikator_sikap_id,
                            indikator_text: final_indikator_text,
                            nilai: sikapDetail.nilai,
                            deskripsi: sikapDetail.deskripsi
                        }, { transaction });
                        
                        console.log(`✅ Sikap disimpan: ${sikapDetail.jenis_sikap} - ${final_indikator_text}`);
                    } else {
                        console.log(`❌ TahunAjaran tidak ditemukan: ${tahun_ajaran} semester ${semester}`);
                    }
                }
            }
            if (data.catatan_sikap) {
                const tahunAjaranDb = await db.TahunAjaran.findOne({
                    where: { 
                        nama_ajaran: tahun_ajaran, 
                        semester: semester,
                        status: 'aktif' 
                    }
                });

                if (tahunAjaranDb) {
                    await db.Sikap.upsert({
                        siswa_id,
                        tahun_ajaran_id: tahunAjaranDb.id,
                        semester,
                        indikator_sikap_id: null,
                        indikator_text: 'Catatan Wali Kelas',
                        nilai: finalNilai,
                        deskripsi: data.catatan_sikap
                    }, { transaction });
                    console.log(`✅ Catatan sikap umum disimpan`);
                }
            }
        }
        
        // Hapus draft setelah berhasil
        await db.DraftNilai.destroy({ 
            where: { upload_batch_id: batchId }, 
            transaction 
        });
        
        await transaction.commit();
        
        console.log(`🎉 Berhasil menyimpan semua data untuk batch: ${batchId}`);
        res.status(200).json({ 
            message: 'Data raport berhasil disimpan dengan kehadiran detail per kegiatan.',
            processed_count: validDrafts.length
        });

    } catch (error) {
        await transaction.rollback();
        console.error("❌ Error during confirm and save:", error);
        res.status(500).json({ 
            message: 'Gagal menyimpan data.', 
            error: error.message 
        });
    }
};