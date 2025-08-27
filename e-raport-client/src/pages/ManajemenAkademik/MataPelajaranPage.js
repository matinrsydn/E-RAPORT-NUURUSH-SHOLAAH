import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Form, Table, Alert, Tabs, Tab } from 'react-bootstrap';

const MataPelajaranPage = () => {
    const [mapelUjian, setMapelUjian] = useState([]);
    const [mapelHafalan, setMapelHafalan] = useState([]);
    const [activeTab, setActiveTab] = useState('Ujian'); // State untuk tab aktif
    const [show, setShow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState(null);

    // PERBAIKAN 1: Buat initialState menjadi statis
    const initialState = { nama_mapel: '', kitab: '' };
    const [currentData, setCurrentData] = useState({ ...initialState, jenis: 'Ujian' });

    const API_URL = 'http://localhost:5000/api/mata-pelajaran';

    // Fetch data untuk kedua jenis saat komponen dimuat
    useEffect(() => {
        fetchMataPelajaran('Ujian');
        fetchMataPelajaran('Hafalan');
    }, []);

    const fetchMataPelajaran = async (jenis) => {
        try {
            // Kirim 'jenis' sebagai query parameter
            const res = await axios.get(`${API_URL}?jenis=${jenis}`);
            if (jenis === 'Ujian') {
                setMapelUjian(res.data);
            } else {
                setMapelHafalan(res.data);
            }
        } catch (err) {
            console.error(`Gagal mengambil data mata pelajaran ${jenis}:`, err);
        }
    };

    const handleClose = () => {
        setShow(false);
        setError(null);
        setCurrentData({ ...initialState, jenis: activeTab });
    };

    // PERBAIKAN 2: Atur 'jenis' secara eksplisit saat membuka modal
    const handleShow = (data) => {
        setError(null);
        const isAdding = !data;
        setIsEditing(!isAdding);

        if (isAdding) {
            // Jika MENAMBAH data, set 'jenis' berdasarkan tab yang sedang aktif
            setCurrentData({ ...initialState, jenis: activeTab });
        } else {
            // Jika MENGEDIT data, gunakan data yang ada
            setCurrentData(data);
        }
        setShow(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCurrentData(prev => ({ ...prev, [name]: value }));
    };

    // e-raport-client/src/pages/MataPelajaranPage.js

    const handleSave = async () => {
        setError(null);
        try {
            const dataToSave = { ...currentData, jenis: currentData.jenis || activeTab };

            if (isEditing) {
                await axios.put(`${API_URL}/${dataToSave.id}`, dataToSave);
            } else {
                await axios.post(API_URL, dataToSave);
            }

            // ======================= PERBAIKAN DI SINI =======================
            // Alih-alih me-refresh hanya tab aktif, refresh data untuk KEDUA tab.
            fetchMataPelajaran('Ujian');
            fetchMataPelajaran('Hafalan');
            // ===============================================================

            handleClose();
        } catch (err) {
            setError("Gagal menyimpan data. Pastikan semua field terisi.");
            console.error("Error saat menyimpan:", err); // Tambahkan log error untuk debug
        }
    };

    const handleDelete = async (id, jenis) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus mata pelajaran ini?')) {
            try {
                await axios.delete(`${API_URL}/${id}`);
                // Refresh data untuk tab yang dihapus
                fetchMataPelajaran(jenis);
            } catch (err) {
                console.error("Gagal menghapus data:", err);
            }
        }
    };

    const renderTable = (data, jenis) => (
        <Table striped bordered hover responsive>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Nama Mata Pelajaran</th>
                    <th>Kitab</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody>
                {data.map((mapel, index) => (
                    <tr key={mapel.id}>
                        <td>{index + 1}</td>
                        <td>{mapel.nama_mapel}</td>
                        <td>{mapel.kitab}</td>
                        <td>
                            <Button variant="info" size="sm" className="me-1" onClick={() => handleShow(mapel)}>Edit</Button>
                            <Button variant="danger" size="sm" onClick={() => handleDelete(mapel.id, jenis)}>Hapus</Button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );

    return (
        <div className="container mt-4">
            <h2>Manajemen Mata Pelajaran</h2>
            <Button variant="primary" className="mb-3" onClick={() => handleShow(null)}>
                Tambah Mata Pelajaran
            </Button>

            <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-3"
                fill
            >
                <Tab eventKey="Ujian" title="📚 Mata Pelajaran Ujian">
                    {renderTable(mapelUjian, 'Ujian')}
                </Tab>
                <Tab eventKey="Hafalan" title="📖 Mata Pelajaran Hafalan">
                    {renderTable(mapelHafalan, 'Hafalan')}
                </Tab>
            </Tabs>

            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Edit' : 'Tambah'} Mata Pelajaran ({currentData.jenis || activeTab})</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form>
                        {/* Form input untuk jenis, bisa disembunyikan jika ditentukan oleh tab */}
                         <Form.Group className="mb-3">
                            <Form.Label>Jenis Mata Pelajaran</Form.Label>
                            <Form.Select name="jenis" value={currentData.jenis || activeTab} onChange={handleChange}>
                                <option value="Ujian">Ujian</option>
                                <option value="Hafalan">Hafalan</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                        <Form.Label>Nama Mata Pelajaran</Form.Label>
                        <Form.Control
                            type="text"
                            name="nama_mapel"
                            value={currentData.nama_mapel}
                            onChange={handleChange}
                        />
                        </Form.Group>
                        <Form.Group className="mb-3">
                        <Form.Label>Kitab</Form.Label>
                        <Form.Control
                            type="text"
                            name="kitab"
                            value={currentData.kitab}
                            onChange={handleChange}
                        />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>Batal</Button>
                    <Button variant="primary" onClick={handleSave}>Simpan</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default MataPelajaranPage;