const db = require('../models');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');
const libre = require('libreoffice-convert');
libre.convertAsync = require('util').promisify(libre.convert);

// --- Helper Functions ---
const getPredicate = (nilai) => {
    if (nilai >= 90) return 'A';
    if (nilai >= 80) return 'B';
    if (nilai >= 70) return 'C';
    if (nilai >= 60) return 'D';
    if (nilai === null || nilai === undefined) return '-';
    return 'E';
};

const calculateAverage = (arr, key) => {
    if (!arr || arr.length === 0) return 0;
    const total = arr.reduce((sum, item) => sum + (parseFloat(item[key]) || 0), 0);
    return (total / arr.length).toFixed(2);
};

const formatTanggal = (tanggal) => {
    if (!tanggal) return '-';
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const date = new Date(tanggal);
    return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
};

async function getFullRaportData(siswaId, semester, tahunAjaranId) {
    const siswa = await db.Siswa.findByPk(siswaId, {
        include: [{ model: db.Kelas, as: 'kelas', include: [{ model: db.WaliKelas, as: 'walikelas' }] }]
    });
    if (!siswa) throw new Error('Siswa tidak ditemukan');

    const tahunAjaran = await db.TahunAjaran.findByPk(tahunAjaranId);
    const kepalaPesantren = await db.KepalaPesantren.findOne();
    const commonWhere = { siswa_id: siswaId, semester, tahun_ajaran_id: tahunAjaranId };

    const [nilaiUjians, nilaiHafalans, sikaps, kehadirans] = await Promise.all([
        db.NilaiUjian.findAll({ where: commonWhere, include: [{ model: db.MataPelajaran, as: 'mapel' }] }),
        db.NilaiHafalan.findAll({ where: commonWhere, include: [{ model: db.MataPelajaran, as: 'mapel' }] }),
        db.Sikap.findAll({ where: commonWhere }),
        db.Kehadiran.findAll({ where: commonWhere })
    ]);

    return { siswa, tahunAjaran, kepalaPesantren, nilaiUjians, nilaiHafalans, sikaps, kehadirans };
}

async function generateDocx(templateName, data) {
    const templatePath = path.resolve(__dirname, `../uploads/templates/${templateName}`);
    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template ${templateName} tidak ditemukan di folder templates.`);
    }
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => "" });
    doc.render(data);
    return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// Controller untuk generate Laporan Nilai
exports.generateNilaiReport = async (req, res) => {
    try {
        const { siswaId, semester, tahunAjaranId } = req.params;
        const { format } = req.query;

        const data = await getFullRaportData(siswaId, semester, tahunAjaranId);

        // --- KALKULASI NILAI UJIAN UNTUK SUMMARY ---
        const nilaiUjian = data.nilaiUjians;
        const jumlahMapel = nilaiUjian.length > 0 ? nilaiUjian.length : 1;

        const jml_p = nilaiUjian.reduce((sum, n) => sum + (parseFloat(n.nilai_pengetahuan) || 0), 0);
        const jml_k = nilaiUjian.reduce((sum, n) => sum + (parseFloat(n.nilai_keterampilan) || 0), 0);

        const rata_p = (jml_p / jumlahMapel);
        const rata_k = (jml_k / jumlahMapel);
        const rata_akhir = (rata_p + rata_k) / 2;

        // --- KALKULASI PERINGKAT (LOGIKA TAMBAHAN) ---
        let peringkat = 'N/A';
        let total_siswa = 'N/A';
        const kelasId = data.siswa?.kelas?.id;

        if (kelasId) {
            const semuaNilaiDiKelas = await db.NilaiUjian.findAll({
                where: { semester, tahun_ajaran_id: tahunAjaranId },
                include: [{ model: db.Siswa, as: 'siswa', where: { kelas_id: kelasId } }]
            });

            const rataRataSiswa = {};
            semuaNilaiDiKelas.forEach(n => {
                const id = n.siswa_id;
                if (!rataRataSiswa[id]) {
                    rataRataSiswa[id] = { total: 0, count: 0 };
                }
                rataRataSiswa[id].total += (parseFloat(n.nilai_pengetahuan) || 0) + (parseFloat(n.nilai_keterampilan) || 0);
                rataRataSiswa[id].count += 2;
            });

            const peringkatList = Object.keys(rataRataSiswa).map(id => ({
                siswa_id: parseInt(id, 10),
                rata_akhir: (rataRataSiswa[id].total / rataRataSiswa[id].count)
            })).sort((a, b) => b.rata_akhir - a.rata_akhir);

            total_siswa = peringkatList.length;
            const rankIndex = peringkatList.findIndex(item => item.siswa_id === parseInt(siswaId, 10));
            if (rankIndex !== -1) {
                peringkat = rankIndex + 1;
            }
        }

        const templateData = {
            nama: data.siswa?.nama || 'N/A',
            no_induk: data.siswa?.nis || 'N/A',
            kota_asal: data.siswa?.kota_asal || 'N/A',
            kelas: data.siswa?.kelas?.nama_kelas || 'N/A',
            wali_kelas: data.siswa?.kelas?.walikelas?.nama || 'N/A',
            kepala_pesantren: data.kepalaPesantren?.nama || 'N/A',
            
            mapel: nilaiUjian.map((n, i) => ({
                no: i + 1,
                nama_mapel: n.mapel_text || n.mapel?.nama_mapel || 'Mapel Dihapus',
                kitab: n.mapel?.kitab || '-',
                p_angka: n.nilai_pengetahuan,
                p_predikat: getPredicate(n.nilai_pengetahuan),
                k_angka: n.nilai_keterampilan,
                k_predikat: getPredicate(n.nilai_keterampilan),
            })),

            // Menambahkan data kalkulasi
            jml_p: jml_p.toFixed(2),
            jml_k: jml_k.toFixed(2),
            rata_p: rata_p.toFixed(2),
            pred_p: getPredicate(rata_p),
            rata_k: rata_k.toFixed(2),
            pred_k: getPredicate(rata_k),
            rata_akhir: rata_akhir.toFixed(2),
            pred_akhir: getPredicate(rata_akhir),
            peringkat: peringkat,
            total_siswa: total_siswa,

            hafalan: data.nilaiHafalans.map((n, i) => ({
                no: i + 1,
                nama: n.mapel_text || n.mapel?.nama_mapel || 'Mapel Dihapus',
                kitab: n.mapel?.kitab || '-',
                nilai_angka: n.nilai,
                predikat: getPredicate(n.nilai)
            })),
            kehadiran: data.kehadirans.map((k) => ({
                kegiatan: k.indikator_text,
                izin: k.izin,
                sakit: k.sakit,
                absen: k.absen,
                total: k.izin + k.sakit + k.absen
            })),
        };

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

// Controller untuk generate Laporan Sikap
exports.generateSikapReport = async (req, res) => {
    try {
        const { siswaId, semester, tahunAjaranId } = req.params;
        const { format } = req.query;

        const data = await getFullRaportData(siswaId, semester, tahunAjaranId);
        
        const sikapSpiritual = data.sikaps.filter(s => s.jenis_sikap === 'Spiritual');
        const sikapSosial = data.sikaps.filter(s => s.jenis_sikap === 'Sosial');
        
        const rataSpiritual = calculateAverage(sikapSpiritual, 'nilai');
        const rataSosial = calculateAverage(sikapSosial, 'nilai');
        const nilaiAkhir = calculateAverage(data.sikaps, 'nilai');

        const templateData = {
            semester: data.tahunAjaran?.semester || 'N/A',
            thn_ajaran: data.tahunAjaran?.nama_ajaran || 'N/A',
            nama: data.siswa?.nama || 'N/A',
            ttl: `${data.siswa?.tempat_lahir || ''}, ${data.siswa?.tanggal_lahir ? new Date(data.siswa.tanggal_lahir).toLocaleDateString('id-ID') : ''}`,
            no_induk: data.siswa?.nis || 'N/A',
            kamar: data.siswa?.kamar || 'N/A',
            kepala_pesantren: data.kepalaPesantren?.nama || 'N/A',
            sikap_s: sikapSpiritual.map((s, i) => ({
                no: i + 1,
                indikator: s.indikator_text,
                angka: s.nilai,
                predikat: getPredicate(s.nilai)
            })),
            deskripsi_spiritual: sikapSpiritual.map(s => s.deskripsi).join('. '),
            sikap_o: sikapSosial.map((s, i) => ({
                no: i + 1,
                indikator: s.indikator_text,
                angka: s.nilai,
                predikat: getPredicate(s.nilai)
            })),
            deskripsi_sosial: sikapSosial.map(s => s.deskripsi).join('. '),
            rata_ss: rataSpiritual,
            pred_ss: getPredicate(rataSpiritual),
            rata_so: rataSosial,
            pred_so: getPredicate(rataSosial),
            nilai_akhir_sikap: nilaiAkhir,
            pred_akhir_sikap: getPredicate(nilaiAkhir)
        };
        
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

exports.generateIdentitas = async (req, res) => {
    const { siswaId } = req.params;
    const { format = 'docx' } = req.query;

    try {
        const siswa = await db.Siswa.findByPk(siswaId, {
            include: [{ model: db.Kelas, as: 'kelas', include: [{ model: db.WaliKelas, as: 'walikelas' }] }]
        });
        if (!siswa) return res.status(404).json({ message: 'Data siswa tidak ditemukan.' });
        
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