const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./models');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve file statis (untuk download template .xlsx dan melihat .docx)
app.use('/templates', express.static(path.join(__dirname, 'uploads/templates')));

// Routes
app.use('/api/kepalasekolah', require('./routes/kepalaSekolahRoutes'));
app.use('/api/walikelas', require('./routes/waliKelasRoutes'));
app.use('/api/matapelajaran', require('./routes/mataPelajaranRoutes'));
app.use('/api/siswa', require('./routes/siswaRoutes'));
app.use('/api/orangtua', require('./routes/orangTuaRoutes'));
app.use('/api/nilaiujian', require('./routes/nilaiUjianRoutes'));
app.use('/api/nilaihafalan', require('./routes/nilaiHafalanRoutes'));
app.use('/api/sikap', require('./routes/sikapRoutes'));
app.use('/api/kehadiran', require('./routes/kehadiranRoutes'));
app.use('/api/template', require('./routes/templateRoutes'));
app.use('/api/excel', require('./routes/excelRoutes'));


const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}.`);
    await db.sequelize.sync(); // Gunakan { force: true } hanya saat development untuk reset tabel
});