import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';

// Import Halaman yang Sudah Ada (dengan path yang benar)
import Dashboard from './pages/Dashboard';
import ManajemenSiswaPage from './pages/ManajemenSiswaPage';
import UploadExcelPage from './pages/UploadExcelPage';
import ManajemenTemplatePage from './pages/ManajemenTemplatePage';
import WaliKelasPage from './pages/ManajemenAkademik/WaliKelasPage';
import MataPelajaranPage from './pages/ManajemenAkademik/MataPelajaranPage';
import KepalaPesantrenPage from './pages/ManajemenAkademik/KepalaPesantrenPage';

// Import Halaman Baru
import ManajemenKelasPage from './pages/ManajemenKelasPage';
import IndikatorSikapPage from './pages/IndikatorSikapPage';
import GenerateRaportPage from './pages/GenerateRaportPage';

function App() {
  return (
    <Router>
      <div className="d-flex">
        <Sidebar />
        <main className="flex-grow-1 p-4">
          <Routes>
            {/* Rute yang sudah ada */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/manajemen-siswa" element={<ManajemenSiswaPage />} />
            <Route path="/upload-excel" element={<UploadExcelPage />} />
            <Route path="/manajemen-template" element={<ManajemenTemplatePage />} />
            <Route path="/wali-kelas" element={<WaliKelasPage />} />
            <Route path="/mata-pelajaran" element={<MataPelajaranPage />} />
            <Route path="/kepala-pesantren" element={<KepalaPesantrenPage />} />

            {/* Rute untuk Halaman Baru */}
            <Route path="/download-template" element={<GenerateRaportPage />} />
            <Route path="/manajemen-kelas" element={<ManajemenKelasPage />} />
            <Route path="/indikator-sikap" element={<IndikatorSikapPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;