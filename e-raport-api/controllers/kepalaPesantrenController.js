const db = require('../models');
const KepalaPesantren = db.KepalaPesantren;

exports.getAll = async (req, res) => res.json(await KepalaPesantren.findAll());
exports.create = async (req, res) => res.status(201).json(await KepalaPesantren.create(req.body));
exports.update = async (req, res) => {
    await KepalaPesantren.update(req.body, { where: { id: req.params.id } });
    res.json({ message: 'Update successful' });
};
exports.delete = async (req, res) => {
    await KepalaPesantren.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Delete successful' });
};