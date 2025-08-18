const Siswa = db.Siswa;
const OrangTua = db.OrangTua;

exports.getAllSiswa = async (req, res) => res.json(await Siswa.findAll({ include: ['wali_kelas', 'kepala_sekolah', 'orang_tua'] }));
exports.createSiswa = async (req, res) => {
    const { orang_tua, ...siswaData } = req.body;
    const t = await db.sequelize.transaction();
    try {
        const newSiswa = await Siswa.create(siswaData, { transaction: t });
        if (orang_tua) {
            await OrangTua.create({ ...orang_tua, siswaId: newSiswa.id }, { transaction: t });
        }
        await t.commit();
        res.status(201).json(newSiswa);
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: 'Gagal membuat siswa', error: error.message });
    }
};
exports.updateSiswa = async (req, res) => {
    const { orang_tua, ...siswaData } = req.body;
    const t = await db.sequelize.transaction();
    try {
        await Siswa.update(siswaData, { where: { id: req.params.id }, transaction: t });
        if (orang_tua) {
            await OrangTua.update(orang_tua, { where: { siswaId: req.params.id }, transaction: t });
        }
        await t.commit();
        res.json({ message: 'Update successful' });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: 'Gagal update siswa', error: error.message });
    }
};
exports.deleteSiswa = async (req, res) => {
    await Siswa.destroy({ where: { id: req.params.id } });
    // OrangTua akan terhapus secara cascade jika diatur di database
    res.json({ message: 'Delete successful' });
};