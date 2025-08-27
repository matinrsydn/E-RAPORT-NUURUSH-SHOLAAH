import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Form, Table, Alert } from 'react-bootstrap';

const WaliKelasPage = () => {
    const [waliKelas, setWaliKelas] = useState([]);
    const [show, setShow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState(null);
    
    const initialState = { nama: '', nip: '' };
    const [currentData, setCurrentData] = useState(initialState);

    // REVISI: Pastikan URL API benar -> '/api/wali-kelas'
    const API_URL = 'http://localhost:5000/api/wali-kelas';

    useEffect(() => {
        fetchWaliKelas();
    }, []);

    const fetchWaliKelas = async () => {
        try {
            const res = await axios.get(API_URL);
            setWaliKelas(res.data);
        } catch (err) {
            console.error("Gagal mengambil data wali kelas:", err);
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
            fetchWaliKelas();
            handleClose();
        } catch (err) {
            setError("Gagal menyimpan data. Pastikan nama terisi.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus data wali kelas ini?')) {
            try {
                await axios.delete(`${API_URL}/${id}`);
                fetchWaliKelas();
            } catch (err) {
                console.error("Gagal menghapus data:", err);
            }
        }
    };

    return (
        <div className="container mt-4">
            <h2>Manajemen Wali Kelas</h2>
            <Button variant="primary" className="mb-3" onClick={() => handleShow(null)}>
                Tambah Wali Kelas
            </Button>
            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Nama Wali Kelas</th>
                        <th>NIP</th>
                        <th>Kelas yang Diajar</th> {/* Tambah kolom baru */}
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {waliKelas.map((wk, index) => (
                        <tr key={wk.id}>
                            <td>{index + 1}</td>
                            <td>{wk.nama}</td>
                            <td>{wk.nip || '-'}</td> 
                            {/* Tampilkan nama kelas, jika ada */}
                            <td>{wk.kelas ? wk.kelas.nama_kelas : 'N/A'}</td>
                            <td>
                                <Button variant="info" size="sm" className="me-1" onClick={() => handleShow(wk)}>Edit</Button>
                                <Button variant="danger" size="sm" onClick={() => handleDelete(wk.id)}>Hapus</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>{isEditing ? 'Edit Wali Kelas' : 'Tambah Wali Kelas'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                <Form>
                <Form.Group className="mb-3">
                    <Form.Label>Nama Wali Kelas</Form.Label>
                    <Form.Control
                    type="text"
                    name="nama"
                    value={currentData.nama}
                    onChange={handleChange}
                    />
                </Form.Group>

                {/* Tambahkan field NIP di sini */}
                <Form.Group className="mb-3">
                    <Form.Label>NIP</Form.Label>
                    <Form.Control
                    type="text"
                    name="nip"
                    value={currentData.nip || ""}
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

export default WaliKelasPage;
