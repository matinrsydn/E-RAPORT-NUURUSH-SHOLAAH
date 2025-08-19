import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Form, Table, FormControl, InputGroup, Row, Col, Alert } from 'react-bootstrap';

const ManajemenSiswaPage = () => {
    const [siswas, setSiswas] = useState([]);
    const [waliKelasList, setWaliKelasList] = useState([]);
    const [kepalaSekolahList, setKepalaSekolahList] = useState([]);
    const [show, setShow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState(null);
    
    const initialState = {
        nama: '', nis: '', tempat_lahir: '', tanggal_lahir: '', jenis_kelamin: 'Laki-laki', agama: 'Islam', alamat: '', kelas: '', wali_kelas_id: '', kepala_sekolah_id: '',
        nama_ayah: '', pekerjaan_ayah: '', alamat_ayah: '',
        nama_ibu: '', pekerjaan_ibu: '', alamat_ibu: '',
        nama_wali: '', pekerjaan_wali: '', alamat_wali: '',
    };
    const [currentSiswa, setCurrentSiswa] = useState(initialState);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchSiswas();
        fetchWaliKelas();
        fetchKepalaSekolah();
    }, []);

    const fetchSiswas = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/siswa');
            setSiswas(res.data);
        } catch (error) {
            console.error("Gagal mengambil data siswa:", error);
        }
    };

    const fetchWaliKelas = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/walikelas');
            setWaliKelasList(res.data);
        } catch (error) {
            console.error("Gagal mengambil data wali kelas:", error);
        }
    };

    const fetchKepalaSekolah = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/kepalasekolah');
            setKepalaSekolahList(res.data);
        } catch (error) {
            console.error("Gagal mengambil data kepala sekolah:", error);
        }
    };

    const handleClose = () => {
        setShow(false);
        setError(null);
        setCurrentSiswa(initialState);
    };

    const handleShow = (siswa) => {
        setError(null);
        setIsEditing(!!siswa);
        setCurrentSiswa(siswa || initialState);
        setShow(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCurrentSiswa(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setError(null);
        try {
            const allData = {
                ...currentSiswa,
                wali_kelas_id: currentSiswa.wali_kelas_id || null,
                kepala_sekolah_id: currentSiswa.kepala_sekolah_id || null,
            };

            if (isEditing) {
                await axios.put(`http://localhost:5000/api/siswa/${currentSiswa.id}`, allData);
            } else {
                await axios.post('http://localhost:5000/api/siswa', allData);
            }
            fetchSiswas();
            handleClose();
        } catch (error) {
            console.error("Gagal menyimpan data siswa:", error);
            setError("Gagal menyimpan data. Pastikan semua field terisi dengan benar dan coba lagi.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus data ini?')) {
            try {
                await axios.delete(`http://localhost:5000/api/siswa/${id}`);
                fetchSiswas();
            } catch (error) {
                console.error("Gagal menghapus data siswa:", error);
            }
        }
    };

    // FUNGSI BARU: Untuk menangani unduhan file identitas
    const handleDownloadIdentitas = async (siswa) => {
        try {
            const response = await axios.get(`http://localhost:5000/api/templates/generate-identitas/${siswa.id}`, {
                responseType: 'blob', // Penting untuk unduhan file
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const fileName = `Identitas_${siswa.nama.replace(/ /g, '_')}.docx`;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            console.error("Gagal mengunduh file identitas:", error);
            alert("Gagal mengunduh file. Pastikan template 'identitas.docx' ada di server.");
        }
    };

    const filteredSiswas = siswas.filter(s =>
        (s.nama && s.nama.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.nis && s.nis.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="container mt-4">
            <h2>Manajemen Siswa</h2>
            <Button variant="primary" className="mb-3" onClick={() => handleShow(null)}>
                <i className="bi bi-plus-circle"></i> Tambah Siswa
            </Button>
            <InputGroup className="mb-3">
                <FormControl placeholder="Cari berdasarkan nama atau NIS..." onChange={(e) => setSearchTerm(e.target.value)} />
            </InputGroup>
            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>NIS</th>
                        <th>Nama</th>
                        <th>Kelas</th>
                        <th>Wali Kelas</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredSiswas.map((siswa, index) => (
                        <tr key={siswa.id}>
                            <td>{index + 1}</td>
                            <td>{siswa.nis}</td>
                            <td>{siswa.nama}</td>
                            <td>{siswa.kelas}</td>
                            <td>{siswa.wali_kelas?.nama}</td>
                            <td>
                                {/* TOMBOL BARU: Untuk mencetak identitas */}
                                <Button variant="success" size="sm" className="me-1" onClick={() => handleDownloadIdentitas(siswa)}>
                                    <i className="bi bi-printer"></i> Cetak Identitas
                                </Button>
                                <Button variant="info" size="sm" className="me-1" onClick={() => handleShow(siswa)}>
                                    <i className="bi bi-pencil-square"></i> Edit
                                </Button>
                                <Button variant="danger" size="sm" onClick={() => handleDelete(siswa.id)}>
                                    <i className="bi bi-trash"></i> Hapus
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {/* ... (Kode Modal yang sudah ada tidak perlu diubah) ... */}
            <Modal show={show} onHide={handleClose} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Edit Siswa' : 'Tambah Siswa'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form>
                        <h5>Data Diri Siswa</h5>
                        <hr/>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nama</Form.Label>
                                    <Form.Control type="text" name="nama" value={currentSiswa.nama || ''} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>NIS</Form.Label>
                                    <Form.Control type="text" name="nis" value={currentSiswa.nis || ''} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Tempat Lahir</Form.Label>
                                    <Form.Control type="text" name="tempat_lahir" value={currentSiswa.tempat_lahir || ''} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Tanggal Lahir</Form.Label>
                                    <Form.Control type="date" name="tanggal_lahir" value={currentSiswa.tanggal_lahir ? new Date(currentSiswa.tanggal_lahir).toISOString().split('T')[0] : ''} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                             <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Jenis Kelamin</Form.Label>
                                    <Form.Select name="jenis_kelamin" value={currentSiswa.jenis_kelamin || 'Laki-laki'} onChange={handleChange}>
                                        <option value="Laki-laki">Laki-laki</option>
                                        <option value="Perempuan">Perempuan</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                             <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Agama</Form.Label>
                                    <Form.Control type="text" name="agama" value={currentSiswa.agama || ''} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Alamat Siswa</Form.Label>
                            <Form.Control as="textarea" rows={2} name="alamat" value={currentSiswa.alamat || ''} onChange={handleChange} />
                        </Form.Group>
                        <Row>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Kelas</Form.Label>
                                    <Form.Control type="text" name="kelas" value={currentSiswa.kelas || ''} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Wali Kelas</Form.Label>
                                    <Form.Select name="wali_kelas_id" value={currentSiswa.wali_kelas_id || ''} onChange={handleChange}>
                                        <option value="">Pilih Wali Kelas</option>
                                        {waliKelasList.map(wk => <option key={wk.id} value={wk.id}>{wk.nama}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Kepala Sekolah</Form.Label>
                                    <Form.Select name="kepala_sekolah_id" value={currentSiswa.kepala_sekolah_id || ''} onChange={handleChange}>
                                        <option value="">Pilih Kepala Sekolah</option>
                                        {kepalaSekolahList.map(ks => <option key={ks.id} value={ks.id}>{ks.nama}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                        
                        <h5 className="mt-4">Data Orang Tua</h5>
                        <hr/>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nama Ayah</Form.Label>
                                    <Form.Control type="text" name="nama_ayah" value={currentSiswa.nama_ayah || ''} onChange={handleChange} />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Pekerjaan Ayah</Form.Label>
                                    <Form.Control type="text" name="pekerjaan_ayah" value={currentSiswa.pekerjaan_ayah || ''} onChange={handleChange} />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Alamat Ayah</Form.Label>
                                    <Form.Control as="textarea" rows={2} name="alamat_ayah" value={currentSiswa.alamat_ayah || ''} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nama Ibu</Form.Label>
                                    <Form.Control type="text" name="nama_ibu" value={currentSiswa.nama_ibu || ''} onChange={handleChange} />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Pekerjaan Ibu</Form.Label>
                                    <Form.Control type="text" name="pekerjaan_ibu" value={currentSiswa.pekerjaan_ibu || ''} onChange={handleChange} />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Alamat Ibu</Form.Label>
                                    <Form.Control as="textarea" rows={2} name="alamat_ibu" value={currentSiswa.alamat_ibu || ''} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                        </Row>

                        <h5 className="mt-4">Data Wali (Jika Ada)</h5>
                        <hr/>
                        <Row>
                             <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nama Wali</Form.Label>
                                    <Form.Control type="text" name="nama_wali" value={currentSiswa.nama_wali || ''} onChange={handleChange} />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Pekerjaan Wali</Form.Label>
                                    <Form.Control type="text" name="pekerjaan_wali" value={currentSiswa.pekerjaan_wali || ''} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                             <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Alamat Wali</Form.Label>
                                    <Form.Control as="textarea" rows={3} name="alamat_wali" value={currentSiswa.alamat_wali || ''} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Batal
                    </Button>
                    <Button variant="primary" onClick={handleSave}>
                        Simpan
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ManajemenSiswaPage;
