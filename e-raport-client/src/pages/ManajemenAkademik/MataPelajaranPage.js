import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';

const MataPelajaranPage = () => {
    // Logika CRUD serupa dengan WaliKelasPage
    const [listData, setListData] = useState([]);
    const [formData, setFormData] = useState({ nama_mapel: '', kitab: '' });
    const [isEditing, setIsEditing] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/matapelajaran');
            setListData(res.data);
        } catch (err) {
            setError('Gagal memuat data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleClose = () => {
        setShowModal(false);
        setIsEditing(null);
        setFormData({ nama_mapel: '', kitab: '' });
    };

    const handleShow = (item = null) => {
        if (item) {
            setIsEditing(item.id);
            setFormData({ nama_mapel: item.nama_mapel, kitab: item.kitab });
        } else {
            setIsEditing(null);
            setFormData({ nama_mapel: '', kitab: '' });
        }
        setShowModal(true);
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await axios.put(`/matapelajaran/${isEditing}`, formData);
            } else {
                await axios.post('/matapelajaran', formData);
            }
            fetchData();
            handleClose();
        } catch (err) {
            setError('Gagal menyimpan data.');
        }
    };
    
    const handleDelete = async (id) => {
        if (window.confirm('Yakin ingin menghapus data ini?')) {
            try {
                await axios.delete(`/matapelajaran/${id}`);
                fetchData();
            } catch (err) {
                setError('Gagal menghapus data.');
            }
        }
    };
    return (
        <Card>
            <Card.Header as="h4">Manajemen Mata Pelajaran</Card.Header>
            <Card.Body>
                <Button onClick={() => handleShow()} className="mb-3">Tambah Mata Pelajaran</Button>
                {error && <Alert variant="danger">{error}</Alert>}
                {loading ? <div className="text-center"><Spinner animation="border" /></div> : (
                    <Table striped bordered hover responsive>
                        <thead><tr><th>Nama Mapel</th><th>Kitab</th><th>Aksi</th></tr></thead>
                        <tbody>
                            {listData.map(item => (
                                <tr key={item.id}>
                                    <td>{item.nama_mapel}</td><td>{item.kitab}</td>
                                    <td>
                                        <Button variant="warning" size="sm" onClick={() => handleShow(item)} className="me-2">Edit</Button>
                                        <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>Hapus</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Card.Body>

            <Modal show={showModal} onHide={handleClose}>
                <Modal.Header closeButton><Modal.Title>{isEditing ? 'Edit' : 'Tambah'} Mata Pelajaran</Modal.Title></Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Form.Group className="mb-3"><Form.Label>Nama Mata Pelajaran</Form.Label><Form.Control name="nama_mapel" value={formData.nama_mapel} onChange={handleChange} required /></Form.Group>
                        <Form.Group className="mb-3"><Form.Label>Kitab</Form.Label><Form.Control name="kitab" value={formData.kitab} onChange={handleChange} /></Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleClose}>Batal</Button>
                        <Button variant="primary" type="submit">Simpan</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Card>
    );
};
export default MataPelajaranPage;