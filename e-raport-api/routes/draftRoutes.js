const express = require('express');
const router = express.Router();
const draftController = require('../controllers/draftController');
const upload = require('../middleware/upload');

// Rute untuk mengunggah dan validasi file
router.post('/upload', upload.single('file'), draftController.uploadAndValidate);

// Rute untuk mengambil data draft per batch
router.get('/:batchId', draftController.getDraftData);

// Rute untuk melihat preview raport
router.get('/preview/:nis/:semester/:tahun_ajaran', draftController.getRaportPreview);

// --- TAMBAHKAN RUTE INI UNTUK KONFIRMASI ---
router.post('/confirm/:batchId', draftController.confirmAndSave);

router.get('/debug/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    console.log(`🔍 Debug batch: ${batchId}`);
    
    const draftData = await db.DraftNilai.findAll({
      where: { upload_batch_id: batchId },
      order: [['row_number', 'ASC']]
    });
    
    console.log(`📋 Total draft entries: ${draftData.length}`);
    
    draftData.forEach((draft, index) => {
      console.log(`\n--- DRAFT ${index + 1} ---`);
      console.log(`NIS: ${draft.data.nis}`);
      console.log(`Nama: ${draft.data.nama_siswa}`);
      console.log(`Valid: ${draft.is_valid}`);
      console.log('Kehadiran Detail:', JSON.stringify(draft.data.kehadiran_detail || 'KOSONG', null, 2));
      console.log('Kehadiran Summary:', JSON.stringify(draft.data.kehadiran_summary || 'KOSONG', null, 2));
      console.log('Raw Data Keys:', Object.keys(draft.data));
    });
    
    res.json({
      message: 'Debug selesai, cek console server',
      total_entries: draftData.length,
      sample_data: draftData[0]?.data || null
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;