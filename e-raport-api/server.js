const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import semua routes
const siswaRoutes = require('./routes/siswaRoutes');
const waliKelasRoutes = require('./routes/waliKelasRoutes');
const kepalaPesantrenRoutes = require('./routes/kepalaPesantrenRoutes');
const mataPelajaranRoutes = require('./routes/mataPelajaranRoutes');
const nilaiRoutes = require('./routes/nilaiRoutes');
const sikapRoutes = require('./routes/sikapRoutes');
const kehadiranRoutes = require('./routes/kehadiranRoutes');
const templateRoutes = require('./routes/templateRoutes');
const excelRoutes = require('./routes/excelRoutes');
const kelasRoutes = require('./routes/kelasRoutes');
const indikatorSikapRoutes = require('./routes/indikatorSikapRoutes');
const tahunAjaranRoutes = require('./routes/tahunAjaranRoutes'); // BARU

// Gunakan semua routes dengan prefix yang benar
app.use('/api/siswa', siswaRoutes);
app.use('/api/wali-kelas', waliKelasRoutes);
app.use('/api/kepala-pesantren', kepalaPesantrenRoutes);
app.use('/api/mata-pelajaran', mataPelajaranRoutes);
app.use('/api/nilai', nilaiRoutes);
app.use('/api/sikap', sikapRoutes);
app.use('/api/kehadiran', kehadiranRoutes);
app.use('/api/template', templateRoutes);
app.use('/api/excel', excelRoutes);
app.use('/api/kelas', kelasRoutes);
app.use('/api/indikator-sikap', indikatorSikapRoutes);
app.use('/api/tahun-ajaran', tahunAjaranRoutes); // BARU

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
