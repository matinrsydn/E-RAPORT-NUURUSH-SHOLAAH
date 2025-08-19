const { Siswa, WaliKelas, KepalaPesantren, Kelas } = require('../models');

exports.getAllSiswa = async (req, res) => {
    try {
        const siswas = await Siswa.findAll({
            include: [
                { model: Kelas, attributes: ['nama_kelas'] },
                { model: WaliKelas, attributes: ['nama'] },
                { model: KepalaPesantren, attributes: ['nama'] }
            ],
            order: [['nama', 'ASC']]
        });
        res.json(siswas);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data siswa", error: error.message });
    }
};

exports.getSiswaById = async (req, res) => {
    try {
        const siswa = await Siswa.findByPk(req.params.id, {
            include: [
                { model: Kelas, attributes: ['nama_kelas'] },
                { model: WaliKelas, attributes: ['nama'] },
                { model: KepalaPesantren, attributes: ['nama'] }
            ]
        });
        if (!siswa) return res.status(404).json({ message: "Siswa tidak ditemukan" });
        res.json(siswa);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data siswa", error: error.message });
    }
};

exports.createSiswa = async (req, res) => {
    try {
        const newSiswa = await Siswa.create(req.body);
        res.status(201).json(newSiswa);
    } catch (error) {
        res.status(400).json({ message: "Gagal membuat siswa", error: error.message });
    }
};

exports.updateSiswa = async (req, res) => {
    try {
        const [updated] = await Siswa.update(req.body, { where: { id: req.params.id } });
        if (updated) {
            const updatedSiswa = await Siswa.findByPk(req.params.id);
            return res.status(200).json(updatedSiswa);
        }
        throw new Error('Siswa tidak ditemukan');
    } catch (error) {
        res.status(404).json({ message: "Siswa tidak ditemukan", error: error.message });
    }
};

exports.deleteSiswa = async (req, res) => {
    try {
        const deleted = await Siswa.destroy({ where: { id: req.params.id } });
        if (deleted) return res.status(204).send();
        throw new Error('Siswa tidak ditemukan');
    } catch (error) {
        res.status(404).json({ message: "Siswa tidak ditemukan", error: error.message });
    }
};
