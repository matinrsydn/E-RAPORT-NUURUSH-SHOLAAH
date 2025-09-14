const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./models');

const os = require('os');
const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
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
const masterTahunAjaranRoutes = require('./routes/masterTahunAjaranRoutes');
const templateRoutes = require('./routes/templateRoutes.js');
const raportRoutes = require('./routes/raportRoutes');
const indikatorKehadiranRoutes = require('./routes/indikatorKehadiranRoutes');
const kamarRoutes = require('./routes/kamarRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const kitabRoutes = require('./routes/kitabRoutes');
const kurikulumRoutes = require('./routes/kurikulumRoutes');
const guruRoutes = require('./routes/guruRoutes');
const kenaikanRoutes = require('./routes/kenaikanRoutes');
const promosiRoutes = require('./routes/promosiRoutes');
const suratKeluarRoutes = require('./routes/suratKeluarRoutes');
const kelasPeriodeRoutes = require('./routes/kelasPeriodeRoutes');
const historyRoutes = require('./routes/historyRoutes');
const tingkatanRoutes = require('./routes/tingkatanRoutes');

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
app.use('/api/master-tahun-ajaran', masterTahunAjaranRoutes);
// Keep existing plural route for backward compatibility
app.use('/api/raports', raportRoutes);
// Also register singular '/api/raport' so clients using either form won't get 404s
app.use('/api/raport', raportRoutes);
app.use('/api/templates', templateRoutes);
// draft routes removed: draft flow deprecated — uploads now go directly to raport endpoints
app.use('/api/indikator-kehadiran', indikatorKehadiranRoutes);
app.use('/api/kamar', kamarRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/kitab', kitabRoutes);
app.use('/api/kurikulum', kurikulumRoutes);
app.use('/api/guru', guruRoutes);
app.use('/api/kenaikan', kenaikanRoutes);
app.use('/api/promosi', promosiRoutes);
app.use('/api/surat-keluar', suratKeluarRoutes);
app.use('/api/kelas-periode', kelasPeriodeRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/tingkatans', tingkatanRoutes);

console.log("✓ All routes registered successfully");
console.log("\u2713 All routes registered successfully");

// Rute dasar
// Serve React production build if it exists (assumes client build at ../e-raport-client/build)
const clientBuildPath = path.join(__dirname, '..', 'e-raport-client', 'build');
try {
  // check if build folder exists
  const fs = require('fs');
  if (fs.existsSync(clientBuildPath)) {
    console.log('Serving React build from', clientBuildPath);
    app.use(express.static(clientBuildPath));

    // For any non-API route, serve index.html so client-side router works
    app.get(/^((?!\/api).)*$/, (req, res) => {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  } else {
    // fallback JSON greeting
    app.get('/', (req, res) => {
      res.json({ message: 'Selamat datang di API e-Raport.' });
    });
  }
} catch (e) {
  console.error('Error while configuring client static middleware:', e && e.message ? e.message : e);
  app.get('/', (req, res) => {
    res.json({ message: 'Selamat datang di API e-Raport.' });
  });
}

// Atur port dan jalankan server
const PORT = process.env.PORT || 5000;
// If ALLOW_LAN=true, bind to 0.0.0.0 so other devices on the LAN can reach the API
const HOST = process.env.ALLOW_LAN === 'true' ? '0.0.0.0' : '127.0.0.1';
app.listen(PORT, HOST, () => {
    console.log(`Server berjalan pada ${HOST}:${PORT}.`);
    // If running in LAN mode, log possible LAN URL to help clients find API
    if (HOST === '0.0.0.0') {
      try {
        const os = require('os');
        const ifaces = os.networkInterfaces();
        for (const name of Object.keys(ifaces)) {
          for (const iface of ifaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
              console.log(`➡️ API available at: http://${iface.address}:${PORT}/`);
            }
          }
        }
      } catch (e) {
        console.log('Could not list network interfaces:', e && e.message ? e.message : e);
      }
    }
});
