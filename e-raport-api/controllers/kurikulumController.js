const db = require('../models');

// Mengambil kurikulum berdasarkan filter
exports.getKurikulum = async (req, res) => {
    const { tahun_ajaran_id, kelas_id, semester } = req.query;
    if (!tahun_ajaran_id || !kelas_id || !semester) {
        return res.status(400).json({ message: "Parameter tahun ajaran, kelas, dan semester diperlukan." });
    }

    try {
        const kurikulum = await db.Kurikulum.findAll({
            where: { tahun_ajaran_id, kelas_id, semester },
            include: [
                { model: db.MataPelajaran, as: 'mapel', attributes: ['nama_mapel', 'jenis'] },
                { model: db.Kitab, as: 'kitab', attributes: ['nama_kitab'] }
            ],
            order: [[{model: db.MataPelajaran, as: 'mapel'}, 'nama_mapel', 'ASC']]
        });
        res.json(kurikulum);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data kurikulum.", error: error.message });
    }
};

// Menambah mapel ke kurikulum
exports.createKurikulum = async (req, res) => {
    try {
        const newEntry = await db.Kurikulum.create(req.body);
        res.status(201).json(newEntry);
    } catch (error) {
        res.status(400).json({ message: "Gagal menambahkan ke kurikulum.", error: error.message });
    }
};

// Mengubah kitab dalam kurikulum
exports.updateKurikulum = async (req, res) => {
    try {
        const { kitab_id } = req.body;
        const [updated] = await db.Kurikulum.update({ kitab_id }, { where: { id: req.params.id } });
        if (updated) {
            const updatedData = await db.Kurikulum.findByPk(req.params.id);
            return res.status(200).json(updatedData);
        }
        throw new Error('Entri kurikulum tidak ditemukan');
    } catch (error) {
        res.status(404).json({ message: 'Entri kurikulum tidak ditemukan', error: error.message });
    }
};

// Menghapus mapel dari kurikulum
exports.deleteKurikulum = async (req, res) => {
    try {
        const deleted = await db.Kurikulum.destroy({ where: { id: req.params.id } });
        if (deleted) return res.status(204).send();
        throw new Error('Entri kurikulum tidak ditemukan');
    } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus dari kurikulum', error: error.message });
    }
};
