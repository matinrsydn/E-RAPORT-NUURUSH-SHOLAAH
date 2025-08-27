import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Form, Table, Alert } from 'react-bootstrap';

const MataPelajaranPage = () => {
    const [mataPelajaran, setMataPelajaran] = useState([]);
    const [show, setShow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState(null);
    
    const initialState = { nama_mapel: '', kitab: '' };
    const [currentData, setCurrentData] = useState(initialState);

    const API_URL = 'http://localhost:5000/api/mata-pelajaran';

    useEffect(() => {
        fetchMataPelajaran();
    }, []);

    const fetchMataPelajaran = async () => {
        try {
            const res = await axios.get(API_URL);
            setMataPelajaran(res.data);
        } catch (err) {
            console.error("Gagal mengambil data mata pelajaran:", err);
        }
    };

    const handleClose = () => {
        setShow(false);
        setError(null);
        setCurrentData(initialState);
    };

    const handleShow = (data) => {
        setError(null);
        setIsEditing(!!data);
        setCurrentData(data || initialState);
        setShow(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCurrentData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setError(null);
        try {
            if (isEditing) {
                await axios.put(`${API_URL}/${currentData.id}`, currentData);
            } else {
                await axios.post(API_URL, currentData);
            }
            fetchMataPelajaran();
            handleClose();
        } catch (err) {
            setError("Gagal menyimpan data. Pastikan semua field terisi.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus mata pelajaran ini?')) {
            try {
                await axios.delete(`${API_URL}/${id}`);
                fetchMataPelajaran();
            } catch (err) {
                console.error("Gagal menghapus data:", err);
            }
        }
    };

    return (
        <div className="container mt-4">
            <h2>Manajemen Mata Pelajaran</h2>
            <Button variant="primary" className="mb-3" onClick={() => handleShow(null)}>
                Tambah Mata Pelajaran
            </Button>
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
                    {mataPelajaran.map((mapel, index) => (
                        <tr key={mapel.id}>
                            <td>{index + 1}</td>
                            <td>{mapel.nama_mapel}</td>
                            <td>{mapel.kitab}</td>
                            <td>
                                <Button variant="info" size="sm" className="me-1" onClick={() => handleShow(mapel)}>Edit</Button>
                                <Button variant="danger" size="sm" onClick={() => handleDelete(mapel.id)}>Hapus</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form>
                        <Form.Group className="mb-3">
                        <Form.Label>Nama Mata Pelajaran</Form.Label>
                        <Form.Control
                            type="text"
                            name="nama_mapel"   // penting!
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
