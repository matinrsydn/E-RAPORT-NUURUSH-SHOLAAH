import React, { useState } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import ManajemenSiswaPage from './pages/ManajemenSiswaPage';
import WaliKelasPage from './pages/ManajemenAkademik/WaliKelasPage';
import MataPelajaranPage from './pages/ManajemenAkademik/MataPelajaranPage';
import UploadExcelPage from './pages/UploadExcelPage';
import ManajemenTemplatePage from './pages/ManajemenTemplatePage';
import GenerateRaportPage from './pages/GenerateRaportPage';
import KepalaSekolahPage from './pages/ManajemenAkademik/KepalaSekolahPage';

// Set base URL untuk semua request axios
axios.defaults.baseURL = 'http://localhost:5000/api';

function App() {
  const [activeMenu, setActiveMenu] = useState('Upload Nilai Excel');

  const renderContent = () => {
    switch (activeMenu) {
      case 'Manajemen Siswa': return <ManajemenSiswaPage />;
      case 'Wali Kelas': return <WaliKelasPage />;
      case 'Mata Pelajaran': return <MataPelajaranPage />;
      case 'Kepala Sekolah': return <KepalaSekolahPage />;
      case 'Manajemen Template': return <ManajemenTemplatePage />;
      case 'Upload Nilai Excel': return <UploadExcelPage />;
      case 'Cetak Raport': return <GenerateRaportPage />;
      default: return <UploadExcelPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      <main className="flex-1 p-8 overflow-y-auto">{renderContent()}</main>
    </div>
  );
}
export default App;