import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Form, Table, FormControl, InputGroup, Row, Col, Alert, Spinner, Dropdown, DropdownButton } from 'react-bootstrap';

const ManajemenSiswaPage = () => {
    // STATE DECLARATIONS
    const [siswas, setSiswas] = useState([]);
    const [waliKelasList, setWaliKelasList] = useState([]);
    const [kelasOptions, setKelasOptions] = useState([]);
    const [kepalaPesantren, setKepalaPesantren] = useState([]);
    const [show, setShow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [downloadingIds, setDownloadingIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [tahunAjaranOptions, setTahunAjaranOptions] = useState([]);
    const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');

    const initialState = {
        nama: '', nis: '', tempat_lahir: '', tanggal_lahir: '', jenis_kelamin: 'Laki-laki', 
        agama: 'Islam', alamat: '', kelas_id: '', wali_kelas_id: '', kepala_pesantren_id: '',
        kamar: '', kota_asal: '', nama_ayah: '', pekerjaan_ayah: '', alamat_ayah: '',
        nama_ibu: '', pekerjaan_ibu: '', alamat_ibu: '', nama_wali: '', pekerjaan_wali: '', 
        alamat_wali: '',
    };
    const [currentSiswa, setCurrentSiswa] = useState(initialState);

    // DATA FETCHING
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [resSiswa, resWali, resKelas, resTa, resKp] = await Promise.all([
                    axios.get('http://localhost:5000/api/siswa'),
                    axios.get('http://localhost:5000/api/wali-kelas'),
                    axios.get('http://localhost:5000/api/kelas'),
                    axios.get('http://localhost:5000/api/tahun-ajaran'),
                    axios.get('http://localhost:5000/api/kepala-pesantren')
                ]);
                setSiswas(resSiswa.data);
                setWaliKelasList(resWali.data);
                setKelasOptions(resKelas.data);
                setTahunAjaranOptions(resTa.data);
                setKepalaPesantren(resKp.data);
            } catch (error) {
                console.error("Gagal mengambil data awal:", error);
                setError("Gagal memuat data. Silakan refresh halaman.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    
    // REFRESH DATA SISWA (dipakai setelah save/delete)
    const fetchSiswas = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/siswa');
            setSiswas(res.data);
        } catch (error) {
             console.error("Gagal refresh data siswa:", error);
        }
    };

    // MODAL HANDLERS
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
            setCurrentSiswa({
                ...siswa,
                tanggal_lahir: siswa.tanggal_lahir ? new Date(siswa.tanggal_lahir).toISOString().split('T')[0] : '',
            });
        } else {
            setCurrentSiswa(initialState);
        }
        setShow(true);
    };

    // FORM HANDLER
    const handleChange = (e) => {
        const { name, value } = e.target;
        setCurrentSiswa(prev => ({ ...prev, [name]: value }));
    };

    // CRUD HANDLERS
    const handleSave = async () => {
        setError(null);
        if (!currentSiswa.nama?.trim() || !currentSiswa.nis?.trim()) {
            setError("Nama dan NIS siswa harus diisi.");
            return;
        }

        try {
            setLoading(true);
            const dataToSave = {
                ...currentSiswa,
                wali_kelas_id: currentSiswa.wali_kelas_id || null,
                kepala_pesantren_id: currentSiswa.kepala_pesantren_id || null,
                kelas_id: currentSiswa.kelas_id || null,
            };

            if (isEditing) {
                await axios.put(`http://localhost:5000/api/siswa/${currentSiswa.id}`, dataToSave);
            } else {
                await axios.post('http://localhost:5000/api/siswa', dataToSave);
            }
            
            await fetchSiswas();
            handleClose();
            
        } catch (error) {
            console.error("Gagal menyimpan data siswa:", error);
            setError(error.response?.data?.message || "Gagal menyimpan data.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Yakin ingin menghapus data siswa ini? Semua data terkait (nilai, dll) akan ikut terhapus.')) {
            try {
                setLoading(true);
                await axios.delete(`http://localhost:5000/api/siswa/${id}`);
                await fetchSiswas();
            } catch (error) {
                console.error("Gagal menghapus data siswa:", error);
                setError(error.response?.data?.message || "Gagal menghapus data.");
            } finally {
                setLoading(false);
            }
        }
    };

    // DOWNLOAD HANDLER
    const handleDownload = async (siswa, reportType, format, endpoint) => {
        if ((reportType === 'nilai' || reportType === 'sikap') && (!selectedTahunAjaran || !selectedSemester)) {
            alert("Silakan pilih Tahun Ajaran dan Semester terlebih dahulu untuk mencetak rapor.");
            return;
        }

        const downloadId = `${siswa.id}-${reportType}-${format}`;
        setDownloadingIds(prev => new Set(prev).add(downloadId));
        
        try {
            const url = `http://localhost:5000/api/${endpoint}?format=${format}`;
            const response = await axios.get(url, { responseType: 'blob' });
            
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            
            const contentDisposition = response.headers['content-disposition'];
            let fileName = `Laporan_${siswa.nama.replace(/\s+/g, '_')}.${format}`;
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
                if (fileNameMatch && fileNameMatch.length === 2) fileName = fileNameMatch[1];
            }
            
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(link.href);

        } catch (error) {
            console.error(`Error saat download ${reportType}:`, error);
            alert(`Gagal mengunduh file. Pastikan data siswa lengkap dan server berjalan.`);
        } finally {
            setDownloadingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(downloadId);
                return newSet;
            });
        }
    };
    
    const filteredSiswas = siswas.filter(s =>
        (s.nama && s.nama.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.nis && s.nis.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // RENDER COMPONENT
    return (
        <div className="container mt-4">
            <h2>Manajemen Siswa</h2>
            <Button variant="primary" className="mb-3" onClick={() => handleShow(null)}>
                <i className="bi bi-plus-circle"></i> Tambah Siswa
            </Button>
            
            <Row className="mb-3 bg-light p-3 border rounded">
                <Col md={12}><strong>Filter Cetak Rapor</strong></Col>
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Pilih Tahun Ajaran</Form.Label>
                        <Form.Select value={selectedTahunAjaran} onChange={e => setSelectedTahunAjaran(e.target.value)}>
                            <option value="">-- Pilih Tahun Ajaran --</option>
                            {[...new Map(tahunAjaranOptions.map(item => [item.nama_ajaran, item])).values()].map(ta => (
                                <option key={ta.id} value={ta.id}>{ta.nama_ajaran}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Pilih Semester</Form.Label>
                        <Form.Select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}>
                            <option value="">-- Pilih Semester --</option>
                            <option value="1">Semester 1</option>
                            <option value="2">Semester 2</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
            </Row>

            <InputGroup className="mb-3">
                <FormControl placeholder="Cari berdasarkan nama atau NIS..." onChange={(e) => setSearchTerm(e.target.value)} />
            </InputGroup>

            {loading && <div className="text-center"><Spinner animation="border" /></div>}

            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>NIS</th>
                        <th>Nama</th>
                        <th>Kelas</th>
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
                            <td>
                                <DropdownButton
                                    id={`dropdown-cetak-${siswa.id}`}
                                    title={
                                        downloadingIds.size > 0 && Array.from(downloadingIds).some(id => id.startsWith(siswa.id)) 
                                        ? <Spinner as="span" animation="border" size="sm" /> 
                                        : <><i className="bi bi-printer"></i> Cetak</>
                                    }
                                    variant="success" size="sm" className="d-inline-block me-1">
                                    
                                    <Dropdown.Header>Identitas Siswa</Dropdown.Header>
                                    {/* --- PERBAIKAN ENDPOINT DI SINI --- */}
                                    <Dropdown.Item onClick={() => handleDownload(siswa, 'identitas', 'docx', `raports/generate/identitas/${siswa.id}`)}>Identitas (DOCX)</Dropdown.Item>
                                    <Dropdown.Item onClick={() => handleDownload(siswa, 'identitas', 'pdf', `raports/generate/identitas/${siswa.id}`)}>Identitas (PDF)</Dropdown.Item>
                                    
                                    <Dropdown.Divider />
                                    
                                    <Dropdown.Header>Rapor Nilai</Dropdown.Header>
                                    <Dropdown.Item onClick={() => handleDownload(siswa, 'nilai', 'docx', `raports/generate/nilai/${siswa.id}/${selectedSemester}/${selectedTahunAjaran}`)}>Rapor Nilai (DOCX)</Dropdown.Item>
                                    <Dropdown.Item onClick={() => handleDownload(siswa, 'nilai', 'pdf', `raports/generate/nilai/${siswa.id}/${selectedSemester}/${selectedTahunAjaran}`)}>Rapor Nilai (PDF)</Dropdown.Item>
                                    
                                    <Dropdown.Divider />
                                    
                                    <Dropdown.Header>Rapor Sikap</Dropdown.Header>
                                    <Dropdown.Item onClick={() => handleDownload(siswa, 'sikap', 'docx', `raports/generate/sikap/${siswa.id}/${selectedSemester}/${selectedTahunAjaran}`)}>Rapor Sikap (DOCX)</Dropdown.Item>
                                    <Dropdown.Item onClick={() => handleDownload(siswa, 'sikap', 'pdf', `raports/generate/sikap/${siswa.id}/${selectedSemester}/${selectedTahunAjaran}`)}>Rapor Sikap (PDF)</Dropdown.Item>
                                
                                </DropdownButton>

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
                        {/* FORM FIELDS HERE, e.g., */}
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
                        {/* Add all other form rows and columns here as per your original file */}
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

export default ManajemenSiswaPage;