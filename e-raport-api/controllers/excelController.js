const ExcelJS = require('exceljs');
const { Siswa, MataPelajaran, IndikatorSikap, Kelas, WaliKelas } = require('../models');

// Fungsi untuk mengunduh template Excel dinamis
exports.downloadTemplate = async (req, res) => {
    try {
        const { kelas_id, wali_kelas_id } = req.query;

        let whereClause = {};
        if (kelas_id) {
            whereClause.kelas_id = kelas_id;
        } else if (wali_kelas_id) {
            const kelas = await Kelas.findOne({ where: { wali_kelas_id } });
            if (kelas) {
                whereClause.kelas_id = kelas.id;
            } else {
                return res.status(404).json({ message: "Tidak ada kelas yang diasosiasikan dengan wali kelas ini." });
            }
        } else {
            return res.status(400).json({ message: "Silakan pilih filter berdasarkan kelas atau wali kelas." });
        }

        const students = await Siswa.findAll({ where: whereClause, order: [['nama', 'ASC']] });
        if (students.length === 0) {
            return res.status(404).json({ message: "Tidak ada siswa yang ditemukan untuk filter yang dipilih." });
        }

        // Mengambil data master untuk membuat kolom dinamis
        const subjects = await MataPelajaran.findAll({ order: [['id', 'ASC']] });
        const spiritualIndicators = await IndikatorSikap.findAll({ where: { jenis_sikap: 'spiritual' }, order: [['id', 'ASC']] });
        const socialIndicators = await IndikatorSikap.findAll({ where: { jenis_sikap: 'sosial' }, order: [['id', 'ASC']] });

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'E-Raport System';
        workbook.created = new Date();

        // ========== Sheet 1: Nilai Raport ==========
        const nilaiSheet = workbook.addWorksheet('Nilai Raport');
        
        // --- Header Dasar ---
        let nilaiColumns = [
            { header: 'NIS', key: 'nis', width: 15 },
            { header: 'Nama Siswa', key: 'nama', width: 30 },
        ];

        // --- Kolom Dinamis untuk Nilai Ujian ---
        subjects.forEach(subject => {
            nilaiColumns.push({ header: `${subject.nama_mapel} - Kitab`, key: `mapel_kitab_${subject.id}`, width: 20 });
            nilaiColumns.push({ header: `${subject.nama_mapel} - Pengetahuan`, key: `mapel_p_${subject.id}`, width: 25 });
            nilaiColumns.push({ header: `${subject.nama_mapel} - Keterampilan`, key: `mapel_k_${subject.id}`, width: 25 });
        });
        
        // --- Kolom Dinamis untuk Nilai Hafalan ---
        subjects.forEach(subject => {
            nilaiColumns.push({ header: `${subject.nama_mapel} - Hafalan`, key: `hafalan_${subject.id}`, width: 25 });
        });

        // --- Kolom untuk Ketidakhadiran ---
        nilaiColumns.push({ header: 'Sakit', key: 'sakit', width: 10 });
        nilaiColumns.push({ header: 'Izin', key: 'izin', width: 10 });
        nilaiColumns.push({ header: 'Tanpa Keterangan', key: 'alpha', width: 20 });

        nilaiSheet.columns = nilaiColumns;

        // Menambahkan baris siswa
        students.forEach(student => {
            nilaiSheet.addRow({ nis: student.nis, nama: student.nama });
        });


        // ========== Sheet 2: Nilai Sikap ==========
        const sikapSheet = workbook.addWorksheet('Nilai Sikap');
        const sikapColumns = [
            { header: 'NIS', key: 'nis', width: 15 },
            { header: 'Nama Siswa', key: 'nama', width: 30 },
        ];

        // --- Kolom Dinamis untuk Sikap Spiritual ---
        spiritualIndicators.forEach(indicator => {
            sikapColumns.push({ header: `Spiritual: ${indicator.indikator}`, key: `spirit_nilai_${indicator.id}`, width: 30 });
            sikapColumns.push({ header: `Deskripsi Spiritual: ${indicator.indikator}`, key: `spirit_desk_${indicator.id}`, width: 40 });
        });

        // --- Kolom Dinamis untuk Sikap Sosial ---
        socialIndicators.forEach(indicator => {
            sikapColumns.push({ header: `Sosial: ${indicator.indikator}`, key: `sosial_nilai_${indicator.id}`, width: 30 });
            sikapColumns.push({ header: `Deskripsi Sosial: ${indicator.indikator}`, key: `sosial_desk_${indicator.id}`, width: 40 });
        });
        
        sikapSheet.columns = sikapColumns;

        // Menambahkan baris siswa
        students.forEach(student => {
            sikapSheet.addRow({ nis: student.nis, nama: student.nama });
        });


        // ========== Kirim File ke Client ==========
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + 'Template-Input-Nilai.xlsx');
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Error generating Excel template:", error);
        res.status(500).json({ message: "Gagal men-generate template Excel.", error: error.message });
    }
};

// Fungsi untuk mengunggah dan memproses Excel (nama disesuaikan)
exports.uploadExcel = async (req, res) => {
    // Logika untuk memproses file Excel yang diunggah akan ditempatkan di sini.
    // Ini akan membaca nilai dari kolom-kolom dinamis, menghitung predikat, jumlah, rata-rata, dll.
    res.status(501).send({ message: 'Fungsi upload belum diimplementasikan.' });
};
