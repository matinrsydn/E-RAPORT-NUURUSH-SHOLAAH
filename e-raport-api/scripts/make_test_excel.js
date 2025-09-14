const ExcelJS = require('exceljs');
const path = require('path');

async function make() {
  const wb = new ExcelJS.Workbook();

  // Template Nilai Ujian
  const s1 = wb.addWorksheet('Template Nilai Ujian');
  s1.addRow(['NIS','Nama','Mapel','Kitab','Nilai','','Semester','Tahun Ajaran']);
  s1.addRow(['12345','Budi','Matematika','Kitab A',90,'',1,'2024/2025']);

  // Template Hafalan
  const s2 = wb.addWorksheet('Template Hafalan');
  s2.addRow(['NIS','Nama','Mapel','Kitab','Nilai Angka','','Semester','Tahun Ajaran']);
  s2.addRow(['12345','Budi','Hafalan X','Kitab B',85,'',1,'2024/2025']);

  // Template Kehadiran
  const s3 = wb.addWorksheet('Template Kehadiran');
  s3.addRow(['NIS','Nama','Kegiatan','Izin','Sakit','Absen']);
  s3.addRow(['12345','Budi','Mengaji',1,0,0]);

  // Template Sikap
  const s4 = wb.addWorksheet('Template Sikap');
  s4.addRow(['NIS','Nama','Jenis Sikap','Indikator','Nilai','Catatan Wali Kelas']);
  s4.addRow(['12345','Budi','Akhlak','Tanggung Jawab',4,'Baik dalam menjaga kebersihan']);

  const out = path.join(__dirname, '..', 'tmp', `test_upload_${Date.now()}.xlsx`);
  await wb.xlsx.writeFile(out);
  console.log('Wrote test file at', out);
}

make().catch(err=>{console.error(err); process.exit(1) });
