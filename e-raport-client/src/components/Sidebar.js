import React from 'react';
import { NavLink } from 'react-router-dom';
import { ListGroup } from 'react-bootstrap';
import { Users, UserCheck, Book, FileUp, FileText, Printer, UserCog, House, Layers, ClipboardList } from 'lucide-react';

const Sidebar = () => {
    return (
        <aside className="bg-light" style={{ width: '280px', minHeight: '100vh', boxShadow: '2px 0 5px rgba(0,0,0,0.1)' }}>
            <div className="p-4 border-bottom">
                <h2 className="h4 text-primary text-center">e-Raport</h2>
            </div>
            <ListGroup variant="flush" className="p-2">
                <h3 className="px-3 py-2 mt-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Menu Utama</h3>
                <ListGroup.Item action as={NavLink} to="/" className="d-flex align-items-center gap-3 rounded mb-1">
                    <House size={18} /> Dashboard
                </ListGroup.Item>
                <ListGroup.Item action as={NavLink} to="/manajemen-siswa" className="d-flex align-items-center gap-3 rounded mb-1">
                    <Users size={18} /> Manajemen Siswa
                </ListGroup.Item>
                <ListGroup.Item action as={NavLink} to="/upload-excel" className="d-flex align-items-center gap-3 rounded mb-1">
                    <FileUp size={18} /> Upload Nilai Excel
                </ListGroup.Item>
                {/* MODIFIKASI: Mengganti link dan nama dari Cetak Raport ke Download Template */}
                <ListGroup.Item action as={NavLink} to="/download-template" className="d-flex align-items-center gap-3 rounded mb-1">
                    <Printer size={18} /> Download Template Nilai
                </ListGroup.Item>

                <h3 className="px-3 py-2 mt-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Master Data</h3>
                <ListGroup.Item action as={NavLink} to="/wali-kelas" className="d-flex align-items-center gap-3 rounded mb-1">
                    <UserCheck size={18} /> Wali Kelas
                </ListGroup.Item>
                <ListGroup.Item action as={NavLink} to="/mata-pelajaran" className="d-flex align-items-center gap-3 rounded mb-1">
                    <Book size={18} /> Mata Pelajaran
                </ListGroup.Item>
                
                {/* --- BARU --- */}
                <ListGroup.Item action as={NavLink} to="/manajemen-kelas" className="d-flex align-items-center gap-3 rounded mb-1">
                    <Layers size={18} /> Manajemen Kelas
                </ListGroup.Item>
                <ListGroup.Item action as={NavLink} to="/indikator-sikap" className="d-flex align-items-center gap-3 rounded mb-1">
                    <ClipboardList size={18} /> Indikator Sikap
                </ListGroup.Item>
                {/* --- END BARU --- */}

                <ListGroup.Item action as={NavLink} to="/kepala-pesantren" className="d-flex align-items-center gap-3 rounded mb-1">
                    <UserCog size={18} /> Kepala Pesantren
                </ListGroup.Item>
                <ListGroup.Item action as={NavLink} to="/manajemen-template" className="d-flex align-items-center gap-3 rounded mb-1">
                    <FileText size={18} /> Manajemen Template
                </ListGroup.Item>
            </ListGroup>
        </aside>
    );
};
export default Sidebar;
