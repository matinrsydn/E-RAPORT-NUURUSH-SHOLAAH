const ExcelJS = require('exceljs');
const db = require('../models');

/**
 * Read value from Excel cell safely
 */
const getCellValue = (cell) => {
  if (!cell || cell.value === null || cell.value === undefined) return null;
  if (cell.value && typeof cell.value === 'object' && cell.value.result !== undefined) return cell.value.result;
  if (cell.value && typeof cell.value === 'object' && cell.value.richText) return cell.value.richText.map(rt => rt.text).join('');
  return cell.value;
};

/**
 * Parse an uploaded Excel file and return an array of objects suitable for saving:
 * [{ row_number, data, is_valid, validation_errors, processed_data }]
 *
 * The parser expects sheets named: 'Template Nilai Ujian', 'Template Hafalan', 'Template Kehadiran', 'Template Sikap'
 */
async function parseExcelFile(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const combinedData = {};

  const processSheet = async (sheetName, dataProcessor) => {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) return;
    const actualRowCount = worksheet.actualRowCount;
    for (let i = 2; i <= actualRowCount; i++) {
      const row = worksheet.getRow(i);
      const cellA = worksheet.getCell(`A${i}`);
      const nis = cellA && cellA.isMerged ? getCellValue(worksheet.getCell(cellA.master.address)) : getCellValue(cellA);
      if (!nis) continue;
      const cellB = worksheet.getCell(`B${i}`);
      const nama_siswa = cellB && cellB.isMerged ? getCellValue(worksheet.getCell(cellB.master.address)) : getCellValue(cellB);
      if (!combinedData[nis]) combinedData[nis] = { nis, nama_siswa, row_number: i, nilai_ujian: [], nilai_hafalan: [], kehadiran_detail: [], kehadiran_summary: { sakit: 0, izin: 0, alpha: 0 }, sikap: { catatan_walikelas: '', detail: [] }, semester: null, tahun_ajaran: null };
      await dataProcessor(row, combinedData[nis], worksheet);
    }
  };

  // Template Nilai Ujian
  await processSheet('Template Nilai Ujian', async (row, siswaData) => {
    // Struktur kolom yang diharapkan:
    // A: NIS (wajib)
    // B: Nama (info saja)
    // C: Nama Mapel Ujian (wajib)
    // D: Kitab Mapel Ujian (opsional)
    // E: Nilai (wajib, numerik)
    // F: Semester (wajib, harus 1 atau 2)
    // G: Tahun Ajaran (wajib)
    
    const rawData = {
      nis: getCellValue(row.getCell('A')),
      nama: getCellValue(row.getCell('B')),
      namaMapel: getCellValue(row.getCell('C')),
      kitab: getCellValue(row.getCell('D')),
      nilai: getCellValue(row.getCell('E')),
      semester: getCellValue(row.getCell('F')),
      tahunAjaran: getCellValue(row.getCell('G'))
    };
    
    // Log raw data for debugging
    console.log(`Membaca baris ${row.number}:`, rawData);
    
    // Validasi kolom wajib
    if (!rawData.namaMapel) {
      console.log(`Baris ${row.number}: Kolom C (Nama Mapel) kosong`);
      return;
    }

    if (!rawData.nilai || isNaN(parseFloat(rawData.nilai))) {
      console.log(`Baris ${row.number}: Kolom E (Nilai) tidak valid: ${rawData.nilai}`);
      return;
    }

    if (!rawData.semester || !['1', '2'].includes(String(rawData.semester).trim())) {
      console.log(`Baris ${row.number}: Kolom F (Semester) harus 1 atau 2, ditemukan: ${rawData.semester}`);
      return;
    }

    if (!rawData.tahunAjaran) {
      console.log(`Baris ${row.number}: Kolom G (Tahun Ajaran) kosong`);
      return;
    }

    // Normalisasi data untuk database
    const nilaiData = {
      nama_mapel: rawData.namaMapel.toString().trim(),
      kitab: rawData.kitab ? rawData.kitab.toString().trim() : null,
      nilai: parseFloat(rawData.nilai),
      semester: String(rawData.semester).trim(),
      tahun_ajaran: rawData.tahunAjaran.toString().trim()
    };

    console.log(`Baris ${row.number} valid dan akan disimpan:`, nilaiData);
    
    // Simpan ke siswaData
    siswaData.nilai_ujian.push(nilaiData);
    if (!siswaData.semester) siswaData.semester = nilaiData.semester;
    if (!siswaData.tahun_ajaran) siswaData.tahun_ajaran = nilaiData.tahun_ajaran;
  });

  // Template Hafalan
  await processSheet('Template Hafalan', async (row, siswaData) => {
    // columns: A NIS, B Nama, C Nama Mapel, D Kitab, E Batas Hafalan (ignored), F Predikat (A/B/C/D), G Semester, H Tahun Ajaran
    const semesterValue = getCellValue(row.getCell('G'));
    const tahunAjaranValue = getCellValue(row.getCell('H'));
    const namaMapel = (getCellValue(row.getCell('C')) || '').toString().trim();
    const predikat = (getCellValue(row.getCell('F')) || '').toString().trim(); // Predikat should be stored as string

    // If no nama mapel or predikat, skip
    if (!namaMapel) return;

    const hafalanData = {
      nama_mapel: namaMapel,
      kitab: (getCellValue(row.getCell('D')) || '').toString().trim(),
      predikat: predikat || null, // store predikat as string; Batas Hafalan (col E) intentionally ignored
      semester: semesterValue ? String(semesterValue).trim() : null,
      tahun_ajaran: tahunAjaranValue ? String(tahunAjaranValue).trim() : null
    };
    siswaData.nilai_hafalan.push(hafalanData);
    if (!siswaData.semester) siswaData.semester = hafalanData.semester;
    if (!siswaData.tahun_ajaran) siswaData.tahun_ajaran = hafalanData.tahun_ajaran;
  });

  // Kehadiran
  await processSheet('Template Kehadiran', async (row, siswaData) => {
    const kegiatan = (getCellValue(row.getCell('C')) || '').toString().trim();
    if (!kegiatan) return;
    const izin = parseInt(getCellValue(row.getCell('D')) || 0, 10);
    const sakit = parseInt(getCellValue(row.getCell('E')) || 0, 10);
    const absen = parseInt(getCellValue(row.getCell('F')) || 0, 10);
    // Template Kehadiran columns: A NIS, B Nama, C Kegiatan, D Izin, E Sakit, F Absen, G Semester, H Tahun Ajaran
    const semesterValue = getCellValue(row.getCell('G'));
    const tahunAjaranValue = getCellValue(row.getCell('H'));
    siswaData.kehadiran_detail.push({ kegiatan, izin, sakit, absen });
    siswaData.kehadiran_summary.izin += izin;
    siswaData.kehadiran_summary.sakit += sakit;
    siswaData.kehadiran_summary.alpha += absen;
    if (!siswaData.semester && semesterValue) siswaData.semester = semesterValue;
    if (!siswaData.tahun_ajaran && tahunAjaranValue) siswaData.tahun_ajaran = tahunAjaranValue;
  });

  // Sikap
  await processSheet('Template Sikap', async (row, siswaData, worksheet) => {
    // Template Sikap columns: A NIS, B Nama, C Jenis Sikap, D Indikator, E Nilai, F Semester, G Tahun Ajaran, (H Deskripsi merged?)
    const jenis_sikap = getCellValue(row.getCell('C'));
    const indikator = getCellValue(row.getCell('D'));
    const nilai = getCellValue(row.getCell('E'));
    const semesterValue = getCellValue(row.getCell('F'));
    const tahunAjaranValue = getCellValue(row.getCell('G'));
    const cellH = row.getCell('H');
    const deskripsi = cellH && cellH.isMerged ? getCellValue(worksheet.getCell(cellH.master.address)) : getCellValue(cellH);
    if (jenis_sikap && indikator) siswaData.sikap.detail.push({ jenis_sikap, indikator, nilai: nilai ? parseFloat(nilai) : null });
    if (deskripsi && !siswaData.sikap.catatan_walikelas) siswaData.sikap.catatan_walikelas = deskripsi;
    if (!siswaData.semester && semesterValue) siswaData.semester = semesterValue;
    if (!siswaData.tahun_ajaran && tahunAjaranValue) siswaData.tahun_ajaran = tahunAjaranValue;
  });

  // Catatan sheets: support new separate sheets 'Catatan Akademik' and 'Catatan Sikap'
  const catAkSheet = workbook.getWorksheet('Catatan Akademik');
  if (catAkSheet) {
    for (let i = 2; i <= catAkSheet.actualRowCount; i++) {
      const idOrNis = getCellValue(catAkSheet.getCell(`A${i}`));
      const sem = getCellValue(catAkSheet.getCell(`C${i}`));
      const cat = getCellValue(catAkSheet.getCell(`D${i}`)) || null;
      if (!idOrNis || !cat) continue;
      // try to resolve siswa by id or nis
      let siswaRec = null;
      if (String(idOrNis).match(/^\d+$/)) {
        siswaRec = await db.Siswa.findByPk(Number(idOrNis));
      }
      if (!siswaRec) siswaRec = await db.Siswa.findOne({ where: { nis: String(idOrNis) } });
      if (!siswaRec) continue;
      const nisKey = siswaRec.nis;
      if (!combinedData[nisKey]) combinedData[nisKey] = { nis: nisKey, nama_siswa: siswaRec.nama, row_number: i, nilai_ujian: [], nilai_hafalan: [], kehadiran_detail: [], kehadiran_summary: { sakit: 0, izin: 0, alpha: 0 }, sikap: { catatan_walikelas: '', detail: [] }, semester: sem || null, tahun_ajaran: null };
      if (!combinedData[nisKey].catatan_akademik) combinedData[nisKey].catatan_akademik = String(cat).trim();
      if (!combinedData[nisKey].semester && sem) combinedData[nisKey].semester = sem;
    }
  }

  const catSiSheet = workbook.getWorksheet('Catatan Sikap');
  if (catSiSheet) {
    for (let i = 2; i <= catSiSheet.actualRowCount; i++) {
      const idOrNis = getCellValue(catSiSheet.getCell(`A${i}`));
      const sem = getCellValue(catSiSheet.getCell(`C${i}`));
      const cat = getCellValue(catSiSheet.getCell(`D${i}`)) || null;
      if (!idOrNis || !cat) continue;
      let siswaRec = null;
      if (String(idOrNis).match(/^\d+$/)) {
        siswaRec = await db.Siswa.findByPk(Number(idOrNis));
      }
      if (!siswaRec) siswaRec = await db.Siswa.findOne({ where: { nis: String(idOrNis) } });
      if (!siswaRec) continue;
      const nisKey = siswaRec.nis;
      if (!combinedData[nisKey]) combinedData[nisKey] = { nis: nisKey, nama_siswa: siswaRec.nama, row_number: i, nilai_ujian: [], nilai_hafalan: [], kehadiran_detail: [], kehadiran_summary: { sakit: 0, izin: 0, alpha: 0 }, sikap: { catatan_walikelas: '', detail: [] }, semester: sem || null, tahun_ajaran: null };
      if (!combinedData[nisKey].catatan_sikap) combinedData[nisKey].catatan_sikap = String(cat).trim();
      if (!combinedData[nisKey].semester && sem) combinedData[nisKey].semester = sem;
    }
  }

  const result = [];
  for (const nis in combinedData) {
    const siswaData = combinedData[nis];
    const siswaDb = await db.Siswa.findOne({ where: { nis: siswaData.nis }, include: [{ model: db.Kelas, as: 'kelas', include: [{ model: db.Guru, as: 'walikelas' }] }] });
    const validation = { isValid: true, errors: [] };
    if (!siswaDb) {
      validation.isValid = false;
      validation.errors.push(`Siswa dengan NIS '${siswaData.nis}' tidak ditemukan.`);
    }
    if (!/^[12]$/.test(String(siswaData.semester))) {
      validation.isValid = false;
      validation.errors.push(`Semester '${siswaData.semester}' tidak valid. Harus '1' atau '2'.`);
    }
    if (!/^[0-9]{4}\/[0-9]{4}$/.test(String(siswaData.tahun_ajaran))) {
      validation.isValid = false;
      validation.errors.push(`Tahun Ajaran '${siswaData.tahun_ajaran}' tidak valid. Contoh: 2024/2025.`);
    }
  result.push({ row_number: siswaData.row_number, data: siswaData, is_valid: validation.isValid, validation_errors: validation.errors.length > 0 ? validation.errors : null, processed_data: { siswa_id: siswaDb ? siswaDb.id : null, kelas_id: siswaDb && siswaDb.kelas ? siswaDb.kelas.id : null, wali_kelas_id: siswaDb && siswaDb.kelas && siswaDb.kelas.walikelas ? siswaDb.kelas.walikelas.id : null, catatan_akademik: siswaData.catatan_akademik || null, catatan_sikap: siswaData.catatan_sikap || null } });
  }

  return result;
}

module.exports = { parseExcelFile };
