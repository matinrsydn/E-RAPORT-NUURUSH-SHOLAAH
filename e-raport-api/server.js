const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./models');

const app = express();

// Middleware
// Log incoming Origin header to help debug CORS issues from browser requests
app.use((req, res, next) => {
  if (req.headers && req.headers.origin) {
    console.log('➡️ Incoming Origin:', req.headers.origin);
  }
  next();
});

// Safer CORS: allowlist and function check to avoid malformed input
// Add http://localhost:3001 so the frontend running on that origin can access the API
const allowedOrigins = ['http://localhost:3002', 'http://localhost:3001', 'http://localhost:3000'];
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like curl, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    console.log('⛔ CORS blocked for origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
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

// Sinkronisasi database (gunakan alter untuk menjaga konsistensi schema dari models)
// Use authenticate() at startup instead of sync({ alter: true }) to avoid
// running potentially destructive or large ALTER operations automatically
// (which on some MySQL setups can fail with "Too many keys specified").
// This still verifies DB connectivity without modifying schema.
db.sequelize.authenticate()
  .then(() => {
    console.log('Database terkoneksi (authenticate).');
  })
  .catch((err) => {
    console.log('Gagal koneksi database: ' + (err && err.message ? err.message : err));
    // don't throw; allow server to start so routes can be debugged even when
    // schema sync fails locally. Developers should fix migrations separately.
  });

// log unhandled errors so the process doesn't silently exit during debugging
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
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
const kamarRoutes = require('./routes/kamarRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const kitabRoutes = require('./routes/kitabRoutes');
const kurikulumRoutes = require('./routes/kurikulumRoutes');
const guruRoutes = require('./routes/guruRoutes');

app.use('/api/siswa', siswaRoutes);
console.log("Registered route: /api/siswa -> ./routes/siswaRoutes.js");
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
// Keep existing plural route for backward compatibility
app.use('/api/raports', raportRoutes);
// Also register singular '/api/raport' so clients using either form won't get 404s
app.use('/api/raport', raportRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/draft', draftRoutes);
app.use('/api/indikator-kehadiran', indikatorKehadiranRoutes);
app.use('/api/kamar', kamarRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/kitab', kitabRoutes);
app.use('/api/kurikulum', kurikulumRoutes);
app.use('/api/guru', guruRoutes);

console.log("✓ All routes registered successfully");
console.log("\u2713 All routes registered successfully");

// Rute dasar
app.get('/', (req, res) => {
    res.json({ message: 'Selamat datang di API e-Raport.' });
});

// Atur port dan jalankan server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server berjalan pada port ${PORT}.`);
});
