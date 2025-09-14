const ExcelJS = require('exceljs');
const path = require('path');
const db = require('../models');
const { parseExcelFile } = require('../controllers/excelParser');
const fs = require('fs');

describe('Excel Import Tests', () => {
  let workbook;
  const testFilePath = path.join(__dirname, 'test-data.xlsx');

  beforeAll(async () => {
    // Create test Excel file
    workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Template Nilai Ujian');
    
    // Add headers
    sheet.columns = [
      { header: 'NIS', key: 'nis' },
      { header: 'Nama', key: 'nama' },
      { header: 'Nama Mapel', key: 'nama_mapel' },
      { header: 'Kitab', key: 'kitab' },
      { header: 'Nilai', key: 'nilai' },
      { header: 'Semester', key: 'semester' },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran' }
    ];

    // Add test data
    const testData = [
      {
        nis: '1234',
        nama: 'Test Siswa 1',
        nama_mapel: 'Matematika',
        kitab: 'Kitab Mat 1',
        nilai: 85,
        semester: '1',
        tahun_ajaran: '2025/2026'
      },
      {
        nis: '1234',
        nama: 'Test Siswa 1',
        nama_mapel: 'Bahasa Arab',
        kitab: 'Kitab Arab 1',
        nilai: 90,
        semester: '1',
        tahun_ajaran: '2025/2026'
      },
      // Test case dengan nama mapel yang ada spasi ekstra
      {
        nis: '1235',
        nama: 'Test Siswa 2',
        nama_mapel: ' Matematika ',  // dengan spasi ekstra
        kitab: 'Kitab Mat 1',
        nilai: 75,
        semester: '1',
        tahun_ajaran: '2025/2026'
      },
      // Test case dengan semester invalid
      {
        nis: '1235',
        nama: 'Test Siswa 2',
        nama_mapel: 'Bahasa Arab',
        kitab: 'Kitab Arab 1',
        nilai: 80,
        semester: '3', // invalid semester
        tahun_ajaran: '2025/2026'
      }
    ];

    testData.forEach(data => {
      sheet.addRow(data);
    });

    // Save test file
    await workbook.xlsx.writeFile(testFilePath);
  });

  afterAll(async () => {
    // Cleanup test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  test('should parse valid nilai ujian data correctly', async () => {
    const result = await parseExcelFile(testFilePath);
    
    // Check first student data
    expect(result['1234']).toBeDefined();
    expect(result['1234'].nilai_ujian).toHaveLength(2);
    expect(result['1234'].nilai_ujian[0]).toEqual(
      expect.objectContaining({
        nama_mapel: 'Matematika',
        nilai: 85,
        semester: '1',
        tahun_ajaran: '2025/2026'
      })
    );

    // Verify nama_mapel trimming
    const siswa2NilaiMatematika = result['1235'].nilai_ujian
      .find(n => n.nama_mapel.trim() === 'Matematika');
    expect(siswa2NilaiMatematika).toBeDefined();
    expect(siswa2NilaiMatematika.nama_mapel).toBe('Matematika');

    // Verify invalid semester is rejected
    const invalidSemesterNilai = result['1235'].nilai_ujian
      .find(n => n.semester === '3');
    expect(invalidSemesterNilai).toBeUndefined();
  });

  test('should validate semester values', async () => {
    const result = await parseExcelFile(testFilePath);
    
    // Check all parsed nilai have valid semester
    Object.values(result).forEach(siswa => {
      siswa.nilai_ujian.forEach(nilai => {
        expect(['1', '2']).toContain(nilai.semester);
      });
    });
  });

  test('should handle nilai conversion correctly', async () => {
    const result = await parseExcelFile(testFilePath);
    
    Object.values(result).forEach(siswa => {
      siswa.nilai_ujian.forEach(nilai => {
        expect(typeof nilai.nilai).toBe('number');
        expect(nilai.nilai).toBeGreaterThanOrEqual(0);
        expect(nilai.nilai).toBeLessThanOrEqual(100);
      });
    });
  });
});