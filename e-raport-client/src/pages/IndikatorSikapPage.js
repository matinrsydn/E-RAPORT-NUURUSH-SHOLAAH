import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Form, Table, Alert } from 'react-bootstrap';

const ManajemenIndikatorSikapPage = () => {
    const [indikator, setIndikator] = useState([]);
    const [show, setShow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState(null);
    
    const initialState = { jenis_sikap: 'spiritual', indikator: '' };
    const [currentData, setCurrentData] = useState(initialState);

    useEffect(() => {
        fetchIndikator();
    }, []);

    const fetchIndikator = async () => {
        const res = await axios.get('http://localhost:5000/api/indikator-sikap');
        setIndikator(res.data);
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
                await axios.put(`http://localhost:5000/api/indikator-sikap/${currentData.id}`, currentData);
            } else {
                await axios.post('http://localhost:5000/api/indikator-sikap', currentData);
            }
            fetchIndikator();
            handleClose();
        } catch (err) {
            setError("Gagal menyimpan data. Pastikan semua field terisi.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus indikator ini?')) {
            await axios.delete(`http://localhost:5000/api/indikator-sikap/${id}`);
            fetchIndikator();
        }
    };

    return (
        <div className="container mt-4">
            <h2>Manajemen Indikator Sikap</h2>
            <Button variant="primary" className="mb-3" onClick={() => handleShow(null)}>
                Tambah Indikator
            </Button>
            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Jenis Sikap</th>
                        <th>Indikator</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {indikator.map((item, index) => (
                        <tr key={item.id}>
                            <td>{index + 1}</td>
                            <td className="text-capitalize">{item.jenis_sikap}</td>
                            <td>{item.indikator}</td>
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
                    <Modal.Title>{isEditing ? 'Edit Indikator' : 'Tambah Indikator'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Jenis Sikap</Form.Label>
                            <Form.Select name="jenis_sikap" value={currentData.jenis_sikap} onChange={handleChange}>
                                <option value="spiritual">Spiritual</option>
                                <option value="sosial">Sosial</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Indikator</Form.Label>
                            <Form.Control as="textarea" rows={3} name="indikator" value={currentData.indikator} onChange={handleChange} />
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

export default ManajemenIndikatorSikapPage;
