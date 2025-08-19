import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';

// Import semua halaman yang digunakan
import Dashboard from './pages/Dashboard';
import ManajemenSiswaPage from './pages/ManajemenSiswaPage';
import WaliKelasPage from './pages/ManajemenAkademik/WaliKelasPage';
import MataPelajaranPage from './pages/ManajemenAkademik/MataPelajaranPage';
import KepalaPesantrenPage from './pages/ManajemenAkademik/KepalaPesantrenPage';
import ManajemenTemplatePage from './pages/ManajemenTemplatePage';
import ManajemenKelasPage from './pages/ManajemenKelasPage';
import IndikatorSikapPage from './pages/IndikatorSikapPage';
import ManajemenTahunAjaranPage from './pages/ManajemenAkademik/ManajemenTahunAjaranPage';
import InputNilaiPage from './pages/InputNilaiPage';

function App() {
  return (
    <Router>
      <div className="d-flex">
        <Sidebar />
        <main className="flex-grow-1 p-4">
          <Routes>
            {/* Rute Utama */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/manajemen-siswa" element={<ManajemenSiswaPage />} />
            <Route path="/input-nilai" element={<InputNilaiPage />} />
            
            {/* Rute Master Data */}
            <Route path="/tahun-ajaran" element={<ManajemenTahunAjaranPage />} />
            <Route path="/wali-kelas" element={<WaliKelasPage />} />
            <Route path="/manajemen-kelas" element={<ManajemenKelasPage />} />
            <Route path="/mata-pelajaran" element={<MataPelajaranPage />} />
            <Route path="/indikator-sikap" element={<IndikatorSikapPage />} />
            <Route path="/kepala-pesantren" element={<KepalaPesantrenPage />} />
            <Route path="/manajemen-template" element={<ManajemenTemplatePage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
