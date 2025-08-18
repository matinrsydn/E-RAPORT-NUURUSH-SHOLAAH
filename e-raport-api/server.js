const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./models');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/templates', express.static(path.join(__dirname, 'uploads/templates')));

app.use('/api/kepalasekolah', require('./routes/kepalaSekolahRoutes'));
app.use('/api/walikelas', require('./routes/waliKelasRoutes'));
app.use('/api/matapelajaran', require('./routes/mataPelajaranRoutes'));
app.use('/api/siswa', require('./routes/siswaRoutes'));
app.use('/api/orangtua', require('./routes/orangTuaRoutes'));
app.use('/api/nilai', require('./routes/nilaiRoutes'));
app.use('/api/sikap', require('./routes/sikapRoutes'));
app.use('/api/kehadiran', require('./routes/kehadiranRoutes'));
app.use('/api/template', require('./routes/templateRoutes'));
app.use('/api/excel', require('./routes/excelRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}.`);
    await db.sequelize.sync();
});