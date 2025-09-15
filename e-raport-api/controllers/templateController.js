const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const DocxMerger = require('docx-merger');
let db = require('../models');
const multer = require("multer");
const fs = require("fs");
const path = require('path');
const libre = require('libreoffice-convert');
const util = require('util');

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
        // Menggunakan nama file sesuai dengan jenisnya untuk kemudahan identifikasi
        const standardizedName = `${file.fieldname.toLowerCase()}.docx`;
        cb(null, standardizedName);
    }
});

const uploadMiddleware = multer({ storage: templateStorage }).fields([
    { name: 'identitas', maxCount: 1 },
    { name: 'nilai', maxCount: 1 },
    { name: 'sikap', maxCount: 1 },
    { name: 'surat_keluar', maxCount: 1 }
]);


// --- Helper Functions (Tidak berubah) ---
const formatTanggal = (tanggal) => {
    if (!tanggal) return '-';
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const date = new Date(tanggal);
    return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
};

const nilaiKePredikat = (angka) => {
    if (angka === null || angka === undefined) return '-';
    const n = parseFloat(angka);
    if (isNaN(n)) return '-';
    if (n === 100) return 'Sempurna';
    if (n >= 90) return 'Sangat Baik';
    if (n >= 80) return 'Baik';
    if (n >= 70) return 'Cukup';
    return 'Kurang';
};

const nilaiSikapKePredikat = (angka) => {
    if (angka === null || angka === undefined || isNaN(angka)) return '-';
    if(angka === 100) return 'Sempurna';
    if(angka >= 90) return 'Sangat Baik';
    if (angka >= 80) return 'Baik Sekali';
    if (angka >= 70) return 'Baik';
    return 'Kurang';
};


// --- Controller Functions (Diperbarui dan Disempurnakan) ---

exports.uploadTemplate = (req, res) => {
    try {
        uploadMiddleware(req, res, async (err) => {
            if (err) {
                console.error('Upload error:', err);
                return res.status(400).json({ 
                    message: 'Gagal mengunggah file', 
                    error: err.message 
                });
            }

            const files = req.files;
            const uploadDir = path.join(__dirname, '../uploads/templates/');
            
            // Process each template type
            const processTemplate = (fieldName) => {
                if (files[fieldName] && files[fieldName][0]) {
                    const file = files[fieldName][0];
                    const targetPath = path.join(uploadDir, `${fieldName}.docx`);
                    fs.renameSync(file.path, targetPath);
                    return { 
                        fieldName, 
                        path: targetPath, 
                        originalName: file.originalname 
                    };
                }
                return null;
            };

            const results = [];
            ['identitas', 'nilai', 'sikap', 'surat_keluar'].forEach(type => {
                const result = processTemplate(type);
                if (result) results.push(result);
            });

            // Special handling for surat_keluar if jenis is provided
            if (files.surat_keluar && req.body.jenis === 'surat_keluar') {
                const targetPath = path.join(uploadDir, 'surat_keluar.docx');
                // Add metadata or handle specific surat keluar logic here
            }

            res.json({ 
                message: 'Template berhasil diunggah',
                uploaded: results
            });
        });
    } catch (error) {
        console.error('Template upload error:', error);
        res.status(500).json({ 
            message: 'Gagal mengunggah template', 
            error: error.message 
        });
    }
    uploadMiddleware(req, res, (err) => {
        if (err) {
            return res.status(500).json({ message: 'Gagal mengunggah file.', error: err.message });
        }
        res.status(200).json({ message: 'Template berhasil diunggah.' });
    });
};

exports.getTemplates = (req, res) => {
    const templateDir = path.join(__dirname, '../uploads/templates/');
    if (!fs.existsSync(templateDir)) {
        return res.status(200).json([]);
    }
    fs.readdir(templateDir, (err, files) => {
        if (err) {
            return res.status(500).json({ message: "Gagal membaca direktori template." });
        }
        const templateInfo = files
            .filter(file => path.extname(file).toLowerCase() === '.docx')
            .map(file => {
                const filePath = path.join(templateDir, file);
                const stats = fs.statSync(filePath);
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

// --- FUNGSI UTAMA YANG DIPERBARUI ---
exports.generateRaport = async (req, res) => {
    // prefer numeric FK tahun_ajaran_id (may come from middleware or client)
    const { siswaId, semester } = req.params;
    let tahun_ajaran_id = req.params.tahun_ajaran_id || req.body?.tahun_ajaran_id || req.query?.tahun_ajaran_id;
    let tahun_ajaran_text = req.params.tahun_ajaran || req.body?.tahun_ajaran || req.query?.tahun_ajaran;
    try {
        // If textual tahun_ajaran is provided but not resolved to id, try to resolve locally
        if (!tahun_ajaran_id && tahun_ajaran_text) {
            const master = await db.MasterTahunAjaran.findOne({ where: { nama_ajaran: tahun_ajaran_text } });
            if (master) tahun_ajaran_id = master.id;
            else {
                const periode = await db.PeriodeAjaran.findOne({ where: { nama_ajaran: tahun_ajaran_text } });
                if (periode) tahun_ajaran_id = periode.id;
            }
        }
        // 1. Ambil semua data siswa dan relasinya secara lengkap
        // Build include clauses that use tahun_ajaran_id where possible
        const nilaiWhere = { semester };
        const hafalWhere = { semester };
        const sikapWhere = { semester };
        const hadirWhere = {};
        if (tahun_ajaran_id) {
            nilaiWhere.tahun_ajaran_id = tahun_ajaran_id;
            hafalWhere.tahun_ajaran_id = tahun_ajaran_id;
            sikapWhere.tahun_ajaran_id = tahun_ajaran_id;
            hadirWhere.tahun_ajaran_id = tahun_ajaran_id;
        }

        const siswa = await db.Siswa.findOne({
                where: { id: siswaId },
                include: [
                    { 
                    model: db.Kelas, 
                    as: 'kelas', 
                    include: [{ model: db.Guru, as: 'walikelas' }] 
                    },
                    { 
                    model: db.SiswaKelasHistory, 
                    as: 'histories',
                    where: { semester: semester },
                    required: false,
                    order: [['id', 'DESC']]
                    },
                    { model: db.NilaiUjian, as: 'NilaiUjians', where: nilaiWhere, required: false, include: { model: db.MataPelajaran, as: 'mapel' } },
                    { model: db.NilaiHafalan, as: 'NilaiHafalans', where: hafalWhere, required: false, include: { model: db.MataPelajaran, as: 'mapel' } },
                    { model: db.Sikap, as: 'Sikaps', where: sikapWhere, required: false, include: { model: db.IndikatorSikap, as: 'indikator_sikap' } },
                    { model: db.Kehadiran, as: 'Kehadirans', where: hadirWhere, required: false }
                ]
                });

        if (!siswa) {
            return res.status(404).json({ message: 'Data siswa tidak ditemukan.' });
        }
        
        // Dapatkan data kepala sekolah/pesantren (ambil yang pertama jika ada banyak)
        const kepalaPesantren = await db.KepalaPesantren.findOne();

        // 2. Proses dan hitung semua nilai (sesuai logika app.js)
        let nilaiUjian = siswa.NilaiUjians || [];
        // fallback: if there are no nilai for the requested tahun_ajaran/semester, try fetching any nilai for the siswa
        if ((nilaiUjian || []).length === 0) {
            try {
                const fallback = await db.NilaiUjian.findAll({ where: { siswa_id: siswaId }, include: { model: db.MataPelajaran, as: 'mapel' } });
                if (fallback && fallback.length > 0) nilaiUjian = fallback;
            } catch (e) {
                console.warn('Fallback fetch NilaiUjian failed:', e.message);
            }
        }
        const jumlahMapel = nilaiUjian.length > 0 ? nilaiUjian.length : 1;

    // Note: numeric `nilai` removed; use predikat and deskripsi instead
    const jumlahNilai = 0;
    const rataRataUjian = 'N/A';
        
        // NOTE: Peringkat dan total_siswa memerlukan query tambahan yang lebih kompleks.
        // Untuk sekarang kita gunakan placeholder.
        const peringkatData = { peringkat: 'N/A', total_siswa: 'N/A' };

        // Proses Nilai Sikap
        let semuaSikap = siswa.Sikaps || [];
        if ((semuaSikap || []).length === 0) {
            try {
                const fallbackSikap = await db.Sikap.findAll({ where: { siswa_id: siswaId }, include: { model: db.IndikatorSikap, as: 'indikator_sikap' } });
                if (fallbackSikap && fallbackSikap.length > 0) semuaSikap = fallbackSikap;
            } catch (e) {
                console.warn('Fallback fetch Sikap failed:', e.message);
            }
        }
        const sikapSpiritualIndicators = semuaSikap.filter(s => s.indikator_sikap?.jenis_sikap === 'Spiritual'); // PERBAIKI FILTER
        const sikapSosialIndicators = semuaSikap.filter(s => s.indikator_sikap?.jenis_sikap === 'Sosial'); // PERBAIKI FILTER

    const rataSikapSpiritual = (sikapSpiritualIndicators.reduce((sum, s) => sum + (s.angka || 0), 0) / (sikapSpiritualIndicators.length || 1)).toFixed(1);
        const rataSikapSosial = (sikapSosialIndicators.reduce((sum, s) => sum + (s.angka || 0), 0) / (sikapSosialIndicators.length || 1)).toFixed(1);

        const nilaiAkhirSikap = ((parseFloat(rataSikapSpiritual) + parseFloat(rataSikapSosial)) / 2).toFixed(1);

        // Mengambil deskripsi. Diasumsikan deskripsi sama untuk satu jenis sikap per siswa.
        const deskripsiSpiritual = sikapSpiritualIndicators.length > 0 ? sikapSpiritualIndicators[0].deskripsi : 'Siswa menunjukkan perkembangan sikap spiritual yang baik.';
        const deskripsiSosial = sikapSosialIndicators.length > 0 ? sikapSosialIndicators[0].deskripsi : 'Siswa menunjukkan perkembangan sikap sosial yang baik.';

        // 3. Susun `templateData` dengan lengkap
        const templateData = {
            // Identitas
            nama: siswa.nama || '-',
            no_induk: siswa.nis || '-',
            ttl: `${siswa.tempat_lahir || ''}, ${formatTanggal(siswa.tanggal_lahir)}`,
            jk: siswa.jenis_kelamin || '-',
            agama: siswa.agama || '-',
            alamat: siswa.alamat || '-',
            nama_ayah: siswa.nama_ayah || '-',
            kerja_ayah: siswa.pekerjaan_ayah || '-',
            alamat_ayah: siswa.alamat_ayah || '-',
            nama_ibu: siswa.nama_ibu || '-',
            kerja_ibu: siswa.pekerjaan_ibu || '-',
            alamat_ibu: siswa.alamat_ibu || '-',
            nama_wali: siswa.nama_wali || '-',
            kerja_wali: siswa.pekerjaan_wali || '-',
            alamat_wali: siswa.alamat_wali || '-',
            
            // Akademik
            kelas: siswa.kelas?.nama_kelas || '-',
            semester: semester || '-',
            thn_ajaran: (tahun_ajaran_text || '').replace('-', '/') || '-',
            wali_kelas: siswa.kelas?.walikelas?.nama || '-',
            kepsek: kepalaPesantren?.nama || '-',
            tgl_raport: formatTanggal(new Date()),
            kamar: siswa.kamar || '-',
            kota_asal: siswa.kota_asal || '-',

            // Nilai Ujian (predikat/deskripsi per mapel)
            mapel: nilaiUjian.map((m, i) => ({
                no: i + 1,
                nama_mapel: m.mapel?.nama_mapel || 'N/A',
                kitab: m.mapel?.kitab || '-',
                predikat: m.predikat || '-'
            })),
            jml_n: 'N/A',
            rata_n: 'N/A',
            pred_n: 'N/A',
            peringkat: peringkatData.peringkat,
            total_siswa: peringkatData.total_siswa,

            // Hafalan & Kehadiran
            hafalan: (siswa.NilaiHafalans || []).map((h, i) => ({
                no: i + 1,
                nama: h.mapel?.nama_mapel || 'N/A',
                kitab: h.mapel?.kitab || '-',
                predikat: h.predikat || '-',
                nilai_angka: h.nilai
            })),
            kehadiran: (siswa.Kehadirans || []).map((k, i) => ({
                no: i + 1,
                kegiatan: k.indikator_text,
                izin: k.izin || 0,
                sakit: k.sakit || 0,
                absen: k.absen || 0,
                total: (k.izin || 0) + (k.sakit || 0) + (k.absen || 0)
            })),
            
            // Sikap
            sikap_s: sikapSpiritualIndicators.map((s, i) => ({ no: i + 1, indikator: s.indikator_text, angka: s.nilai, predikat: nilaiSikapKePredikat(s.nilai) })), // PERBAIKI PROPERTY
            sikap_o: sikapSosialIndicators.map((s, i) => ({ no: i + 1, indikator: s.indikator_text, angka: s.nilai, predikat: nilaiSikapKePredikat(s.nilai) })), // PERBAIKI PROPERTY
            rata_ss: rataSikapSpiritual,
            pred_ss: nilaiSikapKePredikat(rataSikapSpiritual),
            rata_so: rataSikapSosial,
            pred_so: nilaiSikapKePredikat(rataSikapSosial),
            nilai_akhir_sikap: nilaiAkhirSikap,
            pred_akhir_sikap: nilaiSikapKePredikat(nilaiAkhirSikap),
            deskripsi_spiritual: deskripsiSpiritual, 
            deskripsi_sosial: deskripsiSosial,
        };

        // If caller requested debug JSON, return the template data instead of generating DOCX
        if (req.query && (req.query.debugJson === '1' || req.query.debugJson === 'true')) {
            return res.status(200).json({ templateData });
        }

        // 4. Generate dan gabungkan file DOCX
        const templatePaths = {
            identitas: path.join(__dirname, '../uploads/templates/identitas.docx'),
            nilai: path.join(__dirname, '../uploads/templates/nilai.docx'),
            sikap: path.join(__dirname, '../uploads/templates/sikap.docx'),
        };

        const generatedPages = [];
        const templateKeys = ['identitas', 'nilai', 'sikap'];

        for (const key of templateKeys) {
            const templatePath = templatePaths[key];
            if (fs.existsSync(templatePath)) {
                try {
                    const content = fs.readFileSync(templatePath, 'binary');
                    const zip = new PizZip(content);
                    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => "" });
                    doc.render(templateData);
                    generatedPages.push(doc.getZip().generate({ type: 'nodebuffer' }));
                } catch (error) {
                    console.error(`Error memproses template ${key}:`, error);
                    return res.status(500).json({ message: `Gagal memproses template ${key}.docx.`, error: error.message });
                }
            }
        }

        if (generatedPages.length === 0) {
            return res.status(404).json({ message: 'Tidak ada file template (.docx) yang ditemukan di server.' });
        }

        const merger = new DocxMerger({}, generatedPages);
        merger.save('nodebuffer', (mergedBuffer) => {
            const kelasName = siswa.Kelas?.nama_kelas || 'kelas';
            const namaFile = `Raport_${siswa.nama.replace(/\s+/g, '_')}_${kelasName.replace(/\s+/g, '')}.docx`;
            res.setHeader('Content-Disposition', `attachment; filename=${namaFile}`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.send(mergedBuffer);
        });

    } catch (error) {
        console.error("Gagal membuat raport:", error);
        res.status(500).json({ message: 'Terjadi kesalahan internal saat membuat raport.', error: error.message });
    }
};

// Test helper: allow tests to inject db
exports.__setDb = (newDb) => { db = newDb; };

// Tambahkan fungsi ini di templateController.js:

exports.generateIdentitas = async (req, res) => {
    const { siswaId } = req.params;
    const { format = 'docx' } = req.query; // Ambil format dari query, default 'docx'

    try {
        const siswa = await db.Siswa.findOne({
            where: { id: siswaId },
            include: [
                { 
                    model: db.Kelas, 
                    as: 'kelas',
                    include: [{ 
                        model: db.WaliKelas, 
                        as: 'walikelas' 
                    }] 
                }
            ]
        });

        if (!siswa) {
            return res.status(404).json({ message: 'Data siswa tidak ditemukan.' });
        }

        const kepalaPesantren = await db.KepalaPesantren.findOne();

        const templateData = {
            nama: siswa.nama || '-',
            no_induk: siswa.nis || '-',
            ttl: `${siswa.tempat_lahir || ''}, ${formatTanggal(siswa.tanggal_lahir)}`,
            jk: siswa.jenis_kelamin || '-',
            agama: siswa.agama || '-',
            alamat: siswa.alamat || '-',
            nama_ayah: siswa.nama_ayah || '-',
            kerja_ayah: siswa.pekerjaan_ayah || '-',
            alamat_ayah: siswa.alamat_ayah || '-',
            nama_ibu: siswa.nama_ibu || '-',
            kerja_ibu: siswa.pekerjaan_ibu || '-',
            alamat_ibu: siswa.alamat_ibu || '-',
            nama_wali: siswa.nama_wali || '-',
            kerja_wali: siswa.pekerjaan_wali || '-',
            alamat_wali: siswa.alamat_wali || '-',
            kelas: siswa.kelas?.nama_kelas || '-',
            wali_kelas: siswa.kelas?.walikelas?.nama || '-',
            kepsek: kepalaPesantren?.nama || '-',
            tgl_raport: formatTanggal(new Date()),
            kamar: siswa.kamar || '-',
            kota_asal: siswa.kota_asal || '-'
        };

        const identitasTemplatePath = path.join(__dirname, '../uploads/templates/identitas.docx');
        
        if (!fs.existsSync(identitasTemplatePath)) {
            return res.status(404).json({ message: 'Template identitas.docx tidak ditemukan.' });
        }

        const content = fs.readFileSync(identitasTemplatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { 
            paragraphLoop: true, 
            linebreaks: true, 
            nullGetter: () => "" 
        });
        
        doc.render(templateData);
        const generatedBuffer = doc.getZip().generate({ type: 'nodebuffer' });

        if (format === 'pdf') {
            const convert = util.promisify(libre.convert);
            const pdfBuffer = await convert(generatedBuffer, '.pdf', undefined);

            const namaFile = `Identitas_${siswa.nama.replace(/\s+/g, '_')}.pdf`;
            res.setHeader('Content-Disposition', `attachment; filename=${namaFile}`);
            res.setHeader('Content-Type', 'application/pdf');
            res.send(pdfBuffer);
        } else {
            const namaFile = `Identitas_${siswa.nama.replace(/\s+/g, '_')}.docx`;
            res.setHeader('Content-Disposition', `attachment; filename=${namaFile}`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.send(generatedBuffer);
        }

    } catch (error) {
        console.error("Gagal membuat identitas:", error);
        res.status(500).json({ 
            message: 'Terjadi kesalahan saat membuat identitas.', 
            error: error.message 
        });
    }
};
