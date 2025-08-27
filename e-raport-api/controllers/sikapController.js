// e-raport-api/controllers/sikapController.js - VERSI DIPERBAIKI
const db = require('../models');
const Sikap = db.Sikap;
const Siswa = db.Siswa;
const IndikatorSikap = db.IndikatorSikap;
const { Op } = require("sequelize");

// 🔥 FUNGSI HELPER UNTUK KONVERSI NILAI KE PREDIKAT
const nilaiSikapKePredikat = (angka) => {
    if (angka === null || angka === undefined || isNaN(angka)) return '-';
    if (angka > 8.0) return 'Baik Sekali';
    if (angka > 7.0) return 'Baik';
    if (angka > 6.0) return 'Cukup';
    return 'Kurang';
};

// --- FUNGSI UNTUK MENYIMPAN BANYAK NILAI SIKAP SEKALIGUS (BULK) ---
exports.bulkUpdateOrInsertSikap = async (req, res) => {
    const sikapBatch = req.body;
    const transaction = await db.sequelize.transaction();

    try {
        if (!Array.isArray(sikapBatch) || sikapBatch.length === 0) {
            return res.status(400).json({ message: "Data yang dikirim tidak valid." });
        }

        for (const sikap of sikapBatch) {
            // Hanya proses jika ada nilai yang diinput (tidak kosong)
            if (sikap.angka !== null && sikap.angka !== undefined) {
                
                // 🔥 VALIDASI: Pastikan indikator_sikap_id ada
                if (!sikap.indikator_sikap_id) {
                    throw new Error(`indikator_sikap_id wajib diisi untuk siswa_id: ${sikap.siswa_id}`);
                }

                await Sikap.upsert({
                    siswa_id: sikap.siswa_id,
                    indikator_sikap_id: sikap.indikator_sikap_id, // 🔥 GUNAKAN FOREIGN KEY
                    angka: sikap.angka, // 🔥 NILAI ANGKA
                    deskripsi: sikap.deskripsi || '',
                    catatan_wali_kelas: sikap.catatan_wali_kelas || '',
                    semester: sikap.semester,
                    tahun_ajaran: sikap.tahun_ajaran,
                    wali_kelas_id: sikap.wali_kelas_id,
                    kelas_id: sikap.kelas_id
                }, {
                    transaction
                });
            }
        }

        await transaction.commit();
        res.status(200).json({ message: "Nilai sikap berhasil disimpan." });

    } catch (error) {
        await transaction.rollback();
        console.error("Error saat bulk update nilai sikap:", error);
        res.status(500).json({ message: "Terjadi kesalahan di server.", error: error.message });
    }
};

// --- FUNGSI UNTUK MENGAMBIL SISWA DAN NILAI SIKAP BERDASARKAN FILTER ---
exports.getSiswaWithSikapByFilter = async (req, res) => {
    const { kelas_id, jenis_sikap, semester, tahun_ajaran } = req.query;

    if (!kelas_id || !jenis_sikap || !semester || !tahun_ajaran) {
        return res.status(400).json({ message: "Semua filter harus diisi." });
    }

    try {
        const siswaList = await Siswa.findAll({
            where: { kelas_id: kelas_id },
            include: [{
                model: Sikap,
                as: 'sikap',
                where: {
                    semester: semester,
                    tahun_ajaran: tahun_ajaran
                },
                include: [{
                    model: IndikatorSikap,
                    as: 'indikator_sikap',
                    where: { jenis_sikap: jenis_sikap }
                }],
                required: false // LEFT JOIN, agar siswa tetap tampil meskipun belum ada nilai
            }],
            order: [['nama', 'ASC']]
        });

        // 🔥 TRANSFORM DATA: Tambahkan perhitungan rata-rata dan predikat
        const transformedData = siswaList.map(siswa => {
            const sikapData = siswa.sikap || [];
            const totalNilai = sikapData.reduce((sum, s) => sum + (parseFloat(s.angka) || 0), 0);
            const rataRata = sikapData.length > 0 ? (totalNilai / sikapData.length).toFixed(2) : 0;
            
            return {
                ...siswa.toJSON(),
                sikap_summary: {
                    total_indikator: sikapData.length,
                    rata_rata: parseFloat(rataRata),
                    predikat: nilaiSikapKePredikat(rataRata),
                    detail: sikapData.map(s => ({
                        indikator: s.indikator_sikap?.indikator,
                        angka: s.angka,
                        predikat: nilaiSikapKePredikat(s.angka),
                        deskripsi: s.deskripsi
                    }))
                }
            };
        });

        res.status(200).json(transformedData);
    } catch (error) {
        console.error("Error fetching siswa with sikap:", error);
        res.status(500).json({ message: "Gagal mengambil data siswa.", error: error.message });
    }
};

// --- FUNGSI UNTUK MENGAMBIL DESKRIPSI SIKAP SISWA BERDASARKAN FILTER ---
exports.getDeskripsiSikapByFilter = async (req, res) => {
    const { siswa_id, semester, tahun_ajaran } = req.query;

    if (!siswa_id || !semester || !tahun_ajaran) {
        return res.status(400).json({ message: "Semua filter harus diisi." });
    }

    try {
        const semuaSikap = await Sikap.findAll({
            where: {
                siswa_id: siswa_id,
                semester: semester,
                tahun_ajaran: tahun_ajaran
            },
            include: [{
                model: IndikatorSikap,
                as: 'indikator_sikap'
            }]
        });

        // 🔥 PISAHKAN BERDASARKAN JENIS SIKAP
        const sikapSpiritual = semuaSikap.filter(s => s.indikator_sikap?.jenis_sikap === 'spiritual');
        const sikapSosial = semuaSikap.filter(s => s.indikator_sikap?.jenis_sikap === 'sosial');

        // 🔥 HITUNG RATA-RATA
        const hitungRataRata = (daftarSikap) => {
            if (daftarSikap.length === 0) return 0;
            const total = daftarSikap.reduce((sum, s) => sum + (parseFloat(s.angka) || 0), 0);
            return (total / daftarSikap.length).toFixed(2);
        };

        const rataSpiritual = hitungRataRata(sikapSpiritual);
        const rataSosial = hitungRataRata(sikapSosial);

        // 🔥 AMBIL CATATAN WALI KELAS (ambil yang pertama jika ada)
        const catatanWaliKelas = semuaSikap.length > 0 ? semuaSikap[0].catatan_wali_kelas || '' : '';

        res.status(200).json({
            spiritual: {
                rata_rata: parseFloat(rataSpiritual),
                predikat: nilaiSikapKePredikat(rataSpiritual),
                indikator: sikapSpiritual.map(s => ({
                    id: s.id,
                    indikator: s.indikator_sikap?.indikator,
                    angka: s.angka,
                    predikat: nilaiSikapKePredikat(s.angka),
                    deskripsi: s.deskripsi
                }))
            },
            sosial: {
                rata_rata: parseFloat(rataSosial),
                predikat: nilaiSikapKePredikat(rataSosial),
                indikator: sikapSosial.map(s => ({
                    id: s.id,
                    indikator: s.indikator_sikap?.indikator,
                    angka: s.angka,
                    predikat: nilaiSikapKePredikat(s.angka),
                    deskripsi: s.deskripsi
                }))
            },
            catatan_wali_kelas: catatanWaliKelas,
            nilai_akhir_sikap: ((parseFloat(rataSpiritual) + parseFloat(rataSosial)) / 2).toFixed(2),
            predikat_akhir: nilaiSikapKePredikat((parseFloat(rataSpiritual) + parseFloat(rataSosial)) / 2)
        });
    } catch (error) {
        console.error("Error fetching deskripsi sikap:", error);
        res.status(500).json({ message: "Gagal mengambil deskripsi sikap.", error: error.message });
    }
};

// --- FUNGSI UNTUK UPDATE CATATAN WALI KELAS ---
exports.updateCatatanWaliKelas = async (req, res) => {
    const { siswa_id, semester, tahun_ajaran, catatan_wali_kelas } = req.body;
    const transaction = await db.sequelize.transaction();

    try {
        if (!siswa_id || !semester || !tahun_ajaran) {
            return res.status(400).json({ message: "Data input tidak lengkap." });
        }

        // Update semua record sikap untuk siswa tersebut dengan catatan yang sama
        await Sikap.update(
            { catatan_wali_kelas: catatan_wali_kelas },
            {
                where: {
                    siswa_id: siswa_id,
                    semester: semester,
                    tahun_ajaran: tahun_ajaran
                },
                transaction
            }
        );

        await transaction.commit();
        res.status(200).json({ message: "Catatan wali kelas berhasil diperbarui." });

    } catch (error) {
        await transaction.rollback();
        console.error("Error saat update catatan wali kelas:", error);
        res.status(500).json({ message: "Terjadi kesalahan di server.", error: error.message });
    }
};

// --- FUNGSI UNTUK MENDAPATKAN TEMPLATE NILAI SIKAP ---
exports.getTemplateSikapBySiswa = async (req, res) => {
    const { siswa_id, semester, tahun_ajaran, jenis_sikap } = req.query;

    try {
        // Ambil semua indikator untuk jenis sikap tertentu
        const indikatorList = await IndikatorSikap.findAll({
            where: { jenis_sikap: jenis_sikap },
            order: [['indikator', 'ASC']]
        });

        // Ambil nilai yang sudah ada (jika ada)
        const existingSikap = await Sikap.findAll({
            where: {
                siswa_id: siswa_id,
                semester: semester,
                tahun_ajaran: tahun_ajaran
            },
            include: [{
                model: IndikatorSikap,
                as: 'indikator_sikap',
                where: { jenis_sikap: jenis_sikap }
            }]
        });

        // Gabungkan template dengan nilai yang sudah ada
        const template = indikatorList.map(indikator => {
            const existing = existingSikap.find(s => s.indikator_sikap_id === indikator.id);
            return {
                indikator_sikap_id: indikator.id,
                indikator: indikator.indikator,
                jenis_sikap: indikator.jenis_sikap,
                angka: existing ? existing.angka : null,
                deskripsi: existing ? existing.deskripsi : '',
                predikat: existing ? nilaiSikapKePredikat(existing.angka) : '-'
            };
        });

        res.status(200).json(template);
    } catch (error) {
        console.error("Error getting template sikap:", error);
        res.status(500).json({ message: "Gagal mengambil template sikap.", error: error.message });
    }
};

// --- FUNGSI-FUNGSI CRUD STANDAR (DIPERBARUI) ---

// 1. Membuat satu entri nilai sikap baru
exports.createSikap = async (req, res) => {
    try {
        const { siswa_id, indikator_sikap_id, angka, semester, tahun_ajaran } = req.body;
        
        if (!siswa_id || !indikator_sikap_id || !semester || !tahun_ajaran) {
            return res.status(400).json({ message: "Data input tidak lengkap." });
        }
        
        const newSikap = await Sikap.create(req.body);
        
        // Include indikator_sikap untuk response
        const sikapWithIndikator = await Sikap.findByPk(newSikap.id, {
            include: [{ model: IndikatorSikap, as: 'indikator_sikap' }]
        });
        
        res.status(201).json(sikapWithIndikator);
    } catch (error) {
        console.error("Error membuat nilai sikap:", error);
        res.status(500).json({ message: "Gagal membuat entri nilai sikap baru.", error: error.message });
    }
};

// 2. Mengambil semua data nilai sikap (termasuk nama siswa dan indikator)
exports.getAllSikap = async (req, res) => {
    try {
        const allSikap = await Sikap.findAll({
            include: [
                { model: Siswa, as: 'siswa', attributes: ['nama', 'nis'] },
                { model: IndikatorSikap, as: 'indikator_sikap' }
            ],
            order: [['tahun_ajaran', 'DESC'], ['semester', 'DESC']]
        });
        res.status(200).json(allSikap);
    } catch (error) {
        console.error("Error mengambil semua nilai sikap:", error);
        res.status(500).json({ message: "Gagal mengambil data nilai sikap.", error: error.message });
    }
};

// 3. Mengambil satu entri nilai sikap berdasarkan ID
exports.getSikapById = async (req, res) => {
    try {
        const { id } = req.params;
        const sikap = await Sikap.findByPk(id, {
            include: [
                { model: Siswa, as: 'siswa' },
                { model: IndikatorSikap, as: 'indikator_sikap' }
            ]
        });
        
        if (!sikap) {
            return res.status(404).json({ message: "Data nilai sikap tidak ditemukan." });
        }
        
        res.status(200).json(sikap);
    } catch (error) {
        console.error("Error mengambil nilai sikap by ID:", error);
        res.status(500).json({ message: "Gagal mengambil data nilai sikap.", error: error.message });
    }
};

// 4. Memperbarui satu entri nilai sikap berdasarkan ID
exports.updateSikap = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await Sikap.update(req.body, {
            where: { id: id }
        });
        
        if (updated) {
            const updatedSikap = await Sikap.findByPk(id, {
                include: [{ model: IndikatorSikap, as: 'indikator_sikap' }]
            });
            res.status(200).json({ message: "Nilai sikap berhasil diperbarui.", data: updatedSikap });
        } else {
            res.status(404).json({ message: "Data nilai sikap tidak ditemukan." });
        }
    } catch (error) {
        console.error("Error memperbarui nilai sikap:", error);
        res.status(500).json({ message: "Gagal memperbarui nilai sikap.", error: error.message });
    }
};

// 5. Menghapus satu entri nilai sikap berdasarkan ID
exports.deleteSikap = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Sikap.destroy({
            where: { id: id }
        });
        
        if (deleted) {
            res.status(200).json({ message: "Nilai sikap berhasil dihapus." });
        } else {
            res.status(404).json({ message: "Data nilai sikap tidak ditemukan." });
        }
    } catch (error) {
        console.error("Error menghapus nilai sikap:", error);
        res.status(500).json({ message: "Gagal menghapus nilai sikap.", error: error.message });
    }
};