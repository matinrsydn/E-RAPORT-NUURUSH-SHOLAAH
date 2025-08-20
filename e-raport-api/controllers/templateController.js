const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const DocxMerger = require('docx-merger');
const db = require('../models');
const multer = require("multer");
const fs = require("fs");
const path = require('path');

// --- Konfigurasi Multer (Tidak berubah) ---
const templateStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/templates/');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '.docx');
    }
});

const uploadMiddleware = multer({ storage: templateStorage }).fields([
    { name: 'identitas', maxCount: 1 },
    { name: 'nilai', maxCount: 1 },
    { name: 'sikap', maxCount: 1 }
]);

// --- Controller Functions (Tidak berubah) ---
exports.uploadTemplate = (req, res) => {
    uploadMiddleware(req, res, (err) => {
        if (err) {
            return res.status(500).json({ message: 'Gagal mengunggah file.', error: err.message });
        }
        res.status(200).json({ message: 'Template berhasil diunggah.' });
    });
};

exports.getTemplates = (req, res) => {
    const templateDir = path.join(__dirname, '../uploads/templates/');
    fs.readdir(templateDir, (err, files) => {
        if (err) {
            return res.status(err.code === 'ENOENT' ? 200 : 500).json(err.code === 'ENOENT' ? [] : { message: "Gagal membaca template." });
        }
        const templateInfo = files
            .filter(file => path.extname(file) === '.docx')
            .map(file => ({ fileName: file, url: `${req.protocol}://${req.get('host')}/uploads/templates/${file}` }));
        res.status(200).json(templateInfo);
    });
};

exports.deleteTemplate = (req, res) => {
    const { fileName } = req.params;
    const filePath = path.join(__dirname, '../uploads/templates/', fileName);
    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(err.code === 'ENOENT' ? 404 : 500).json({ message: err.code === 'ENOENT' ? 'Template tidak ditemukan.' : 'Gagal menghapus template.' });
        }
        res.status(200).json({ message: `Template '${fileName}' berhasil dihapus.` });
    });
};


// --- Helper Functions (Tidak berubah) ---
const formatTanggal = (tanggal) => {
    if (!tanggal) return '-';
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const date = new Date(tanggal);
    return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
};

const nilaiKePredikat = (angka) => {
    if (angka === null || angka === undefined) return '-';
    if (angka >= 93) return 'Istimewa';
    if (angka >= 85) return 'Baik Sekali';
    if (angka >= 75) return 'Baik';
    return 'Cukup';
};

const nilaiSikapKePredikat = (angka) => {
    if (angka === null || angka === undefined) return '-';
    if (angka > 8.0) return 'Baik Sekali';
    if (angka > 7.0) return 'Baik';
    if (angka > 6.0) return 'Cukup';
    return 'Kurang';
};


// --- FUNGSI UTAMA YANG DIPERBARUI ---
// 4. Generate Raport Lengkap (Logika Baru)
exports.generateRaport = async (req, res) => {
    const { siswaId, semester, tahun_ajaran } = req.params;
    try {
        // 1. Ambil data siswa dan relasinya dari database
        const siswa = await db.Siswa.findOne({
            where: { id: siswaId },
            include: [
                { model: db.WaliKelas, as: 'wali_kelas' },
                { model: db.KepalaPesantren, as: 'kepala_pesantren' },
                { model: db.Kelas, as: 'kelas_info' }, // Asumsi relasi ke tabel Kelas ada
                { model: db.NilaiUjian, as: 'nilai_ujian', where: { semester, tahun_ajaran }, required: false, include: { model: db.MataPelajaran, as: 'mapel' } },
                { model: db.NilaiHafalan, as: 'nilai_hafalan', where: { semester, tahun_ajaran }, required: false, include: { model: db.MataPelajaran, as: 'mapel' } },
                { model: db.Sikap, as: 'sikap', where: { semester, tahun_ajaran }, required: false },
                { model: db.Kehadiran, as: 'kehadiran', where: { semester, tahun_ajaran }, required: false },
            ]
        });

        if (!siswa) return res.status(404).json({ message: 'Data siswa tidak ditemukan.' });

        // 2. Proses dan hitung semua nilai (mengikuti logika app.js)
        const { wali_kelas = {}, kepala_pesantren = {}, kelas_info = {} } = siswa;
        
        // Nilai Ujian
        const nilai_ujian = siswa.nilai_ujian || [];
        const jumlahMapel = nilai_ujian.length > 0 ? nilai_ujian.length : 1;
        const jumlahPengetahuan = nilai_ujian.reduce((sum, m) => sum + (m.pengetahuan_angka || 0), 0);
        const rataRataPengetahuan = (jumlahPengetahuan / jumlahMapel).toFixed(1);
        const jumlahKeterampilan = nilai_ujian.reduce((sum, m) => sum + (m.keterampilan_angka || 0), 0);
        const rataRataKeterampilan = (jumlahKeterampilan / jumlahMapel).toFixed(1);
        const rataRataUjian = ((jumlahPengetahuan + jumlahKeterampilan) / (jumlahMapel * 2) || 0).toFixed(1);
        
        // NOTE: Peringkat dan total_siswa perlu logika tambahan
        // Untuk sekarang kita gunakan placeholder statis
        const peringkatData = { peringkat: 'N/A', total_siswa: 'N/A' };

        // Nilai Sikap
        const sikap = siswa.sikap || [];
        const sikap_spiritual_indicators = sikap.filter(s => s.jenis_sikap === 'Spiritual');
        const sikap_sosial_indicators = sikap.filter(s => s.jenis_sikap === 'Sosial');
        
        const rataSikapSpiritual = (sikap_spiritual_indicators.reduce((sum, s) => sum + (s.angka || 0), 0) / (sikap_spiritual_indicators.length || 1)).toFixed(1);
        const rataSikapSosial = (sikap_sosial_indicators.reduce((sum, s) => sum + (s.angka || 0), 0) / (sikap_sosial_indicators.length || 1)).toFixed(1);

        // Ambil deskripsi dari entri pertama (jika ada)
        const deskripsiSpiritual = sikap_spiritual_indicators.length > 0 ? sikap_spiritual_indicators[0].deskripsi : 'Siswa menunjukkan perkembangan sikap spiritual yang baik.';
        const deskripsiSosial = sikap_sosial_indicators.length > 0 ? sikap_sosial_indicators[0].deskripsi : 'Siswa menunjukkan perkembangan sikap sosial yang baik.';

        // 3. Susun object `templateData` sesuai struktur di app.js dan placeholder di DOCX
        const templateData = {
            // Identitas
            nama: siswa.nama,
            no_induk: siswa.nis,
            ttl: `${siswa.tempat_lahir || ''}, ${formatTanggal(siswa.tanggal_lahir)}`,
            jk: siswa.jenis_kelamin,
            agama: siswa.agama,
            alamat: siswa.alamat,
            nama_ayah: siswa.nama_ayah,
            kerja_ayah: siswa.pekerjaan_ayah,
            alamat_ayah: siswa.alamat_ayah,
            nama_ibu: siswa.nama_ibu,
            kerja_ibu: siswa.pekerjaan_ibu,
            alamat_ibu: siswa.alamat_ibu,
            nama_wali: siswa.nama_wali,
            kerja_wali: siswa.pekerjaan_wali,
            alamat_wali: siswa.alamat_wali,
            
            // Akademik
            kelas: kelas_info.nama_kelas || siswa.kelas, // Ambil dari relasi jika ada
            semester,
            thn_ajaran: tahun_ajaran.replace('-', '/'),
            wali_kelas: wali_kelas.nama || '-',
            kepsek: kepala_pesantren.nama || '-',
            tgl_raport: formatTanggal(new Date()),
            kamar: siswa.kamar || '-',
            kota_asal: siswa.kota_asal || '-',

            // Nilai Ujian
            mapel: nilai_ujian.map((m, i) => ({
                no: i + 1,
                nama_mapel: m.mapel.nama_mapel,
                kitab: m.mapel.kitab,
                p_angka: m.pengetahuan_angka,
                p_predikat: nilaiKePredikat(m.pengetahuan_angka),
                k_angka: m.keterampilan_angka,
                k_predikat: nilaiKePredikat(m.keterampilan_angka)
            })),
            jml_p: jumlahPengetahuan,
            jml_k: jumlahKeterampilan,
            rata_p: rataRataPengetahuan,
            pred_p: nilaiKePredikat(rataRataPengetahuan),
            rata_k: rataRataKeterampilan,
            pred_k: nilaiKePredikat(rataRataKeterampilan),
            rata_akhir: rataRataUjian,
            pred_akhir: nilaiKePredikat(rataRataUjian),
            peringkat: peringkatData.peringkat,
            total_siswa: peringkatData.total_siswa,

            // Hafalan & Kehadiran
            hafalan: (siswa.nilai_hafalan || []).map((h, i) => ({ no: i + 1, nama: h.mapel.nama_mapel, kitab: h.mapel.kitab, nilai_angka: h.nilai_angka, predikat: nilaiKePredikat(h.nilai_angka) })),
            kehadiran: (siswa.kehadiran || []).map((k, i) => ({ no: i + 1, kegiatan: k.kegiatan, izin: k.izin || 0, sakit: k.sakit || 0, absen: k.absen || 0, total: (k.izin || 0) + (k.sakit || 0) + (k.absen || 0) })),
            
            // Sikap
            sikap_s: sikap_spiritual_indicators.map((s, i) => ({ no: i + 1, indikator: s.indikator, angka: s.angka, predikat: nilaiSikapKePredikat(s.angka) })),
            sikap_o: sikap_sosial_indicators.map((s, i) => ({ no: i + 1, indikator: s.indikator, angka: s.angka, predikat: nilaiSikapKePredikat(s.angka) })),
            rata_ss: rataSikapSpiritual,
            pred_ss: nilaiSikapKePredikat(rataSikapSpiritual),
            rata_so: rataSikapSosial,
            pred_so: nilaiSikapKePredikat(rataSikapSosial),
            nilai_akhir_sikap: ((parseFloat(rataSikapSpiritual) + parseFloat(rataSikapSosial)) / 2).toFixed(1),
            pred_akhir_sikap: nilaiSikapKePredikat(((parseFloat(rataSikapSpiritual) + parseFloat(rataSikapSosial)) / 2)),
            deskripsi_spiritual: deskripsiSpiritual, 
            deskripsi_sosial: deskripsiSosial,
        };

        // 4. Generate dan gabungkan file DOCX (tidak berubah)
        const templatePaths = {
            // Tambahkan template identitas jika ada
            // identitas: path.join(__dirname, '../uploads/templates/identitas.docx'),
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

        if (generatedPages.length === 0) return res.status(400).json({ message: 'Tidak ada template (nilai.docx/sikap.docx) yang ditemukan di server.' });

        const merger = new DocxMerger({}, generatedPages);
        merger.save('nodebuffer', (mergedBuffer) => {
            res.setHeader('Content-Disposition', `attachment; filename=Raport_${siswa.nama.replace(/\s+/g, '_')}.docx`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.send(mergedBuffer);
        });

    } catch (error) {
        console.error("Gagal membuat raport:", error);
        res.status(500).json({ message: 'Gagal membuat raport.', error: error.message });
    }
};
