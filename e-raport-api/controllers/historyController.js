const db = require('../models');

exports.updateCatatan = async (req, res) => {
  try {
    const { historyId } = req.params;
    const { catatan_akademik, catatan_sikap } = req.body;

    const history = await db.SiswaKelasHistory.findByPk(historyId);
    if (!history) return res.status(404).json({ message: 'History not found' });

    if (typeof catatan_akademik !== 'undefined') history.catatan_akademik = catatan_akademik;
    if (typeof catatan_sikap !== 'undefined') history.catatan_sikap = catatan_sikap;

    await history.save();
    res.status(200).json(history);
  } catch (error) {
    console.error('ERROR updateCatatan:', error);
    res.status(500).json({ message: 'Failed to update catatan', error: error.message });
  }
};
