const db = require('../models');
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

/**
 * Helper function untuk "membersihkan" dan mengambil nilai dari sel Excel.
 * Ini adalah kunci untuk mencegah kesalahan format dan pergeseran kolom.
 * @param {ExcelJS.Cell} cell - Objek sel dari library exceljs.
 * @returns {string|number|null} - Nilai yang sudah bersih.
 */
const getCellValue = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) {
        return null;
    }

    // Jika sel berisi formula, ambil hasilnya
    if (cell.value && typeof cell.value === 'object' && cell.value.result !== undefined) {
        return cell.value.result;
    }
    
    // Jika sel berisi rich text, gabungkan teksnya
    if (cell.value && typeof cell.value === 'object' && cell.value.richText) {
        return cell.value.richText.map(rt => rt.text).join('');
    }

    // Untuk semua kasus lain, kembalikan nilai biasa
    return cell.value;
};

/**
 * Helper function untuk melakukan validasi setiap baris data dari Excel.
 */
async function validateRow(rowData) {
    const errors = [];

    // 1. Validasi Keberadaan Siswa berdasarkan NIS
    const siswa = await db.Siswa.findOne({ where: { nis: rowData.nis } });
    if (!siswa) {
        errors.push(`Siswa dengan NIS '${rowData.nis}' tidak ditemukan.`);
    }

    // ========================================================================
    // PERBAIKAN: Menggunakan findOrCreate untuk Mata Pelajaran
    // ------------------------------------------------------------------------
    // Logika ini diubah dari `findOne` menjadi `findOrCreate`.
    // Jika mata pelajaran tidak ditemukan, ia akan otomatis dibuat.
    // Ini akan mencegah error "Mata Pelajaran ... tidak ditemukan."
    // ========================================================================
    const [mapel, created] = await db.MataPelajaran.findOrCreate({
        where: { kode_mapel: rowData.kode_mapel },
        defaults: {
            nama_mapel: rowData.nama_mapel || `Mapel Otomatis ${rowData.kode_mapel}`
        }
    });

    if (created) {
        console.log(`INFO: Mata pelajaran baru otomatis dibuat: Kode='${rowData.kode_mapel}', Nama='${rowData.nama_mapel}'`);
    }
    
    // 3. Validasi Tipe Data Nilai (harus angka)
    if (rowData.pengetahuan_angka === null || isNaN(parseFloat(rowData.pengetahuan_angka))) {
        errors.push(`Nilai Pengetahuan '${rowData.pengetahuan_angka}' bukan angka yang valid.`);
    }
    if (rowData.keterampilan_angka === null || isNaN(parseFloat(rowData.keterampilan_angka))) {
        errors.push(`Nilai Keterampilan '${rowData.keterampilan_angka}' bukan angka yang valid.`);
    }

    // 4. Validasi Kehadiran (Sakit, Izin, Alpha) - dengan default 0 jika null
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

    // 5. Validasi Semester dan Tahun Ajaran
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
    };
}

/**
 * Mengunggah file Excel, memvalidasi isinya, dan menyimpannya ke tabel draft.
 * VERSI PALING STABIL
 */
exports.uploadAndValidate = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'File tidak ditemukan.' });
        }

        const upload_batch_id = uuidv4();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.getWorksheet(1);

        const draftEntries = [];
        
        // Iterasi mulai dari baris ke-2 (untuk melewati header)
        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);

            // Lewati baris kosong - periksa apakah ada data di kolom A sampai F
            const hasData = row.getCell('A').value || row.getCell('B').value || 
                           row.getCell('C').value || row.getCell('D').value ||
                           row.getCell('E').value || row.getCell('F').value;
            
            if (!hasData) continue;

            const rowData = {
                nis: getCellValue(row.getCell('A')),
                nama_siswa: getCellValue(row.getCell('B')),
                kode_mapel: getCellValue(row.getCell('C')),
                nama_mapel: getCellValue(row.getCell('D')),
                pengetahuan_angka: getCellValue(row.getCell('E')),
                keterampilan_angka: getCellValue(row.getCell('F')),
                semester: getCellValue(row.getCell('G')),
                tahun_ajaran: getCellValue(row.getCell('H')),
                
                // Kolom ini tidak ada di sheet Nilai Ujian, beri nilai default null
                sakit: null,
                izin: null,
                alpha: null,
                catatan_walikelas: null,
            };
            console.log(`Baris ${i}:`, rowData); // Debug log
            
            const validation = await validateRow(rowData);
            draftEntries.push({
                upload_batch_id,
                row_number: i,
                data: rowData,
                is_valid: validation.isValid,
                validation_errors: validation.errors,
                processed_data: {
                    siswa_id: validation.siswaId,
                    mapel_id: validation.mapelId,
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
 */
exports.confirmAndSave = async (req, res) => {
    const { batchId } = req.params;
    const transaction = await db.sequelize.transaction();

    try {
        const validDrafts = await db.DraftNilai.findAll({
            where: {
                upload_batch_id: batchId,
                is_valid: true
            },
            transaction
        });

        if (validDrafts.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Tidak ada data valid untuk disimpan.' });
        }

        const nilaiToCreate = [];
        const kehadiranToUpdate = {};

        for (const draft of validDrafts) {
            const { data, processed_data } = draft;
            
            nilaiToCreate.push({
                siswa_id: processed_data.siswa_id,
                mapel_id: processed_data.mapel_id,
                pengetahuan_angka: data.pengetahuan_angka,
                keterampilan_angka: data.keterampilan_angka,
                semester: data.semester,
                tahun_ajaran: data.tahun_ajaran,
            });

            if (!kehadiranToUpdate[processed_data.siswa_id]) {
                kehadiranToUpdate[processed_data.siswa_id] = {
                    siswa_id: processed_data.siswa_id,
                    sakit: data.sakit || 0,
                    izin: data.izin || 0,
                    alpha: data.alpha || 0,
                    semester: data.semester,
                    tahun_ajaran: data.tahun_ajaran,
                };
            }
        }

        await db.NilaiUjian.bulkCreate(nilaiToCreate, { 
            transaction, 
            updateOnDuplicate: ['pengetahuan_angka', 'keterampilan_angka'] 
        });

        for (const siswaId in kehadiranToUpdate) {
            const data = kehadiranToUpdate[siswaId];
            await db.Kehadiran.upsert(data, { transaction });
        }

        await db.DraftNilai.destroy({
            where: { upload_batch_id: batchId },
            transaction
        });
        
        await transaction.commit();
        res.status(200).json({ message: 'Data raport berhasil disimpan secara permanen.' });

    } catch (error) {
        await transaction.rollback();
        console.error("Error during confirm and save:", error);
        res.status(500).json({ message: 'Gagal menyimpan data.', error: error.message });
    }
};
