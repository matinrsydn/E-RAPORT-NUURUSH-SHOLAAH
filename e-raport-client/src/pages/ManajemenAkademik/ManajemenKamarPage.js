// src/pages/ManajemenKamarPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Form, Table, Alert, Spinner, Row, Col } from 'react-bootstrap';
import API_BASE from '../../api';

const ManajemenKamarPage = () => {
    const [kamars, setKamars] = useState([]);
    const [show, setShow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentKamar, setCurrentKamar] = useState({ nama_kamar: '', kapasitas: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchKamars = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/kamar`);
            setKamars(res.data);
        } catch (err) {
            setError("Gagal memuat data kamar.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKamars();
    }, []);

    const handleClose = () => {
        setShow(false);
        setIsEditing(false);
        setCurrentKamar({ nama_kamar: '', kapasitas: '' });
        setError(null);
    };

    const handleShow = (kamar) => {
        setIsEditing(!!kamar);
        setCurrentKamar(kamar ? { ...kamar } : { nama_kamar: '', kapasitas: '' });
        setShow(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCurrentKamar(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!currentKamar.nama_kamar || !currentKamar.kapasitas) {
            setError("Nama kamar dan kapasitas harus diisi.");
            return;
        }
        setLoading(true);
        try {
                if (isEditing) {
                await axios.put(`${API_BASE}/kamar/${currentKamar.id}`, currentKamar);
            } else {
                await axios.post(`${API_BASE}/kamar`, currentKamar);
            }
            fetchKamars();
            handleClose();
        } catch (err) {
            setError(err.response?.data?.message || "Gagal menyimpan data.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Yakin ingin menghapus kamar ini?')) {
            setLoading(true);
            try {
                await axios.delete(`${API_BASE}/kamar/${id}`);
                fetchKamars();
            } catch (err) {
                setError("Gagal menghapus data.");
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="container mt-4">
            <h2>Manajemen Kamar</h2>
            <Button variant="primary" className="mb-3" onClick={() => handleShow(null)}>
                <i className="bi bi-plus-circle"></i> Tambah Kamar
            </Button>

            {error && <Alert variant="danger">{error}</Alert>}
            {loading && !show && <div className="text-center"><Spinner animation="border" /></div>}

            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Nama Kamar</th>
                        <th>Kapasitas</th>
                        <th>Terisi</th>
                        <th>Sisa</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {kamars.map((kamar, index) => {
                        const terisi = kamar.siswa?.length || 0;
                        return (
                            <tr key={kamar.id}>
                                <td>{index + 1}</td>
                                <td>{kamar.nama_kamar}</td>
                                <td>{kamar.kapasitas}</td>
                                <td>{terisi}</td>
                                <td>{kamar.kapasitas - terisi}</td>
                                <td>
                                    <Button variant="info" size="sm" className="me-1" onClick={() => handleShow(kamar)}>Edit</Button>
                                    <Button variant="danger" size="sm" onClick={() => handleDelete(kamar.id)}>Hapus</Button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>

            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Edit Kamar' : 'Tambah Kamar'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Nama Kamar</Form.Label>
                            <Form.Control type="text" name="nama_kamar" value={currentKamar.nama_kamar} onChange={handleChange} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Kapasitas</Form.Label>
                            <Form.Control type="number" name="kapasitas" value={currentKamar.kapasitas} onChange={handleChange} />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>Batal</Button>
                    <Button variant="primary" onClick={handleSave} disabled={loading}>
                        {loading ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ManajemenKamarPage;