import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import ToastProvider from './components/ui/toast'
import Dashboard from './dashboard/page'
import ManajemenSiswaPage from './dashboard/manajemen-siswa/page'
import ManajemenKelasPage from './dashboard/manajemen-kelas/page'
import ManajemenMapelPage from './dashboard/manajemen-mapel/page'
import ManajemenKamarPage from './dashboard/manajemen-kamar/page'
// use the new dashboard-styled pages instead of legacy pages
import ManajemenTahunAjaranPage from './dashboard/manajemen-tahun-ajaran/page'
import ManajemenIndikatorSikapPage from './dashboard/manajemen-indikator-sikap/page';
import ManajemenKepalaPesantrenPage from './dashboard/manajemen-kepala-pesantren/page';
import ManajemenIndikatorKehadiranPage from './dashboard/manajemen-indikator-kehadiran/page';
// fall back to legacy page if dashboard-styled page not present
import ManajemenTemplatePage from './dashboard/manajemen-template/page';
import ManajemenGuruPage from './dashboard/manajemen-guru/page';
import InputNilaiDashboardPage from './dashboard/input-nilai/page'
import ManajemenRaportDashboardPage from './dashboard/manajemen-raport/page'
import ManajemenMapelDashboardPage from './dashboard/manajemen-mapel/page'
import ManajemenKelasDashboardPage from './dashboard/manajemen-kelas/page'
import ManajemenKamarDashboardPage from './dashboard/manajemen-kamar/page'
import ManajemenKurikulumPage from './dashboard/manajemen-kurikulum/page'
import ManajemenNilaiUjianPage from './dashboard/manajemen-nilai-ujian/page'
import ManajemenNilaiHafalanPage from './dashboard/manajemen-nilai-hafalan/page'
import ManajemenDraftNilaiPage from './dashboard/manajemen-draft-nilai/page'
import ManajemenKitabPage from './dashboard/manajemen-kitab/page'; 
import ManajemenKehadiranPage from './dashboard/manajemen-kehadiran/page'
import ManajemenSikapPage from './dashboard/manajemen-sikap/page'
import PromosiKelasPage from './dashboard/promosi-kelas/page'





function App() {
  return (
  <ToastProvider>
  <Router>
      <Routes>
        {/* dashboard root */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* dashboard pages (new) */}
        <Route path="/dashboard/manajemen-siswa" element={<ManajemenSiswaPage />} />
        <Route path="/dashboard/manajemen-guru" element={<ManajemenGuruPage />} />
        <Route path="/dashboard/manajemen-kelas" element={<ManajemenKelasDashboardPage />} />
        <Route path="/dashboard/manajemen-kamar" element={<ManajemenKamarDashboardPage />} />
        <Route path="/dashboard/manajemen-mapel" element={<ManajemenMapelDashboardPage />} />
        <Route path="/dashboard/manajemen-tahun-ajaran" element={<ManajemenTahunAjaranPage />} />
        <Route path="/dashboard/input-nilai" element={<InputNilaiDashboardPage />} />
        <Route path="/dashboard/manajemen-raport" element={<ManajemenRaportDashboardPage />} />
        <Route path="/dashboard/manajemen-template" element={<ManajemenTemplatePage />} />
        {/* <Route path="/dashboard/promosi-kelas" element={<PromosiKelasPage />} /> */}
  <Route path="/dashboard/indikator-sikap" element={<ManajemenIndikatorSikapPage />} />
  {/* compatibility route: some nav links use 'manajemen-indikator-sikap' */}
  <Route path="/dashboard/manajemen-indikator-sikap" element={<ManajemenIndikatorSikapPage />} />
        <Route path="/dashboard/indikator-kehadiran" element={<ManajemenIndikatorKehadiranPage />} />
        <Route path="/dashboard/kepala-pesantren" element={<ManajemenKepalaPesantrenPage />} />
        <Route path="/dashboard/manajemen-kurikulum" element={<ManajemenKurikulumPage />} />
        <Route path="/dashboard/manajemen-nilai-ujian" element={<ManajemenNilaiUjianPage />} />
        <Route path="/dashboard/manajemen-nilai-hafalan" element={<ManajemenNilaiHafalanPage />} />
        <Route path="/dashboard/manajemen-draft-nilai" element={<ManajemenDraftNilaiPage />} />
    <Route path="/dashboard/manajemen-kitab" element={<ManajemenKitabPage />} />
    <Route path="/dashboard/manajemen-kehadiran" element={<ManajemenKehadiranPage />} />
    <Route path="/dashboard/manajemen-sikap" element={<ManajemenSikapPage />} />
    <Route path="/dashboard/promosi-kelas" element={<PromosiKelasPage />} />
  {/* compatibility: some links may use the old 'kenaikan-kelas' path */}
  <Route path="/dashboard/kenaikan-kelas" element={<PromosiKelasPage />} />

        {/* legacy routes: redirect to dashboard equivalents */}
        <Route path="/manajemen-siswa" element={<Navigate to="/dashboard/manajemen-siswa" replace />} />
        <Route path="/manajemen-guru" element={<Navigate to="/dashboard/manajemen-guru" replace />} />
        <Route path="/manajemen-akademik/kelas" element={<Navigate to="/dashboard/manajemen-kelas" replace />} />
        <Route path="/manajemen-akademik/kamar" element={<Navigate to="/dashboard/manajemen-kamar" replace />} />
        <Route path="/manajemen-akademik/mata-pelajaran" element={<Navigate to="/dashboard/manajemen-mapel" replace />} />
        <Route path="/input-nilai" element={<Navigate to="/dashboard/input-nilai" replace />} />
        <Route path="/manajemen-raport" element={<Navigate to="/dashboard/manajemen-raport" replace />} />
        <Route path="/manajemen-template" element={<Navigate to="/dashboard/manajemen-template" replace />} />
        <Route path="/manajemen-akademik/promosi-kelas" element={<Navigate to="/dashboard/promosi-kelas" replace />} />
  <Route path="/manajemen-akademik/kenaikan-kelas" element={<Navigate to="/dashboard/kenaikan-kelas" replace />} />
        <Route path="/manajemen-akademik/indikator-sikap" element={<Navigate to="/dashboard/indikator-sikap" replace />} />
        <Route path="/manajemen-akademik/indikator-kehadiran" element={<Navigate to="/dashboard/indikator-kehadiran" replace />} />
        <Route path="/manajemen-akademik/kepala-pesantren" element={<Navigate to="/dashboard/kepala-pesantren" replace />} />

        {/* keep specific legacy pages (validate/draft) redirect if needed */}
        <Route path="/validasi-raport/:batchId" element={<Navigate to="/dashboard/manajemen-raport" replace />} />
        <Route path="/draft-raport" element={<Navigate to="/dashboard/manajemen-draft-nilai" replace />} />
      </Routes>
  </Router>
  </ToastProvider>
  );
}

export default App;