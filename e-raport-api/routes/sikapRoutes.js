const express = require("express");
const router = express.Router();
const sikapController = require("../controllers/sikapController");

// --- ROUTES SIKAP ---
router.post("/", sikapController.createSikap);
router.get("/", sikapController.getAllSikap);
router.get("/:id", sikapController.getSikapById);
router.put("/:id", sikapController.updateSikap);   // ✅ handler function
router.delete("/:id", sikapController.deleteSikap);

// khusus bulk
router.post("/bulk", sikapController.bulkUpdateOrInsertSikap);

// filter
router.get("/filter/siswa", sikapController.getSiswaWithSikapByFilter);
router.get("/filter/deskripsi", sikapController.getDeskripsiSikapByFilter);

// template
router.get("/template", sikapController.getTemplateSikapBySiswa);

module.exports = router;
