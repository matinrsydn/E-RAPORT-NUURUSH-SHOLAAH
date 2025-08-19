const multer = require('multer');
const path = require('path');

// Konfigurasi penyimpanan untuk Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Menentukan folder untuk menyimpan file yang di-upload
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Membuat nama file yang unik untuk mencegah tumpang tindih
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filter untuk memastikan hanya file Excel yang di-upload
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png|xlsx|xls|docx|doc/;
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedFileTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Hanya file dengan format Excel (xlsx, xls), Word (docx, doc), atau gambar (jpg, png) yang diizinkan!');
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10000000 }, // Batas ukuran file 10MB
  fileFilter: fileFilter
});

module.exports = upload;
