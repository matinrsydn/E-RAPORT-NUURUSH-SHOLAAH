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
    // support optional filters: ?kelas_id=, ?master_ta_id=, ?tahun_ajaran_id= and ?tingkatan_id=
    const { kelas_id, master_ta_id, tingkatan_id, tahun_ajaran_id } = req.query;
    // If frontend provides a PeriodeAjaran id (tahun_ajaran_id), prefer using it to derive master_tahun_ajaran_id and semester
    let derivedMasterTaId = null;
    let derivedSemester = null;
    if (tahun_ajaran_id) {
        try {
            const periode = await db.PeriodeAjaran.findByPk(Number(tahun_ajaran_id));
            if (periode) {
                derivedMasterTaId = periode.master_tahun_ajaran_id || (periode.master && periode.master.id) || null;
                derivedSemester = periode.semester ? String(periode.semester) : null;
            }
        } catch (e) {
            // ignore and continue without derived periode
            console.warn('Invalid tahun_ajaran_id provided to getAllSiswa:', tahun_ajaran_id, e && e.message);
        }
    }
        const showAll = req.query.show_all === 'true' || req.query.include_all === 'true';
        const where = {};
        if (kelas_id) where.kelas_id = isNaN(Number(kelas_id)) ? kelas_id : Number(kelas_id);

        const kelasInclude = {
            model: db.Kelas,
            as: 'kelas',
            attributes: ['id', 'nama_kelas', 'tingkatan_id'],
            required: false,
            include: [
                {
                    model: db.Guru,
                    as: 'walikelas',
                    attributes: ['nama'],
                    required: false
                }
            ]
        };
        // If tingkatan_id provided, filter kelas by tingkatan
        if (tingkatan_id) {
            kelasInclude.where = { tingkatan_id: isNaN(Number(tingkatan_id)) ? tingkatan_id : Number(tingkatan_id) };
            // also allow top-level where to filter siswa by kelas via provided kelas_id if present
        }

        const include = [ kelasInclude,
            {
                model: db.Kamar,
                as: 'infoKamar',
                attributes: ['nama_kamar'],
                required: false
            }
        ];

        // If master_ta_id is provided, include SiswaKelasHistory.
        // Default behavior: required: true (only return siswa who have history for that master TA).
        // If client requests show_all=true, use required: false and add a hasHistory flag on each siswa.
        // prefer derivedMasterTaId (from tahun_ajaran_id param) over master_ta_id query param
        const effectiveMasterTa = derivedMasterTaId || (master_ta_id ? (isNaN(Number(master_ta_id)) ? master_ta_id : Number(master_ta_id)) : null);
        if (effectiveMasterTa) {
            const whereHistory = {};
            whereHistory.master_tahun_ajaran_id = effectiveMasterTa;
            if (kelas_id) whereHistory.kelas_id = isNaN(Number(kelas_id)) ? kelas_id : Number(kelas_id);
            if (derivedSemester) whereHistory.semester = String(derivedSemester);

            // Build histories include: include masterTahunAjaran to provide nama_ajaran if available
            const historyInclude = {
                model: db.SiswaKelasHistory,
                as: 'histories',
                where: whereHistory,
                required: !showAll,
                attributes: ['id', 'master_tahun_ajaran_id', 'kelas_id', 'semester', 'note', 'catatan_akademik', 'catatan_sikap'],
                include: [
                    {
                        model: db.MasterTahunAjaran,
                        as: 'masterTahunAjaran',
                        attributes: ['id', 'nama_ajaran'],
                        required: false
                    }
                ]
            };

            include.push(historyInclude);
        }

        const siswas = await db.Siswa.findAll({ where, order: [['nama', 'ASC']], include });

        // Attach latest history (currentHistory) per siswa so frontend can render the student's actual TA
        try {
            const siswaIds = siswas.map(s => s.id);
            if (siswaIds.length > 0) {
                // If caller provided a periode/year filter, only fetch histories for that periode (master TA + semester) so we attach the correct record
                const historiesWhere = { siswa_id: siswaIds };
                const effectiveMasterForAttach = derivedMasterTaId || (master_ta_id ? (isNaN(Number(master_ta_id)) ? master_ta_id : Number(master_ta_id)) : null);
                if (effectiveMasterForAttach) historiesWhere.master_tahun_ajaran_id = effectiveMasterForAttach;
                if (derivedSemester) historiesWhere.semester = String(derivedSemester);

                const histories = await db.SiswaKelasHistory.findAll({ where: historiesWhere, order: [['id', 'DESC']], include: [{ model: db.MasterTahunAjaran, as: 'masterTahunAjaran', attributes: ['id','nama_ajaran'], required: false }] });
                const latestBySiswa = new Map();
                for (const h of histories) {
                    if (!latestBySiswa.has(h.siswa_id)) latestBySiswa.set(h.siswa_id, h);
                }
                // attach
                for (const s of siswas) {
                    const plain = s.toJSON ? s.toJSON() : s;
                    const latest = latestBySiswa.get(s.id) || null;
                    if (latest) {
                        const master = latest.masterTahunAjaran ? { id: latest.masterTahunAjaran.id, nama_ajaran: latest.masterTahunAjaran.nama_ajaran } : null;
                        plain.currentHistory = { id: latest.id, master_tahun_ajaran_id: latest.master_tahun_ajaran_id, kelas_id: latest.kelas_id, note: latest.note, masterTahunAjaran: master };
                    } else {
                        plain.currentHistory = null;
                    }
                    // replace s in array with plain object
                    const idx = siswas.indexOf(s);
                    siswas[idx] = plain;
                }
            }
        } catch (attachErr) {
            console.warn('Could not attach currentHistory for siswa list', attachErr);
        }

        // If showAll was requested and master_ta_id provided, attach hasHistory boolean per siswa
        if (showAll && master_ta_id) {
            const out = siswas.map((s) => {
                const obj = s;
                obj.hasHistory = Array.isArray(obj.histories) && obj.histories.length > 0;
                return obj;
            });
            return res.status(200).json(out);
        }

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
        const payload = { ...req.body };
        
        // Sanitize tanggal_lahir
        if ('tanggal_lahir' in payload) {
            const parsed = parseValidDate(payload.tanggal_lahir);
            if (payload.tanggal_lahir && !parsed) {
                return res.status(400).json({ message: "Format tanggal_lahir tidak valid", error: `Invalid value: ${payload.tanggal_lahir}` });
            }
            payload.tanggal_lahir = parsed;
        }

        // Require master_tahun_ajaran_id
        const masterTaId = payload.master_tahun_ajaran_id || payload.master_ta_id || null;
        if (!masterTaId) {
            return res.status(400).json({ message: "master_tahun_ajaran_id wajib diisi saat membuat siswa" });
        }

        // Create siswa record
        const newSiswa = await db.Siswa.create(payload);

        // Determine kelas for history
        const kelasForHistory = payload.kelas_id ?? payload.kelas_id_masuk ?? newSiswa.kelas_id;

        // Create initial history entry
        let createdHistory = null;
        try {
            createdHistory = await db.SiswaKelasHistory.create({
                siswa_id: newSiswa.id,
                kelas_id: Number(kelasForHistory),
                master_tahun_ajaran_id: Number(masterTaId),
                note: 'masuk'
            });
        } catch (histErr) {
            console.error('ERROR: gagal membuat history siswa:', histErr);
            const failOnHist = (process.env.FAIL_ON_HISTORY_ERROR || '').toLowerCase() === 'true';
            if (failOnHist) {
                try { 
                    await db.Siswa.destroy({ where: { id: newSiswa.id } });
                } catch (e) {
                    console.error('Gagal rollback siswa setelah error history', e);
                }
                return res.status(500).json({ message: 'Gagal membuat siswa history', error: histErr.message });
            }
        }

        return res.status(201).json({ siswa: newSiswa, history: createdHistory });
    } catch (error) {
        console.error('SERVER ERROR - POST /api/siswa:', error);
        res.status(400).json({ message: "Gagal membuat siswa", error: error.message });
    }
};

exports.createSiswa = async (req, res) => {
  try {
    const payload = { ...req.body }

    // validasi tanggal lahir
    if ('tanggal_lahir' in payload) {
      const parsed = parseValidDate(payload.tanggal_lahir)
      if (payload.tanggal_lahir && !parsed) {
        return res.status(400).json({
          message: "Format tanggal_lahir tidak valid",
          error: `Invalid value: ${payload.tanggal_lahir}`
        })
      }
      payload.tanggal_lahir = parsed
    }

    // ambil master_tahun_ajaran_id langsung dari payload
    const masterTaId = payload.master_tahun_ajaran_id || payload.master_ta_id || null
    if (!masterTaId) {
      return res.status(400).json({ message: "master_tahun_ajaran_id wajib diisi saat membuat siswa" })
    }

    // buat siswa
    const newSiswa = await db.Siswa.create(payload)

    // kelas untuk history
    const kelasForHistory = payload.kelas_id ?? payload.kelas_id_masuk ?? newSiswa.kelas_id

    // buat history pertama (masuk)
    let createdHistory = null
    try {
      createdHistory = await db.SiswaKelasHistory.create({
        siswa_id: newSiswa.id,
        kelas_id: Number(kelasForHistory),
        master_tahun_ajaran_id: Number(masterTaId),
        semester: '1', // default semester masuk
        note: 'masuk'
      })
    } catch (histErr) {
      console.error('ERROR: gagal membuat history siswa:', histErr)
      const failOnHist = (process.env.FAIL_ON_HISTORY_ERROR || '').toLowerCase() === 'true'
      if (failOnHist) {
        try { await db.Siswa.destroy({ where: { id: newSiswa.id } }) } catch (e) {
          console.error('Gagal rollback siswa setelah error history', e)
        }
        return res.status(500).json({ message: 'Gagal membuat siswa history', error: histErr.message })
      }
    }

    return res.status(201).json({ siswa: newSiswa, history: createdHistory })
  } catch (error) {
    console.error('SERVER ERROR - POST /api/siswa:', error)
    res.status(400).json({ message: "Gagal membuat siswa", error: error.message })
  }
}

exports.updateSiswa = async (req, res) => {
  try {
    const payload = { ...req.body }

    // validasi tanggal lahir
    if ('tanggal_lahir' in payload) {
      const parsed = parseValidDate(payload.tanggal_lahir)
      if (payload.tanggal_lahir && !parsed) {
        return res.status(400).json({
          message: "Format tanggal_lahir tidak valid",
          error: `Invalid value: ${payload.tanggal_lahir}`
        })
      }
      payload.tanggal_lahir = parsed
    }

    const [updated] = await db.Siswa.update(payload, { where: { id: req.params.id } })
    if (!updated) throw new Error('Siswa tidak ditemukan')

    // update earliest history kalau ada master_tahun_ajaran_id baru
    if (payload.master_tahun_ajaran_id || payload.master_ta_id) {
      const siswaId = Number(req.params.id)
      const earliest = await db.SiswaKelasHistory.findOne({
        where: { siswa_id: siswaId },
        order: [['id', 'ASC']]
      })
      if (earliest) {
        const masterIncoming = payload.master_tahun_ajaran_id || payload.master_ta_id
        earliest.master_tahun_ajaran_id = Number(masterIncoming)
        await earliest.save()
      }
    }

    const updatedSiswa = await db.Siswa.findByPk(req.params.id)
    return res.status(200).json(updatedSiswa)
  } catch (error) {
    console.error(`SERVER ERROR - PUT /api/siswa/${req.params.id}:`, error)
    if (error.message && /datetime|Invalid date|Incorrect datetime/i.test(error.message)) {
      return res.status(400).json({ message: "Format tanggal_lahir tidak valid", error: error.message })
    }
    res.status(404).json({ message: "Siswa tidak ditemukan", error: error.message })
  }
}


exports.deleteSiswa = async (req, res) => {
    try {
        const deleted = await db.Siswa.destroy({ where: { id: req.params.id } });
        if (deleted) return res.status(204).send();
        throw new Error('Siswa tidak ditemukan');
    } catch (error) {
        res.status(404).json({ message: "Siswa tidak ditemukan", error: error.message });
    }
};

// Backfill/create missing SiswaKelasHistory rows for a given tahun_ajaran or master_tahun_ajaran
exports.backfillHistories = async (req, res) => {
    try {
        const { master_tahun_ajaran_id, kelas_id, siswa_id } = req.body;
        if (!master_tahun_ajaran_id) {
            return res.status(400).json({ message: 'master_tahun_ajaran_id is required' });
        }

        const where = {};
        if (kelas_id) where.kelas_id = kelas_id;
        if (siswa_id) where.id = siswa_id;

        const siswas = await db.Siswa.findAll({ where });
        let created = 0;
        for (const s of siswas) {
            const exists = await db.SiswaKelasHistory.findOne({ where: { siswa_id: s.id, master_tahun_ajaran_id: master_tahun_ajaran_id } });
            if (!exists) {
                await db.SiswaKelasHistory.create({ siswa_id: s.id, kelas_id: s.kelas_id || null, master_tahun_ajaran_id: master_tahun_ajaran_id, note: 'backfill via API' });
                created++;
            }
        }
        return res.json({ success: true, created });
    } catch (err) {
        console.error('ERROR backfillHistories', err);
        return res.status(500).json({ success: false, message: 'Failed to backfill histories', error: err.message });
    }
}

// Return list of siswa missing histories for a given tahun_ajaran (optional kelas_id)
exports.getMissingHistories = async (req, res) => {
    try {
        const { master_tahun_ajaran_id, kelas_id } = req.query;
        if (!master_tahun_ajaran_id) return res.status(400).json({ message: 'master_tahun_ajaran_id is required' });
        const where = {};
        if (kelas_id) where.kelas_id = isNaN(Number(kelas_id)) ? kelas_id : Number(kelas_id);

        // All siswa matching where
        const siswas = await db.Siswa.findAll({ where, include: [{ model: db.Kelas, as: 'kelas', attributes: ['nama_kelas'] }] });

        const missing = [];
        for (const s of siswas) {
            const exists = await db.SiswaKelasHistory.findOne({ where: { siswa_id: s.id, master_tahun_ajaran_id: isNaN(Number(master_tahun_ajaran_id)) ? master_tahun_ajaran_id : Number(master_tahun_ajaran_id) } });
            if (!exists) missing.push({ id: s.id, nama: s.nama, nis: s.nis, kelas_id: s.kelas_id, kelas: s.kelas ? s.kelas.nama_kelas : null });
        }
        return res.json({ count: missing.length, missing });
    } catch (err) {
        console.error('ERROR getMissingHistories', err);
        return res.status(500).json({ success: false, message: 'Failed to list missing histories', error: err.message });
    }
}

// Get the earliest SiswaKelasHistory for a given siswa (used by frontend to prefill Tahun Ajaran Masuk)
exports.getEarliestHistory = async (req, res) => {
    try {
        const siswaId = Number(req.params.id);
        if (!siswaId) return res.status(400).json({ message: 'Invalid siswa id' });
        const earliest = await db.SiswaKelasHistory.findOne({ where: { siswa_id: siswaId }, order: [['id', 'ASC']], include: [{ model: db.MasterTahunAjaran, as: 'masterTahunAjaran', attributes: ['id','nama_ajaran'], required: false }] });
        if (!earliest) return res.status(404).json({ message: 'History not found' });
        // Normalize returned payload to include master_tahun_ajaran_id and readable masterTahunAjaran
        const out = earliest.toJSON();
        return res.status(200).json(out);
    } catch (err) {
        console.error('ERROR getEarliestHistory', err);
        res.status(500).json({ message: 'Failed to get earliest history', error: err.message });
    }
}