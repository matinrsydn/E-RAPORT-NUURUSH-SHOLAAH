const db_mp = require('../models');
const MataPelajaran = db_mp.MataPelajaran;

exports.getAllMapel = async (req, res) => res.json(await MataPelajaran.findAll());
exports.createMapel = async (req, res) => res.status(201).json(await MataPelajaran.create(req.body));
exports.updateMapel = async (req, res) => {
    await MataPelajaran.update(req.body, { where: { id: req.params.id } });
    res.json({ message: 'Update successful' });
};
exports.deleteMapel = async (req, res) => {
    await MataPelajaran.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Delete successful' });
};