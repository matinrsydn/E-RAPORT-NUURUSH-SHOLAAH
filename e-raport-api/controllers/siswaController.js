// e-raport-api/controllers/siswaController.js
const db = require('../models');

// Helper: parse a date-like value into a JS Date or return null for empty/invalid
function parseValidDate(value) {
    if (value === undefined || value === null || value === '') return null;
    // If already a Date
    if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value;
    }
    // Try to parse string/number
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

// Mengambil SEMUA siswa dengan data kelas dan wali kelas yang benar
exports.getAllSiswa = async (req, res) => {
    try {
        const siswas = await db.Siswa.findAll({
            order: [['nama', 'ASC']],
            include: [
                {
                    model: db.Kelas,
                    as: 'kelas',
                    attributes: ['nama_kelas'],
                    required: false,
                    // Lakukan join tambahan dari Kelas ke Guru untuk mendapatkan nama Wali Kelas
                    include: [{
                        model: db.Guru,
                        as: 'walikelas', // Alias ini berasal dari model Kelas
                        attributes: ['nama'],
                        required: false
                    }]
                },
                {
                    model: db.Kamar,
                    as: 'infoKamar',
                    attributes: ['nama_kamar'],
                    required: false
                }
            ]
        });
        res.status(200).json(siswas);

    } catch (error) {
        console.error("SERVER ERROR - GET /api/siswa:", error);
        res.status(500).json({ message: "Gagal mengambil data siswa.", error: error.message });
    }
};

// Mengambil SATU siswa dengan data yang sama (untuk cetak)
exports.getSiswaById = async (req, res) => {
    try {
        console.log(`➡️ Controller getSiswaById called with id=${req.params.id}`);
        // Mirror the includes used in getAllSiswa to avoid invalid include entries
        const siswa = await db.Siswa.findByPk(req.params.id, {
            include: [
                {
                    model: db.Kelas,
                    as: 'kelas',
                    attributes: ['nama_kelas'],
                    required: false,
                    include: [
                        {
                            model: db.Guru,
                            as: 'walikelas',
                            attributes: ['nama'],
                            required: false,
                        },
                    ],
                },
                {
                    model: db.Kamar,
                    as: 'infoKamar',
                    attributes: ['nama_kamar'],
                    required: false,
                },
            ],
        });
        if (!siswa) return res.status(404).json({ message: "Siswa tidak ditemukan" });
        res.json(siswa);
    } catch (error) {
        console.error(`SERVER ERROR - GET /api/siswa/${req.params.id}:`, error);
        res.status(500).json({ message: "Gagal mengambil data siswa", error: error.message });
    }
};

// --- FUNGSI CREATE, UPDATE, DELETE (TIDAK PERLU DIUBAH) ---

exports.createSiswa = async (req, res) => {
    try {
        // Sanitize payload to avoid passing invalid datetime strings to MySQL
        const payload = { ...req.body };
        // Enforce tahun_ajaran_id presence
        const tahunAjaranIdRaw = payload.tahun_ajaran_id || payload.tahunAjaranId || null;
        if (!tahunAjaranIdRaw) {
            return res.status(400).json({ message: 'tahun_ajaran_id is required when creating a siswa' });
        }
        if ('tanggal_lahir' in payload) {
            const parsed = parseValidDate(payload.tanggal_lahir);
            if (payload.tanggal_lahir && !parsed) {
                return res.status(400).json({ message: "Format tanggal_lahir tidak valid", error: `Invalid value: ${payload.tanggal_lahir}` });
            }
            payload.tanggal_lahir = parsed; // null or Date
        }

        // Create siswa record
        const newSiswa = await db.Siswa.create(payload);

        // Determine kelas for history: prefer payload.kelas_id, then payload.kelas_id_masuk, fall back to created record
        const kelasForHistory = payload.kelas_id ?? payload.kelas_id_masuk ?? newSiswa.kelas_id;

        // Create history entry; fail the request if configured to do so
        let createdHistory = null;
        try {
            createdHistory = await db.SiswaKelasHistory.create({
                siswa_id: newSiswa.id,
                kelas_id: Number(kelasForHistory),
                tahun_ajaran_id: Number(tahunAjaranIdRaw),
                note: 'masuk'
            });
        } catch (histErr) {
            console.error('ERROR: failed to create SiswaKelasHistory for new siswa:', histErr);
            const failOnHist = (process.env.FAIL_ON_HISTORY_ERROR || '').toLowerCase() === 'true';
            if (failOnHist) {
                // attempt to rollback the created siswa to avoid partial state
                try { await db.Siswa.destroy({ where: { id: newSiswa.id } }); } catch(e) { console.error('Failed to rollback siswa after history error', e); }
                return res.status(500).json({ message: 'Failed to create siswa history', error: histErr.message });
            }
            // otherwise, leave createdSiswa and return warning
        }

        return res.status(201).json({ siswa: newSiswa, history: createdHistory });
    } catch (error) {
        console.error('SERVER ERROR - POST /api/siswa:', error);
        res.status(400).json({ message: "Gagal membuat siswa", error: error.message });
    }
};

exports.updateSiswa = async (req, res) => {
    try {
        // Sanitize payload to avoid database datetime errors
        const payload = { ...req.body };
        if ('tanggal_lahir' in payload) {
            const parsed = parseValidDate(payload.tanggal_lahir);
            if (payload.tanggal_lahir && !parsed) {
                return res.status(400).json({ message: "Format tanggal_lahir tidak valid", error: `Invalid value: ${payload.tanggal_lahir}` });
            }
            payload.tanggal_lahir = parsed; // null or Date
        }

        const [updated] = await db.Siswa.update(payload, { where: { id: req.params.id } });
        if (updated) {
            const updatedSiswa = await db.Siswa.findByPk(req.params.id);
            return res.status(200).json(updatedSiswa);
        }
        throw new Error('Siswa tidak ditemukan');
    } catch (error) {
        console.error(`SERVER ERROR - PUT /api/siswa/${req.params.id}:`, error);
        // If it's a validation/DB error, respond 400, otherwise 404 when not found
        if (error.message && /datetime|Invalid date|Incorrect datetime/i.test(error.message)) {
            return res.status(400).json({ message: "Format tanggal_lahir tidak valid", error: error.message });
        }
        res.status(404).json({ message: "Siswa tidak ditemukan", error: error.message });
    }
};

exports.deleteSiswa = async (req, res) => {
    try {
        const deleted = await db.Siswa.destroy({ where: { id: req.params.id } });
        if (deleted) return res.status(204).send();
        throw new Error('Siswa tidak ditemukan');
    } catch (error) {
        res.status(404).json({ message: "Siswa tidak ditemukan", error: error.message });
    }
};