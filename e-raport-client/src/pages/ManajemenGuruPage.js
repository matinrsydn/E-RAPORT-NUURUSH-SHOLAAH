import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Form, Table, Alert, Row, Col, Badge } from 'react-bootstrap';
import API_BASE, { UPLOADS_BASE } from '../api';

const ManajemenGuruPage = () => {
    const [gurus, setGurus] = useState([]);
    const [show, setShow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState(null);
    const [currentGuru, setCurrentGuru] = useState({});
    const [signatureFile, setSignatureFile] = useState(null);

    const API_URL = `${API_BASE}/guru`;

    const fetchGurus = async () => {
        try {
            const res = await axios.get(API_URL);

            // Tambahkan baris ini untuk menyaring duplikat berdasarkan ID
            const uniqueGurus = Array.from(new Map(res.data.map(guru => [guru.id, guru])).values());

            setGurus(uniqueGurus); // Simpan data yang sudah unik
        } catch (err) {
            setError("Gagal memuat data guru.");
        }
    };

    useEffect(() => {
        const fetchGurus = async () => {
            try {
                const res = await axios.get(API_URL);
                const uniqueGurus = Array.from(new Map(res.data.map(guru => [guru.id, guru])).values());
                setGurus(uniqueGurus);

                // --- TAMBAHKAN BARIS INI UNTUK DEBUGGING ---
                console.log("DATA SEMUA GURU DARI SERVER:", res.data);
                // -----------------------------------------

            } catch (err) {
                setError("Gagal memuat data guru.");
            }
        };

        fetchGurus();
    }, []);

    const handleClose = () => {
        setShow(false);
        setError(null);
        setCurrentGuru({});
        // --- PERUBAHAN 2: Reset state file saat modal ditutup ---
        setSignatureFile(null); 
    };

    const handleShow = (guru = null) => {
        // --- TAMBAHKAN BARIS INI UNTUK DEBUGGING ---
        console.log("DATA GURU YANG DIKLIK UNTUK DIEDIT:", guru);
        // -----------------------------------------

        setIsEditing(!!guru);
        setCurrentGuru(guru ? {
            ...guru,
            tanggal_lahir: guru.tanggal_lahir ? new Date(guru.tanggal_lahir).toISOString().split('T')[0] : ''
        } : { jenis_kelamin: 'Laki-laki', status: 'Aktif' });
        setShow(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCurrentGuru(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        setSignatureFile(e.target.files[0]);
    };

    const handleSave = async () => {
        setError(null);
        if (!currentGuru.nama || currentGuru.nama.trim() === '') {
            setError("Nama Lengkap wajib diisi.");
            return;
        }
        
        const formData = new FormData();
        for (const key in currentGuru) {
            if (currentGuru[key] !== null && currentGuru[key] !== undefined) {
                formData.append(key, currentGuru[key]);
            }
        }
        if (signatureFile) {
            formData.append('tanda_tangan', signatureFile);
        }

        try {
            const config = { headers: { 'Content-Type': 'multipart/form-data' } };
            let response; // Tangkap respons dari server

            if (isEditing) {
                // --- PERBAIKAN DI SINI ---
                response = await axios.put(`${API_URL}/${currentGuru.id}`, formData, config);
            } else {
                response = await axios.post(API_URL, formData, config);
            }
            
            // --- DAN DI SINI ---
            // Alih-alih memanggil fetchGurus(), perbarui state secara manual
            // dengan data balasan yang sudah pasti terbaru.
            const updatedGuru = response.data.guru;
            setGurus(prevGurus => {
                const newGurus = [...prevGurus];
                const index = newGurus.findIndex(g => g.id === updatedGuru.id);
                if (index !== -1) {
                    newGurus[index] = updatedGuru; // Ganti data lama dengan data baru
                } else {
                    newGurus.push(updatedGuru); // Tambahkan data baru jika mode 'Tambah'
                }
                return newGurus;
            });

            handleClose();

        } catch (err) {
            setError(err.response?.data?.message || "Gagal menyimpan data.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus data guru ini?')) {
            setError(null);
            try {
                await axios.delete(`${API_URL}/${id}`);
                fetchGurus();
            } catch (err) {
                setError(err.response?.data?.message || "Gagal menghapus data.");
            }
        }
    };

    return (
        <div className="container mt-4">
            <h2>Manajemen Guru</h2>
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            <Button variant="primary" className="mb-3" onClick={() => handleShow()}>
                Tambah Guru
            </Button>

            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Nama</th>
                        <th>NIP</th>
                        <th>Telepon</th>
                        <th>Tanda Tangan</th>
                        <th>Status</th>
                        <th>Kelas Asuhan</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {gurus.map((guru, index) => (
                        <tr key={guru.id}>
                            <td>{index + 1}</td>
                            <td>{guru.nama}</td>
                            <td>{guru.nip || '-'}</td>
                            <td>{guru.telepon || '-'}</td>
                            <td>
                                {guru.tanda_tangan ? (
                                        <img 
                                        src={`${UPLOADS_BASE}/uploads/signatures/${guru.tanda_tangan}`}
                                        alt={`Ttd ${guru.nama}`}
                                        style={{ width: '100px', height: 'auto', background: '#f8f9fa' }}
                                    />
                                ) : (
                                    <Badge bg="warning">Belum Ada</Badge>
                                )}
                            </td>
                            <td>
                                <Badge bg={guru.status === 'Aktif' ? 'success' : 'secondary'}>
                                    {guru.status}
                                </Badge>
                            </td>
                            <td>{guru.kelas_asuhan?.nama_kelas || '-'}</td>
                            <td>
                                <Button variant="info" size="sm" className="me-1" onClick={() => handleShow(guru)}>Edit</Button>
                                <Button variant="danger" size="sm" onClick={() => handleDelete(guru.id)}>Hapus</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal show={show} onHide={handleClose} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Edit Guru' : 'Tambah Guru'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        {/* Bagian form data guru yang sudah ada (Nama, NIP, dll.) */}
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nama Lengkap</Form.Label>
                                    <Form.Control type="text" name="nama" value={currentGuru.nama || ''} onChange={handleChange} required/>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>NIP</Form.Label>
                                    <Form.Control type="text" name="nip" value={currentGuru.nip || ''} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Jenis Kelamin</Form.Label>
                                    <Form.Select name="jenis_kelamin" value={currentGuru.jenis_kelamin || 'Laki-laki'} onChange={handleChange}>
                                        <option value="Laki-laki">Laki-laki</option>
                                        <option value="Perempuan">Perempuan</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                             <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Status</Form.Label>
                                    <Form.Select name="status" value={currentGuru.status || 'Aktif'} onChange={handleChange}>
                                        <option value="Aktif">Aktif</option>
                                        <option value="Tidak Aktif">Tidak Aktif</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                             <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Tempat Lahir</Form.Label>
                                    <Form.Control type="text" name="tempat_lahir" value={currentGuru.tempat_lahir || ''} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                             <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Tanggal Lahir</Form.Label>
                                    <Form.Control type="date" name="tanggal_lahir" value={currentGuru.tanggal_lahir || ''} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                         <Form.Group className="mb-3">
                            <Form.Label>Nomor Telepon</Form.Label>
                            <Form.Control type="text" name="telepon" value={currentGuru.telepon || ''} onChange={handleChange} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Alamat</Form.Label>
                            <Form.Control as="textarea" rows={3} name="alamat" value={currentGuru.alamat || ''} onChange={handleChange} />
                        </Form.Group>
                        
                        {/* --- PERUBAHAN DIMULAI DI SINI --- */}
                        {/* Tampilkan bagian ini hanya jika sedang mode 'Edit' */}
                        {isEditing && (
                            <>
                                <hr />
                                <h5>Tanda Tangan Digital</h5>
                                <Row>
                                    <Col md={6} className="text-center">
                                        <p className="mb-2">Tanda Tangan Saat Ini:</p>
                                        {currentGuru.tanda_tangan ? (
                                            <img 
                                            src={`${API_BASE.replace('/api','')}/uploads/signatures/${currentGuru.tanda_tangan}`}
                                                alt="Tanda Tangan"
                                                className="img-thumbnail"
                                                style={{ maxWidth: '200px', backgroundColor: '#f8f9fa' }}
                                            />
                                        ) : (
                                            <p className="text-muted fst-italic">Belum ada tanda tangan.</p>
                                        )}
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Unggah Tanda Tangan Baru</Form.Label>
                                            <Form.Text className="d-block mb-2">
                                                Pilih file gambar (.png, .jpg). Kosongkan jika tidak ingin mengubah.
                                            </Form.Text>
                                            <Form.Control 
                                                type="file" 
                                                name="tanda_tangan" 
                                                accept="image/png, image/jpeg" 
                                                onChange={handleFileChange} 
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </>
                        )}
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

export default ManajemenGuruPage;
