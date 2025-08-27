import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Form, Table, Alert, Badge } from 'react-bootstrap';

const ManajemenTahunAjaranPage = () => {
    const [data, setData] = useState([]);
    const [show, setShow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState(null);
    
    const initialState = { nama_ajaran: '', status: 'tidak-aktif' };
    const [currentData, setCurrentData] = useState(initialState);

    const API_URL = 'http://localhost:5000/api/tahun-ajaran';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await axios.get(API_URL);
            setData(res.data);
        } catch (err) {
            console.error("Gagal mengambil data:", err);
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
        try {
            if (isEditing) {
                await axios.put(`${API_URL}/${currentData.id}`, currentData);
            } else {
                await axios.post(API_URL, currentData);
            }
            fetchData();
            handleClose();
        } catch (err) {
            setError("Gagal menyimpan data. Pastikan nama ajaran unik dan tidak kosong.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus data ini?')) {
            try {
                await axios.delete(`${API_URL}/${id}`);
                fetchData();
            } catch (err) {
                console.error("Gagal menghapus data:", err);
            }
        }
    };

    return (
        <div className="container mt-4">
            <h2>Manajemen Tahun Ajaran</h2>
            <Button variant="primary" className="mb-3" onClick={() => handleShow(null)}>
                Tambah Tahun Ajaran
            </Button>
            <Table striped bordered hover responsive>
            <thead>
                <tr>
                <th>#</th>
                <th>Tahun Ajaran</th>
                <th>Semester</th>   {/* kolom baru */}
                <th>Status</th>
                <th>Aksi</th>
                </tr>
            </thead>
            <tbody>
                {data.map((item, index) => (
                <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>{item.nama_ajaran}</td>
                    <td>{item.semester}</td>   {/* tampilkan semester */}
                    <td>
                    {item.status === 'aktif'
                        ? <Badge bg="success">Aktif</Badge>
                        : <Badge bg="secondary">Tidak Aktif</Badge>}
                    </td>
                    <td>
                    <Button
                        variant="info"
                        size="sm"
                        className="me-1"
                        onClick={() => handleShow(item)}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                    >
                        Hapus
                    </Button>
                    </td>
                </tr>
                ))}
            </tbody>
            </Table>


            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form>
                    <Form.Group className="mb-3">
                        <Form.Label>Tahun Ajaran (Contoh: 2024/2025)</Form.Label>
                        <Form.Control
                        type="text"
                        name="nama_ajaran"
                        value={currentData.nama_ajaran}
                        onChange={handleChange}
                        placeholder="2024/2025"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Semester</Form.Label>
                        <Form.Select
                        name="semester"
                        value={currentData.semester || '1'}
                        onChange={handleChange}
                        >
                        <option value="1">Semester 1</option>
                        <option value="2">Semester 2</option>
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Status</Form.Label>
                        <Form.Select
                        name="status"
                        value={currentData.status}
                        onChange={handleChange}
                        >
                        <option value="tidak-aktif">Tidak Aktif</option>
                        <option value="aktif">Aktif</option>
                        </Form.Select>
                        <Form.Text className="text-muted">
                        Mengaktifkan tahun ajaran ini akan menonaktifkan yang lain.
                        </Form.Text>
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
