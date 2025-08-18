const db = require('../models');
const KepalaSekolah = db.KepalaSekolah;

exports.getAll = async (req, res) => res.json(await KepalaSekolah.findAll());
exports.create = async (req, res) => res.status(201).json(await KepalaSekolah.create(req.body));
exports.update = async (req, res) => {
    await KepalaSekolah.update(req.body, { where: { id: req.params.id } });
    res.json({ message: 'Update successful' });
};
exports.delete = async (req, res) => {
    await KepalaSekolah.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Delete successful' });
};