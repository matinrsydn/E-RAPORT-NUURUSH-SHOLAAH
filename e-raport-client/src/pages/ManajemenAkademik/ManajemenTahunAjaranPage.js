import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Form, Table, Alert, Badge } from 'react-bootstrap';
import API_BASE from '../../api';

const ManajemenTahunAjaranPage = () => {
    const [data, setData] = useState([]);
    const [show, setShow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState(null);
    
    const initialState = { nama_ajaran: '', semester: '1', status: 'tidak-aktif' };
    const [currentData, setCurrentData] = useState(initialState);

    const API_URL = `${API_BASE}/tahun-ajaran`;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await axios.get(API_URL);
            setData(res.data);
        } catch (err) {
            setError("Gagal mengambil data. Pastikan server berjalan.");
        }
    };

    const handleClose = () => {
        setShow(false);
        setError(null);
        setCurrentData(initialState);
    };

    const handleShow = (item) => {
        setError(null);
        setIsEditing(!!item);
        setCurrentData(item || initialState);
        setShow(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCurrentData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setError(null);
        if (!currentData.nama_ajaran.trim()) {
            setError("Tahun Ajaran tidak boleh kosong.");
            return;
        }
        try {
            if (isEditing) {
                await axios.put(`${API_URL}/${currentData.id}`, currentData);
            } else {
                await axios.post(API_URL, currentData);
            }
            fetchData();
            handleClose();
        } catch (err) {
            setError(err.response?.data?.message || "Gagal menyimpan data. Pastikan kombinasi Tahun Ajaran dan Semester unik.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Anda yakin ingin menghapus data ini?')) {
            try {
                await axios.delete(`${API_URL}/${id}`);
                fetchData();
            } catch (err) {
                setError(err.response?.data?.message || "Gagal menghapus data.");
            }
        }
    };

    return (
        <div className="container mt-4">
            <h2>Manajemen Tahun Ajaran</h2>
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            <Button variant="primary" className="mb-3" onClick={() => handleShow(null)}>
                Tambah Tahun Ajaran
            </Button>
            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Tahun Ajaran</th>
                        <th>Semester</th>
                        <th>Status</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, index) => (
                        <tr key={item.id}>
                            <td>{index + 1}</td>
                            <td>{item.nama_ajaran}</td>
                            <td>Semester {item.semester}</td>
                            <td>
                                <Badge bg={item.status === 'aktif' ? 'success' : 'secondary'}>
                                    {item.status === 'aktif' ? 'Aktif' : 'Tidak Aktif'}
                                </Badge>
                            </td>
                            <td>
                                <Button variant="info" size="sm" className="me-1" onClick={() => handleShow(item)}>Edit</Button>
                                <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>Hapus</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Edit' : 'Tambah'} Tahun Ajaran</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Tahun Ajaran (Contoh: 2024/2025)</Form.Label>
                            <Form.Control type="text" name="nama_ajaran" value={currentData.nama_ajaran} onChange={handleChange} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Semester</Form.Label>
                            <Form.Select name="semester" value={currentData.semester || '1'} onChange={handleChange}>
                                <option value="1">Semester 1</option>
                                <option value="2">Semester 2</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Status</Form.Label>
                            <Form.Select name="status" value={currentData.status} onChange={handleChange}>
                                <option value="tidak-aktif">Tidak Aktif</option>
                                <option value="aktif">Aktif</option>
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

export default ManajemenTahunAjaranPage;

