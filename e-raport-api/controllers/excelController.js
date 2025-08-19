const ExcelJS = require('exceljs');
const { Siswa, MataPelajaran, IndikatorSikap, Kelas } = require('../models');

exports.downloadTemplate = async (req, res) => {
    try {
        const { kelas_id, wali_kelas_id } = req.query;

        let whereClause = {};
        if (kelas_id) {
            whereClause.kelas_id = kelas_id;
        } else if (wali_kelas_id) {
            const kelas = await Kelas.findOne({ where: { wali_kelas_id } });
            if (kelas) whereClause.kelas_id = kelas.id;
            else return res.status(404).json({ message: "Tidak ada kelas untuk wali kelas ini." });
        } else {
            return res.status(400).json({ message: "Filter kelas atau wali kelas diperlukan." });
        }

        const students = await Siswa.findAll({ where: whereClause, order: [['nama', 'ASC']] });
        if (students.length === 0) {
            return res.status(404).json({ message: "Tidak ada siswa di filter yang dipilih." });
        }

        const subjects = await MataPelajaran.findAll({ order: [['id', 'ASC']] });
        const spiritualIndicators = await IndikatorSikap.findAll({ where: { jenis_sikap: 'spiritual' }, order: [['id', 'ASC']] });
        const socialIndicators = await IndikatorSikap.findAll({ where: { jenis_sikap: 'sosial' }, order: [['id', 'ASC']] });

        const workbook = new ExcelJS.Workbook();
        
        // Sheet 1: Nilai Raport
        const nilaiSheet = workbook.addWorksheet('Nilai Raport');
        let nilaiColumns = [
            { header: 'NIS', key: 'nis', width: 15 },
            { header: 'Nama Siswa', key: 'nama', width: 30 },
        ];
        subjects.forEach(s => {
            nilaiColumns.push({ header: `${s.nama_mapel} - Kitab`, key: `mapel_kitab_${s.id}`, width: 20 });
            nilaiColumns.push({ header: `${s.nama_mapel} - Pengetahuan`, key: `mapel_p_${s.id}`, width: 25 });
            nilaiColumns.push({ header: `${s.nama_mapel} - Keterampilan`, key: `mapel_k_${s.id}`, width: 25 });
        });
        subjects.forEach(s => {
            nilaiColumns.push({ header: `${s.nama_mapel} - Hafalan`, key: `hafalan_${s.id}`, width: 25 });
        });
        nilaiColumns.push({ header: 'Sakit', key: 'sakit', width: 10 });
        nilaiColumns.push({ header: 'Izin', key: 'izin', width: 10 });
        nilaiColumns.push({ header: 'Tanpa Keterangan', key: 'alpha', width: 20 });
        nilaiSheet.columns = nilaiColumns;
        students.forEach(student => nilaiSheet.addRow({ nis: student.nis, nama: student.nama }));

        // Sheet 2: Nilai Sikap
        const sikapSheet = workbook.addWorksheet('Nilai Sikap');
        let sikapColumns = [
            { header: 'NIS', key: 'nis', width: 15 },
            { header: 'Nama Siswa', key: 'nama', width: 30 },
        ];
        spiritualIndicators.forEach(i => {
            sikapColumns.push({ header: `Spiritual: ${i.indikator}`, key: `spirit_nilai_${i.id}`, width: 30 });
            sikapColumns.push({ header: `Deskripsi Spiritual: ${i.indikator}`, key: `spirit_desk_${i.id}`, width: 40 });
        });
        socialIndicators.forEach(i => {
            sikapColumns.push({ header: `Sosial: ${i.indikator}`, key: `sosial_nilai_${i.id}`, width: 30 });
            sikapColumns.push({ header: `Deskripsi Sosial: ${i.indikator}`, key: `sosial_desk_${i.id}`, width: 40 });
        });
        sikapSheet.columns = sikapColumns;
        students.forEach(student => sikapSheet.addRow({ nis: student.nis, nama: student.nama }));

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Template-Input-Nilai.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ message: "Gagal men-generate template Excel.", error: error.message });
    }
};

exports.uploadExcel = async (req, res) => {
    res.status(501).send({ message: 'Fungsi upload belum diimplementasikan.' });
};
