// middleware/uploadSignature.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads/signatures');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const extension = path.extname(file.originalname);
        // --- PERUBAHAN DI SINI ---
        // Gunakan 'type' dari URL untuk menamai file (e.g., /api/guru/:id/upload-ttd/guru)
        const type = req.params.type || 'unknown'; 
        const filename = `ttd_${type}_${req.params.id || 'new'}_${timestamp}${extension}`;
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('File yang diunggah harus berupa gambar!'), false);
    }
};

module.exports = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // Batasi ukuran file 2MB
    }
});