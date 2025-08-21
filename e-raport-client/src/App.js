import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ManajemenSiswaPage from './pages/ManajemenSiswaPage';
import ManajemenKelasPage from './pages/ManajemenAkademik/ManajemenKelasPage';
import ManajemenMapelPage from './pages/ManajemenAkademik/MataPelajaranPage';
import ManajemenWaliKelasPage from './pages/ManajemenAkademik/WaliKelasPage';
import ManajemenTahunAjaranPage from './pages/ManajemenAkademik/ManajemenTahunAjaranPage';
import ManajemenIndikatorSikapPage from './pages/ManajemenAkademik/ManajemenIndikatorSikapPage';
import ManajemenKepalaPesantrenPage from './pages/ManajemenAkademik/KepalaPesantrenPage';
import InputNilaiPage from './pages/InputNilaiPage';
import GenerateRaportPage from './pages/GenerateRaportPage';
import ValidasiRaportPage from './pages/ValidasiRaportPage';
import DraftRaportPage from './pages/DraftRaportPage';

function App() {
  return (
    <Router>
      <div className="d-flex">
        <Sidebar />
        <main className="flex-grow-1 p-4" style={{ backgroundColor: '#f8f9fa' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/manajemen-siswa" element={<ManajemenSiswaPage />} />
            <Route path="/input-nilai" element={<InputNilaiPage />} />
            <Route path="/generate-raport" element={<GenerateRaportPage />} />

            {/* --- SESUAIKAN SEMUA RUTE MASTER DATA DI SINI --- */}
            <Route path="/manajemen-akademik/tahun-ajaran" element={<ManajemenTahunAjaranPage />} />
            <Route path="/manajemen-akademik/wali-kelas" element={<ManajemenWaliKelasPage />} />
            <Route path="/manajemen-akademik/kelas" element={<ManajemenKelasPage />} />
            <Route path="/manajemen-akademik/mata-pelajaran" element={<ManajemenMapelPage />} />
            <Route path="/manajemen-akademik/indikator-sikap" element={<ManajemenIndikatorSikapPage />} />
            <Route path="/manajemen-akademik/kepala-pesantren" element={<ManajemenKepalaPesantrenPage />} />
            
            {/* Rute untuk validasi dan draft raport (ini sudah benar) */}
            <Route path="/validasi-raport/:batchId" element={<ValidasiRaportPage />} />
            <Route path="/draft-raport/:nis/:semester/:tahun_ajaran" element={<DraftRaportPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;