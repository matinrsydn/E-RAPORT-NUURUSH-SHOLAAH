const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Konfigurasi storage untuk file Excel
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/excel/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Buat nama file unik dengan timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// Filter untuk memastikan hanya file Excel yang diunggah
const excelFilter = (req, file, cb) => {
  if (
    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || // .xlsx
    file.mimetype === 'application/vnd.ms-excel' // .xls
  ) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file Excel (.xlsx, .xls) yang diizinkan!'), false);
  }
};

const uploadExcel = multer({ storage: excelStorage, fileFilter: excelFilter });

module.exports = uploadExcel;
