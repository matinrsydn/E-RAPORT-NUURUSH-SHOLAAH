const db = require('../models');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Download template Excel LENGKAP dengan multiple sheets
// Perbaikan pada excelController.js - fungsi downloadCompleteTemplate

// Upload data dari multi-sheet Excel
exports.uploadCompleteData = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }

    // Helper function to get cell value safely
    function getCellValue(worksheet, row, col) {
        const cell = worksheet.getRow(row).getCell(col);
        if (!cell || cell.value === null || cell.value === undefined) {
            return '';
        }
        if (typeof cell.value === 'object' && cell.value.richText) {
            return cell.value.richText.map(rt => rt.text).join('').trim();
        }
        if (typeof cell.value === 'object' && cell.value.result) {
            return String(cell.value.result).trim();
        }
        return String(cell.value).trim();
    }

    const filePath = req.file.path;
    const transaction = await db.sequelize.transaction();

  // Allow caller to provide tahun_ajaran_id or master_tahun_ajaran_id (form field or query)
  // Normalize to Numbers or null
  const providedTahunAjaranIdRaw = (req.body && (req.body.tahun_ajaran_id || req.body.tahunAjaranId)) || (req.query && req.query.tahun_ajaran_id) || null;
  const providedTahunAjaranId = providedTahunAjaranIdRaw ? (isNaN(Number(providedTahunAjaranIdRaw)) ? null : Number(providedTahunAjaranIdRaw)) : null;
  const providedMasterRaw = (req.body && (req.body.master_tahun_ajaran_id || req.body.master_ta_id)) || (req.query && req.query.master_tahun_ajaran_id) || null;
  const providedMasterId = providedMasterRaw ? (isNaN(Number(providedMasterRaw)) ? null : Number(providedMasterRaw)) : null;

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        const results = {
            nilai_ujian: { success: 0, errors: 0, skipped: 0 },
            hafalan: { success: 0, errors: 0, skipped: 0 },
            kehadiran: { success: 0, errors: 0, skipped: 0 },
            sikap: { success: 0, errors: 0, skipped: 0 }
        };

    const cache = {
            siswa: {},
            tahunAjaran: {},
            indikatorKehadiran: {},
            indikatorSikap: {}
        };

    // Helper: get latest SiswaKelasHistory for a siswa
    const getLatestHistoryForSiswa = async (siswaId) => {
      return await db.SiswaKelasHistory.findOne({ where: { siswa_id: siswaId }, order: [['id', 'DESC']] });
    };

    // Resolve a history row and tahun_ajaran_id (+semester) to use for a given siswa.
    // Priority:
    // 1) If caller provided a tahun_ajaran_id, try to find a history for that TA and semester (if semester provided).
    // 2) Otherwise, fallback to the latest history for the siswa with the matching semester if possible.
    // 3) As a last resort, accept latest history and/or tahun_ajaran from sheet.
    const resolveHistoryForSiswa = async (siswaId, tahunAjaranInfo, semesterFromSheet) => {
      let history = null;
      const masterTaId = tahunAjaranInfo ? (
        tahunAjaranInfo.master?.id || tahunAjaranInfo.master_tahun_ajaran_id
      ) : null;
      
      // 1) Try to find history with matching master TA and semester
      if (masterTaId && semesterFromSheet) {
        history = await db.SiswaKelasHistory.findOne({ 
          where: { 
            siswa_id: siswaId, 
            master_tahun_ajaran_id: masterTaId, 
            semester: semesterFromSheet 
          }, 
          order: [['id', 'DESC']] 
        });
      }
      
      // 2) Try with just master TA if no semester match
      if (!history && masterTaId) {
        history = await db.SiswaKelasHistory.findOne({ 
          where: { 
            siswa_id: siswaId, 
            master_tahun_ajaran_id: masterTaId 
          }, 
          order: [['id', 'DESC']] 
        });
      }
      
      // 3) Fallback to latest history if nothing else matches
      if (!history) {
        history = await getLatestHistoryForSiswa(siswaId);
      }

      const semesterToUse = history?.semester || semesterFromSheet || null;
      const masterTaToUse = history?.master_tahun_ajaran_id || masterTaId || null;
      
      return { 
        history, 
        semesterToUse, 
        masterTaToUse 
      };
    };

        // Cache helpers
        const findSiswa = async (nis) => {
            if (!cache.siswa[nis]) cache.siswa[nis] = await db.Siswa.findOne({ where: { nis } });
            return cache.siswa[nis];
        };
    const findTahunAjaran = async (nama_ajaran, semester) => {
      const key = `${nama_ajaran}-${semester}`;
      if (!cache.tahunAjaran[key]) {
        try {
          // Always go through MasterTahunAjaran first
          console.log(`Mencari Master Tahun Ajaran: ${nama_ajaran}`);
          const master = await db.MasterTahunAjaran.findOne({ 
            where: { nama_ajaran } 
          });
          
          if (!master) {
            console.log(`Master Tahun Ajaran "${nama_ajaran}" tidak ditemukan`);
            return null;
          }
          
          console.log(`Master Tahun Ajaran ditemukan dengan ID: ${master.id}`);
          
          // Find PeriodeAjaran using master_tahun_ajaran_id
          const periode = await db.PeriodeAjaran.findOne({ 
            where: { 
              master_tahun_ajaran_id: master.id, 
              semester: String(semester), // Ensure semester is string
              status: 'aktif' 
            }
          });
          
          if (!periode) {
            console.log(`Periode Ajaran tidak ditemukan untuk Master TA: ${master.id}, Semester: ${semester}`);
            return null;
          }
          
          console.log(`Periode Ajaran ditemukan dengan ID: ${periode.id}`);
          cache.tahunAjaran[key] = periode;
        } catch (error) {
          console.error(`Error saat mencari tahun ajaran:`, error);
          return null;
        }
      }
      return cache.tahunAjaran[key];
    };
        const findIndikatorKehadiran = async (nama_kegiatan) => {
            if (!cache.indikatorKehadiran[nama_kegiatan]) cache.indikatorKehadiran[nama_kegiatan] = await db.IndikatorKehadiran.findOne({ where: { nama_kegiatan } });
            return cache.indikatorKehadiran[nama_kegiatan];
        };
        const findIndikatorSikap = async (jenis_sikap, indikator) => {
            const key = `${jenis_sikap}-${indikator}`;
            if (!cache.indikatorSikap[key]) {
                cache.indikatorSikap[key] = await db.IndikatorSikap.findOne({ where: { jenis_sikap, indikator, is_active: 1 } });
            }
            return cache.indikatorSikap[key];
        };
        
        // ========== 1. PROSES SHEET NILAI UJIAN ==========
        const nilaiWorksheet = workbook.getWorksheet('Template Nilai Ujian');
    if (nilaiWorksheet) {
      console.log("Memulai proses Sheet Nilai Ujian...");
      console.log("Format yang diharapkan:");
      console.log("A: NIS");
      console.log("B: Nama Siswa");
      console.log("C: Nama Mapel");
      console.log("D: Kitab");
      console.log("E: Nilai");
      console.log("F: Semester (harus 1 atau 2)");
      console.log("G: Tahun Ajaran");
      
      const toNumberOrNull = (v) => {
        if (v === null || v === undefined || v === '') return null;
        const n = parseFloat(v);
        return isNaN(n) ? null : n;
      };

            for (let i = 2; i <= nilaiWorksheet.rowCount; i++) {
            const nis = getCellValue(nilaiWorksheet, i, 1);
            const nama_mapel = getCellValue(nilaiWorksheet, i, 3); // Nama Mapel col 3
            const semester = getCellValue(nilaiWorksheet, i, 6); // Semester col 6
            const tahun_ajaran_str = getCellValue(nilaiWorksheet, i, 7); // Tahun Ajaran col 7

            if (!nis || !nama_mapel) { 
              console.log(`Baris ${i}: NIS atau Nama Mapel kosong`);
              results.nilai_ujian.skipped++; 
              continue; 
            }

            try {
              console.log(`\nMemproses baris ${i}:`);
              console.log(`Data: NIS=${nis}, Mapel=${nama_mapel}, Semester=${semester}, TA=${tahun_ajaran_str}`);

              const siswa = await findSiswa(nis);
              if (!siswa) {
                console.log(`Baris ${i}: Siswa dengan NIS ${nis} tidak ditemukan`);
                results.nilai_ujian.errors++;
                continue;
              }
              console.log(`- Siswa ditemukan: ${siswa.nama}`);

              // --- Perubahan: Cari mapel berdasarkan Tingkatan siswa, bukan TahunAjaran ---
              // Ambil informasi kelas/tingkatan siswa (prefer include cache)
              let siswaKelasInfo = null;
              try {
                // include Kelas to get tingkatan_id if available
                siswaKelasInfo = await db.Siswa.findOne({ where: { id: siswa.id }, include: [{ model: db.Kelas, as: 'kelas', attributes: ['id', 'tingkatan_id'] }] });
              } catch (err) {
                console.error(`Error membaca kelas siswa (NIS ${nis}) :`, err && err.message ? err.message : err);
              }

              const tingkatanId = siswaKelasInfo && siswaKelasInfo.kelas ? (siswaKelasInfo.kelas.tingkatan_id || siswaKelasInfo.kelas.tingkatanId) : null;
              const normalizedNamaMapel = (nama_mapel || '').toString().trim();
              console.log(`Mencari mata pelajaran untuk siswa NIS=${nis}, tingkatan=${tingkatanId}, nama_mapel="${normalizedNamaMapel}" (baris ${i})`);

              // Cari MataPelajaran melalui Kurikulum yang terkait ke tingkatan
              let mapel = null;
              try {
                if (tingkatanId) {
                  // Join MataPelajaran <-> Kurikulum dan filter by tingkatan_id
                  mapel = await db.MataPelajaran.findOne({
                    include: [{
                      model: db.Kurikulum,
                      as: 'kurikulum',
                      where: { tingkatan_id: tingkatanId },
                      required: true
                    }],
                    where: db.Sequelize.where(
                      db.Sequelize.fn('LOWER', db.Sequelize.fn('TRIM', db.Sequelize.col('nama_mapel'))),
                      normalizedNamaMapel.toLowerCase()
                    )
                  });
                } else {
                  // Jika tingkatan tidak tersedia, fallback ke pencarian global (case-insensitive)
                  mapel = await db.MataPelajaran.findOne({
                    where: db.Sequelize.where(
                      db.Sequelize.fn('LOWER', db.Sequelize.fn('TRIM', db.Sequelize.col('nama_mapel'))),
                      normalizedNamaMapel.toLowerCase()
                    )
                  });
                }
              } catch (err) {
                console.error(`Error saat mencari MataPelajaran di DB:`, err && err.message ? err.message : err);
              }

              if (!mapel) {
                // Fallback logging to help debugging: list kurikulum untuk tingkatan jika tersedia
                if (tingkatanId) {
                  const kurikulums = await db.Kurikulum.findAll({ where: { tingkatan_id: tingkatanId }, include: [{ model: db.MataPelajaran, as: 'mapel', attributes: ['id', 'nama_mapel'] }], limit: 50 });
                  console.log(`Baris ${i}: Mata pelajaran "${normalizedNamaMapel}" tidak ditemukan untuk tingkatan ${tingkatanId}. Contoh mapel pada tingkatan ini:`, kurikulums.map(k => k.mapel ? k.mapel.nama_mapel : null).filter(Boolean));
                } else {
                  const allMapel = await db.MataPelajaran.findAll({ attributes: ['id', 'nama_mapel'], limit: 50 });
                  console.log(`Baris ${i}: Mata pelajaran "${normalizedNamaMapel}" tidak ditemukan (tingkatan tidak diketahui). Contoh mapel:`, allMapel.map(m => m.nama_mapel));
                }
                results.nilai_ujian.errors++;
                continue;
              }
              console.log(`- Mapel ditemukan: ${mapel.nama_mapel} (ID: ${mapel.id}, Jenis: ${mapel.jenis})`);

              // Check semester format
              if (semester !== '1' && semester !== '2') {
                console.log(`Baris ${i}: Semester harus 1 atau 2, ditemukan: ${semester}`);
                results.nilai_ujian.errors++;
                continue;
              }
              console.log(`- Semester valid: ${semester}`);

              // Get and validate tahun ajaran
              console.log(`Mencari tahun ajaran: ${tahun_ajaran_str} semester ${semester}`);
              const tahunAjaranFromSheet = await findTahunAjaran(tahun_ajaran_str, semester);
              
              if (!tahunAjaranFromSheet) {
                console.log(`Baris ${i}: Tahun ajaran "${tahun_ajaran_str}" semester ${semester} tidak ditemukan di MasterTahunAjaran`);
                results.nilai_ujian.errors++;
                continue;
              }

              if (!tahunAjaranFromSheet.id) {
                console.log(`Baris ${i}: Periode tidak aktif untuk tahun ajaran "${tahun_ajaran_str}" semester ${semester}`);
                results.nilai_ujian.errors++;
                continue;
              }
              
              console.log(`- Tahun Ajaran ditemukan: ID=${tahunAjaranFromSheet.id}, Status=${tahunAjaranFromSheet.status}, Master ID=${tahunAjaranFromSheet.master_tahun_ajaran_id}`);

              // Get and validate nilai
              const rawNilai = getCellValue(nilaiWorksheet, i, 5);
              const finalNilai = toNumberOrNull(rawNilai);
              if (finalNilai === null || isNaN(finalNilai)) {
                console.log(`Baris ${i}: Nilai tidak valid: "${rawNilai}"`);
                results.nilai_ujian.errors++;
                continue;
              }
              console.log(`- Nilai valid: ${finalNilai}`);

              // Double check all required fields
              const payload = {
                siswa_id: siswa.id,
                mapel_id: mapel.id,
                tahun_ajaran_id: tahunAjaranFromSheet.id,
                semester: String(semester), // Ensure semester is string
                nilai: finalNilai,
                mapel_text: mapel.nama_mapel
              };

              // Validate payload
              if (!payload.siswa_id || !payload.mapel_id || !payload.tahun_ajaran_id || !payload.semester) {
                console.error(`Data tidak lengkap:`, payload);
                results.nilai_ujian.errors++;
                continue;
              }

              console.log('Menyimpan nilai ke database dengan data:', payload);

              try {
                // First check if record exists
                const existingRecord = await db.NilaiUjian.findOne({
                  where: {
                    siswa_id: payload.siswa_id,
                    mapel_id: payload.mapel_id,
                    semester: payload.semester,
                    tahun_ajaran_id: payload.tahun_ajaran_id
                  },
                  transaction
                });

                let result;
                if (existingRecord) {
                  // Update existing record
                  console.log('Updating existing nilai record:', existingRecord.id);
                  result = await existingRecord.update({
                    nilai: payload.nilai,
                    mapel_text: payload.mapel_text
                  }, { transaction });
                } else {
                  // Create new record
                  console.log('Creating new nilai record');
                  result = await db.NilaiUjian.create(payload, { 
                    transaction,
                    returning: true
                  });
                }
                
                console.log('Berhasil menyimpan nilai:', {
                  id: result.id,
                  siswa_id: payload.siswa_id,
                  mapel_id: payload.mapel_id,
                  tahun_ajaran_id: payload.tahun_ajaran_id,
                  semester: payload.semester,
                  nilai: payload.nilai
                });
                
                results.nilai_ujian.success++;
              } catch (error) {
                console.error('Error saat menyimpan nilai:', {
                  error: error.message,
                  stack: error.stack,
                  code: error.code,
                  name: error.name,
                  payload,
                  constraint: error.constraint
                });
                results.nilai_ujian.errors++;
              }
            } catch (error) {
              console.error(`Error pada baris ${i}:`, error);
              results.nilai_ujian.errors++;
            }
          }
    }

        // ========== 2. PROSES SHEET HAFALAN ==========
        const hafalanWorksheet = workbook.getWorksheet('Template Hafalan');
        if (hafalanWorksheet) {
            for (let i = 2; i <= hafalanWorksheet.rowCount; i++) {
                const nis = getCellValue(hafalanWorksheet, i, 1);
            const nama_mapel = getCellValue(hafalanWorksheet, i, 3); // Nama Mapel col 3
            const semester = getCellValue(hafalanWorksheet, i, 7); // Semester col 7
            const tahun_ajaran_str = getCellValue(hafalanWorksheet, i, 8); // Tahun Ajaran col 8
            const predikatVal = getCellValue(hafalanWorksheet, i, 6); // Predikat col 6 (dropdown)

            if (!nis || !nama_mapel) { results.hafalan.skipped++; continue; }

            const siswa = await findSiswa(nis);
            const mapel = await db.MataPelajaran.findOne({ where: { nama_mapel: nama_mapel, jenis: 'Hafalan' } });
            const tahunAjaranFromSheet = await findTahunAjaran(tahun_ajaran_str, semester);

            if (siswa && mapel) {
              const history = await getLatestHistoryForSiswa(siswa.id);
              const tahunAjaranIdToUse = history ? history.tahun_ajaran_id : (tahunAjaranFromSheet ? tahunAjaranFromSheet.id : null);

              await db.NilaiHafalan.upsert({
                siswa_id: siswa.id,
                mapel_id: mapel.id,
                tahun_ajaran_id: tahunAjaranIdToUse,
                semester,
                predikat: predikatVal || null,
                mapel_text: mapel.nama_mapel
              }, { transaction });
              results.hafalan.success++;
            } else {
              results.hafalan.errors++;
            }
            }
        }
        
        // ... (Sisa fungsi untuk sheet Kehadiran dan Sikap tetap sama)
        // ========== 3. PROSES SHEET KEHADIRAN ==========
        const kehadiranWorksheet = workbook.getWorksheet('Template Kehadiran');
        if (kehadiranWorksheet) {
            for (let i = 2; i <= kehadiranWorksheet.rowCount; i++) {
                const nis = getCellValue(kehadiranWorksheet, i, 1);
                const kegiatan_text = getCellValue(kehadiranWorksheet, i, 3);
                const tahun_ajaran_str = getCellValue(kehadiranWorksheet, i, 8);
                const semester = getCellValue(kehadiranWorksheet, i, 7);

                if (!nis || !kegiatan_text) { results.kehadiran.skipped++; continue; }

                const siswa = await findSiswa(nis);
                const indikator = await findIndikatorKehadiran(kegiatan_text);
                const tahunAjaran = await findTahunAjaran(tahun_ajaran_str, semester);
                
        if (siswa) {
          const history = await getLatestHistoryForSiswa(siswa.id);
          const tahunAjaranIdToUse = history ? history.tahun_ajaran_id : (tahunAjaran ? tahunAjaran.id : null);
          await db.Kehadiran.upsert({
            siswa_id: siswa.id,
            tahun_ajaran_id: tahunAjaranIdToUse,
            semester,
            indikatorkehadirans_id: indikator ? indikator.id : null,
            indikator_text: kegiatan_text,
            izin: parseInt(getCellValue(kehadiranWorksheet, i, 4), 10) || 0,
            sakit: parseInt(getCellValue(kehadiranWorksheet, i, 5), 10) || 0,
            absen: parseInt(getCellValue(kehadiranWorksheet, i, 6), 10) || 0,
          }, { transaction });
                    results.kehadiran.success++;
                } else {
                    results.kehadiran.errors++;
                }
            }
        }

        // ========== 4. PROSES SHEET SIKAP ==========
        const sikapWorksheet = workbook.getWorksheet('Template Sikap');
        if (sikapWorksheet) {
            for (let i = 2; i <= sikapWorksheet.rowCount; i++) {
                const nis = getCellValue(sikapWorksheet, i, 1);
        const jenis_sikap = getCellValue(sikapWorksheet, i, 3);
        const indikator_text = getCellValue(sikapWorksheet, i, 4);
        const nilai_from_excel = getCellValue(sikapWorksheet, i, 5);
        const semester = getCellValue(sikapWorksheet, i, 6);
        const tahun_ajaran_str = getCellValue(sikapWorksheet, i, 7);

        if (!nis || !indikator_text) { results.sikap.skipped++; continue; }

        const siswa = await findSiswa(nis);
        const indikator = await findIndikatorSikap(jenis_sikap, indikator_text);
        const tahunAjaranFromSheet = await findTahunAjaran(tahun_ajaran_str, semester);

        if (siswa && indikator) {
          const history = await getLatestHistoryForSiswa(siswa.id);
          const tahunAjaranIdToUse = history ? history.tahun_ajaran_id : (tahunAjaranFromSheet ? tahunAjaranFromSheet.id : null);
          const finalNilai = (nilai_from_excel !== '' && !isNaN(parseFloat(nilai_from_excel))) ? parseFloat(nilai_from_excel) : null;

          await db.Sikap.upsert({
            siswa_id: siswa.id,
            tahun_ajaran_id: tahunAjaranIdToUse,
            semester,
            indikator_sikap_id: indikator ? indikator.id : null,
            indikator_text: indikator_text,
            nilai: finalNilai,
            deskripsi: '',
          }, { transaction });
          results.sikap.success++;
        } else {
          results.sikap.errors++;
        }
            }
        }

    // ========== 5. PROSES SHEET CATATAN AKADEMIK ==========
    const catatanAkademikSheet = workbook.getWorksheet('Catatan Akademik');
    if (catatanAkademikSheet) {
      for (let i = 2; i <= catatanAkademikSheet.rowCount; i++) {
        const idSiswa = getCellValue(catatanAkademikSheet, i, 1);
        const semesterVal = getCellValue(catatanAkademikSheet, i, 3);
        const catatan = getCellValue(catatanAkademikSheet, i, 4);
        if (!idSiswa) continue;
        const siswa = await db.Siswa.findByPk(idSiswa);
        if (!siswa) continue;
        // Resolve history/tahun_ajaran and semester for this siswa
        const tahunAjaranFromSheet = null; // sheet doesn't carry tahun_ajaran id, only semester/name in download flow
        const { history, tahunAjaranIdToUse, semesterToUse, masterTaToUse } = await resolveHistoryForSiswa(siswa.id, tahunAjaranFromSheet, semesterVal);
        if (history) {
          await history.update({ catatan_akademik: catatan, semester: semesterToUse }, { transaction });
        } else {
          // create with resolved master TA and semester (do not include tahun_ajaran_id here)
          const masterTaForHist = masterTaToUse || providedMasterId || null;
          await db.SiswaKelasHistory.create({ siswa_id: siswa.id, kelas_id: siswa.kelas_id || null, master_tahun_ajaran_id: masterTaForHist, semester: semesterToUse, catatan_akademik: catatan }, { transaction });
        }
      }
    }

    // ========== 6. PROSES SHEET CATATAN SIKAP ==========
    const catatanSikapSheet = workbook.getWorksheet('Catatan Sikap');
    if (catatanSikapSheet) {
      for (let i = 2; i <= catatanSikapSheet.rowCount; i++) {
        const idSiswa = getCellValue(catatanSikapSheet, i, 1);
        const semesterVal = getCellValue(catatanSikapSheet, i, 3);
        const catatan = getCellValue(catatanSikapSheet, i, 4);
        if (!idSiswa) continue;
        const siswa = await db.Siswa.findByPk(idSiswa);
        if (!siswa) continue;
        const tahunAjaranFromSheet = null;
        const { history, tahunAjaranIdToUse, semesterToUse, masterTaToUse } = await resolveHistoryForSiswa(siswa.id, tahunAjaranFromSheet, semesterVal);
        if (history) {
          await history.update({ catatan_sikap: catatan, semester: semesterToUse }, { transaction });
        } else {
          const masterTaForHist2 = masterTaToUse || providedMasterId || null;
          await db.SiswaKelasHistory.create({ siswa_id: siswa.id, kelas_id: siswa.kelas_id || null, master_tahun_ajaran_id: masterTaForHist2, semester: semesterToUse, catatan_sikap: catatan }, { transaction });
        }
      }
    }


        await transaction.commit();
        res.status(200).json({ message: 'Data berhasil diimpor.', results });

    } catch (error) {
        await transaction.rollback();
        console.error('Error processing complete excel file:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat memproses file.', error: error.message });
    } finally {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
};
// ====================== NILAI UJIAN ======================
exports.downloadTemplate = async (req, res) => {
  try {
    const { kelas_id, tahun_ajaran, semester } = req.query;

    if (!kelas_id || !tahun_ajaran || !semester) {
      return res.status(400).json({ message: 'Parameter kelas_id, tahun_ajaran, semester wajib diisi.' });
    }

    const siswaList = await db.Siswa.findAll({ where: { kelas_id }, order: [['nama', 'ASC']] });
    const mapelList = await db.MataPelajaran.findAll({ order: [['nama_mapel', 'ASC']] });

    if (siswaList.length === 0) return res.status(404).json({ message: 'Tidak ada siswa di kelas ini.' });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Nilai Ujian');

    sheet.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Siswa', key: 'nama_siswa', width: 25 },
      { header: 'Kode Mapel', key: 'kode_mapel', width: 15 },
      { header: 'Nama Mapel', key: 'nama_mapel', width: 25 },
      { header: 'Nilai', key: 'nilai', width: 20 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 }
    ];

    let currentRow = 2;
    for (const siswa of siswaList) {
      const startRow = currentRow;
      
      for (const mapel of mapelList) {
        sheet.addRow({
          nis: '',
          nama_siswa: '',
          kode_mapel: mapel.kode_mapel || `MP${mapel.id}`,
          nama_mapel: mapel.nama_mapel,
          semester,
          tahun_ajaran
        });
        currentRow++;
      }
      
      const endRow = currentRow - 1;
      
      // Merge cells untuk NIS dan Nama
      try {
        const nisRange = `A${startRow}:A${endRow}`;
        const namaRange = `B${startRow}:B${endRow}`;
        
        sheet.mergeCells(nisRange);
        sheet.mergeCells(namaRange);
        
        sheet.getCell(`A${startRow}`).value = siswa.nis;
        sheet.getCell(`A${startRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
        
        sheet.getCell(`B${startRow}`).value = siswa.nama;
        sheet.getCell(`B${startRow}`).alignment = { vertical: 'middle', horizontal: 'left' };
        
      } catch (error) {
        console.error(`Error merging cells untuk ${siswa.nama}:`, error.message);
      }
    }

    // Apply styling
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Template_Nilai_Ujian_MergeCells.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    res.status(500).json({ message: 'Gagal membuat template nilai ujian', error: err.message });
  }
};

exports.uploadNilai = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Tidak ada file yang diupload.' });

    const filePath = req.file.path;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet('Nilai Ujian');

    let success = 0;
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const siswa = await db.Siswa.findOne({ where: { nis: row.getCell(1).value } });
      const mapel = await db.MataPelajaran.findOne({ where: { kode_mapel: row.getCell(3).value } });

        if (siswa && mapel) {
        const toNumberOrNull = (v) => {
          if (v === null || v === undefined || v === '') return null;
          const n = parseFloat(v);
          return isNaN(n) ? null : n;
        };
        const computeFinalNilai = (p, k) => {
          const a = toNumberOrNull(p);
          const b = toNumberOrNull(k);
          if (a !== null && b !== null) return (a + b) / 2;
          if (a !== null) return a;
          if (b !== null) return b;
          return null;
        };

        const p = toNumberOrNull(row.getCell(5).value);
        const k = toNumberOrNull(row.getCell(6).value);
        const finalNilai = computeFinalNilai(p, k);

        // Resolve tahun_ajaran_id from provided tahun_ajaran string (column 8) and semester (column 7)
        const tahunAjaranStr = row.getCell(8).value;
        const semesterVal = row.getCell(7).value;
        let periodeRec = null;
        try {
          periodeRec = await db.PeriodeAjaran.findOne({ where: { nama_ajaran: tahunAjaranStr, semester: semesterVal, status: 'aktif' } });
        } catch (e) { periodeRec = null; }

        await db.NilaiUjian.upsert({
          siswa_id: siswa.id,
          mapel_id: mapel.id,
          nilai: finalNilai,
          semester: semesterVal,
          tahun_ajaran_id: periodeRec ? periodeRec.id : null,
          mapel_text: mapel.nama_mapel
        });
        success++;
      }
    }
    fs.unlinkSync(filePath);
    res.json({ message: `Berhasil upload ${success} data nilai ujian.` });
  } catch (err) {
    res.status(500).json({ message: 'Gagal upload nilai ujian', error: err.message });
  }
};

// ====================== HAFALAN ======================
exports.downloadTemplateHafalan = async (req, res) => {
  try {
    const { kelas_id, tahun_ajaran, semester } = req.query;
    const siswaList = await db.Siswa.findAll({ where: { kelas_id }, order: [['nama', 'ASC']] });
    const mapelList = await db.MataPelajaran.findAll({ where: { nama_mapel: { [db.Sequelize.Op.iLike]: '%Qur%' } } });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Hafalan');
    sheet.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Siswa', key: 'nama_siswa', width: 25 },
      { header: 'Kode Mapel', key: 'kode_mapel', width: 15 },
      { header: 'Nama Mapel', key: 'nama_mapel', width: 25 },
      { header: 'Nilai Hafalan', key: 'nilai', width: 15 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 }
    ];
    for (const siswa of siswaList) {
      for (const mapel of mapelList) {
        sheet.addRow({ nis: siswa.nis, nama_siswa: siswa.nama, kode_mapel: mapel.kode_mapel, nama_mapel: mapel.nama_mapel, semester, tahun_ajaran });
      }
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Template_Hafalan.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: 'Gagal membuat template hafalan', error: err.message });
  }
};

exports.uploadHafalan = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Tidak ada file diupload.' });
    const filePath = req.file.path;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet('Hafalan');

    let success = 0;
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const siswa = await db.Siswa.findOne({ where: { nis: row.getCell(1).value } });
      const mapel = await db.MataPelajaran.findOne({ where: { kode_mapel: row.getCell(3).value } });

        if (siswa && mapel) {
          const nilaiNum = parseFloat(row.getCell(5).value);
          let predikat = null;
          if (!isNaN(nilaiNum)) predikat = (nilaiNum >= 70 ? 'Tercapai' : 'Tidak Tercapai');
          // Resolve Tahun Ajaran record if possible (try by nama and semester)
          const tahunAjaranRecord = await findTahunAjaran(row.getCell(7).value, row.getCell(6).value);
          await db.NilaiHafalan.upsert({
            siswa_id: siswa.id,
            mapel_id: mapel.id,
            tahun_ajaran_id: tahunAjaranRecord ? tahunAjaranRecord.id : null,
            semester: row.getCell(6).value,
            predikat: predikat,
            mapel_text: mapel.nama_mapel
          });
          success++;
        }
    }
    fs.unlinkSync(filePath);
    res.json({ message: `Berhasil upload ${success} data hafalan.` });
  } catch (err) {
    res.status(500).json({ message: 'Gagal upload hafalan', error: err.message });
  }
};

// ====================== KEHADIRAN ======================
exports.downloadTemplateKehadiran = async (req, res) => {
  try {
    const { kelas_id, tahun_ajaran, semester } = req.query;
    const siswaList = await db.Siswa.findAll({ where: { kelas_id }, order: [['nama', 'ASC']] });
    const indikatorList = await db.IndikatorKehadiran.findAll({ order: [['nama_kegiatan', 'ASC']] });

    if (indikatorList.length === 0) {
      return res.status(404).json({ message: 'Tidak ada data Indikator Kehadiran. Silakan tambahkan terlebih dahulu di menu Master Data.' });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Kehadiran');

    sheet.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Siswa', key: 'nama', width: 25 },
      { header: 'Kegiatan', key: 'kegiatan', width: 20 },
      { header: 'Izin', key: 'izin', width: 10 },
      { header: 'Sakit', key: 'sakit', width: 10 },
      { header: 'Absen', key: 'absen', width: 10 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 }
    ];

    let currentRow = 2;
    for (const siswa of siswaList) {
      const startRow = currentRow;
      
      for (const indikator of indikatorList) {
        sheet.addRow({
          nis: '',
          nama: '',
          kegiatan: indikator.nama_kegiatan,
          izin: 0,
          sakit: 0,
          absen: 0,
          semester,
          tahun_ajaran
        });
        currentRow++;
      }
      
      const endRow = currentRow - 1;
      
      // Merge cells
      try {
        const nisRange = `A${startRow}:A${endRow}`;
        const namaRange = `B${startRow}:B${endRow}`;
        
        sheet.mergeCells(nisRange);
        sheet.mergeCells(namaRange);
        
        sheet.getCell(`A${startRow}`).value = siswa.nis;
        sheet.getCell(`A${startRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
        
        sheet.getCell(`B${startRow}`).value = siswa.nama;
        sheet.getCell(`B${startRow}`).alignment = { vertical: 'middle', horizontal: 'left' };
        
      } catch (error) {
        console.error(`Error merging cells untuk ${siswa.nama}:`, error.message);
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Template_Kehadiran_MergeCells.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    res.status(500).json({ message: 'Gagal membuat template kehadiran', error: err.message });
  }
};


exports.uploadKehadiran = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Tidak ada file diupload.' });
    const filePath = req.file.path;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet('Kehadiran');

    let success = 0;
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const siswa = await db.Siswa.findOne({ where: { nis: row.getCell(1).value } });

      if (siswa) {
        await db.Kehadiran.upsert({
          siswaId: siswa.id,
          kegiatan: row.getCell(3).value,
          izin: parseInt(row.getCell(4).value) || 0,
          sakit: parseInt(row.getCell(5).value) || 0,
          absen: parseInt(row.getCell(6).value) || 0,
          semester: row.getCell(7).value,
          tahun_ajaran: row.getCell(8).value
        });
        success++;
      }
    }
    fs.unlinkSync(filePath);
    res.json({ message: `Berhasil upload ${success} data kehadiran.` });
  } catch (err) {
    res.status(500).json({ message: 'Gagal upload kehadiran', error: err.message });
  }
};



// ====================== SIKAP ======================
exports.downloadTemplateSikap = async (req, res) => {
  try {
    const { kelas_id, tahun_ajaran, semester } = req.query;
    const siswaList = await db.Siswa.findAll({ where: { kelas_id }, order: [['nama', 'ASC']] });
    const indikatorSpiritual = await db.IndikatorSikap.findAll({ where: { jenis_sikap: 'spiritual' } });
    const indikatorSosial = await db.IndikatorSikap.findAll({ where: { jenis_sikap: 'sosial' } });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sikap');
    sheet.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Siswa', key: 'nama', width: 25 },
      { header: 'Jenis Sikap', key: 'jenis', width: 15 },
      { header: 'Indikator', key: 'indikator', width: 30 },
      { header: 'Nilai Angka', key: 'angka', width: 15 },
      { header: 'Deskripsi', key: 'deskripsi', width: 40 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 }
    ];
    for (const siswa of siswaList) {
      for (const ind of indikatorSpiritual) {
        sheet.addRow({ nis: siswa.nis, nama: siswa.nama, jenis: 'spiritual', indikator: ind.indikator, semester, tahun_ajaran });
      }
      for (const ind of indikatorSosial) {
        sheet.addRow({ nis: siswa.nis, nama: siswa.nama, jenis: 'sosial', indikator: ind.indikator, semester, tahun_ajaran });
      }
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Template_Sikap.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: 'Gagal membuat template sikap', error: err.message });
  }
};

exports.uploadSikap = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Tidak ada file diupload.' });
    const filePath = req.file.path;5
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet('Sikap');

    let success = 0;
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const siswa = await db.Siswa.findOne({ where: { nis: row.getCell(1).value } });

      if (siswa) {
        await db.Sikap.upsert({
          siswaId: siswa.id,
          jenis_sikap: row.getCell(3).value,
          indikator: row.getCell(4).value,
          angka: parseFloat(row.getCell(5).value) || null,
          deskripsi: row.getCell(6).value || '',
          semester: row.getCell(7).value,
          tahun_ajaran: row.getCell(8).value
        });
        success++;
      }
    }
    fs.unlinkSync(filePath);
    res.json({ message: `Berhasil upload ${success} data sikap.` });
  } catch (err) {
    res.status(500).json({ message: 'Gagal upload sikap', error: err.message });
  }
};


const applySheetStyling = (sheet) => {
  // Styling untuk baris header
  const headerRow = sheet.getRow(1);
  headerRow.font = {
    bold: true,
    color: { argb: 'FFFFFFFF' } // Teks putih
  };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F81BD' } // Latar belakang biru tua
  };
  headerRow.alignment = {
    vertical: 'middle',
    horizontal: 'center'
  };

  // Menambahkan border ke semua sel, termasuk yang kosong
  sheet.eachRow({ includeEmpty: true }, function(row, rowNumber) { // PERUBAHAN: dari false menjadi true
    // Hanya proses sampai baris terakhir yang digunakan
    if (rowNumber > sheet.lastRow.number) {
        return;
    }
    row.eachCell({ includeEmpty: true }, function(cell, colNumber) { // PERUBAHAN: dari false menjadi true
        // Hanya proses sampai kolom terakhir yang punya header
        if (colNumber > sheet.columns.length) {
            return;
        }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });
};

// Fungsi untuk merge cell (jika belum ada)
const mergeCellsForStudent = (sheet, startRow, endRow, siswa) => {
  if (startRow > endRow) return;

  sheet.mergeCells(`A${startRow}:A${endRow}`);
  sheet.mergeCells(`B${startRow}:B${endRow}`);

  const nisCell = sheet.getCell(`A${startRow}`);
  nisCell.value = siswa.nis;
  nisCell.alignment = { vertical: 'middle', horizontal: 'center' };

  const namaCell = sheet.getCell(`B${startRow}`);
  namaCell.value = siswa.nama;
  namaCell.alignment = { vertical: 'middle', horizontal: 'left' };
};

// Helper untuk membersihkan nama file (jika belum ada)
const sanitizeFilename = (name) => {
    if (!name) return 'file';
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
};

exports.downloadCompleteTemplate = async (req, res) => {
    try {
        const { kelas_id, tahun_ajaran_id, tingkatan_id } = req.query;

        // Validate required parameters
        if (!tahun_ajaran_id) {
            return res.status(400).json({ message: 'Parameter tahun_ajaran_id wajib diisi.' });
        }
        if (!tingkatan_id) {
            return res.status(400).json({ message: 'Parameter tingkatan_id wajib diisi.' });
        }
        if (!kelas_id) {
            return res.status(400).json({ message: 'Parameter kelas_id wajib diisi.' });
        }

        // 1. Load PeriodeAjaran dan MasterTahunAjaran
        const tahunAjaranInfo = await db.PeriodeAjaran.findByPk(tahun_ajaran_id, { 
            include: [{
                model: db.MasterTahunAjaran,
                as: 'master',
                required: true
            }]
        });

        // 2. Validate Tingkatan
        const tingkatan = await db.Tingkatan.findByPk(tingkatan_id);
        if (!tingkatan) {
            return res.status(404).json({ message: 'Tingkatan tidak ditemukan.' });
        }

        // 3. Validate Kelas belongs to Tingkatan
        const kelas = await db.Kelas.findOne({
            where: { 
                id: kelas_id,
                tingkatan_id: tingkatan_id
            }
        });
        
        if (!kelas) {
            return res.status(404).json({ 
                message: `Kelas tidak ditemukan atau bukan bagian dari tingkatan ${tingkatan.nama_tingkatan}.`
            });
        }

        if (!tahunAjaranInfo) {
            return res.status(404).json({ message: 'Data Tahun Ajaran tidak ditemukan.' });
        }

        console.log('Debug Tahun Ajaran:', {
            periodeId: tahunAjaranInfo.id,
            periodeSemester: tahunAjaranInfo.semester,
            periodeNamaAjaran: tahunAjaranInfo.nama_ajaran,
            masterId: tahunAjaranInfo.master?.id,
            masterNamaAjaran: tahunAjaranInfo.master?.nama_ajaran
        });

        // 2. Get kelasInfo and resolve tingkatanId
        const kelasInfo = await db.Kelas.findByPk(kelas_id);
        if (!kelasInfo) {
            return res.status(404).json({ message: 'Kelas tidak ditemukan.' });
        }

        const tingkatanId = kelasInfo.tingkatan_id || kelasInfo.tingkatanId;

        // 3. Get masterTaId from tahunAjaranInfo
        const masterTaId = tahunAjaranInfo.master?.id;
        if (!masterTaId) {
            return res.status(400).json({ message: 'Data Master Tahun Ajaran tidak ditemukan untuk periode ini.' });
        }

        // 4. Verify if this class has any students in the selected period
        const hasStudentsInPeriod = await db.SiswaKelasHistory.count({
            where: {
                kelas_id,
                master_tahun_ajaran_id: masterTaId,
                semester: tahunAjaranInfo.semester
            }
        });

        console.log('Debug Kelas:', {
            kelasId: kelasInfo.id,
            kelasNama: kelasInfo.nama_kelas,
            hasStudentsInPeriod,
            masterTaId,
            semester: tahunAjaranInfo.semester
        });

        // 4. Get all students that have histories in this master tahun ajaran and are in the correct tingkatan/kelas
        const siswaList = await db.Siswa.findAll({
            where: { kelas_id },
            attributes: ['id', 'nis', 'nama'],
            include: [{
                model: db.Kelas,
                as: 'kelas',
                where: { tingkatan_id },
                required: true,
                attributes: ['id', 'nama_kelas', 'tingkatan_id']
            }, {
                model: db.SiswaKelasHistory,
                as: 'histories',
                where: {
                    master_tahun_ajaran_id: masterTaId
                },
                attributes: ['id', 'master_tahun_ajaran_id', 'semester', 'catatan_akademik', 'catatan_sikap'],
                required: true
            }],
            order: [['nama', 'ASC']]
        });

        console.log('Query Debug:', {
            params: {
                kelas_id,
                masterTaId,
                semester: tahunAjaranInfo.semester
            },
            result: {
                totalSiswa: siswaList.length,
                siswaDetails: siswaList.map(s => ({
                    id: s.id,
                    nis: s.nis,
                    nama: s.nama,
                    totalHistories: s.histories?.length || 0,
                    histories: s.histories?.map(h => ({
                        id: h.id,
                        masterId: h.master_tahun_ajaran_id,
                        semester: h.semester,
                        hasAkademik: !!h.catatan_akademik,
                        hasSikap: !!h.catatan_sikap
                    }))
                }))
            }
        });

        if (siswaList.length === 0) {
            return res.status(404).json({ 
                message: `Tidak ada riwayat siswa di kelas ini untuk tahun ajaran ${tahunAjaranInfo.master?.nama_ajaran || tahunAjaranInfo.nama_ajaran}.` 
            });
        }

  // Kurikulum table is keyed by tingkatan and master_tahun_ajaran; do not filter by semester column (doesn't exist)
  // Kurikulum is now only keyed by tingkatan_id since it defines the curriculum structure
  const kurikulumWhere = { tingkatan_id: tingkatanId };

    const kurikulumEntries = await db.Kurikulum.findAll({
      where: kurikulumWhere,
      include: [
        { model: db.MataPelajaran, as: 'mapel' },
        { model: db.Kitab, as: 'kitab' }
      ],
      order: [ [{ model: db.MataPelajaran, as: 'mapel' }, 'nama_mapel', 'ASC'] ]
    });
        
        // --- PERUBAHAN ---: Pisahkan seluruh entri kurikulum, bukan hanya mapel-nya
        const kurikulumUjian = kurikulumEntries.filter(k => k.mapel && k.mapel.jenis === 'Ujian');
        const kurikulumHafalan = kurikulumEntries.filter(k => k.mapel && k.mapel.jenis === 'Hafalan');
        
        const indikatorKehadiran = await db.IndikatorKehadiran.findAll({ where: { is_active: true }, order: [['nama_kegiatan', 'ASC']] });
        const indikatorSikap = await db.IndikatorSikap.findAll({ where: { is_active: true }, order: [['jenis_sikap', 'ASC'], ['indikator', 'ASC']] });

        const workbook = new ExcelJS.Workbook();

  // 2. Create "Template Nilai Ujian" Sheet
        const sheetNilai = workbook.addWorksheet('Template Nilai Ujian');
    sheetNilai.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Siswa', key: 'nama', width: 25 },
      { header: 'Nama Mapel', key: 'nama_mapel', width: 25 },
      { header: 'Kitab', key: 'kitab', width: 20 }, // --- PERUBAHAN ---: Tambah kolom Kitab
      { header: 'Nilai', key: 'nilai', width: 15 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 },
    ];
        let currentRowNilai = 2;
        siswaList.forEach(siswa => {
            const startRow = currentRowNilai;
            // --- PERUBAHAN ---: Loop melalui kurikulumUjian
            kurikulumUjian.forEach(kurikulum => {
                sheetNilai.addRow({
                    nama_mapel: kurikulum.mapel.nama_mapel,
                    kitab: kurikulum.kitab ? kurikulum.kitab.nama_kitab : '-', // --- PERUBAHAN ---: Isi nama kitab
                    semester: tahunAjaranInfo.semester,
          tahun_ajaran: (tahunAjaranInfo.master && tahunAjaranInfo.master.nama_ajaran) || tahunAjaranInfo.nama_ajaran
                });
                currentRowNilai++;
            });
            mergeCellsForStudent(sheetNilai, startRow, currentRowNilai - 1, siswa);
        });
        applySheetStyling(sheetNilai);

        // 3. Create "Template Hafalan" Sheet
        const sheetHafalan = workbook.addWorksheet('Template Hafalan');
    sheetHafalan.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Siswa', key: 'nama', width: 25 },
      { header: 'Nama Mapel', key: 'nama_mapel', width: 25 },
      { header: 'Kitab', key: 'kitab', width: 20 }, // Tambah kolom Kitab
      { header: 'Batas Hafalan', key: 'batas_hafalan', width: 20 }, // Tambah kolom batas_hafalan
      { header: 'Predikat', key: 'predikat', width: 15 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 },
    ];
        let currentRowHafalan = 2;
        siswaList.forEach(siswa => {
            const startRow = currentRowHafalan;
            // --- PERUBAHAN ---: Loop melalui kurikulumHafalan
            kurikulumHafalan.forEach(kurikulum => {
                sheetHafalan.addRow({
                    nis: siswa.nis,
                    nama: siswa.nama,
                    nama_mapel: kurikulum.mapel.nama_mapel,
          kitab: kurikulum.kitab ? kurikulum.kitab.nama_kitab : '-',
          batas_hafalan: kurikulum.batas_hafalan ?? '',
          semester: tahunAjaranInfo.semester,
          tahun_ajaran: (tahunAjaranInfo.master && tahunAjaranInfo.master.nama_ajaran) || tahunAjaranInfo.nama_ajaran
        });
                currentRowHafalan++;
            });
            mergeCellsForStudent(sheetHafalan, startRow, currentRowHafalan - 1, siswa);
        });
    // Apply data validation for Predikat column (F) - use values from NilaiHafalan model
    const predikatList = ['Tercapai', 'Tidak Tercapai'];
    for (let r = 2; r <= sheetHafalan.rowCount; r++) {
      const cell = sheetHafalan.getCell(`F${r}`);
      try {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${predikatList.join(',')}"`],
          showErrorMessage: true,
          errorTitle: 'Nilai tidak valid',
          error: 'Pilih salah satu: Tercapai atau Tidak Tercapai'
        };
      } catch (e) {
        // ignore failures on dataValidation for unsupported cells
      }
    }
    applySheetStyling(sheetHafalan);
        
        // ... (Sisa fungsi untuk sheet Kehadiran dan Sikap tetap sama)
        // 4. Create "Template Kehadiran" Sheet
        const sheetKehadiran = workbook.addWorksheet('Template Kehadiran');
        sheetKehadiran.columns = [
            { header: 'NIS', key: 'nis', width: 15 },
            { header: 'Nama Siswa', key: 'nama', width: 25 },
            { header: 'Kegiatan', key: 'kegiatan', width: 25 },
            { header: 'Izin', key: 'izin', width: 10 },
            { header: 'Sakit', key: 'sakit', width: 10 },
            { header: 'Absen', key: 'absen', width: 10 },
            { header: 'Semester', key: 'semester', width: 12 },
            { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 },
        ];
        let currentRowKehadiran = 2;
        siswaList.forEach(siswa => {
            const startRow = currentRowKehadiran;
            indikatorKehadiran.forEach(ind => {
                sheetKehadiran.addRow({
                    nis: siswa.nis,
                    nama: siswa.nama,
                    kegiatan: ind.nama_kegiatan,
                    semester: tahunAjaranInfo.semester,
                    tahun_ajaran: tahunAjaranInfo.nama_ajaran
                });
                currentRowKehadiran++;
            });
            mergeCellsForStudent(sheetKehadiran, startRow, currentRowKehadiran - 1, siswa);
        });
        applySheetStyling(sheetKehadiran);

        // 5. Create "Template Sikap" Sheet
        const sheetSikap = workbook.addWorksheet('Template Sikap');
    sheetSikap.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Siswa', key: 'nama', width: 25 },
      { header: 'Jenis Sikap', key: 'jenis', width: 15 },
      { header: 'Indikator', key: 'indikator', width: 30 },
      { header: 'Nilai', key: 'nilai', width: 10 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 15 },
    ];
        let currentRowSikap = 2;
        siswaList.forEach(siswa => {
            const startRow = currentRowSikap;
            indikatorSikap.forEach(ind => {
                sheetSikap.addRow({
                    nis: siswa.nis,
                    nama: siswa.nama,
                    jenis: ind.jenis_sikap,
                    indikator: ind.indikator,
                    semester: tahunAjaranInfo.semester,
                    tahun_ajaran: tahunAjaranInfo.nama_ajaran
                });
                currentRowSikap++;
            });
            const endRow = currentRowSikap - 1;
      // Gabungkan sel NIS dan Nama
      mergeCellsForStudent(sheetSikap, startRow, endRow, siswa);
        });
        applySheetStyling(sheetSikap);

    // ========== 7. Create "Catatan Akademik" and "Catatan Sikap" Sheets ==========
    // Query Siswa with included histories filtered by master_tahun_ajaran_id and semester
    const historyInclude = {
      model: db.SiswaKelasHistory,
      as: 'histories',
      where: {
        master_tahun_ajaran_id: masterTaId, // use existing masterTaId from above
        semester: tahunAjaranInfo.semester
      },
      required: false,
      include: [{ 
        model: db.MasterTahunAjaran, 
        as: 'masterTahunAjaran', 
        attributes: ['id', 'nama_ajaran'], 
        required: false 
      }]
    };

    const siswaWithHistories = await db.Siswa.findAll({
      where: { kelas_id },
      order: [['nama', 'ASC']],
      include: [historyInclude]
    });

    // Catatan Akademik sheet
    const sheetCatatanAkademik = workbook.addWorksheet('Catatan Akademik');
    sheetCatatanAkademik.columns = [
      { header: 'ID Siswa', key: 'id', width: 12 },
      { header: 'Nama Siswa', key: 'nama', width: 30 },
      { header: 'Semester', key: 'semester', width: 10 },
      { header: 'Catatan Akademik', key: 'catatan_akademik', width: 60 }
    ];

    // Catatan Sikap sheet
    const sheetCatatanSikap = workbook.addWorksheet('Catatan Sikap');
    sheetCatatanSikap.columns = [
      { header: 'ID Siswa', key: 'id', width: 12 },
      { header: 'Nama Siswa', key: 'nama', width: 30 },
      { header: 'Semester', key: 'semester', width: 10 },
      { header: 'Catatan Sikap', key: 'catatan_sikap', width: 60 }
    ];

    // Fill data untuk setiap worksheet
    console.log('Starting Excel population...');
    let rowCount = 0;

    for (const siswa of siswaList) {
        // Ambil history yang sesuai dengan semester ini
        const siswaHistory = siswa.histories.find(h => h.semester === tahunAjaranInfo.semester) || siswa.histories[0];
        
        console.log('Processing Siswa:', {
            id: siswa.id,
            nama: siswa.nama,
            selectedHistory: siswaHistory ? {
                id: siswaHistory.id,
                semester: siswaHistory.semester,
                catatan_akademik: siswaHistory.catatan_akademik || '(kosong)',
                catatan_sikap: siswaHistory.catatan_sikap || '(kosong)'
            } : 'No history found'
        });

        // Add header row if first row
        if (rowCount === 0) {
            sheetCatatanAkademik.getRow(1).values = ['ID Siswa', 'Nama Siswa', 'Semester', 'Catatan Akademik'];
            sheetCatatanSikap.getRow(1).values = ['ID Siswa', 'Nama Siswa', 'Semester', 'Catatan Sikap'];
            rowCount++;
        }

        // Isi Catatan Akademik
        const akademikRow = sheetCatatanAkademik.addRow({
            id: siswa.id,
            nama: siswa.nama,
            semester: tahunAjaranInfo.semester,
            catatan_akademik: siswaHistory?.catatan_akademik || ''
        });
        akademikRow.commit();

        // Isi Catatan Sikap
        const sikapRow = sheetCatatanSikap.addRow({
            id: siswa.id,
            nama: siswa.nama,
            semester: tahunAjaranInfo.semester,
            catatan_sikap: siswaHistory?.catatan_sikap || ''
        });
        sikapRow.commit();
    }

    // Apply styling to the new sheets
    applySheetStyling(sheetCatatanAkademik);
    applySheetStyling(sheetCatatanSikap);

        // 6. Send the file
  const masterName = (tahunAjaranInfo.master && tahunAjaranInfo.master.nama_ajaran) || tahunAjaranInfo.nama_ajaran || 'TA';
  const fileName = `Template-Lengkap-${sanitizeFilename(kelasInfo.nama_kelas)}-Semester-${tahunAjaranInfo.semester}-${sanitizeFilename(masterName)}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        
        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('Error creating complete template:', err);
        res.status(500).json({ message: 'Gagal membuat template lengkap', error: err.message });
    }
};
