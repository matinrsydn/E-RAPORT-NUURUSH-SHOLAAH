const db = require('../models');

// Mengambil semua data tahun ajaran
exports.getAll = async (req, res) => {
    try {
        // Support optional filtering by semester (e.g. ?semester=2)
        // and optional dedupe by nama_ajaran (e.g. ?uniqueByName=true)
        const { semester, uniqueByName, master_tahun_ajaran_id } = req.query;
        const where = {};
            if (typeof semester !== 'undefined' && semester !== null && semester !== '') {
                // Coerce to string because semester is stored as ENUM('1','2')
                const s = String(semester);
                where.semester = s;
            }
            if (typeof master_tahun_ajaran_id !== 'undefined' && master_tahun_ajaran_id !== null && master_tahun_ajaran_id !== '') {
                where.master_tahun_ajaran_id = isNaN(Number(master_tahun_ajaran_id)) ? master_tahun_ajaran_id : Number(master_tahun_ajaran_id);
            }

            // If client requests uniqueByName, we'll group by nama_ajaran and return one representative row per name
            if (uniqueByName === 'true' || uniqueByName === true) {
                    const { Sequelize } = db;
                    try {
                        // Group after applying `where` (e.g. semester=2) so the representative rows come from the filtered set.
                        // We aggregate semester/status using MAX to surface a sensible value.
                        const rows = await db.PeriodeAjaran.findAll({
                            where,
                            attributes: [
                                [Sequelize.fn('MIN', Sequelize.col('id')), 'id'],
                                'nama_ajaran',
                                [Sequelize.fn('MAX', Sequelize.col('semester')), 'semester'],
                                [Sequelize.fn('MAX', Sequelize.col('status')), 'status']
                            ],
                            group: ['nama_ajaran'],
                            order: [['nama_ajaran', 'DESC']]
                        });
                        return res.json(rows);
                    } catch (err) {
                        // Fallback: some older schemas may not have expected columns (e.g. master_tahun_ajaran_id)
                        // In that case, fetch all rows and dedupe in JS.
                        const rows = await db.PeriodeAjaran.findAll({ where, order: [['nama_ajaran', 'DESC'], ['semester', 'ASC']] });
                        const deduped = [];
                        const seen = new Set();
                        for (const r of rows) {
                            if (!seen.has(r.nama_ajaran)) {
                                seen.add(r.nama_ajaran);
                                deduped.push(r);
                            }
                        }
                        return res.json(deduped);
                    }
                }

            // Normal fetch: try to select the expected attributes, but fallback to a simple select if DB lacks columns
            try {
                const tahunAjarans = await db.PeriodeAjaran.findAll({
                    where,
                    order: [['nama_ajaran', 'DESC'], ['semester', 'ASC']],
                    attributes: ['id', 'nama_ajaran', 'semester', 'status', 'master_tahun_ajaran_id']
                });
                return res.json(tahunAjarans);
            } catch (err) {
                // If DB is missing the attribute, retry without attribute projection
                const tahunAjarans = await db.PeriodeAjaran.findAll({ where, order: [['nama_ajaran', 'DESC'], ['semester', 'ASC']] });
                return res.json(tahunAjarans);
            }
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data tahun ajaran.", error: error.message });
    }
};

// Membuat tahun ajaran baru
exports.create = async (req, res) => {
    try {
        // Langsung teruskan semua data dari body request
        const newTahunAjaran = await db.TahunAjaran.create(req.body);
        res.status(201).json(newTahunAjaran);
    } catch (error) {
        // Tangani error jika ada, misalnya karena duplikasi
        res.status(400).json({ message: 'Gagal membuat data. Pastikan kombinasi Tahun Ajaran dan Semester unik.', error: error.message });
    }
};

// Memperbarui tahun ajaran
exports.update = async (req, res) => {
    try {
        await db.TahunAjaran.update(req.body, { where: { id: req.params.id } });
        const updatedData = await db.TahunAjaran.findByPk(req.params.id);
        res.status(200).json(updatedData);
    } catch (error) {
        res.status(500).json({ message: 'Gagal memperbarui data.', error: error.message });
    }
};

// Menghapus tahun ajaran
exports.delete = async (req, res) => {
    const tahunAjaranId = req.params.id;
    try {
        const kurikulumTerkait = await db.Kurikulum.findOne({ where: { tahun_ajaran_id: tahunAjaranId } });
        if (kurikulumTerkait) {
            return res.status(409).json({
                message: 'Gagal menghapus. Tahun Ajaran ini masih digunakan dalam data Kurikulum.'
            });
        }
        await db.TahunAjaran.destroy({ where: { id: tahunAjaranId } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus data.', error: error.message });
    }
};