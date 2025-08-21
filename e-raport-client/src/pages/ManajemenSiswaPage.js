
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Form, Table, FormControl, InputGroup, Row, Col, Alert, Spinner } from 'react-bootstrap';

const ManajemenSiswaPage = () => {
    const [siswas, setSiswas] = useState([]);
    const [waliKelasList, setWaliKelasList] = useState([]);
    const [kepalaPesantren, setKepalaPesantren] = useState([]);
    const [kelasOptions, setKelasOptions] = useState([]);
    const [show, setShow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [downloadingIds, setDownloadingIds] = useState(new Set());
    
    const initialState = {
        nama: '', 
        nis: '', 
        tempat_lahir: '', 
        tanggal_lahir: '', 
        jenis_kelamin: 'Laki-laki', 
        agama: 'Islam', 
        alamat: '', 
        kelas_id: '', 
        wali_kelas_id: '', 
        kepala_pesantren_id: '',
        kamar: '',
        kota_asal: '',
        nama_ayah: '', 
        pekerjaan_ayah: '', 
        alamat_ayah: '',
        nama_ibu: '', 
        pekerjaan_ibu: '', 
        alamat_ibu: '',
        nama_wali: '', 
        pekerjaan_wali: '', 
        alamat_wali: '',
    };
    
    const [currentSiswa, setCurrentSiswa] = useState(initialState);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchSiswas();
        fetchWaliKelas();
        fetchKepalaPesantren();
        fetchKelas();
    }, []);

    const fetchSiswas = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:5000/api/siswa');
            setSiswas(res.data);
        } catch (error) {
            console.error("Gagal mengambil data siswa:", error);
            setError("Gagal mengambil data siswa. Silakan refresh halaman.");
        } finally {
            setLoading(false);
        }
    };

    const fetchWaliKelas = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/wali-kelas');
            setWaliKelasList(res.data);
        } catch (error) {
            console.error("Gagal mengambil data wali kelas:", error);
        }
    };

    const fetchKelas = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/kelas');
            setKelasOptions(res.data);
        } catch (error) {
            console.error("Gagal mengambil data kelas:", error);
        }
    };

    const fetchKepalaPesantren = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/kepala-pesantren');
            setKepalaPesantren(response.data);
        } catch (error) {
            console.error('Gagal mengambil data kepala pesantren:', error);
        }
    };

    const handleClose = () => {
        setShow(false);
        setError(null);
        setCurrentSiswa(initialState);
        setIsEditing(false);
    };

    const handleShow = (siswa) => {
        setError(null);
        setIsEditing(!!siswa);
        
        if (siswa) {
            // Format tanggal untuk input date
            const siswaData = {
                ...siswa,
                tanggal_lahir: siswa.tanggal_lahir ? new Date(siswa.tanggal_lahir).toISOString().split('T')[0] : '',
                kelas_id: siswa.kelas_id || '',
                wali_kelas_id: siswa.wali_kelas_id || '',
                kepala_pesantren_id: siswa.kepala_pesantren_id || ''
            };
            setCurrentSiswa(siswaData);
        } else {
            setCurrentSiswa(initialState);
        }
        
        setShow(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCurrentSiswa(prev => ({ 
            ...prev, 
            [name]: value 
        }));
    };

    const validateForm = () => {
        if (!currentSiswa.nama?.trim()) {
            setError("Nama siswa harus diisi");
            return false;
        }
        if (!currentSiswa.nis?.trim()) {
            setError("NIS harus diisi");
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        setError(null);
        
        if (!validateForm()) {
            return;
        }

        try {
            setLoading(true);
            
            // Bersihkan data yang kosong dan set null untuk foreign key yang kosong
            const allData = {
                ...currentSiswa,
                wali_kelas_id: currentSiswa.wali_kelas_id || null,
                kepala_pesantren_id: currentSiswa.kepala_pesantren_id || null,
                kelas_id: currentSiswa.kelas_id || null,
                // Trim string values
                nama: currentSiswa.nama?.trim(),
                nis: currentSiswa.nis?.trim(),
                tempat_lahir: currentSiswa.tempat_lahir?.trim(),
                alamat: currentSiswa.alamat?.trim(),
                kamar: currentSiswa.kamar?.trim(),
                kota_asal: currentSiswa.kota_asal?.trim(),
                nama_ayah: currentSiswa.nama_ayah?.trim(),
                pekerjaan_ayah: currentSiswa.pekerjaan_ayah?.trim(),
                alamat_ayah: currentSiswa.alamat_ayah?.trim(),
                nama_ibu: currentSiswa.nama_ibu?.trim(),
                pekerjaan_ibu: currentSiswa.pekerjaan_ibu?.trim(),
                alamat_ibu: currentSiswa.alamat_ibu?.trim(),
                nama_wali: currentSiswa.nama_wali?.trim(),
                pekerjaan_wali: currentSiswa.pekerjaan_wali?.trim(),
                alamat_wali: currentSiswa.alamat_wali?.trim()
            };

            if (isEditing) {
                await axios.put(`http://localhost:5000/api/siswa/${currentSiswa.id}`, allData);
            } else {
                await axios.post('http://localhost:5000/api/siswa', allData);
            }
            
            await fetchSiswas(); // Refresh data
            handleClose();
            
        } catch (error) {
            console.error("Gagal menyimpan data siswa:", error);
            
            if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else if (error.response?.status === 400) {
                setError("Data tidak valid. Periksa kembali form Anda.");
            } else if (error.response?.status === 409) {
                setError("NIS sudah digunakan oleh siswa lain.");
            } else {
                setError("Gagal menyimpan data. Pastikan semua field terisi dengan benar dan coba lagi.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus data siswa ini? Data yang terkait (nilai, sikap, kehadiran) juga akan terhapus.')) {
            try {
                setLoading(true);
                await axios.delete(`http://localhost:5000/api/siswa/${id}`);
                await fetchSiswas(); // Refresh data
            } catch (error) {
                console.error("Gagal menghapus data siswa:", error);
                
                if (error.response?.status === 404) {
                    setError("Data siswa tidak ditemukan.");
                } else {
                    setError("Gagal menghapus data siswa. Silakan coba lagi.");
                }
            } finally {
                setLoading(false);
            }
        }
    };

    // Ganti fungsi handleDownloadIdentitas yang kosong dengan ini:
    // Ganti fungsi handleDownloadIdentitas yang kosong dengan ini:
    const handleDownloadIdentitas = async (siswa) => {
        try {
            // Untuk download identitas, kita bisa menggunakan semester dan tahun ajaran default
            // Atau bisa diminta input dari user melalui modal
            const semester = '1'; // atau bisa dinamis
            const tahunAjaran = '2024-2025'; // atau bisa dinamis
            
            console.log(`Downloading identitas untuk siswa: ${siswa.nama}`);
            
            const response = await axios({
                method: 'GET',
                url: `http://localhost:5000/api/templates/generate-identitas/${siswa.id}`,
                responseType: 'blob', // Important untuk download file
            });
            
            // Buat blob dan download file
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Raport_${siswa.nama.replace(/\s+/g, '_')}_Identitas.docx`;
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);
            
            console.log('Download identitas berhasil!');
        } catch (error) {
            console.error('Error saat download identitas:', error);
            alert('Gagal mengunduh file identitas. Pastikan template sudah diupload dan data siswa lengkap.');
        }
    };

    // Filter siswa berdasarkan search term
    const filteredSiswas = siswas.filter(s =>
        (s.nama && s.nama.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.nis && s.nis.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.kelas?.nama_kelas && s.kelas.nama_kelas.toLowerCase().includes(searchTerm.toLowerCase()))
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
                                <td>{siswa.kelas?.nama_kelas || 'N/A'}</td>
                                <td>{siswa.kelas?.walikelas?.nama || 'N/A'}</td>
                                <td>
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
                                    <Form.Control type="date" name="tanggal_lahir" value={currentSiswa.tanggal_lahir || ''} onChange={handleChange} />
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
                                    <Form.Select name="kelas_id" value={currentSiswa.kelas_id || ''} onChange={handleChange}>
                                        <option value="">Pilih Kelas</option>
                                        {kelasOptions.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                                    </Form.Select>
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
                                <Form.Group controlId="formKepalaPesantren">
                                    <Form.Label>Kepala Pesantren</Form.Label> 
                                    <Form.Control as="select" name="kepala_pesantren_id" value={currentSiswa.kepala_pesantren_id || ''} onChange={handleChange}>
                                        <option value="">Pilih Kepala Pesantren</option> 
                                        {kepalaPesantren.map((kp) => (<option key={kp.id} value={kp.id}>{kp.nama}</option>))}
                                    </Form.Control>
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
                    <Button variant="secondary" onClick={handleClose}>Batal</Button>
                    <Button variant="primary" onClick={handleSave}>Simpan</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ManajemenSiswaPage;
