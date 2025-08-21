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
        // Menggunakan nama file sesuai dengan jenisnya untuk kemudahan identifikasi
        const standardizedName = `${file.fieldname.toLowerCase()}.docx`;
        cb(null, standardizedName);
    }
});

const uploadMiddleware = multer({ storage: templateStorage }).fields([
    { name: 'identitas', maxCount: 1 },
    { name: 'nilai', maxCount: 1 },
    { name: 'sikap', maxCount: 1 }
]);


// --- Helper Functions (Tidak berubah) ---
const formatTanggal = (tanggal) => {
    if (!tanggal) return '-';
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const date = new Date(tanggal);
    return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
};

const nilaiKePredikat = (angka) => {
    if (angka === null || angka === undefined || isNaN(angka)) return '-';
    if (angka >= 93) return 'Istimewa';
    if (angka >= 85) return 'Baik Sekali';
    if (angka >= 75) return 'Baik';
    return 'Cukup';
};

const nilaiSikapKePredikat = (angka) => {
    if (angka === null || angka === undefined || isNaN(angka)) return '-';
    if (angka > 8.0) return 'Baik Sekali';
    if (angka > 7.0) return 'Baik';
    if (angka > 6.0) return 'Cukup';
    return 'Kurang';
};


// --- Controller Functions (Diperbarui dan Disempurnakan) ---

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
    const { siswaId, semester, tahun_ajaran } = req.params;
    try {
        // 1. Ambil semua data siswa dan relasinya secara lengkap
        const siswa = await db.Siswa.findOne({
            where: { id: siswaId },
            include: [
                { model: db.Kelas, include: [{ model: db.WaliKelas }] },
                // Asumsi ada relasi ke Kepala Pesantren, jika tidak ada, perlu ditambahkan di model Siswa
                // { model: db.KepalaPesantren, as: 'kepala_pesantren' },
                {
                    model: db.NilaiUjian,
                    where: { semester, tahun_ajaran },
                    required: false,
                    include: { model: db.MataPelajaran, as: 'mapel' }
                },
                {
                    model: db.NilaiHafalan,
                    where: { semester, tahun_ajaran },
                    required: false,
                    include: { model: db.MataPelajaran, as: 'mapel' }
                },
                {
                    model: db.Sikap,
                    where: { semester, tahun_ajaran },
                    required: false
                },
                {
                    model: db.Kehadiran,
                    where: { semester, tahun_ajaran },
                    required: false
                },
            ]
        });

        if (!siswa) {
            return res.status(404).json({ message: 'Data siswa tidak ditemukan.' });
        }
        
        // Dapatkan data kepala sekolah/pesantren (ambil yang pertama jika ada banyak)
        const kepalaPesantren = await db.KepalaPesantren.findOne();

        // 2. Proses dan hitung semua nilai (sesuai logika app.js)
        const nilaiUjian = siswa.NilaiUjians || [];
        const jumlahMapel = nilaiUjian.length > 0 ? nilaiUjian.length : 1;

        const jumlahPengetahuan = nilaiUjian.reduce((sum, m) => sum + (m.pengetahuan_angka || 0), 0);
        const rataRataPengetahuan = (jumlahPengetahuan / jumlahMapel).toFixed(1);

        const jumlahKeterampilan = nilaiUjian.reduce((sum, m) => sum + (m.keterampilan_angka || 0), 0);
        const rataRataKeterampilan = (jumlahKeterampilan / jumlahMapel).toFixed(1);

        const rataRataUjian = ((jumlahPengetahuan + jumlahKeterampilan) / (jumlahMapel * 2) || 0).toFixed(1);
        
        // NOTE: Peringkat dan total_siswa memerlukan query tambahan yang lebih kompleks.
        // Untuk sekarang kita gunakan placeholder.
        const peringkatData = { peringkat: 'N/A', total_siswa: 'N/A' };

        // Proses Nilai Sikap
        const semuaSikap = siswa.Sikaps || [];
        const sikapSpiritualIndicators = semuaSikap.filter(s => s.jenis_sikap === 'spiritual');
        const sikapSosialIndicators = semuaSikap.filter(s => s.jenis_sikap === 'sosial');

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
            kelas: siswa.Kela?.nama_kelas || '-',
            semester: semester || '-',
            thn_ajaran: tahun_ajaran.replace('-', '/') || '-',
            wali_kelas: siswa.Kela?.WaliKela?.nama || '-',
            kepsek: kepalaPesantren?.nama || '-',
            tgl_raport: formatTanggal(new Date()),
            kamar: siswa.kamar || '-',
            kota_asal: siswa.kota_asal || '-',

            // Nilai Ujian
            mapel: nilaiUjian.map((m, i) => ({
                no: i + 1,
                nama_mapel: m.mapel?.nama_mapel || 'N/A',
                kitab: m.mapel?.kitab || '-',
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
            hafalan: (siswa.NilaiHafalans || []).map((h, i) => ({
                no: i + 1,
                nama: h.mapel?.nama_mapel || 'N/A',
                kitab: h.mapel?.kitab || '-',
                nilai_angka: h.nilai_angka,
                predikat: nilaiKePredikat(h.nilai_angka)
            })),
            kehadiran: (siswa.Kehadirans || []).map((k, i) => ({
                no: i + 1,
                kegiatan: k.kegiatan,
                izin: k.izin || 0,
                sakit: k.sakit || 0,
                absen: k.absen || 0,
                total: (k.izin || 0) + (k.sakit || 0) + (k.absen || 0)
            })),
            
            // Sikap
            sikap_s: sikapSpiritualIndicators.map((s, i) => ({ no: i + 1, indikator: s.indikator, angka: s.angka, predikat: nilaiSikapKePredikat(s.angka) })),
            sikap_o: sikapSosialIndicators.map((s, i) => ({ no: i + 1, indikator: s.indikator, angka: s.angka, predikat: nilaiSikapKePredikat(s.angka) })),
            rata_ss: rataSikapSpiritual,
            pred_ss: nilaiSikapKePredikat(rataSikapSpiritual),
            rata_so: rataSikapSosial,
            pred_so: nilaiSikapKePredikat(rataSikapSosial),
            nilai_akhir_sikap: nilaiAkhirSikap,
            pred_akhir_sikap: nilaiSikapKePredikat(nilaiAkhirSikap),
            deskripsi_spiritual: deskripsiSpiritual, 
            deskripsi_sosial: deskripsiSosial,
        };

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
            const namaFile = `Raport_${siswa.nama.replace(/\s+/g, '_')}_${(siswa.Kela?.nama_kelas || 'kelas').replace(/\s+/g, '')}.docx`;
            res.setHeader('Content-Disposition', `attachment; filename=${namaFile}`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.send(mergedBuffer);
        });

    } catch (error) {
        console.error("Gagal membuat raport:", error);
        res.status(500).json({ message: 'Terjadi kesalahan internal saat membuat raport.', error: error.message });
    }
};

// Tambahkan fungsi ini di templateController.js:

exports.generateIdentitas = async (req, res) => {
    const { siswaId } = req.params;
    try {
        // Ambil data siswa dengan semua relasinya
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

        // Ambil data kepala pesantren
        const kepalaPesantren = await db.KepalaPesantren.findOne();

        // Siapkan data template untuk identitas saja
        const templateData = {
            // Data identitas siswa
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

        // Generate hanya template identitas
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

        const namaFile = `Identitas_${siswa.nama.replace(/\s+/g, '_')}.docx`;
        res.setHeader('Content-Disposition', `attachment; filename=${namaFile}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(generatedBuffer);

    } catch (error) {
        console.error("Gagal membuat identitas:", error);
        res.status(500).json({ 
            message: 'Terjadi kesalahan saat membuat identitas.', 
            error: error.message 
        });
    }
};