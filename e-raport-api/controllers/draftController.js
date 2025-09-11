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
    
    // Validasi nilai (single field 'nilai')
    if (rowData.nilai === null || rowData.nilai === undefined || isNaN(parseFloat(rowData.nilai))) {
        errors.push(`Nilai '${rowData.nilai}' bukan angka yang valid.`);
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

        console.log('🔄 Memulai proses parsing Excel...');

        const combinedData = {};

        const processSheet = async (sheetName, dataProcessor) => {
            const worksheet = workbook.getWorksheet(sheetName);
            if (!worksheet) {
                console.warn(`Sheet "${sheetName}" tidak ditemukan, dilewati.`);
                return;
            }

            console.log(`📋 Memproses sheet: ${sheetName}`);
            const actualRowCount = worksheet.actualRowCount;
            for (let i = 2; i <= actualRowCount; i++) {
                const row = worksheet.getRow(i);
                const cellA = worksheet.getCell(`A${i}`);
                const nis = cellA.isMerged ? getCellValue(worksheet.getCell(cellA.master.address)) : getCellValue(cellA);

                if (!nis) continue;
                
                const cellB = worksheet.getCell(`B${i}`);
                const nama_siswa = cellB.isMerged ? getCellValue(worksheet.getCell(cellB.master.address)) : getCellValue(cellB);

                if (!combinedData[nis]) {
                    combinedData[nis] = {
                        nis: nis,
                        nama_siswa: nama_siswa,
                        row_number: i,
                        nilai_ujian: [],
                        nilai_hafalan: [],
                        kehadiran_detail: [],
                        kehadiran_summary: { sakit: 0, izin: 0, alpha: 0 },
                        sikap: {
                            catatan_walikelas: '',
                            detail: []
                        },
                        semester: null,
                        tahun_ajaran: null
                    };
                }
                // 🔥 PERUBAHAN 1: Kirim 'worksheet' sebagai parameter ke callback
                await dataProcessor(row, combinedData[nis], worksheet);
            }
        };
        
        // --- Proses Sheet Nilai Ujian, Hafalan, Kehadiran ---
        // Tidak perlu 'worksheet' di sini, jadi bisa diabaikan
        await processSheet('Template Nilai Ujian', async (row, siswaData) => {
            // --- PERBAIKAN PEMBACAAN KOLOM ---
            const semesterValue = getCellValue(row.getCell('G'));      // Kolom G = Semester
            const tahunAjaranValue = getCellValue(row.getCell('H')); // Kolom H = Tahun Ajaran
            
            const nilaiData = {
                nama_mapel: getCellValue(row.getCell('C')),
                kitab: getCellValue(row.getCell('D')),
                // PERUBAHAN: hanya satu kolom 'Nilai' di kolom E
                nilai: getCellValue(row.getCell('E')),
                semester: semesterValue,
                tahun_ajaran: tahunAjaranValue,
            };
            siswaData.nilai_ujian.push(nilaiData);

            if (!siswaData.semester) siswaData.semester = semesterValue;
            if (!siswaData.tahun_ajaran) siswaData.tahun_ajaran = tahunAjaranValue;
        });

        await processSheet('Template Hafalan', async (row, siswaData) => {
            // --- PERBAIKAN PEMBACAAN KOLOM ---
            const semesterValue = getCellValue(row.getCell('F'));      // Kolom F = Semester
            const tahunAjaranValue = getCellValue(row.getCell('G')); // Kolom G = Tahun Ajaran
            const hafalanData = {
                nama_mapel: getCellValue(row.getCell('C')),
                kitab: getCellValue(row.getCell('D')),          // Kolom D = Kitab
                nilai_angka: getCellValue(row.getCell('E')),      // Kolom E = Nilai
                semester: semesterValue,
                tahun_ajaran: tahunAjaranValue,
            };
            siswaData.nilai_hafalan.push(hafalanData);
            if (!siswaData.semester) siswaData.semester = semesterValue;
            if (!siswaData.tahun_ajaran) siswaData.tahun_ajaran = tahunAjaranValue;
        });
        
        await processSheet('Template Kehadiran', async (row, siswaData) => {
            const kegiatan = (getCellValue(row.getCell('C')) || '').trim();
            if (!kegiatan) return;
            const izin = parseInt(getCellValue(row.getCell('D')) || 0, 10);
            const sakit = parseInt(getCellValue(row.getCell('E')) || 0, 10);
            const absen = parseInt(getCellValue(row.getCell('F')) || 0, 10);
            siswaData.kehadiran_detail.push({ kegiatan, izin, sakit, absen });
            siswaData.kehadiran_summary.izin += izin;
            siswaData.kehadiran_summary.sakit += sakit;
            siswaData.kehadiran_summary.alpha += absen;
        });

        // --- 4. Proses Sheet Sikap ---
        // 🔥 PERUBAHAN 2: Terima parameter 'worksheet' di sini
        await processSheet('Template Sikap', async (row, siswaData, worksheet) => {
            const jenis_sikap = getCellValue(row.getCell('C'));
            const indikator = getCellValue(row.getCell('D'));
            const nilai = getCellValue(row.getCell('E'));
            
            const cellF = row.getCell('F');
            const deskripsi = cellF.isMerged ? getCellValue(worksheet.getCell(cellF.master.address)) : getCellValue(cellF);

            if (jenis_sikap && indikator) {
                siswaData.sikap.detail.push({
                    jenis_sikap,
                    indikator,
                    nilai: nilai ? parseFloat(nilai) : null
                });
            }
            if (deskripsi && !siswaData.sikap.catatan_walikelas) {
                siswaData.sikap.catatan_walikelas = deskripsi;
            }
        });


        const draftEntries = [];
        for (const nis in combinedData) {
            const siswaData = combinedData[nis];
            
            const siswaDb = await db.Siswa.findOne({ 
                where: { nis: siswaData.nis }, 
                include: [{ model: db.Kelas, as: 'kelas', include: [{ model: db.Guru, as: 'walikelas' }] }] 
            });

            const validation = { isValid: true, errors: [] };
            if (!siswaDb) {
                validation.isValid = false;
                validation.errors.push(`Siswa dengan NIS '${siswaData.nis}' tidak ditemukan.`);
            }
            if (!/^[12]$/.test(String(siswaData.semester))) {
                validation.isValid = false;
                validation.errors.push(`Semester '${siswaData.semester}' tidak valid. Harus '1' atau '2'.`);
            }
            if (!/^\d{4}\/\d{4}$/.test(String(siswaData.tahun_ajaran))) {
                validation.isValid = false;
                validation.errors.push(`Tahun Ajaran '${siswaData.tahun_ajaran}' tidak valid. Contoh: 2024/2025.`);
            }

            draftEntries.push({
                upload_batch_id,
                row_number: siswaData.row_number,
                data: siswaData,
                is_valid: validation.isValid,
                validation_errors: validation.errors.length > 0 ? validation.errors : null,
                processed_data: {
                    siswa_id: siswaDb ? siswaDb.id : null,
                    kelas_id: siswaDb?.kelas ? siswaDb.kelas.id : null,
                    wali_kelas_id: siswaDb?.kelas?.walikelas ? siswaDb.kelas.walikelas.id : null,
                }
            });
        }
        
        await db.DraftNilai.bulkCreate(draftEntries);
        fs.unlinkSync(req.file.path);

        res.status(200).json({
            message: 'File berhasil diunggah dan divalidasi.',
            upload_batch_id: upload_batch_id,
        });

    } catch (error) {
        console.error("❌ Error during upload and validation:", error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: error.message });
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
    const { validatedData } = req.body; // Ambil data dari body request
    const transaction = await db.sequelize.transaction();
    const toNumberOrNull = (v) => {
        if (v === null || v === undefined || v === '') return null;
        const n = parseFloat(v);
        return isNaN(n) ? null : n;
    };

    // PERUBAHAN: gabungkan pengetahuan_angka & keterampilan_angka menjadi single `nilai`
    const computeFinalNilai = (p, k) => {
        const a = toNumberOrNull(p);
        const b = toNumberOrNull(k);
        if (a !== null && b !== null) return (a + b) / 2;
        if (a !== null) return a;
        if (b !== null) return b;
        return null;
    };

    try {
        if (!validatedData || validatedData.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Tidak ada data valid untuk disimpan.' });
        }

        console.log(`🔄 Memproses ${validatedData.length} data siswa valid...`);

        for (const item of validatedData) {
            // Dapatkan ID Tahun Ajaran yang aktif
            const tahunAjaranDb = await db.TahunAjaran.findOne({
                where: {
                    nama_ajaran: item.tahun_ajaran,
                    semester: item.semester,
                    status: 'aktif'
                }
            });

            if (!tahunAjaranDb) {
                // Jika tidak ditemukan, lewati data siswa ini atau batalkan semua
                console.warn(`Tahun Ajaran aktif untuk ${item.tahun_ajaran} semester ${item.semester} tidak ditemukan. Melewati siswa NIS ${item.nis}.`);
                continue; // Lanjut ke data siswa berikutnya
            }
            const tahun_ajaran_id = tahunAjaranDb.id;

            // Dapatkan ID Siswa
            const siswaDb = await db.Siswa.findOne({ where: { nis: item.nis } });
            if (!siswaDb) {
                console.warn(`Siswa dengan NIS ${item.nis} tidak ditemukan saat proses simpan. Melewati.`);
                continue;
            }
            const siswa_id = siswaDb.id;

            console.log(`📝 Memproses siswa ID: ${siswa_id} (${item.nis})`);

            // 1. Simpan Nilai Ujian
            if (item.nilaiUjian && Array.isArray(item.nilaiUjian)) {
                for (const nilai of item.nilaiUjian) {
                    // 🔥 PERBAIKAN: Cari berdasarkan nama_mapel
                    const mapel = await db.MataPelajaran.findOne({
                        where: {
                            nama_mapel: nilai.nama_mapel,
                            jenis: 'Ujian'
                        }
                    });
                    if (mapel) {
                        // PERUBAHAN: langsung gunakan nilai tunggal dari draft
                        const finalNilai = nilai.nilai !== undefined ? (isNaN(parseFloat(nilai.nilai)) ? null : parseFloat(nilai.nilai)) : null;
                        await db.NilaiUjian.upsert({
                            siswa_id,
                            mapel_id: mapel.id,
                            nilai: finalNilai,
                            semester: item.semester,
                            tahun_ajaran_id,
                            mapel_text: mapel.nama_mapel
                        }, { transaction });
                    }
                }
            }
            
            // 2. Simpan Nilai Hafalan
            if (item.nilaiHafalan && Array.isArray(item.nilaiHafalan)) {
                for (const hafalan of item.nilaiHafalan) {
                    // 🔥 PERBAIKAN: Cari berdasarkan nama_mapel
                    const mapel = await db.MataPelajaran.findOne({
                        where: {
                            nama_mapel: hafalan.nama_mapel,
                            jenis: 'Hafalan'
                        }
                    });
                    if (mapel) {
                        await db.NilaiHafalan.upsert({
                            siswa_id,
                            mapel_id: mapel.id,
                            nilai: hafalan.nilai_angka,
                            semester: item.semester,
                            tahun_ajaran_id,
                            mapel_text: mapel.nama_mapel
                        }, { transaction });
                    }
                }
            }

            // 3. Simpan Kehadiran Detail
            if (item.kehadiran_detail && Array.isArray(item.kehadiran_detail)) {
                for (const kegiatan of item.kehadiran_detail) {
                    const indikator = await db.IndikatorKehadiran.findOne({ where: { nama_kegiatan: kegiatan.kegiatan } });
                    await db.Kehadiran.upsert({
                        siswa_id,
                        indikatorkehadirans_id: indikator ? indikator.id : null,
                        indikator_text: kegiatan.kegiatan,
                        izin: kegiatan.izin,
                        sakit: kegiatan.sakit,
                        absen: kegiatan.absen,
                        semester: item.semester,
                        tahun_ajaran_id
                    }, { transaction });
                }
            }

            // 4. Simpan Sikap
            if (item.sikap && typeof item.sikap === 'object') {
                // Simpan detail sikap
                if(item.sikap.detail && Array.isArray(item.sikap.detail)) {
                    for (const sikapDetail of item.sikap.detail) {
                        const indikator = await db.IndikatorSikap.findOne({
                            where: { indikator: sikapDetail.indikator, is_active: 1 }
                        });
                        await db.Sikap.upsert({
                            siswa_id,
                            tahun_ajaran_id,
                            semester: item.semester,
                            indikator_sikap_id: indikator ? indikator.id : null,
                            indikator_text: sikapDetail.indikator,
                            nilai: sikapDetail.nilai
                        }, { transaction });
                    }
                }
                // Simpan catatan wali kelas
                if (item.sikap.catatan_walikelas) {
                     await db.Sikap.upsert({
                        siswa_id,
                        tahun_ajaran_id,
                        semester: item.semester,
                        indikator_text: 'Catatan Wali Kelas',
                        deskripsi: item.sikap.catatan_walikelas
                    }, { transaction });
                }
            }
        }
        
        await transaction.commit();
        
        console.log(`🎉 Berhasil menyimpan semua data valid.`);
        res.status(200).json({ 
            message: 'Data raport berhasil disimpan.',
            processed_count: validatedData.length
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