import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Form, Table, Row, Col, Alert } from 'react-bootstrap';

const ManajemenKelasPage = () => {
    const [kelas, setKelas] = useState([]);
    const [waliKelasOptions, setWaliKelasOptions] = useState([]);
    const [show, setShow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState(null);
    
    const initialState = { nama_kelas: '', kapasitas: '', wali_kelas_id: '' };
    const [currentKelas, setCurrentKelas] = useState(initialState);

    useEffect(() => {
        fetchKelas();
        fetchWaliKelas();
    }, []);

    const fetchKelas = async () => {
        const res = await axios.get('http://localhost:5000/api/kelas');
        setKelas(res.data);
    };

    const fetchWaliKelas = async () => {
        const res = await axios.get('http://localhost:5000/api/wali-kelas');
        setWaliKelasOptions(res.data);
    };

    const handleClose = () => {
        setShow(false);
        setError(null);
        setCurrentKelas(initialState);
    };

    const handleShow = (data) => {
        setError(null);
        setIsEditing(!!data);
        setCurrentKelas(data || initialState);
        setShow(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCurrentKelas(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setError(null);
        try {
            if (isEditing) {
                await axios.put(`http://localhost:5000/api/kelas/${currentKelas.id}`, currentKelas);
            } else {
                await axios.post('http://localhost:5000/api/kelas', currentKelas);
            }
            fetchKelas();
            handleClose();
        } catch (err) {
            setError("Gagal menyimpan data. Pastikan semua field terisi.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus kelas ini?')) {
            await axios.delete(`http://localhost:5000/api/kelas/${id}`);
            fetchKelas();
        }
    };

    return (
        <div className="container mt-4">
            <h2>Manajemen Kelas</h2>
            <Button variant="primary" className="mb-3" onClick={() => handleShow(null)}>
                Tambah Kelas
            </Button>
            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Nama Kelas</th>
                        <th>Kapasitas</th>
                        <th>Wali Kelas</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {kelas.map((k, index) => (
                        <tr key={k.id}>
                            <td>{index + 1}</td>
                            <td>{k.nama_kelas}</td>
                            <td>{k.kapasitas}</td>
                            <td>{k.walikelas?.nama || 'N/A'}</td>
                            <td>
                                <Button variant="info" size="sm" className="me-1" onClick={() => handleShow(k)}>Edit</Button>
                                <Button variant="danger" size="sm" onClick={() => handleDelete(k.id)}>Hapus</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Edit Kelas' : 'Tambah Kelas'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Nama Kelas</Form.Label>
                            <Form.Control type="text" name="nama_kelas" value={currentKelas.nama_kelas} onChange={handleChange} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Kapasitas</Form.Label>
                            <Form.Control type="number" name="kapasitas" value={currentKelas.kapasitas} onChange={handleChange} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Wali Kelas</Form.Label>
                            <Form.Select name="wali_kelas_id" value={currentKelas.wali_kelas_id || ''} onChange={handleChange}>
                                <option value="">Pilih Wali Kelas</option>
                                {waliKelasOptions.map(wk => <option key={wk.id} value={wk.id}>{wk.nama}</option>)}
                            </Form.Select>
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

export default ManajemenKelasPage;
