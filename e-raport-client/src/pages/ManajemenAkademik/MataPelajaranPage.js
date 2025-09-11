import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import API_BASE from '../../api';
import { Modal, Button, Form, Table, Alert, Tabs, Tab, Row, Col, Spinner, Accordion } from 'react-bootstrap';

/**
 * Komponen Reusable untuk tabel data master (Mapel & Kitab).
 */
const MasterDataTable = ({ title, data, onAdd, onEdit, onDelete, fields }) => (
    <>
        <div className="d-flex justify-content-between align-items-center mb-2">
            <h5>{title}</h5>
            <Button variant="outline-primary" size="sm" onClick={() => onAdd()}>
                + Tambah {title.replace('Master ', '')}
            </Button>
        </div>
        <Table striped bordered hover responsive size="sm">
            <thead>
                <tr>
                    <th>#</th>
                    {fields.map(f => <th key={f.key}>{f.label}</th>)}
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody>
                {data.map((item, index) => (
                    <tr key={item.id}>
                        <td>{index + 1}</td>
                        {fields.map(f => <td key={f.key}>{item[f.key]}</td>)}
                        <td>
                            <Button variant="info" size="sm" className="me-1" onClick={() => onEdit(item)}>Edit</Button>
                            <Button variant="danger" size="sm" onClick={() => onDelete(item.id)}>Hapus</Button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    </>
);


/**
 * Komponen Utama Halaman Manajemen Kurikulum
 */
const MataPelajaranPage = () => {
    // State untuk filter utama
    const [tahunAjarans, setTahunAjarans] = useState([]);
    const [kelasList, setKelasList] = useState([]);
    const [selectedTahunAjaranName, setSelectedTahunAjaranName] = useState(''); // Menyimpan nama ajaran, cth: "2025/2026"
    const [selectedKelas, setSelectedKelas] = useState('');

    // State untuk kurikulum
    const [kurikulum1, setKurikulum1] = useState([]);
    const [kurikulum2, setKurikulum2] = useState([]);
    const [loadingKurikulum, setLoadingKurikulum] = useState(false);

    // State untuk data master
    const [masterMapel, setMasterMapel] = useState([]);
    const [masterKitab, setMasterKitab] = useState([]);

    // State untuk modal
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({ type: '', data: {} });

    const [error, setError] = useState(null);

    // --- PENGAMBILAN DATA ---

    // Mengambil semua data master
    const fetchMasterData = useCallback(async () => {
        try {
            const [resTA, resKelas, resMapel, resKitab] = await Promise.all([
                axios.get(`${API_BASE}/tahun-ajaran`),
                axios.get(`${API_BASE}/kelas`),
                axios.get(`${API_BASE}/mata-pelajaran`),
                axios.get(`${API_BASE}/kitab`),
            ]);
            setTahunAjarans(resTA.data);
            setKelasList(resKelas.data);
            setMasterMapel(resMapel.data);
            setMasterKitab(resKitab.data);
        } catch (err) {
            setError("Gagal memuat data master. Coba refresh halaman.");
        }
    }, []);

    // Mengambil data kurikulum berdasarkan filter
    const fetchKurikulum = useCallback(async () => {
        if (!selectedTahunAjaranName || !selectedKelas) return;
        
        // Cari ID untuk semester 1 dan 2 dari nama tahun ajaran yang dipilih
        const taSemester1 = tahunAjarans.find(ta => ta.nama_ajaran === selectedTahunAjaranName && ta.semester === '1');
        const taSemester2 = tahunAjarans.find(ta => ta.nama_ajaran === selectedTahunAjaranName && ta.semester === '2');

        if (!taSemester1 || !taSemester2) {
             setError(`Data Tahun Ajaran untuk ${selectedTahunAjaranName} tidak lengkap (membutuhkan Semester 1 & 2).`);
             return;
        }

        setLoadingKurikulum(true);
        setError(null);
        try {
            const paramsSem1 = { tahun_ajaran_id: taSemester1.id, kelas_id: selectedKelas, semester: 1 };
            const paramsSem2 = { tahun_ajaran_id: taSemester2.id, kelas_id: selectedKelas, semester: 2 };
            
            const [res1, res2] = await Promise.all([
                axios.get(`${API_BASE}/kurikulum`, { params: paramsSem1 }),
                axios.get(`${API_BASE}/kurikulum`, { params: paramsSem2 })
            ]);
            setKurikulum1(res1.data);
            setKurikulum2(res2.data);
        } catch (err) {
            setError("Gagal memuat data kurikulum.");
        } finally {
            setLoadingKurikulum(false);
        }
    }, [selectedTahunAjaranName, selectedKelas, tahunAjarans]);

    useEffect(() => {
        fetchMasterData();
    }, [fetchMasterData]);

    useEffect(() => {
        fetchKurikulum();
    }, [fetchKurikulum]);
    
    // --- KONTROL MODAL & OPERASI CRUD (TIDAK BERUBAH BANYAK) ---
    
    // Fungsi untuk mendapatkan ID tahun ajaran berdasarkan semester
    const getTahunAjaranIdBySemester = (semester) => {
        const ta = tahunAjarans.find(t => t.nama_ajaran === selectedTahunAjaranName && t.semester === semester.toString());
        return ta ? ta.id : null;
    };

    const handleShowModal = (type, data = {}) => {
        setModalConfig({ type, data });
        setShowModal(true);
    };
    const handleCloseModal = () => setShowModal(false);

    const handleSave = async (formData) => {
        const { type, data } = modalConfig;
        const isEditing = !!data.id;
        let url = '', method = 'post', successCallback = fetchMasterData;

        switch (type) {
            case 'mapel':
                url = isEditing ? `${API_BASE}/mata-pelajaran/${data.id}` : `${API_BASE}/mata-pelajaran`;
                method = isEditing ? 'put' : 'post';
                break;
            case 'kitab':
                url = isEditing ? `${API_BASE}/kitab/${data.id}` : `${API_BASE}/kitab`;
                method = isEditing ? 'put' : 'post';
                break;
            case 'kurikulumAdd':
                url = `${API_BASE}/kurikulum`;
                formData.tahun_ajaran_id = getTahunAjaranIdBySemester(formData.semester);
                formData.kelas_id = selectedKelas;
                if (!formData.tahun_ajaran_id) {
                    alert("Error: ID Tahun Ajaran tidak ditemukan untuk semester ini.");
                    return;
                }
                successCallback = fetchKurikulum;
                break;
            case 'kurikulumEdit':
                url = `${API_BASE}/kurikulum/${data.id}`;
                method = 'put';
                successCallback = fetchKurikulum;
                break;
            default: return;
        }

        try {
            await axios[method](url, formData);
            await successCallback();
            handleCloseModal();
        } catch (err) {
            alert('Gagal menyimpan data! Pastikan semua field terisi dengan benar.');
        }
    };
    
    const handleDelete = async (type, id) => {
        if (!window.confirm("Yakin ingin menghapus data ini?")) return;
        let url = '', successCallback = fetchMasterData;

        switch (type) {
            case 'mapel': url = `${API_BASE}/mata-pelajaran/${id}`; break;
            case 'kitab': url = `${API_BASE}/kitab/${id}`; break;
            case 'kurikulum':
                url = `${API_BASE}/kurikulum/${id}`;
                successCallback = fetchKurikulum;
                break;
            default: return;
        }

        try {
            await axios.delete(url);
            await successCallback();
        } catch (err) {
            alert('Gagal menghapus data! Mungkin data ini masih digunakan.');
        }
    };

    // --- MEMBUAT DROPDOWN TAHUN AJARAN MENJADI UNIK ---
    const uniqueTahunAjaranNames = useMemo(() => {
        // Menggunakan Set untuk mendapatkan nama tahun ajaran yang unik
        return [...new Set(tahunAjarans.map(ta => ta.nama_ajaran))];
    }, [tahunAjarans]);

    // --- FUNGSI UNTUK MERENDER KONTEN MODAL SECARA DINAMIS ---
    const renderModalContent = () => {
        if (!showModal) return null;
        const { type, data } = modalConfig;
        let title = '';
        let formFields;

        switch (type) {
            case 'mapel':
                title = data.id ? 'Edit Master Mapel' : 'Tambah Master Mapel';
                formFields = (
                    <>
                        <Form.Group className="mb-3">
                            <Form.Label>Nama Mata Pelajaran</Form.Label>
                            <Form.Control type="text" name="nama_mapel" defaultValue={data.nama_mapel || ''} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Jenis</Form.Label>
                            <Form.Select name="jenis" defaultValue={data.jenis || 'Ujian'}>
                                <option value="Ujian">Ujian</option>
                                <option value="Hafalan">Hafalan</option>
                            </Form.Select>
                        </Form.Group>
                    </>
                );
                break;
            case 'kitab':
                title = data.id ? 'Edit Master Kitab' : 'Tambah Master Kitab';
                formFields = (
                    <Form.Group className="mb-3">
                        <Form.Label>Nama Kitab</Form.Label>
                        <Form.Control type="text" name="nama_kitab" defaultValue={data.nama_kitab || ''} required />
                    </Form.Group>
                );
                break;
            case 'kurikulumAdd':
                title = `Tambah Mapel ke Kurikulum (Semester ${data.semester})`;
                formFields = (
                    <>
                        <Form.Control type="hidden" name="semester" value={data.semester} />
                        <Form.Group className="mb-3">
                            <Form.Label>Mata Pelajaran</Form.Label>
                            <Form.Select name="mapel_id" required>
                                <option value="">-- Pilih Mata Pelajaran --</option>
                                {masterMapel.map(m => <option key={m.id} value={m.id}>{m.nama_mapel} ({m.jenis})</option>)}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Kitab</Form.Label>
                            <Form.Select name="kitab_id" required>
                                <option value="">-- Pilih Kitab --</option>
                                {masterKitab.map(k => <option key={k.id} value={k.id}>{k.nama_kitab}</option>)}
                            </Form.Select>
                        </Form.Group>
                    </>
                );
                break;
             case 'kurikulumEdit':
                title = `Ubah Kitab untuk ${data.mapel?.nama_mapel}`;
                 formFields = (
                    <Form.Group className="mb-3">
                        <Form.Label>Kitab</Form.Label>
                        <Form.Select name="kitab_id" defaultValue={data.kitab_id} required>
                            <option value="">-- Pilih Kitab --</option>
                            {masterKitab.map(k => <option key={k.id} value={k.id}>{k.nama_kitab}</option>)}
                        </Form.Select>
                    </Form.Group>
                );
                break;
            default: return null;
        }

        const handleSubmit = (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const formJson = Object.fromEntries(formData.entries());
            handleSave(formJson);
        };

        return (
            <Modal show={showModal} onHide={handleCloseModal} centered>
                <Form onSubmit={handleSubmit}>
                    <Modal.Header closeButton><Modal.Title>{title}</Modal.Title></Modal.Header>
                    <Modal.Body>{formFields}</Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>Batal</Button>
                        <Button variant="primary" type="submit">Simpan</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        );
    };


    // --- RENDER KOMPONEN UTAMA ---
    return (
        <div className="container mt-4">
            {renderModalContent()}
            <h2>Manajemen Kurikulum & Mata Pelajaran</h2>
            {error && <Alert variant="danger">{error}</Alert>}

            {/* BAGIAN 1: FILTER KURIKULUM */}
            <div className="p-3 mb-4 border rounded bg-light">
                <p className="fw-bold">Pilih Tahun Ajaran dan Kelas untuk mengelola kurikulum.</p>
                <Row>
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label>Tahun Ajaran</Form.Label>
                            <Form.Select value={selectedTahunAjaranName} onChange={e => setSelectedTahunAjaranName(e.target.value)}>
                                <option value="">-- Pilih Tahun Ajaran --</option>
                                {/* Menggunakan daftar nama yang sudah unik */}
                                {uniqueTahunAjaranNames.map(nama => <option key={nama} value={nama}>{nama}</option>)}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label>Kelas</Form.Label>
                            <Form.Select value={selectedKelas} onChange={e => setSelectedKelas(e.target.value)} disabled={!selectedTahunAjaranName}>
                                <option value="">-- Pilih Kelas --</option>
                                {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
            </div>

            {/* BAGIAN 2: TAMPILAN KURIKULUM */}
            {selectedTahunAjaranName && selectedKelas && (
                <div className="mb-4">
                    <h4>Kurikulum untuk: {kelasList.find(k => k.id == selectedKelas)?.nama_kelas} - TA {selectedTahunAjaranName}</h4>
                    {loadingKurikulum ? <div className="text-center p-5"><Spinner animation="border" /></div> : (
                        <Tabs defaultActiveKey="1" id="kurikulum-tabs" fill>
                            {[1, 2].map(semester => (
                                <Tab eventKey={semester} title={`Semester ${semester}`} key={semester}>
                                    <div className="p-3 border border-top-0">
                                        <div className="d-flex justify-content-end mb-3">
                                             <Button variant="success" onClick={() => handleShowModal('kurikulumAdd', { semester })}>
                                                + Tambah Mapel ke Semester {semester}
                                            </Button>
                                        </div>
                                        <Table striped bordered hover responsive size="sm">
                                            <thead>
                                                <tr>
                                                    <th>Mata Pelajaran</th>
                                                    <th>Jenis</th>
                                                    <th>Kitab yang Digunakan</th>
                                                    <th>Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(semester === 1 ? kurikulum1 : kurikulum2).map(item => (
                                                    <tr key={item.id}>
                                                        <td>{item.mapel?.nama_mapel}</td>
                                                        <td>{item.mapel?.jenis}</td>
                                                        <td>{item.kitab?.nama_kitab}</td>
                                                        <td>
                                                            <Button variant="info" size="sm" className="me-1" onClick={() => handleShowModal('kurikulumEdit', item)}>Ubah Kitab</Button>
                                                            <Button variant="danger" size="sm" onClick={() => handleDelete('kurikulum', item.id)}>Hapus</Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                </Tab>
                            ))}
                        </Tabs>
                    )}
                </div>
            )}

            {/* BAGIAN 3: PENGELOLA MASTER DATA */}
            <Accordion>
                <Accordion.Item eventKey="0">
                    <Accordion.Header>Kelola Data Master (Mata Pelajaran & Kitab)</Accordion.Header>
                    <Accordion.Body>
                        <Row>
                            <Col md={6}>
                                <MasterDataTable
                                    title="Master Mata Pelajaran"
                                    data={masterMapel}
                                    onAdd={() => handleShowModal('mapel')}
                                    onEdit={(item) => handleShowModal('mapel', item)}
                                    onDelete={(id) => handleDelete('mapel', id)}
                                    fields={[{ key: 'nama_mapel', label: 'Nama Mapel' }, { key: 'jenis', label: 'Jenis' }]}
                                />
                            </Col>
                            <Col md={6}>
                                <MasterDataTable
                                    title="Master Kitab"
                                    data={masterKitab}
                                    onAdd={() => handleShowModal('kitab')}
                                    onEdit={(item) => handleShowModal('kitab', item)}
                                    onDelete={(id) => handleDelete('kitab', id)}
                                    fields={[{ key: 'nama_kitab', label: 'Nama Kitab' }]}
                                />
                            </Col>
                        </Row>
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
        </div>
    );
};

export default MataPelajaranPage;

