import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Button, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ManajemenIndikatorKehadiranPage = () => {
    const [indikatorList, setIndikatorList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // State untuk modal (tambah/edit)
    const [showModal, setShowModal] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [namaKegiatan, setNamaKegiatan] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // API Endpoint
    const API_URL = 'http://localhost:5000/api/indikator-kehadiran';

    // Fetch data saat komponen pertama kali dimuat
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(API_URL);
            setIndikatorList(response.data);
            setError('');
        } catch (err) {
            setError('Gagal mengambil data dari server.');
            toast.error('Gagal mengambil data dari server.');
        } finally {
            setLoading(false);
        }
    };

    // --- Fungsi untuk Modal ---
    const handleShowModal = (item = null) => {
        setCurrentItem(item);
        setNamaKegiatan(item ? item.nama_kegiatan : '');
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentItem(null);
        setNamaKegiatan('');
    };

    // --- Fungsi CRUD ---
    const handleSave = async () => {
        if (!namaKegiatan.trim()) {
            toast.warn('Nama kegiatan tidak boleh kosong.');
            return;
        }

        setIsSaving(true);
        const data = { nama_kegiatan: namaKegiatan };

        try {
            if (currentItem) {
                // Mode Edit
                await axios.put(`${API_URL}/${currentItem.id}`, data);
                toast.success('Indikator berhasil diperbarui!');
            } else {
                // Mode Tambah
                await axios.post(API_URL, data);
                toast.success('Indikator baru berhasil ditambahkan!');
            }
            fetchData(); // Muat ulang data
            handleCloseModal();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan data.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus indikator ini?')) {
            try {
                await axios.delete(`${API_URL}/${id}`);
                toast.success('Indikator berhasil dihapus.');
                fetchData(); // Muat ulang data
            } catch (err) {
                toast.error(err.response?.data?.message || 'Gagal menghapus data.');
            }
        }
    };

    return (
        <div>
            <ToastContainer position="top-right" />
            <h2>Manajemen Indikator Kehadiran</h2>
            <p>Kelola daftar kegiatan yang akan muncul pada template Excel kehadiran.</p>
            
            <Button variant="primary" onClick={() => handleShowModal()} className="mb-3">
                <i className="fas fa-plus"></i> Tambah Kegiatan Baru
            </Button>

            {loading ? (
                <div className="text-center"><Spinner animation="border" /></div>
            ) : error ? (
                <Alert variant="danger">{error}</Alert>
            ) : (
                <Table striped bordered hover responsive>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Nama Kegiatan</th>
                            <th style={{ width: '150px' }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {indikatorList.map((item, index) => (
                            <tr key={item.id}>
                                <td>{index + 1}</td>
                                <td>{item.nama_kegiatan}</td>
                                <td>
                                    <Button variant="warning" size="sm" onClick={() => handleShowModal(item)} className="me-2">
                                        <i className="fas fa-edit"></i> Edit
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
                                        <i className="fas fa-trash"></i> Hapus
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}

            {/* Modal untuk Tambah/Edit */}
            <Modal show={showModal} onHide={handleCloseModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{currentItem ? 'Edit Indikator' : 'Tambah Indikator Baru'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Nama Kegiatan</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Contoh: Shalat Berjamaah"
                                value={namaKegiatan}
                                onChange={(e) => setNamaKegiatan(e.target.value)}
                                autoFocus
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>
                        Batal
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <><Spinner as="span" size="sm" /> Menyimpan...</> : 'Simpan'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ManajemenIndikatorKehadiranPage;