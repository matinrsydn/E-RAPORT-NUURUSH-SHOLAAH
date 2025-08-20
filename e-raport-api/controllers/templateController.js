const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const DocxMerger = require('docx-merger');
const db = require('../models');
const multer = require("multer");
const fs = require("fs");
const path = require('path');

// --- Konfigurasi Multer untuk Upload Template ---
// Pindahkan konfigurasi multer ke sini agar lebih terorganisir.
const templateStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/templates/');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Simpan file dengan nama fieldnya (identitas.docx, nilai.docx, dll)
        cb(null, file.fieldname + '.docx');
    }
});

const uploadMiddleware = multer({ storage: templateStorage }).fields([
    { name: 'identitas', maxCount: 1 },
    { name: 'nilai', maxCount: 1 },
    { name: 'sikap', maxCount: 1 }
]);

// --- Controller Functions ---

// 1. Upload Template
exports.uploadTemplate = (req, res) => {
    uploadMiddleware(req, res, (err) => {
        if (err) {
            console.error("Multer Error:", err);
            return res.status(500).json({ message: 'Gagal mengunggah file.', error: err.message });
        }
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
        }
        res.status(200).json({ message: 'Template berhasil diunggah.' });
    });
};

// 2. Get List of Templates
exports.getTemplates = (req, res) => {
    const templateDir = path.join(__dirname, '../uploads/templates/');
    fs.readdir(templateDir, (err, files) => {
        if (err) {
            // Jika direktori tidak ada, kirim array kosong
            if (err.code === 'ENOENT') {
                return res.status(200).json([]);
            }
            return res.status(500).json({ message: "Tidak bisa membaca daftar template.", error: err.message });
        }
        
        const templateInfo = files
            .filter(file => path.extname(file) === '.docx')
            .map(file => {
                const stats = fs.statSync(path.join(templateDir, file));
                return {
                    fileName: file,
                    url: `${req.protocol}://${req.get('host')}/uploads/templates/${file}`,
                    size: stats.size,
                    lastModified: stats.mtime,
                };
            });
            
        res.status(200).json(templateInfo);
    });
};


// 3. Delete a Template
exports.deleteTemplate = (req, res) => {
    const { fileName } = req.params;
    const filePath = path.join(__dirname, '../uploads/templates/', fileName);

    fs.unlink(filePath, (err) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.status(404).json({ message: 'File template tidak ditemukan.' });
            }
            return res.status(500).json({ message: 'Gagal menghapus template.', error: err.message });
        }
        res.status(200).json({ message: `Template '${fileName}' berhasil dihapus.` });
    });
};


// --- Helper Functions untuk Generate Dokumen ---
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


// 4. Generate Identitas Siswa
exports.generateIdentitas = async (req, res) => {
    try {
        const { siswaId } = req.params;
        const siswa = await db.Siswa.findByPk(siswaId, {
            include: [
                { model: db.WaliKelas, as: 'wali_kelas' },
                { model: db.KepalaPesantren, as: 'kepala_pesantren' }
            ]
        });
        if (!siswa) return res.status(404).json({ message: 'Data siswa tidak ditemukan.' });

        const templateData = {
            nama: siswa.nama || '', no_induk: siswa.nis || '', ttl: `${siswa.tempat_lahir || ''}, ${formatTanggal(siswa.tanggal_lahir)}`,
            jk: siswa.jenis_kelamin || '', agama: siswa.agama || '', alamat: siswa.alamat || '',
            nama_ayah: siswa.nama_ayah || '', kerja_ayah: siswa.pekerjaan_ayah || '', alamat_ayah: siswa.alamat_ayah || '',
            nama_ibu: siswa.nama_ibu || '', kerja_ibu: siswa.pekerjaan_ibu || '', alamat_ibu: siswa.alamat_ibu || '',
            nama_wali: siswa.nama_wali || '', kerja_wali: siswa.pekerjaan_wali || '', alamat_wali: siswa.alamat_wali || '',
            kepsek: siswa.kepala_pesantren ? siswa.kepala_pesantren.nama : '_________________',
            nip_kepsek: siswa.kepala_pesantren ? siswa.kepala_pesantren.nip : '_________________',
            tgl_raport: formatTanggal(new Date())
        };

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

// 5. Generate Raport Lengkap
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

        if (generatedPages.length === 0) return res.status(400).json({ message: 'Tidak ada template yang ditemukan untuk digabungkan.' });

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
