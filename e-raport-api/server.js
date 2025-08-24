const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./models');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// <<<<<<<<<<<<<< PINDAHKAN LOGGER KE SINI >>>>>>>>>>>>>>
// Middleware untuk logging setiap request yang masuk
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// Middleware untuk menyajikan file statis dari direktori 'uploads'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Sinkronisasi database
db.sequelize.sync()
  .then(() => {
    console.log("Database tersinkronisasi.");
  })
  .catch((err) => {
    console.log("Gagal sinkronisasi database: " + err.message);
  });

console.log("=== LOADING & REGISTERING ROUTES ===");

// Impor dan daftarkan semua rute
const siswaRoutes = require('./routes/siswaRoutes');
const waliKelasRoutes = require('./routes/waliKelasRoutes');
const kepalaPesantrenRoutes = require('./routes/kepalaPesantrenRoutes');
const mataPelajaranRoutes = require('./routes/mataPelajaranRoutes');
const nilaiRoutes = require('./routes/nilaiRoutes');
const sikapRoutes = require('./routes/sikapRoutes');
const kehadiranRoutes = require('./routes/kehadiranRoutes');
const excelRoutes = require('./routes/excelRoutes');
const kelasRoutes = require('./routes/kelasRoutes');
const indikatorSikapRoutes = require('./routes/indikatorSikapRoutes');
const tahunAjaranRoutes = require('./routes/tahunAjaranRoutes');
const templateRoutes = require('./routes/templateRoutes.js');
const draftRoutes = require('./routes/draftRoutes');
const raportRoutes = require('./routes/raportRoutes');
const indikatorKehadiranRoutes = require('./routes/indikatorKehadiranRoutes');

app.use('/api/siswa', siswaRoutes);
app.use('/api/wali-kelas', waliKelasRoutes);
app.use('/api/kepala-pesantren', kepalaPesantrenRoutes);
app.use('/api/mata-pelajaran', mataPelajaranRoutes);
app.use('/api/nilai', nilaiRoutes);
app.use('/api/sikap', sikapRoutes);
app.use('/api/kehadiran', kehadiranRoutes);
app.use('/api/excel', excelRoutes);
app.use('/api/kelas', kelasRoutes);
app.use('/api/indikator-sikap', indikatorSikapRoutes);
app.use('/api/tahun-ajaran', tahunAjaranRoutes);
app.use('/api/raports', raportRoutes); // <-- Ini sudah benar (raports)
app.use('/api/templates', templateRoutes);
app.use('/api/draft', draftRoutes);
app.use('/api/indikator-kehadiran', indikatorKehadiranRoutes);

console.log("✓ All routes registered successfully");

// Rute dasar
app.get('/', (req, res) => {
    res.json({ message: 'Selamat datang di API e-Raport.' });
});

// Atur port dan jalankan server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server berjalan pada port ${PORT}.`);
});
