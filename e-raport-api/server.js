const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./models');
// Impor controller yang dibutuhkan
const templateController = require('./controllers/templateController');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/templates', express.static(path.join(__dirname, 'uploads/templates')));

// --- RUTE DIPINDAHKAN KE SINI UNTUK TES ---
// Rute untuk mengunduh file identitas per siswa
app.get('/api/templates/generate-identitas/:siswaId', templateController.generateIdentitas);


// Memuat rute-rute lainnya
app.use('/api/kepala-pesantren', require('./routes/kepalaPesantrenRoutes'));
app.use('/api/walikelas', require('./routes/waliKelasRoutes'));
app.use('/api/matapelajaran', require('./routes/mataPelajaranRoutes'));
app.use('/api/siswa', require('./routes/siswaRoutes'));
app.use('/api/nilai', require('./routes/nilaiRoutes'));
app.use('/api/sikap', require('./routes/sikapRoutes'));
app.use('/api/kehadiran', require('./routes/kehadiranRoutes'));
// Gunakan sisa rute dari templateRoutes, tapi yang bermasalah sudah kita pindahkan
app.use('/api/templates', require('./routes/templateRoutes')); 
app.use('/api/excel', require('./routes/excelRoutes'));


const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}.`);
    await db.sequelize.sync();
});
