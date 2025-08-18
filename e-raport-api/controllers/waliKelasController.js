const WaliKelas = db.WaliKelas;

exports.getAllWaliKelas = async (req, res) => res.json(await WaliKelas.findAll());
exports.createWaliKelas = async (req, res) => res.status(201).json(await WaliKelas.create(req.body));
exports.updateWaliKelas = async (req, res) => {
    await WaliKelas.update(req.body, { where: { id: req.params.id } });
    res.json({ message: 'Update successful' });
};
exports.deleteWaliKelas = async (req, res) => {
    await WaliKelas.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Delete successful' });
};