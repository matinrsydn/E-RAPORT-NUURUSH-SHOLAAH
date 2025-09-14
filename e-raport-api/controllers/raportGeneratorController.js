// controllers/raportGeneratorController.js
const db = require('../models');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');
const libre = require('libreoffice-convert');
const moment = require('moment-hijri'); 
const ImageModule = require('docxtemplater-image-module');
libre.convertAsync = require('util').promisify(libre.convert);
moment.locale('id'); 

const PLACEHOLDER_TTD_PATH = path.resolve(__dirname, '../uploads/signatures/placeholder_ttd.png');
// --- Helper Functions ---
const getPredicate = (nilai) => {
    if (nilai === null || nilai === undefined) return '-';
    const n = parseFloat(nilai);
    if (isNaN(n)) return '-';
    if (n === 100) return 'Sempurna';
    if (n >= 90) return 'Sangat Baik';
    if (n >= 80) return 'Baik';
    if (n >= 70) return 'Cukup';
    return 'Kurang';
};


const formatTanggal = (tanggal) => {
    if (!tanggal) return '-';
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const date = new Date(tanggal);
    return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
};

// Helper function to safely calculate averages
const calculateAverage = (items, key) => {
    if (!items || items.length === 0) return '0.00';
    const numericItems = items
        .map(item => parseFloat(item[key]))
        .filter(value => !isNaN(value));
    if (numericItems.length === 0) return '0.00';
    const sum = numericItems.reduce((acc, value) => acc + value, 0);
    return (sum / numericItems.length).toFixed(2);
};


// --- FUNGSI PENGAMBILAN DATA UTAMA ---
async function getFullRaportData(siswaId, semester, tahunAjaranId) {
    const numericSiswaId = parseInt(siswaId, 10);
    const numericTahunAjaranId = parseInt(tahunAjaranId, 10);

    const siswa = await db.Siswa.findByPk(numericSiswaId, {
        include: [
            { model: db.Kamar, as: 'infoKamar' },
            // Note: kelas will be derived from SiswaKelasHistory context rather than rely solely on current siswa.kelas_id
            { model: db.Kelas, as: 'kelas', include: [{ model: db.Guru, as: 'walikelas' }] }
        ]
    });
    if (!siswa) throw new Error('Siswa tidak ditemukan');
    // find the siswa_kelas_history record that matches this siswa and periode (tahunAjaranId)
    const history = await db.SiswaKelasHistory.findOne({ where: { siswa_id: numericSiswaId, tahun_ajaran_id: numericTahunAjaranId, semester: semester } });
    if (!history) {
        // Fallback: use current siswa.kelas_id and provided tahunAjaranId
        console.warn('SiswaKelasHistory not found for siswa %s and tahunAjaran %s - falling back to current kelas_id', numericSiswaId, numericTahunAjaranId);
    }

    const kepalaPesantren = await db.KepalaPesantren.findOne();

    const contextKelasId = history ? history.kelas_id : siswa.kelas_id;
    const contextTahunAjaranId = history ? history.tahun_ajaran_id : numericTahunAjaranId;

    const commonWhere = { siswa_id: numericSiswaId, semester, tahun_ajaran_id: contextTahunAjaranId };

    const [nilaiUjians, nilaiHafalans, sikaps, kehadirans, kurikulums] = await Promise.all([
        db.NilaiUjian.findAll({ where: commonWhere, include: ['mapel'], order: [['mapel_text', 'ASC']] }),
        db.NilaiHafalan.findAll({ where: commonWhere, include: ['mapel'], order: [['mapel_text', 'ASC']] }),
        db.Sikap.findAll({ where: { ...commonWhere }, include: ['indikator_sikap'], order: [['id', 'ASC']] }),
        db.Kehadiran.findAll({ where: commonWhere, order: [['indikator_text', 'ASC']] }),
        // Kurikulum for the kelas/tingkatan and master_tahun_ajaran corresponding to the context
        // Resolve tingkatan from kelas if available, and master from periode
        (async () => {
            const kelasRec = contextKelasId ? await db.Kelas.findByPk(contextKelasId) : null;
            const tingkatanId = kelasRec ? (kelasRec.tingkatan_id || kelasRec.tingkatanId) : null;
            const periodeRec = await db.PeriodeAjaran.findByPk(contextTahunAjaranId, { include: ['master'] });
            const masterTaId = (periodeRec && (periodeRec.master && periodeRec.master.id)) || periodeRec?.master_tahun_ajaran_id || null;
            const where = {};
            if (tingkatanId) where.tingkatan_id = tingkatanId;
            if (masterTaId) where.master_tahun_ajaran_id = masterTaId;
            return db.Kurikulum.findAll({ where, include: ['kitab', 'mapel'] });
        })()
    ]);

    // Include history record so callers can read catatan wali kelas etc.
    return { siswa, tahunAjaran: await db.PeriodeAjaran.findByPk(contextTahunAjaranId), kepalaPesantren, nilaiUjians, nilaiHafalans, sikaps, kehadirans, kurikulums, history };
}

async function generateDocx(templateName, data) {
    const templatePath = path.resolve(__dirname, `../uploads/templates/${templateName}`);
    if (!fs.existsSync(templatePath)) throw new Error(`Template ${templateName} tidak ditemukan.`);
    const content = fs.readFileSync(templatePath, 'binary');

    // Opsi untuk modul gambar
    const imageOpts = {
        centered: false,
        getImage: function(tag) {
            // tag adalah nilai yang kita masukkan ke templateData, yaitu buffer gambar
            return tag;
        },
        getSize: function() {
            // Ukuran gambar dalam piksel (lebar x tinggi)
            return [150, 75]; 
        }
    };

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => "",
        // Daftarkan modul gambar di sini
        modules: [new ImageModule(imageOpts)] 
    });

    doc.render(data);
    return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function getDynamicHeaderData(tahunAjaran) {
    if (!tahunAjaran || !tahunAjaran.nama_ajaran) {
        return {
            semester_text: 'N/A',
            thn_ajaran_masehi: 'N/A',
            thn_ajaran_hijriah: 'N/A'
        };
    }

    // 1. Tentukan teks semester
    const semester_text = tahunAjaran.semester === '1' ? 'GANJIL' : 'GENAP';

    // 2. Tentukan tahun ajaran Masehi
    const thn_ajaran_masehi = tahunAjaran.nama_ajaran; // Contoh: "2024/2025"

    // 3. Konversi ke tahun Hijriah
    let thn_ajaran_hijriah = 'N/A';
    const years = thn_ajaran_masehi.split('/');
    if (years.length === 2) {
        const startYearMasehi = parseInt(years[0], 10);
        const endYearMasehi = parseInt(years[1], 10);

        // Konversi awal dan akhir tahun Masehi ke Hijriah
        const startHijri = moment(`${startYearMasehi}-07-01`, 'YYYY-MM-DD').iYear(); // Awal tahun ajaran di Juli
        const endHijri = moment(`${endYearMasehi}-06-30`, 'YYYY-MM-DD').iYear();   // Akhir tahun ajaran di Juni

        if (startHijri === endHijri) {
            thn_ajaran_hijriah = `${startHijri} H.`;
        } else {
            thn_ajaran_hijriah = `${startHijri}/${endHijri} H.`;
        }
    }

    return {
        semester_text,
        thn_ajaran_masehi,
        thn_ajaran_hijriah
    };
}

// Controller untuk generate Laporan Nilai (tanpa perubahan signifikan, disertakan untuk kelengkapan)
exports.generateNilaiReport = async (req, res) => {
    try {
        const { siswaId, semester, tahunAjaranId } = req.params;
        const { format } = req.query;

        const data = await getFullRaportData(siswaId, semester, tahunAjaranId);
        const headerData = getDynamicHeaderData(data.tahunAjaran);

    // NilaiUjian no longer contains numeric `nilai`; assessment is by `predikat`.
    const nilaiUjian = data.nilaiUjians || [];
    const jumlahMapel = nilaiUjian.length > 0 ? nilaiUjian.length : 1;
    // numeric aggregates are not available (nilai removed). Use predikat/deskripsi instead.
    const jml_nilai = 'N/A';
    const rata_akhir = 'N/A';

        let peringkat = 'N/A';
        let total_siswa = 'N/A';
        const kelasId = data.siswa?.kelas?.id;

        if (kelasId) {
            const semuaNilaiDiKelas = await db.NilaiUjian.findAll({
                where: { semester, tahun_ajaran_id: tahunAjaranId },
                include: [{ model: db.Siswa, as: 'siswa', where: { kelas_id: kelasId } }]
            });

            const rataRataSiswa = {};
            // Since numeric 'nilai' no longer exists, we cannot compute numeric averages here.
            // Keep peringkat logic as N/A unless the project decides on a conversion from predikat to score.
            // For now, leave rataRataSiswa empty which yields peringkat 'N/A'.

            const peringkatList = Object.keys(rataRataSiswa).map(id => ({
                siswa_id: parseInt(id, 10),
                rata_akhir: (rataRataSiswa[id].total / (rataRataSiswa[id].count || 1))
            })).sort((a, b) => b.rata_akhir - a.rata_akhir);

            total_siswa = peringkatList.length;
            const rankIndex = peringkatList.findIndex(item => item.siswa_id === parseInt(siswaId, 10));
            if (rankIndex !== -1) {
                peringkat = rankIndex + 1;
            }
        }

        const findKitab = (mapelId) => {
            const kurikulum = data.kurikulums.find(k => k.mapel_id === mapelId);
            // Jika kurikulum ditemukan dan ada relasi kitab, kembalikan nama kitabnya
            return kurikulum?.kitab?.nama_kitab || '-'; 
        };

    const templateData = {
            semester_text: headerData.semester_text,           // Untuk "GANJIL" / "GENAP"
            thn_ajaran: headerData.thn_ajaran_masehi,           // Untuk "2024/2025 M."
            thn_ajaran_hijriah: headerData.thn_ajaran_hijriah, // Untuk "(1445/1446 H.)"
            nama: data.siswa?.nama || 'N/A',
            no_induk: data.siswa?.nis || 'N/A',
            kota_asal: data.siswa?.tempat_lahir || 'N/A',
            kelas: data.siswa?.kelas?.nama_kelas || 'N/A',
            wali_kelas: data.siswa?.kelas?.walikelas?.nama || 'N/A',
            nip_wali_kelas: data.siswa?.kelas?.walikelas?.nip || '-',
            kepala_pesantren: data.kepalaPesantren?.nama || 'N/A',
            nip_kepala_pesantren: data.kepalaPesantren?.nip || 'N/A',
            
            mapel: nilaiUjian.map((n, i) => ({
                no: i + 1,
                nama_mapel: n.mapel_text || n.mapel?.nama_mapel || 'Mapel Dihapus',
                kitab: findKitab(n.mapel_id),
                predikat: n.predikat || '-'
            })),

            jml_nilai: 'N/A',
            rata_akhir: 'N/A',
            pred_akhir: 'N/A',
            peringkat: peringkat,
            total_siswa: total_siswa,

            hafalan: data.nilaiHafalans.map((n, i) => ({
                no: i + 1,
                nama: n.nama_mapel_hafalan || n.mapel_text || n.mapel?.nama_mapel || 'Mapel Dihapus',
                kitab: n.nama_kitab || findKitab(n.mapel_id) || '-',
                batas: n.batas || '-',
                predikat: n.predikat || '-' 
            })),
            kehadiran: data.kehadirans.map((k, i) => ({ // <-- Tambahkan 'i' untuk index
                no: i + 1, // <-- TAMBAHKAN BARIS INI
                kegiatan: k.indikator_text,
                izin: k.izin || 0,
                sakit: k.sakit || 0,
                absen: k.absen || 0,
                total: (k.izin || 0) + (k.sakit || 0) + (k.absen || 0)
            })),
            // catatan wali kelas: prefer history (SiswaKelasHistory) fields if available
            catatan_akademik: data.history?.catatan_akademik || '',
            catatan_sikap: data.history?.catatan_sikap || '',
        };

        // --- Logika untuk menambahkan gambar tanda tangan ke templateData ---
        // 1. Tanda Tangan Wali Kelas
        const placeholderTtd = fs.existsSync(PLACEHOLDER_TTD_PATH) 
            ? fs.readFileSync(PLACEHOLDER_TTD_PATH) 
            : null;

        // 1. Proses Tanda Tangan Wali Kelas
        templateData.ttd_walikelas = placeholderTtd; // Selalu mulai dengan placeholder
        // Cek apakah semua data yang dibutuhkan ada
        if (data && data.siswa && data.siswa.kelas && data.siswa.kelas.walikelas && data.siswa.kelas.walikelas.tanda_tangan) {
            const ttdWaliPath = path.resolve(__dirname, `../uploads/signatures/${data.siswa.kelas.walikelas.tanda_tangan}`);
            if (fs.existsSync(ttdWaliPath)) {
                templateData.ttd_walikelas = fs.readFileSync(ttdWaliPath);
            }
        }

    // Kepala pesantren TIDAK disertakan sebagai tanda tangan pada laporan sesuai kebijakan
    // Hanya wali kelas (guru) yang memberikan tanda tangan. Jika template membutuhkan
    // ruang tanda tangan kepala, gunakan placeholder di sisi template.

        let outputBuffer = await generateDocx('nilai.docx', templateData);
        let contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        let extension = 'docx';

        if (format === 'pdf') {
            outputBuffer = await libre.convertAsync(outputBuffer, '.pdf', undefined);
            contentType = 'application/pdf';
            extension = 'pdf';
        }

        const fileName = `Raport_Nilai_${data.siswa.nama.replace(/\s+/g, '_')}.${extension}`;
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', contentType);
        res.send(outputBuffer);

    } catch (error) {
        console.error("Error generating nilai report:", error);
        res.status(500).json({ message: "Gagal membuat laporan nilai", error: error.message });
    }
};

/**
 * =================================================================
 * LAPORAN SIKAP (DIREVISI)
 * =================================================================
 */
exports.generateSikapReport = async (req, res) => {
    try {
        const { siswaId, semester, tahunAjaranId } = req.params;
        const { format } = req.query;

        const data = await getFullRaportData(siswaId, semester, tahunAjaranId);
        const headerData = getDynamicHeaderData(data.tahunAjaran);
        
        // 1. Ambil Catatan Wali Kelas
        const catatanWaliKelasRecords = data.sikaps.filter(s => s.indikator_text === 'Catatan Wali Kelas' && s.deskripsi);
        const latestCatatan = catatanWaliKelasRecords.pop(); // Ambil yang paling baru
        const catatanWaliKelasText = latestCatatan?.deskripsi || 'Teruslah beristiqomah dalam ibadah dan berakhlak mulia.'; // Catatan spesifik

        // 2. Ambil data sikap yang memiliki nilai (di luar catatan)
        const scoredSikaps = data.sikaps.filter(s => s.indikator_text !== 'Catatan Wali Kelas' && s.nilai !== null);

        // 3. Kategorikan dan hitung rata-rata
        const sikapSpiritual = scoredSikaps.filter(s => s.indikator_sikap?.jenis_sikap === 'Spiritual');
        const sikapSosial = scoredSikaps.filter(s => s.indikator_sikap?.jenis_sikap === 'Sosial');
        const rataSpiritual = calculateAverage(sikapSpiritual, 'nilai');
        const rataSosial = calculateAverage(sikapSosial, 'nilai');
        const nilaiAkhir = calculateAverage(scoredSikaps, 'nilai');

        const templateData = {
            ...headerData,
            semester: data.tahunAjaran?.semester || 'N/A',
            thn_ajaran: data.tahunAjaran?.nama_ajaran || 'N/A',
            nama: data.siswa?.nama || 'N/A',
            ttl: `${data.siswa?.tempat_lahir || ''}, ${formatTanggal(data.siswa?.tanggal_lahir)}`,
            no_induk: data.siswa?.nis || 'N/A',
            kamar: data.siswa?.infoKamar?.nama_kamar || 'N/A',
            wali_kelas: data.siswa?.kelas?.walikelas?.nama || 'N/A',
            nip_wali_kelas: data.siswa?.kelas?.walikelas?.nip || 'N/A',
            kepala_pesantren: data.kepalaPesantren?.nama || 'N/A', 
            nip_kepala_pesantren: data.kepalaPesantren?.nip || 'N/A',

            // Loop untuk sikap spiritual menggunakan indikator_text
            // --- PERBAIKAN UTAMA ---
            // Data untuk tabel nilai sikap
            sikap_s: sikapSpiritual.map((s, i) => ({
                no: i + 1,
                indikator: s.indikator_text,
                angka: s.nilai,
                predikat: getPredicate(s.nilai)
            })),
            sikap_o: sikapSosial.map((s, i) => ({
                no: i + 1,
                indikator: s.indikator_text,
                angka: s.nilai,
                predikat: getPredicate(s.nilai)
            })),

            // HANYA data untuk Catatan Wali Kelas
            deskripsi_catatan_walikelas: catatanWaliKelasText,

            // Data untuk rekap nilai
            rata_ss: rataSpiritual,
            pred_ss: getPredicate(rataSpiritual),
            rata_so: rataSosial,
            pred_so: getPredicate(rataSosial),
            nilai_akhir_sikap: nilaiAkhir,
            pred_akhir_sikap: getPredicate(nilaiAkhir)
        };

        const placeholderTtd = fs.existsSync(PLACEHOLDER_TTD_PATH) 
            ? fs.readFileSync(PLACEHOLDER_TTD_PATH) 
            : null;

        let ttdWaliBuffer = placeholderTtd;
        if (data.siswa?.kelas?.walikelas?.tanda_tangan) {
            const ttdWaliPath = path.resolve(__dirname, `../uploads/signatures/${data.siswa.kelas.walikelas.tanda_tangan}`);
            if (fs.existsSync(ttdWaliPath)) {
                ttdWaliBuffer = fs.readFileSync(ttdWaliPath);
            }
        }
        templateData.ttd_walikelas = ttdWaliBuffer;

    // Jangan sertakan ttd kepala pesantren, sisakan hanya ttd_walikelas di templateData
        
        let outputBuffer = await generateDocx('sikap.docx', templateData);
        let contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        let extension = 'docx';

        if (format === 'pdf') {
            outputBuffer = await libre.convertAsync(outputBuffer, '.pdf', undefined);
            contentType = 'application/pdf';
            extension = 'pdf';
        }
        
        const fileName = `Raport_Sikap_${data.siswa.nama.replace(/\s+/g, '_')}.${extension}`;
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', contentType);
        res.send(outputBuffer);

    } catch (error) {
        console.error("Error generating sikap report:", error);
        res.status(500).json({ message: "Gagal membuat laporan sikap", error: error.message });
    }
};

// Controller untuk generate Identitas (tanpa perubahan, disertakan untuk kelengkapan)
exports.generateIdentitas = async (req, res) => {
    const { siswaId } = req.params;
    const { format = 'docx' } = req.query;

    try {
        const siswa = await db.Siswa.findByPk(siswaId, {
            include: [{ 
                model: db.Kelas, 
                as: 'kelas', 
                include: [{ model: db.Guru, as: 'walikelas' }] // Menggunakan db.Guru
            }]
        });
        if (!siswa) return res.status(404).json({ message: 'Data siswa tidak ditemukan.' });

        const kepalaPesantren = await db.KepalaPesantren.findOne();

        // --- PERBAIKAN DI SINI ---
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
            
            // Placeholder disamakan dengan rapor nilai & sikap
            kepala_pesantren: kepalaPesantren?.nama || '-', 
            nip_kepala_pesantren: kepalaPesantren?.nip || '-', // Placeholder NIP ditambahkan

            tgl_raport: formatTanggal(new Date()),
            kamar: siswa.kamar || '-',
            kota_asal: siswa.kota_asal || '-'
        };

        if (siswa.kelas?.walikelas?.tanda_tangan) {
            const ttdWaliPath = path.resolve(__dirname, `../uploads/signatures/${siswa.kelas.walikelas.tanda_tangan}`);
            if (fs.existsSync(ttdWaliPath)) {
                templateData.ttd_walikelas = fs.readFileSync(ttdWaliPath);
            }
        }
        if (kepalaPesantren?.tanda_tangan) {
            const ttdKepsekPath = path.resolve(__dirname, `../uploads/signatures/${kepalaPesantren.tanda_tangan}`);
            if (fs.existsSync(ttdKepsekPath)) {
                templateData.ttd_kepsek = fs.readFileSync(ttdKepsekPath);
            }
        }

        let outputBuffer = await generateDocx('identitas.docx', templateData);
        let contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        let extension = 'docx';

        if (format === 'pdf') {
            outputBuffer = await libre.convertAsync(outputBuffer, '.pdf', undefined);
            contentType = 'application/pdf';
            extension = 'pdf';
        }

        const fileName = `Identitas_${siswa.nama.replace(/\s+/g, '_')}.${extension}`;
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', contentType);
        res.send(outputBuffer);

    } catch (error) {
        console.error("Gagal membuat identitas:", error);
        res.status(500).json({ message: 'Terjadi kesalahan saat membuat identitas.', error: error.message });
    }
};