import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Form, Table, Alert, Card, Spinner } from 'react-bootstrap';
import API_BASE from '../../api';

const ManajemenIndikatorSikapPage = () => {
    const [indikator, setIndikator] = useState([]);
    const [show, setShow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // State untuk error di dalam modal
    const [modalError, setModalError] = useState(null);
    
    // State untuk loading dan error di halaman utama
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState(null);

    const initialState = { jenis_sikap: 'spiritual', indikator: '' };
    const [currentData, setCurrentData] = useState(initialState);

    useEffect(() => {
        fetchIndikator();
    }, []);

    const fetchIndikator = async () => {
        setLoading(true);
        setPageError(null);
        try {
            const res = await axios.get(`${API_BASE}/indikator-sikap`);
            setIndikator(res.data);
        } catch (err) {
            setPageError("Gagal memuat data. Silakan coba lagi nanti.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setShow(false);
        setModalError(null);
        setCurrentData(initialState);
        setIsEditing(false);
    };

    const handleShow = (data = null) => {
        setModalError(null);
        if (data) {
            setIsEditing(true);
            setCurrentData(data);
        } else {
            setIsEditing(false);
            setCurrentData(initialState);
        }
        setShow(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCurrentData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!currentData.indikator.trim()) {
            setModalError("Field indikator tidak boleh kosong.");
            return;
        }
        setModalError(null);

        try {
                if (isEditing) {
                await axios.put(`${API_BASE}/indikator-sikap/${currentData.id}`, currentData);
            } else {
                await axios.post(`${API_BASE}/indikator-sikap`, currentData);
            }
            fetchIndikator();
            handleClose();
        } catch (err) {
            setModalError("Gagal menyimpan data. Pastikan semua field terisi dengan benar.");
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus indikator ini?')) {
            try {
                await axios.delete(`${API_BASE}/indikator-sikap/${id}`);
                fetchIndikator();
            } catch (err) {
                // Bisa ditambahkan notifikasi error jika diperlukan
                console.error("Gagal menghapus data:", err);
            }
        }
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div className="text-center p-5">
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </Spinner>
                </div>
            );
        }

        if (pageError) {
            return <Alert variant="danger">{pageError}</Alert>;
        }

        return (
            <Table striped bordered hover responsive>
                <thead className="table-dark">
                    <tr>
                        <th style={{ width: '5%' }}>#</th>
                        <th style={{ width: '20%' }}>Jenis Sikap</th>
                        <th>Indikator</th>
                        <th style={{ width: '15%' }} className="text-center">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {indikator.length > 0 ? (
                        indikator.map((item, index) => (
                            <tr key={item.id}>
                                <td className="text-center">{index + 1}</td>
                                <td className="text-capitalize">{item.jenis_sikap}</td>
                                <td>{item.indikator}</td>
                                <td className="text-center">
                                    <Button variant="info" size="sm" className="me-2" onClick={() => handleShow(item)}>
                                        Edit
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
                                        Hapus
                                    </Button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="4" className="text-center p-3">
                                Tidak ada data indikator yang tersedia.
                            </td>
                        </tr>
                    )}
                </tbody>
            </Table>
        );
    };

    return (
        <div className="container mt-4">
            <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <h4 className="mb-0">Manajemen Indikator Sikap</h4>
                    <Button variant="primary" onClick={() => handleShow()}>
                        Tambah Indikator
                    </Button>
                </Card.Header>
                <Card.Body>
                    {renderContent()}
                </Card.Body>
            </Card>

            <Modal show={show} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Edit Indikator' : 'Tambah Indikator'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {modalError && <Alert variant="danger">{modalError}</Alert>}
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
                            <Form.Control 
                                as="textarea" 
                                rows={4} 
                                name="indikator" 
                                value={currentData.indikator} 
                                onChange={handleChange} 
                                placeholder="Masukkan deskripsi indikator..."
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

export default ManajemenIndikatorSikapPage;