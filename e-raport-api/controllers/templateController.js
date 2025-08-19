const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const DocxMerger = require('docx-merger');
const db = require('../models');
const multer = require("multer");
const fs = require("fs");
const path = require('path');
const ExcelJS = require('exceljs');

// --- Helper Functions ---

const formatTanggal = (tanggal) => {
    if (!tanggal) return '-';
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const date = new Date(tanggal);
    return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
};

const nilaiKePredikat = (angka) => {
    if (angka >= 93) return 'Istimewa';
    if (angka >= 85) return 'Baik Sekali';
    if (angka >= 75) return 'Baik';
    if (angka < 75) return 'Cukup';
    return '-';
};

const nilaiSikapKePredikat = (angka) => {
    if (angka > 8.0) return 'Baik Sekali';
    if (angka > 7.0) return 'Baik';
    if (angka > 6.0) return 'Cukup';
    if (angka <= 6.0) return 'Kurang';
    return '-';
};

// --- Multer Configuration for Template Uploads ---

const templateStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/templates/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '.docx');
    }
});

const uploadTemplatesMulter = multer({ storage: templateStorage }).fields([
    { name: 'identitas', maxCount: 1 },
    { name: 'nilai', maxCount: 1 },
    { name: 'sikap', maxCount: 1 }
]);

// --- Controller Functions ---

exports.uploadTemplates = (req, res) => {
    uploadTemplatesMulter(req, res, (err) => {
        if (err) return res.status(500).json({ message: 'Gagal mengunggah file.', error: err });
        res.status(200).json({ message: 'Template berhasil diunggah.' });
    });
};

exports.generateExcelTemplate = async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        // Sheet Nilai Ujian
        const nilaiUjianSheet = workbook.addWorksheet('Nilai Ujian');
        nilaiUjianSheet.columns = [
            { header: 'NIS', key: 'nis', width: 15 }, { header: 'Nama Mapel', key: 'nama_mapel', width: 30 },
            { header: 'Pengetahuan Angka', key: 'pengetahuan_angka', width: 20 }, { header: 'Keterampilan Angka', key: 'keterampilan_angka', width: 20 },
        ];
        nilaiUjianSheet.addRow({ nis: '12345', nama_mapel: 'Matematika', pengetahuan_angka: 85, keterampilan_angka: 90 });
        // Sheet Nilai Hafalan
        const nilaiHafalanSheet = workbook.addWorksheet('Nilai Hafalan');
        nilaiHafalanSheet.columns = [
            { header: 'NIS', key: 'nis', width: 15 }, { header: 'Nama Mapel Hafalan', key: 'nama_mapel', width: 30 },
            { header: 'Nilai Angka', key: 'nilai_angka', width: 15 },
        ];
        nilaiHafalanSheet.addRow({ nis: '12345', nama_mapel: 'Juz Amma', nilai_angka: 95 });
        // Sheet Sikap
        const sikapSheet = workbook.addWorksheet('Sikap');
        sikapSheet.columns = [
            { header: 'NIS', key: 'nis', width: 15 }, { header: 'Jenis Sikap (Spiritual/Sosial)', key: 'jenis_sikap', width: 30 },
            { header: 'Indikator', key: 'indikator', width: 40 }, { header: 'Angka', key: 'angka', width: 10 }, { header: 'Deskripsi', key: 'deskripsi', width: 50 },
        ];
        sikapSheet.addRow({ nis: '12345', jenis_sikap: 'Spiritual', indikator: 'Ketaatan Beribadah', angka: 8.5, deskripsi: 'Siswa menunjukkan ketaatan yang baik.' });
        // Sheet Kehadiran
        const kehadiranSheet = workbook.addWorksheet('Kehadiran');
        kehadiranSheet.columns = [
            { header: 'NIS', key: 'nis', width: 15 }, { header: 'Kegiatan', key: 'kegiatan', width: 30 },
            { header: 'Izin', key: 'izin', width: 10 }, { header: 'Sakit', key: 'sakit', width: 10 }, { header: 'Absen', key: 'absen', width: 10 },
        ];
        kehadiranSheet.addRow({ nis: '12345', kegiatan: 'Kegiatan Belajar Mengajar', izin: 1, sakit: 2, absen: 0 });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Template_Nilai_Raport.xlsx');
        await workbook.xlsx.write(res);
        res.status(200).end();
    } catch (error) {
        res.status(500).json({ message: 'Gagal membuat template Excel.', error: error.message });
    }
};

exports.generateIdentitas = async (req, res) => {
    try {
        const { siswaId } = req.params;
        // PERBAIKAN: Menggunakan model dan alias yang benar ('kepala_pesantren')
        const siswa = await db.Siswa.findByPk(siswaId, { 
            include: [
                { model: db.WaliKelas, as: 'wali_kelas' },
                { model: db.KepalaPesantren, as: 'kepala_pesantren' }
            ] 
        });
        if (!siswa) return res.status(404).json({ message: 'Data siswa tidak ditemukan.' });

        // PERBAIKAN: Mengambil data dari relasi 'kepala_pesantren'
        const templateData = {
            nama: siswa.nama || '', no_induk: siswa.nis || '', ttl: `${siswa.tempat_lahir || ''}, ${formatTanggal(siswa.tanggal_lahir)}`,
            jk: siswa.jenis_kelamin || '', agama: siswa.agama || '', alamat: siswa.alamat || '',
            nama_ayah: siswa.nama_ayah || '', kerja_ayah: siswa.pekerjaan_ayah || '', alamat_ayah: siswa.alamat_ayah || '',
            nama_ibu: siswa.nama_ibu || '', kerja_ibu: siswa.pekerjaan_ibu || '', alamat_ibu: siswa.alamat_ibu || '',
            nama_wali: siswa.nama_wali || '', kerja_wali: siswa.pekerjaan_wali || '', alamat_wali: siswa.alamat_wali || '',
            // Menggunakan 'kepsek' dan 'nip_kepsek' sebagai placeholder di template, tapi sumber datanya dari 'kepala_pesantren'
            kepsek: siswa.kepala_pesantren ? siswa.kepala_pesantren.nama : '_________________',
            nip_kepsek: siswa.kepala_pesantren ? siswa.kepala_pesantren.nip : '_________________',
            tgl_raport: formatTanggal(new Date())
        };

        // PERBAIKAN: Path yang benar dari 'controllers' ke 'uploads' adalah naik satu level ('../')
        const templatePath = path.join(__dirname, '../uploads/templates/identitas.docx');
        if (!fs.existsSync(templatePath)) return res.status(404).json({ message: "Template 'identitas.docx' tidak ditemukan." });
        
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => "" });
        doc.render(templateData);
        const buffer = doc.getZip().generate({ type: 'nodebuffer' });

        res.setHeader('Content-Disposition', `attachment; filename=Identitas_${siswa.nama}.docx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buffer);
    } catch (error) {
        console.error("Gagal membuat file identitas:", error);
        res.status(500).json({ message: 'Gagal membuat file identitas.', error: error.message });
    }
};

exports.generateRaport = async (req, res) => {
    const { siswaId, semester, tahun_ajaran } = req.params;
    try {
        const siswa = await db.Siswa.findOne({
            where: { id: siswaId },
            include: [
                { model: db.WaliKelas, as: 'wali_kelas' },
                { model: db.KepalaPesantren, as: 'kepala_pesantren' },
                { model: db.NilaiUjian, as: 'nilai_ujian', where: { semester, tahun_ajaran }, required: false, include: { model: db.MataPelajaran, as: 'mapel' } },
                { model: db.NilaiHafalan, as: 'nilai_hafalan', where: { semester, tahun_ajaran }, required: false, include: { model: db.MataPelajaran, as: 'mapel' } },
                { model: db.Sikap, as: 'sikap', where: { semester, tahun_ajaran }, required: false },
                { model: db.Kehadiran, as: 'kehadiran', where: { semester, tahun_ajaran }, required: false },
            ]
        });

        if (!siswa) return res.status(404).json({ message: 'Data siswa tidak ditemukan.' });

        // PERBAIKAN: Destructuring dari 'kepala_pesantren' bukan 'kepala_sekolah'
        const { wali_kelas = {}, kepala_pesantren = {} } = siswa;
        const nilai_ujian = siswa.nilai_ujian || [];
        const jumlahMapel = nilai_ujian.length || 1;
        const jumlahPengetahuan = nilai_ujian.reduce((sum, m) => sum + m.pengetahuan_angka, 0);
        const rataRataPengetahuan = (jumlahPengetahuan / jumlahMapel).toFixed(1);
        const jumlahKeterampilan = nilai_ujian.reduce((sum, m) => sum + m.keterampilan_angka, 0);
        const rataRataKeterampilan = (jumlahKeterampilan / jumlahMapel).toFixed(1);
        const rataRataUjian = ((jumlahPengetahuan + jumlahKeterampilan) / (jumlahMapel * 2) || 0).toFixed(1);
        
        const sikap_spiritual = siswa.sikap.filter(s => s.jenis_sikap === 'Spiritual');
        const sikap_sosial = siswa.sikap.filter(s => s.jenis_sikap === 'Sosial');
        const rataSikapSpiritual = (sikap_spiritual.reduce((sum, s) => sum + s.angka, 0) / (sikap_spiritual.length || 1)).toFixed(1);
        const rataSikapSosial = (sikap_sosial.reduce((sum, s) => sum + s.angka, 0) / (sikap_sosial.length || 1)).toFixed(1);

        const templateData = {
            nama: siswa.nama, no_induk: siswa.nis, ttl: `${siswa.tempat_lahir}, ${formatTanggal(siswa.tanggal_lahir)}`, jk: siswa.jenis_kelamin, agama: siswa.agama, alamat: siswa.alamat,
            nama_ayah: siswa.nama_ayah, kerja_ayah: siswa.pekerjaan_ayah, alamat_ayah: siswa.alamat_ayah, nama_ibu: siswa.nama_ibu, kerja_ibu: siswa.pekerjaan_ibu, alamat_ibu: siswa.alamat_ibu,
            nama_wali: siswa.nama_wali, kerja_wali: siswa.pekerjaan_wali, alamat_wali: siswa.alamat_wali, kelas: siswa.kelas, semester, thn_ajaran: tahun_ajaran,
            // PERBAIKAN: Mengambil nama dari variabel 'kepala_pesantren'
            wali_kelas: wali_kelas.nama || '', kepsek: kepala_pesantren.nama || '', tgl_raport: formatTanggal(new Date()),
            mapel: nilai_ujian.map((m, i) => ({ no: i + 1, nama_mapel: m.mapel.nama_mapel, kitab: m.mapel.kitab, p_angka: m.pengetahuan_angka, p_predikat: nilaiKePredikat(m.pengetahuan_angka), k_angka: m.keterampilan_angka, k_predikat: nilaiKePredikat(m.keterampilan_angka) })),
            jml_p: jumlahPengetahuan, jml_k: jumlahKeterampilan, rata_p: rataRataPengetahuan, pred_p: nilaiKePredikat(rataRataPengetahuan), rata_k: rataRataKeterampilan, pred_k: nilaiKePredikat(rataRataKeterampilan),
            rata_akhir: rataRataUjian, pred_akhir: nilaiKePredikat(rataRataUjian),
            hafalan: (siswa.nilai_hafalan || []).map((h, i) => ({ no: i + 1, nama: h.mapel.nama_mapel, kitab: h.mapel.kitab, nilai_angka: h.nilai_angka, predikat: nilaiKePredikat(h.nilai_angka) })),
            kehadiran: (siswa.kehadiran || []).map((k, i) => ({ no: i + 1, kegiatan: k.kegiatan, izin: k.izin, sakit: k.sakit, absen: k.absen, total: k.izin + k.sakit + k.absen })),
            sikap_s: sikap_spiritual.map((s, i) => ({ no: i + 1, indikator: s.indikator, angka: s.angka, predikat: nilaiSikapKePredikat(s.angka) })),
            sikap_o: sikap_sosial.map((s, i) => ({ no: i + 1, indikator: s.indikator, angka: s.angka, predikat: nilaiSikapKePredikat(s.angka) })),
            rata_ss: rataSikapSpiritual, pred_ss: nilaiSikapKePredikat(rataSikapSpiritual), rata_so: rataSikapSosial, pred_so: nilaiSikapKePredikat(rataSikapSosial),
            nilai_akhir_sikap: ((parseFloat(rataSikapSpiritual) + parseFloat(rataSikapSosial)) / 2).toFixed(1),
            pred_akhir_sikap: nilaiSikapKePredikat(((parseFloat(rataSikapSpiritual) + parseFloat(rataSikapSosial)) / 2)),
            deskripsi_spiritual: sikap_spiritual[0]?.deskripsi || '', deskripsi_sosial: sikap_sosial[0]?.deskripsi || '',
        };

        // PERBAIKAN: Path yang benar dari 'controllers' ke 'uploads' adalah naik satu level ('../')
        const templatePaths = {
            identitas: path.join(__dirname, '../uploads/templates/identitas.docx'),
            nilai: path.join(__dirname, '../uploads/templates/nilai.docx'),
            sikap: path.join(__dirname, '../uploads/templates/sikap.docx'),
        };

        const generatedPages = [];
        for (const key in templatePaths) {
            if (fs.existsSync(templatePaths[key])) {
                const content = fs.readFileSync(templatePaths[key], 'binary');
                const zip = new PizZip(content);
                const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => "" });
                doc.render(templateData);
                generatedPages.push(doc.getZip().generate({ type: 'nodebuffer' }));
            }
        }

        if (generatedPages.length === 0) return res.status(400).json({ message: 'Tidak ada template yang ditemukan.' });

        const merger = new DocxMerger({}, generatedPages);
        merger.save('nodebuffer', (mergedBuffer) => {
            res.setHeader('Content-Disposition', `attachment; filename=Raport_${siswa.nama}.docx`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.send(mergedBuffer);
        });

    } catch (error) {
        console.error("Gagal membuat raport:", error);
        res.status(500).json({ message: 'Gagal membuat raport.', error: error.message });
    }
};
