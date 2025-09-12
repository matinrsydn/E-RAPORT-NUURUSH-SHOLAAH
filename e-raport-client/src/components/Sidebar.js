import React from 'react';
import { NavLink } from 'react-router-dom';
import { ListGroup } from 'react-bootstrap';
import { 
    Users, UserCheck, Book, FileUp, UserCog, House, Layers, 
    ClipboardList, Calendar, FileCheck, BookUser, CalendarCheck, DoorOpen, FileCog, CheckSquare
} from 'lucide-react';

const Sidebar = () => {
    return (
        <aside 
            className="bg-light" 
            style={{ 
                width: '280px', 
                minHeight: '100vh', 
                boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
                
                // --- PERBAIKAN UTAMA ADA DI SINI ---
                position: 'sticky', // 1. Buat sidebar "menempel"
                top: 0,             // 2. Tempelkan di bagian atas layar
                alignSelf: 'flex-start', // Diperlukan agar 'sticky' bekerja dalam flex container
                height: '100vh',    // 3. Atur tinggi maksimal sama dengan tinggi layar
                overflowY: 'auto'   // 4. Jika konten lebih panjang, aktifkan scroll vertikal
            }}
        >
            <div className="p-4 border-bottom">
                <h2 className="h4 text-primary text-center">e-Raport</h2>
            </div>
            {/* ListGroup di sini akan bisa di-scroll jika menunya sangat banyak */}
            <ListGroup variant="flush" className="p-2">
                <h3 className="px-3 py-2 mt-2" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Menu Utama</h3>
                
                <ListGroup.Item action as={NavLink} to="/" className="d-flex align-items-center gap-3 rounded mb-1">
                    <House size={18} /> Dashboard
                </ListGroup.Item>
                <ListGroup.Item action as={NavLink} to="/manajemen-siswa" className="d-flex align-items-center gap-3 rounded mb-1">
                    <Users size={18} /> Manajemen Siswa
                </ListGroup.Item>
                <ListGroup.Item action as={NavLink} to="/input-nilai" className="d-flex align-items-center gap-3 rounded mb-1">
                    <FileUp size={18} /> Input Nilai
                </ListGroup.Item>
                <ListGroup.Item action as={NavLink} to="/manajemen-raport" className="d-flex align-items-center gap-3 rounded mb-1">
                    <BookUser size={18} /> Manajemen Raport
                </ListGroup.Item>


                {/* --- MENU MASTER DATA --- */}
                <h3 className="px-3 py-2 mt-4" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Master Data</h3>
                <ListGroup.Item action as={NavLink} to="/manajemen-akademik/tahun-ajaran" className="d-flex align-items-center gap-3 rounded mb-1">
                    <Calendar size={18} /> Tahun Ajaran
                </ListGroup.Item>
                
                <ListGroup.Item action as={NavLink} to="/manajemen-guru" className="d-flex align-items-center gap-3 rounded mb-1">
                    <Users size={18} /> Manajemen Guru
                </ListGroup.Item>
                <ListGroup.Item action as={NavLink} to="/manajemen-akademik/promosi-kelas" className="d-flex align-items-center gap-3 rounded mb-1">
                    <CheckSquare size={18} /> Kenaikan Kelas
                </ListGroup.Item>
                <ListGroup.Item action as={NavLink} to="/manajemen-akademik/kelas" className="d-flex align-items-center gap-3 rounded mb-1">
                    <Layers size={18} /> Manajemen Kelas
                </ListGroup.Item>
                <ListGroup.Item action as={NavLink} to="/manajemen-akademik/kamar" className="d-flex align-items-center gap-3 rounded mb-1">
                    <DoorOpen size={18} /> Manajemen Kamar
                </ListGroup.Item>
                <ListGroup.Item action as={NavLink} to="/manajemen-akademik/mata-pelajaran" className="d-flex align-items-center gap-3 rounded mb-1">
                    <Book size={18} /> Mata Pelajaran
                </ListGroup.Item>

                {/* ====================================================== */}
                {/* === PENAMBAHAN MENU MANAJEMEN KITAB === */}
                {/* ====================================================== */}
                <ListGroup.Item action as={NavLink} to="/manajemen-akademik/kitab" className="d-flex align-items-center gap-3 rounded mb-1">
                    <Book size={18} /> Manajemen Kitab
                </ListGroup.Item>
                {/* ====================================================== */}

                <ListGroup.Item action as={NavLink} to="/manajemen-akademik/indikator-sikap" className="d-flex align-items-center gap-3 rounded mb-1">
                    <ClipboardList size={18} /> Indikator Sikap
                </ListGroup.Item>
                
                <ListGroup.Item action as={NavLink} to="/manajemen-akademik/indikator-kehadiran" className="d-flex align-items-center gap-3 rounded mb-1">
                    <CalendarCheck size={18} /> Indikator Kehadiran
                </ListGroup.Item>
                
                <ListGroup.Item action as={NavLink} to="/manajemen-akademik/kepala-pesantren" className="d-flex align-items-center gap-3 rounded mb-1">
                    <UserCog size={18} /> Pimpinan Pesantren
                </ListGroup.Item>
                <ListGroup.Item action as={NavLink} to="/manajemen-template" className="d-flex align-items-center gap-3 rounded mb-1">
                    <FileCog size={18} /> Manajemen Template
                </ListGroup.Item>
            </ListGroup>
        </aside>
    );
};
export default Sidebar;