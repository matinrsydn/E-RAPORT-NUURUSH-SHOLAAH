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
    if (cell.value.result) {
        return cell.value.result;
    }
    
    // Jika sel berisi rich text, gabungkan teksnya
    if (cell.value.richText) {
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

    // 2. Validasi Keberadaan Mata Pelajaran berdasarkan Kode
    const mapel = await db.MataPelajaran.findOne({ where: { kode_mapel: rowData.kode_mapel } });
    if (!mapel) {
        errors.push(`Mata Pelajaran dengan kode '${rowData.kode_mapel}' tidak ditemukan.`);
    }
    
    // 3. Validasi Tipe Data Nilai (harus angka)
    if (rowData.pengetahuan_angka === null || isNaN(parseFloat(rowData.pengetahuan_angka))) {
        errors.push(`Nilai Pengetahuan '${rowData.pengetahuan_angka}' bukan angka yang valid.`);
    }
    if (rowData.keterampilan_angka === null || isNaN(parseFloat(rowData.keterampilan_angka))) {
        errors.push(`Nilai Keterampilan '${rowData.keterampilan_angka}' bukan angka yang valid.`);
    }

    // 4. Validasi Kehadiran (Sakit, Izin, Alpha)
    if (rowData.sakit === null || isNaN(parseInt(rowData.sakit))) {
        errors.push(`Jumlah Sakit '${rowData.sakit}' bukan angka yang valid.`);
    }
     if (rowData.izin === null || isNaN(parseInt(rowData.izin))) {
        errors.push(`Jumlah Izin '${rowData.izin}' bukan angka yang valid.`);
    }
     if (rowData.alpha === null || isNaN(parseInt(rowData.alpha))) {
        errors.push(`Jumlah Alpha '${rowData.alpha}' bukan angka yang valid.`);
    }

    // 5. Validasi Semester dan Tahun Ajaran
    const semesterStr = String(rowData.semester);
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

            // Lewati baris kosong
            if (row.values.length === 0) continue;

            const rowData = {
                nis: getCellValue(row.getCell('A')),
                nama_siswa: getCellValue(row.getCell('B')),
                kode_mapel: getCellValue(row.getCell('C')),
                nama_mapel: getCellValue(row.getCell('D')),
                pengetahuan_angka: getCellValue(row.getCell('E')),
                keterampilan_angka: getCellValue(row.getCell('F')),
                sakit: getCellValue(row.getCell('G')),
                izin: getCellValue(row.getCell('H')),
                alpha: getCellValue(row.getCell('I')),
                catatan_walikelas: getCellValue(row.getCell('J')),
                semester: getCellValue(row.getCell('K')),
                tahun_ajaran: getCellValue(row.getCell('L')),
            };
            
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

        const nilaiUjian = await db.NilaiUjian.findAll({ where: { siswa_id: siswa.id, semester, tahun_ajaran }, include: ['mapel'] });
        const kehadiran = await db.Kehadiran.findOne({ where: { siswa_id: siswa.id, semester, tahun_ajaran } });
        const sikap = await db.Sikap.findAll({ where: { siswa_id: siswa.id, semester, tahun_ajaran }, include: ['indikator'] });
        
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
                    sakit: data.sakit,
                    izin: data.izin,
                    alpha: data.alpha,
                    semester: data.semester,
                    tahun_ajaran: data.tahun_ajaran,
                };
            }
        }

        await db.NilaiUjian.bulkCreate(nilaiToCreate, { transaction, updateOnDuplicate: ['pengetahuan_angka', 'keterampilan_angka'] });

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