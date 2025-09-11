// src/pages/ManajemenKelasPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Form, Table, Alert, Spinner } from 'react-bootstrap';
import API_BASE from '../../api';

const ManajemenKelasPage = () => {
    // State untuk data utama dan UI
    const [kelas, setKelas] = useState([]);
    // Mengganti nama state agar lebih jelas dan menunjuk ke data Guru
    const [guruOptions, setGuruOptions] = useState([]); 
    
    // State untuk Modal dan Form
    const [show, setShow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentKelas, setCurrentKelas] = useState({ id: null, nama_kelas: '', kapasitas: '', wali_kelas_id: '' });

    // State untuk feedback pengguna
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // URL API
    const API_URL = `${API_BASE}/kelas`;
    const GURU_API_URL = `${API_BASE}/guru`;

    // Mengambil data saat komponen pertama kali dimuat
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Mengambil data kelas dan guru secara bersamaan untuk efisiensi
                const [resKelas, resGuru] = await Promise.all([
                    axios.get(API_URL),
                    axios.get(GURU_API_URL)
                ]);

                setKelas(resKelas.data);

                // --- SOLUSI UNTUK DUPLICATE KEY ---
                // Saring data duplikat berdasarkan ID sebelum disimpan ke state
                const uniqueGurus = Array.from(new Map(resGuru.data.map(guru => [guru.id, guru])).values());
                setGuruOptions(uniqueGurus);
                // ------------------------------------

            } catch (err) {
                setError("Gagal memuat data awal. Pastikan server berjalan.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Fungsi untuk me-refresh data kelas saja (setelah save/delete)
    const fetchKelas = async () => {
        try {
            const res = await axios.get(API_URL);
            setKelas(res.data);
        } catch (err) {
            console.error("Gagal refresh data kelas:", err);
            setError("Gagal menyegarkan data kelas.");
        }
    };

    // Handler untuk menutup modal
    const handleClose = () => {
        setShow(false);
        setCurrentKelas({ id: null, nama_kelas: '', kapasitas: '', wali_kelas_id: '' });
    };

    // Handler untuk menampilkan modal
    const handleShow = (kelasItem = null) => {
        setError(null);
        setIsEditing(!!kelasItem);
        setCurrentKelas(kelasItem 
            ? { ...kelasItem, wali_kelas_id: kelasItem.wali_kelas_id || '' } 
            : { nama_kelas: '', kapasitas: '', wali_kelas_id: '' }
        );
        setShow(true);
    };

    // Handler untuk perubahan pada input form
    const handleChange = (e) => {
        const { name, value } = e.target;
        setCurrentKelas(prev => ({ ...prev, [name]: value }));
    };

    // Handler untuk menyimpan data
    const handleSave = async () => {
        if (!currentKelas.nama_kelas || !currentKelas.kapasitas) {
            setError("Nama kelas dan kapasitas harus diisi.");
            return;
        }
        setLoading(true);
        setError(null);
        const dataToSave = { ...currentKelas, wali_kelas_id: currentKelas.wali_kelas_id || null };

        try {
            if (isEditing) {
                await axios.put(`${API_URL}/${dataToSave.id}`, dataToSave);
            } else {
                await axios.post(API_URL, dataToSave);
            }
            await fetchKelas();
            handleClose();
        } catch (err) {
            setError(err.response?.data?.message || "Gagal menyimpan data.");
        } finally {
            setLoading(false);
        }
    };

    // Handler untuk menghapus data
    const handleDelete = async (id) => {
        if (window.confirm('Anda yakin ingin menghapus kelas ini?')) {
            setLoading(true);
            setError(null);
            try {
                await axios.delete(`${API_URL}/${id}`);
                await fetchKelas();
            } catch (err) {
                setError(err.response?.data?.message || "Gagal menghapus data kelas.");
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="container mt-4">
            <h2>Manajemen Kelas</h2>
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            <Button variant="primary" className="mb-3" onClick={() => handleShow()}>
                Tambah Kelas
            </Button>

            {loading ? (
                <div className="text-center"><Spinner animation="border" /></div>
            ) : (
                <Table striped bordered hover responsive>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Nama Kelas</th>
                            <th>Kapasitas</th>
                            <th>Wali Kelas</th>
                            <th>Jumlah Siswa</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {kelas.map((item, index) => (
                            <tr key={item.id}>
                                <td>{index + 1}</td>
                                <td>{item.nama_kelas}</td>
                                <td>{item.kapasitas}</td>
                                <td>{item.walikelas?.nama || <span className="text-muted">- Belum Ada -</span>}</td>
                                <td>{item.siswa?.length || 0}</td>
                                <td>
                                    <Button variant="info" size="sm" className="me-1" onClick={() => handleShow(item)}>Edit</Button>
                                    <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>Hapus</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}

            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Edit Kelas' : 'Tambah Kelas'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Nama Kelas</Form.Label>
                            <Form.Control type="text" name="nama_kelas" value={currentKelas.nama_kelas} onChange={handleChange} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Kapasitas</Form.Label>
                            <Form.Control type="number" name="kapasitas" value={currentKelas.kapasitas} onChange={handleChange} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Wali Kelas</Form.Label>
                            <Form.Select name="wali_kelas_id" value={currentKelas.wali_kelas_id} onChange={handleChange}>
                                <option value="">-- Tidak Ada Wali Kelas --</option>
                                {guruOptions.map(guru => {
                                    const isAlreadyWali = guru.kelas_asuhan && guru.kelas_asuhan.id !== currentKelas.id;
                                    return (
                                        <option key={guru.id} value={guru.id} disabled={isAlreadyWali}>
                                            {guru.nama} {isAlreadyWali ? `(Wali ${guru.kelas_asuhan.nama_kelas})` : ''}
                                        </option>
                                    );
                                })}
                            </Form.Select>
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

export default ManajemenKelasPage;