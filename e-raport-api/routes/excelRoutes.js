const express = require('express');
const router = express.Router();

console.log('📝 Loading Excel Routes...');

// Test untuk memastikan router berfungsi
router.get('/', (req, res) => {
    res.json({ 
        message: 'Excel routes root endpoint',
        availableEndpoints: [
            'GET /api/excel/',
            'GET /api/excel/test',
            'GET /api/excel/download-complete-template'
        ]
    });
});

// TEST ROUTES - Untuk debugging
router.get('/test', (req, res) => {
    console.log('✅ Excel routes test endpoint hit');
    res.json({ 
        message: 'Excel routes is working!',
        timestamp: new Date().toISOString(),
        query: req.query
    });
});

// Load dependencies dengan error handling
let excelController = null;
let uploadExcel = null;

try {
    console.log('📦 Loading Excel Controller...');
    excelController = require('../controllers/excelController');
    console.log('✅ Excel Controller loaded successfully');
    
    console.log('📦 Loading Upload Middleware...');
    uploadExcel = require('../middleware/upload');
    console.log('✅ Upload Middleware loaded successfully');
    
} catch (error) {
    console.error('❌ Error loading dependencies:', error.message);
    console.error('Stack:', error.stack);
}

// Test controller availability
router.get('/test-controller', (req, res) => {
    if (!excelController) {
        return res.status(500).json({
            message: 'Excel controller not available',
            error: 'Controller failed to load'
        });
    }

    try {
        const methods = Object.getOwnPropertyNames(excelController);
        res.json({
            message: 'Controller is available',
            methods: methods,
            hasDownloadCompleteTemplate: typeof excelController.downloadCompleteTemplate === 'function'
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error checking controller',
            error: error.message
        });
    }
});

// MAIN ROUTES - Hanya jika controller tersedia
if (excelController) {
    // Route download complete template
    router.get('/download-complete-template', (req, res) => {
        console.log('📥 Download complete template requested');
        console.log('Query params:', req.query);
        
        try {
            excelController.downloadCompleteTemplate(req, res);
        } catch (error) {
            console.error('❌ Error in downloadCompleteTemplate:', error);
            res.status(500).json({
                message: 'Error generating template',
                error: error.message
            });
        }
    });

    // Route upload complete data
    router.post('/upload-complete-data', (req, res) => {
        if (!uploadExcel) {
            return res.status(500).json({ message: 'Upload middleware not available' });
        }
        
        uploadExcel.single('file')(req, res, (err) => {
            if (err) {
                console.error('❌ Upload middleware error:', err);
                return res.status(500).json({ message: 'Upload failed', error: err.message });
            }
            
            try {
                excelController.uploadCompleteData(req, res);
            } catch (error) {
                console.error('❌ Error in uploadCompleteData:', error);
                res.status(500).json({
                    message: 'Error processing upload',
                    error: error.message
                });
            }
        });
    });

    // Route download template (individual)
    router.get('/download-template', (req, res) => {
        console.log('📥 Download individual template requested');
        try {
            excelController.downloadTemplate(req, res);
        } catch (error) {
            console.error('❌ Error in downloadTemplate:', error);
            res.status(500).json({
                message: 'Error generating individual template',
                error: error.message
            });
        }
    });

    // Route upload nilai
    router.post('/upload-nilai', (req, res) => {
        if (!uploadExcel) {
            return res.status(500).json({ message: 'Upload middleware not available' });
        }
        
        uploadExcel.single('file')(req, res, (err) => {
            if (err) {
                return res.status(500).json({ message: 'Upload failed', error: err.message });
            }
            excelController.uploadNilai(req, res);
        });
    });

    // Route download template hafalan
    router.get('/download-template-hafalan', (req, res) => {
        try {
            excelController.downloadTemplateHafalan(req, res);
        } catch (error) {
            res.status(500).json({
                message: 'Error generating hafalan template',
                error: error.message
            });
        }
    });

    // Route upload hafalan
    router.post('/upload-hafalan', (req, res) => {
        if (!uploadExcel) {
            return res.status(500).json({ message: 'Upload middleware not available' });
        }
        
        uploadExcel.single('file')(req, res, (err) => {
            if (err) {
                return res.status(500).json({ message: 'Upload failed', error: err.message });
            }
            excelController.uploadHafalan(req, res);
        });
    });

    // Route download template kehadiran
    router.get('/download-template-kehadiran', (req, res) => {
        try {
            excelController.downloadTemplateKehadiran(req, res);
        } catch (error) {
            res.status(500).json({
                message: 'Error generating kehadiran template',
                error: error.message
            });
        }
    });

    // Route upload kehadiran
    router.post('/upload-kehadiran', (req, res) => {
        if (!uploadExcel) {
            return res.status(500).json({ message: 'Upload middleware not available' });
        }
        
        uploadExcel.single('file')(req, res, (err) => {
            if (err) {
                return res.status(500).json({ message: 'Upload failed', error: err.message });
            }
            excelController.uploadKehadiran(req, res);
        });
    });

    // Route download template sikap
    router.get('/download-template-sikap', (req, res) => {
        try {
            excelController.downloadTemplateSikap(req, res);
        } catch (error) {
            res.status(500).json({
                message: 'Error generating sikap template',
                error: error.message
            });
        }
    });

    // Route upload sikap
    router.post('/upload-sikap', (req, res) => {
        if (!uploadExcel) {
            return res.status(500).json({ message: 'Upload middleware not available' });
        }
        
        uploadExcel.single('file')(req, res, (err) => {
            if (err) {
                return res.status(500).json({ message: 'Upload failed', error: err.message });
            }
            excelController.uploadSikap(req, res);
        });
    });

} else {
    // Jika controller tidak tersedia, beri error message
    router.all('*', (req, res) => {
        res.status(500).json({
            message: 'Excel controller is not available',
            error: 'Controller loading failed'
        });
    });
}

console.log('✅ Excel Routes loaded successfully');

module.exports = router;