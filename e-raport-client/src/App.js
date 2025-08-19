import React, { useState } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ManajemenSiswaPage from './pages/ManajemenSiswaPage';
import WaliKelasPage from './pages/ManajemenAkademik/WaliKelasPage';
import MataPelajaranPage from './pages/ManajemenAkademik/MataPelajaranPage';
import KepalaPesantrenPage from './pages/ManajemenAkademik/KepalaPesantrenPage';
import UploadExcelPage from './pages/UploadExcelPage';
import ManajemenTemplatePage from './pages/ManajemenTemplatePage';
import GenerateRaportPage from './pages/GenerateRaportPage';

// Set base URL untuk semua request axios
axios.defaults.baseURL = 'http://localhost:5000/api';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content p-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/manajemen-siswa" element={<ManajemenSiswaPage />} />
            <Route path="/wali-kelas" element={<WaliKelasPage />} />
            <Route path="/mata-pelajaran" element={<MataPelajaranPage />} />
            <Route path="/kepala-pesantren" element={<KepalaPesantrenPage />} />
            <Route path="/manajemen-template" element={<ManajemenTemplatePage />} />
            <Route path="/upload-excel" element={<UploadExcelPage />} />
            <Route path="/cetak-raport" element={<GenerateRaportPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
export default App;