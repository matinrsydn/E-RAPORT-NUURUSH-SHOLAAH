// middleware/upload.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Pastikan direktori upload ada
const uploadDir = path.join(__dirname, '../uploads/excel');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('📁 Created upload directory:', uploadDir);
}

// Konfigurasi storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate filename dengan timestamp untuk menghindari konflik
        const timestamp = Date.now();
        const originalName = file.originalname.replace(/\s+/g, '_'); // Replace spaces dengan underscore
        const filename = `${timestamp}-${originalName}`;
        
        console.log('📄 Uploading file:', filename);
        cb(null, filename);
    }
});

// File filter - hanya terima Excel files
const fileFilter = (req, file, cb) => {
    console.log('🔍 Checking file type:', file.mimetype);
    
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'application/octet-stream' // fallback untuk beberapa browser
    ];
    
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        console.log('✅ File type accepted');
        cb(null, true);
    } else {
        console.log('❌ File type rejected:', file.mimetype, fileExtension);
        cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
    }
};

// Konfigurasi multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1
    }
});

// Error handling wrapper
const uploadWithErrorHandling = {
    single: (fieldName) => {
        return (req, res, next) => {
            const uploadSingle = upload.single(fieldName);
            
            uploadSingle(req, res, (err) => {
                if (err) {
                    console.error('❌ Upload error:', err.message);
                    
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        return res.status(400).json({
                            message: 'File terlalu besar. Maksimal 10MB.',
                            error: err.message
                        });
                    }
                    
                    if (err.message.includes('Only Excel files')) {
                        return res.status(400).json({
                            message: 'File harus berformat Excel (.xlsx atau .xls).',
                            error: err.message
                        });
                    }
                    
                    return res.status(400).json({
                        message: 'Gagal mengupload file.',
                        error: err.message
                    });
                }
                
                if (!req.file) {
                    return res.status(400).json({
                        message: 'Tidak ada file yang diupload.'
                    });
                }
                
                console.log('✅ File uploaded successfully:', req.file.filename);
                next();
            });
        };
    }
};

module.exports = uploadWithErrorHandling;