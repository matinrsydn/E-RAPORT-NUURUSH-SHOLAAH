import React from 'react';
import { NavLink } from 'react-router-dom';
import { ListGroup } from 'react-bootstrap';
import { Users, UserCheck, Book, FileUp, FileText, UserCog, House, Layers, ClipboardList, Calendar, FileCheck, FilePlus } from 'lucide-react';

const Sidebar = () => {
    return (
        <aside className="bg-light" style={{ width: '280px', minHeight: '100vh', boxShadow: '2px 0 5px rgba(0,0,0,0.1)' }}>
            <div className="p-4 border-bottom">
                <h2 className="h4 text-primary text-center">e-Raport</h2>
            </div>
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
                
                {/* --- MENU DRAFT & GENERATE RAPORT --- */}
                <ListGroup.Item action as={NavLink} to="/draft-raport" className="d-flex align-items-center gap-3 rounded mb-1">
                    <FileCheck size={18} /> Draft Raport
                </ListGroup.Item>
                <ListGroup.Item action as={NavLink} to="/generate-raport" className="d-flex align-items-center gap-3 rounded mb-1">
                    <FilePlus size={18} /> Generate Raport
                </ListGroup.Item>

                <h3 className="px-3 py-2 mt-4" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Master Data</h3>
                <ListGroup.Item action as={NavLink} to="/manajemen-akademik/tahun-ajaran" className="d-flex align-items-center gap-3 rounded mb-1">
                    <Calendar size={18} /> Tahun Ajaran
                </ListGroup.Item>
                <ListGroup.Item action as={NavLink} to="/manajemen-akademik/wali-kelas" className="d-flex align-items-center gap-3 rounded mb-1">
                    <UserCheck size={18} /> Wali Kelas
                </ListGroup.Item>
                <ListGroup.Item action as={NavLink} to="/manajemen-akademik/kelas" className="d-flex align-items-center gap-3 rounded mb-1">
                    <Layers size={18} /> Manajemen Kelas
                </ListGroup.Item>
                <ListGroup.Item action as={NavLink} to="/manajemen-akademik/mata-pelajaran" className="d-flex align-items-center gap-3 rounded mb-1">
                    <Book size={18} /> Mata Pelajaran
                </ListGroup.Item>
                <ListGroup.Item action as={NavLink} to="/manajemen-akademik/indikator-sikap" className="d-flex align-items-center gap-3 rounded mb-1">
                    <ClipboardList size={18} /> Indikator Sikap
                </ListGroup.Item>
                <ListGroup.Item action as={NavLink} to="/manajemen-akademik/kepala-pesantren" className="d-flex align-items-center gap-3 rounded mb-1">
                    <UserCog size={18} /> Kepala Pesantren
                </ListGroup.Item>
            </ListGroup>
        </aside>
    );
};
export default Sidebar;