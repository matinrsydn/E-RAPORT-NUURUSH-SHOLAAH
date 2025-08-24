const db = require('../models');
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

/**
 * Helper function untuk "membersihkan" dan mengambil nilai dari sel Excel.
 */
const getCellValue = (cell) => {
    // ... (Fungsi ini tidak perlu diubah, biarkan seperti aslinya)
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
 * --- FUNGSI INI PERLU DIMODIFIKASI ---
 */
async function validateRow(rowData) {
    const errors = [];

    // --- MODIFIKASI 1: Ambil juga relasi kelas dan walikelas ---
    const siswa = await db.Siswa.findOne({ 
        where: { nis: rowData.nis },
        include: ['kelas', 'wali_kelas'] // --- BARU ---
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
    
    // ... (Validasi lain tidak perlu diubah)
    if (rowData.pengetahuan_angka === null || isNaN(parseFloat(rowData.pengetahuan_angka))) {
        errors.push(`Nilai Pengetahuan '${rowData.pengetahuan_angka}' bukan angka yang valid.`);
    }
    if (rowData.keterampilan_angka === null || isNaN(parseFloat(rowData.keterampilan_angka))) {
        errors.push(`Nilai Keterampilan '${rowData.keterampilan_angka}' bukan angka yang valid.`);
    }
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
    const semesterStr = String(rowData.semester || '');
    if (!rowData.semester || !['1', '2'].includes(semesterStr)) {
        errors.push(`Semester '${rowData.semester}' tidak valid. Harus 1 atau 2.`);
    }
    if (!rowData.tahun_ajaran || !/^\d{4}\/\d{4}$/.test(String(rowData.tahun_ajaran))) {
        errors.push(`Format Tahun Ajaran '${rowData.tahun_ajaran}' tidak valid. Contoh: 2023/2024.`);
    }

    // --- MODIFIKASI 2: Kembalikan ID kelas dan wali kelas ---
    return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : null,
        siswaId: siswa ? siswa.id : null,
        mapelId: mapel ? mapel.id : null,
        kelas_id: siswa && siswa.kelas ? siswa.kelas.id : null, // --- BARU ---
        wali_kelas_id: siswa && siswa.wali_kelas ? siswa.wali_kelas.id : null, // --- BARU ---
    };
}


// ... (Fungsi uploadAndValidate, getDraftData, dll. tidak perlu diubah)
/**
 * Mengunggah file Excel, memvalidasi isinya, dan menyimpannya ke tabel draft.
 * VERSI PALING STABIL
 */
// Ganti seluruh fungsi uploadAndValidate dengan yang ini
exports.uploadAndValidate = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'File tidak ditemukan.' });
        }

        const upload_batch_id = uuidv4();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);

        const combinedData = {};

        // Helper untuk memproses setiap baris dan menggabungkan data per siswa (NIS)
        const processSheet = async (sheetName, dataProcessor) => {
            const worksheet = workbook.getWorksheet(sheetName);
            if (!worksheet) {
                console.warn(`Sheet "${sheetName}" tidak ditemukan, dilewati.`);
                return;
            }

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
                        kehadiran: {},
                        sikap: [],
                        catatan_walikelas: null
                    };
                }
                dataProcessor(row, combinedData[nis]);
            }
        };

        // Proses Sheet Nilai Ujian
        await processSheet('Template Nilai Ujian', (row, siswaData) => {
            siswaData.nilai_ujian.push({
                kode_mapel: getCellValue(row.getCell('C')),
                nama_mapel: getCellValue(row.getCell('D')),
                pengetahuan_angka: getCellValue(row.getCell('E')),
                keterampilan_angka: getCellValue(row.getCell('F')),
                semester: getCellValue(row.getCell('G')),
                tahun_ajaran: getCellValue(row.getCell('H')),
            });
        });

        // Proses Sheet Nilai Hafalan
        await processSheet('Template Hafalan', (row, siswaData) => {
            siswaData.nilai_hafalan.push({
                kode_mapel: getCellValue(row.getCell('C')),
                nama_mapel: getCellValue(row.getCell('D')),
                nilai_angka: getCellValue(row.getCell('E')),
                semester: getCellValue(row.getCell('F')),
                tahun_ajaran: getCellValue(row.getCell('G')),
            });
        });

        // Proses Sheet Kehadiran (agregasi)
        // Ganti bagian proses Sheet Kehadiran dengan versi yang lebih debug:

// Proses Sheet Kehadiran (dengan debug untuk kegiatan)
        await processSheet('Template Kehadiran', (row, siswaData) => {
            const kegiatan = getCellValue(row.getCell('C')); // Kolom C = Kegiatan
            const sakit = getCellValue(row.getCell('D')) || 0;
            const izin = getCellValue(row.getCell('E')) || 0;
            const alpha = getCellValue(row.getCell('F')) || 0;
            
            console.log(`🔍 DEBUG KEHADIRAN - NIS: ${siswaData.nis}, Kegiatan: "${kegiatan}", Sakit: ${sakit}, Izin: ${izin}, Alpha: ${alpha}`);
            
            // Agregasi nilai
            siswaData.kehadiran.sakit = (siswaData.kehadiran.sakit || 0) + sakit;
            siswaData.kehadiran.izin = (siswaData.kehadiran.izin || 0) + izin;
            siswaData.kehadiran.alpha = (siswaData.kehadiran.alpha || 0) + alpha;
            
            // Simpan kegiatan (ambil yang pertama ditemukan)
            if (!siswaData.kehadiran.kegiatan && kegiatan) {
                siswaData.kehadiran.kegiatan = kegiatan;
                console.log(`✅ KEGIATAN TERSIMPAN untuk ${siswaData.nis}: "${kegiatan}"`);
            }
            
            // Atau jika ingin menyimpan semua kegiatan sebagai satu string
            if (kegiatan) {
                if (!siswaData.kehadiran.kegiatan) {
                    siswaData.kehadiran.kegiatan = kegiatan;
                } else if (!siswaData.kehadiran.kegiatan.includes(kegiatan)) {
                    siswaData.kehadiran.kegiatan += `, ${kegiatan}`;
                }
                console.log(`🔄 KEGIATAN UPDATE untuk ${siswaData.nis}: "${siswaData.kehadiran.kegiatan}"`);
            }
            
            if (!siswaData.kehadiran.semester) siswaData.kehadiran.semester = getCellValue(row.getCell('G'));
            if (!siswaData.kehadiran.tahun_ajaran) siswaData.kehadiran.tahun_ajaran = getCellValue(row.getCell('H'));
        });

        // TAMBAHKAN LOG SEBELUM MENYIMPAN KE DRAFT
        console.log("🔍 FINAL DATA SEBELUM DISIMPAN KE DRAFT:");
        for (const nis in combinedData) {
            const siswa = combinedData[nis];
            console.log(`NIS: ${nis}, Kehadiran Kegiatan: "${siswa.kehadiran?.kegiatan || 'NULL'}"`);
        }
        
        // Proses Sheet Sikap
        await processSheet('Template Sikap', (row, siswaData) => {
             if (!siswaData.catatan_walikelas) { // Ambil catatan dari baris pertama
                siswaData.catatan_walikelas = getCellValue(row.getCell('F'));
             }
        });

        const draftEntries = [];
        for (const nis in combinedData) {
            const siswaData = combinedData[nis];
            const rowData = {
                nis: siswaData.nis,
                nama_siswa: siswaData.nama_siswa,
                nilai_ujian: siswaData.nilai_ujian,
                nilai_hafalan: siswaData.nilai_hafalan,
                ...siswaData.kehadiran,
                catatan_sikap: siswaData.catatan_walikelas
            };

            // 🔥 PERBAIKAN: Set default kegiatan jika kosong
            if (!rowData.kegiatan) {
                // Ambil kegiatan pertama dari database sebagai default
                try {
                    const defaultKegiatan = await db.IndikatorKehadiran.findOne({
                        order: [['id', 'ASC']]
                    });
                    if (defaultKegiatan) {
                        rowData.kegiatan = defaultKegiatan.nama_kegiatan;
                        console.log(`⚠️  Set default kegiatan "${defaultKegiatan.nama_kegiatan}" untuk NIS: ${siswaData.nis}`);
                    }
                } catch (err) {
                    console.warn(`❌ Gagal mengambil default kegiatan: ${err.message}`);
                }
            }

            // Lakukan validasi terpusat di sini jika perlu
            const validation = { isValid: true, errors: [], siswaId: null };
            const siswaDb = await db.Siswa.findOne({ where: { nis: siswaData.nis }, include: ['kelas', 'wali_kelas'] });

            if (siswaDb) {
                validation.siswaId = siswaDb.id;
                validation.kelas_id = siswaDb.kelas ? siswaDb.kelas.id : null;
                validation.wali_kelas_id = siswaDb.wali_kelas ? siswaDb.wali_kelas.id : null;
            } else {
                validation.isValid = false;
                validation.errors.push(`Siswa dengan NIS '${siswaData.nis}' tidak ditemukan.`);
            }

            draftEntries.push({
                upload_batch_id,
                row_number: siswaData.row_number,
                data: rowData,
                is_valid: validation.isValid,
                validation_errors: validation.errors.length > 0 ? validation.errors : null,
                processed_data: {
                    siswa_id: validation.siswaId,
                    kelas_id: validation.kelas_id,
                    wali_kelas_id: validation.wali_kelas_id
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
        console.error("Error during upload and validation:", error);
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
        const kehadiran = await db.Kehadiran.findOne({ 
            where: { siswa_id: siswa.id, semester, tahun_ajaran } 
        });
        const sikap = await db.Sikap.findAll({ 
            where: { siswa_id: siswa.id, semester, tahun_ajaran }, 
            include: [{ model: db.IndikatorSikap, as: 'indikator' }]
        });
        
        res.status(200).json({
            siswa,
            nilaiUjian,
            kehadiran,
            sikap
        });
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data preview raport.", error: error.message });
    }
};


/**
 * Mengonfirmasi dan menyimpan data valid dari tabel draft ke tabel permanen.
 * --- FUNGSI INI YANG DIPERBAIKI ---
 */
// e-raport-api/controllers/draftController.js

// Ganti seluruh fungsi confirmAndSave dengan versi ini
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

        const nilaiUjianToCreate = [];
        const nilaiHafalanToCreate = [];
        const kehadiranToUpdate = {};
        const sikapToUpdate = {};

        for (const draft of validDrafts) {
            const draftItem = draft.get({ plain: true });
            const { data, processed_data } = draftItem;

            if (!processed_data || !processed_data.siswa_id) {
                console.warn(`Melewati item draft karena tidak memiliki processed_data atau siswa_id. ID Draft: ${draftItem.id}`);
                continue;
            }

            let semester, tahun_ajaran;
            if (data.nilai_ujian && data.nilai_ujian.length > 0) {
                semester = data.nilai_ujian[0].semester;
                tahun_ajaran = data.nilai_ujian[0].tahun_ajaran;
            } else if (data.nilai_hafalan && data.nilai_hafalan.length > 0) {
                semester = data.nilai_hafalan[0].semester;
                tahun_ajaran = data.nilai_hafalan[0].tahun_ajaran;
            } else if (data.semester) {
                semester = data.semester;
                tahun_ajaran = data.tahun_ajaran;
            }

            if (!semester || !tahun_ajaran) {
                console.warn(`Semester/Tahun Ajaran tidak ditemukan untuk siswa ID: ${processed_data.siswa_id}, dilewati.`);
                continue;
            }

            // 1. Proses Nilai Ujian
            if (data.nilai_ujian && Array.isArray(data.nilai_ujian)) {
                for (const nilai of data.nilai_ujian) {
                    const mapel = await db.MataPelajaran.findOne({ where: { kode_mapel: nilai.kode_mapel }});
                    if (mapel) {
                        nilaiUjianToCreate.push({ siswa_id: processed_data.siswa_id, mapel_id: mapel.id, pengetahuan_angka: nilai.pengetahuan_angka, keterampilan_angka: nilai.keterampilan_angka, semester, tahun_ajaran });
                    }
                }
            }
            
            // 2. Proses Nilai Hafalan
            if (data.nilai_hafalan && Array.isArray(data.nilai_hafalan)) {
                for (const nilai of data.nilai_hafalan) {
                     const mapel = await db.MataPelajaran.findOne({ where: { kode_mapel: nilai.kode_mapel }});
                     if (mapel) {
                        nilaiHafalanToCreate.push({ siswa_id: processed_data.siswa_id, mapel_id: mapel.id, nilai_angka: nilai.nilai_angka, semester, tahun_ajaran });
                     }
                }
            }

            // 3. Proses Kehadiran
            if (data.sakit !== undefined && !kehadiranToUpdate[processed_data.siswa_id]) {
                kehadiranToUpdate[processed_data.siswa_id] = { siswa_id: processed_data.siswa_id, sakit: data.sakit || 0, izin: data.izin || 0, absen: data.alpha || 0, semester, tahun_ajaran };
            }

            // 4. Proses Sikap
            if (data.catatan_sikap && !sikapToUpdate[processed_data.siswa_id]) {
                sikapToUpdate[processed_data.siswa_id] = { siswa_id: processed_data.siswa_id, catatan: data.catatan_sikap, semester, tahun_ajaran, wali_kelas_id: processed_data.wali_kelas_id, kelas_id: processed_data.kelas_id };
            }
        }

        // --- Operasi Database ---
        if (nilaiUjianToCreate.length > 0) {
            await db.NilaiUjian.bulkCreate(nilaiUjianToCreate, { 
            transaction, 
            updateOnDuplicate: ['pengetahuan_angka', 'keterampilan_angka', 'updatedAt'] 
        });
        }
        if (nilaiHafalanToCreate.length > 0) {
            await db.NilaiHafalan.bulkCreate(nilaiHafalanToCreate, { transaction, updateOnDuplicate: ['nilai_angka', 'updatedAt'] });
        }
        if (Object.values(kehadiranToUpdate).length > 0) {
            await db.Kehadiran.bulkCreate(Object.values(kehadiranToUpdate), { 
            transaction, 
            updateOnDuplicate: ["sakit", "izin", "absen", 'updatedAt'] 
        });
        }
        for (const siswaId in sikapToUpdate) {
            if (sikapToUpdate.hasOwnProperty(siswaId)) {
                await db.Sikap.upsert(sikapToUpdate[siswaId], {
                transaction
            });
            }
        }
        

        // --- PERBAIKAN: Gunakan `upsert` dalam loop untuk Sikap ---
        for (const siswaId in sikapToUpdate) {
            if (sikapToUpdate.hasOwnProperty(siswaId)) {
                await db.Sikap.upsert(sikapToUpdate[siswaId], {
                    transaction
                });
            }
        }
        // --- AKHIR PERBAIKAN ---
        
        await db.DraftNilai.destroy({ where: { upload_batch_id: batchId }, transaction });
        
        await transaction.commit();
        res.status(200).json({ message: 'Data raport berhasil disimpan secara permanen.' });

    } catch (error) {
        await transaction.rollback();
        console.error("Error during confirm and save:", error);
        res.status(500).json({ message: 'Gagal menyimpan data.', error: error.message });
    }
};