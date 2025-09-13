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
        const id = req.params.id;

        // Helper: sanitize a name into a filesystem-friendly token
        const sanitize = (s) => {
            if (!s) return 'unknown';
            return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 50) || 'unknown';
        };

        // If an ID is present (update), try to fetch the Guru name from DB to build filename.
        if (id) {
            try {
                const db = require('../models');
                db.Guru.findByPk(id).then(guru => {
                    const nameSource = guru && guru.nama ? guru.nama : (req.body && req.body.nama ? req.body.nama : 'unknown');
                    const token = sanitize(nameSource);
                    const filename = `ttd_${token}_${id}_${timestamp}${extension}`;
                    cb(null, filename);
                }).catch(err => {
                    // On any DB error, fallback to using body.nama or 'unknown'
                    const token = sanitize(req.body && req.body.nama ? req.body.nama : 'unknown');
                    const filename = `ttd_${token}_${id}_${timestamp}${extension}`;
                    cb(null, filename);
                });
            } catch (err) {
                const token = sanitize(req.body && req.body.nama ? req.body.nama : 'unknown');
                const filename = `ttd_${token}_${id}_${timestamp}${extension}`;
                cb(null, filename);
            }
        } else {
            // For create (no id yet), try to use field nama from the multipart form if present
            const nameSource = (req.body && req.body.nama) ? req.body.nama : 'new';
            const token = sanitize(nameSource);
            const filename = `ttd_${token}_new_${timestamp}${extension}`;
            cb(null, filename);
        }
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