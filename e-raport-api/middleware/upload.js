const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = 'uploads/';
// Buat folder 'uploads' jika belum ada
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Gunakan nama file asli untuk template agar mudah dikenali
    cb(null, file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  // Hanya izinkan file .docx
  if (path.extname(file.originalname).toLowerCase() === '.docx') {
    return cb(null, true);
  }
  cb(new Error('Hanya file .docx yang diizinkan!'));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10000000 }, // 10MB
  fileFilter: fileFilter
});

module.exports = upload;
