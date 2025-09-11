import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Form, Table, FormControl, InputGroup, Row, Col, Alert, Spinner, Dropdown } from 'react-bootstrap';
import API_BASE from '../api';

const ManajemenSiswaPage = () => {
    // STATE DECLARATIONS
    const [siswas, setSiswas] = useState([]);
    const [kelasOptions, setKelasOptions] = useState([]);
    const [kepalaPesantren, setKepalaPesantren] = useState([]);
    const [kamarOptions, setKamarOptions] = useState([]);
    const [show, setShow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [downloadingIds, setDownloadingIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [tahunAjaranOptions, setTahunAjaranOptions] = useState([]);
    const [selectedTahunAjaranId, setSelectedTahunAjaranId] = useState('');
    // const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('');
    // const [selectedSemester, setSelectedSemester] = useState('');

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
                // Modifikasi Promise.all untuk mengambil data kamar
                const base = API_BASE;
                const [resSiswa, resKelas, resTa, resKp, resKamar] = await Promise.all([
                    axios.get(`${base}/siswa`),
                    axios.get(`${base}/kelas`),
                    axios.get(`${base}/tahun-ajaran`),
                    axios.get(`${base}/kepala-pesantren`),
                    axios.get(`${base}/kamar`)
                ]);
                setSiswas(resSiswa.data);
                setKelasOptions(resKelas.data);
                setTahunAjaranOptions(resTa.data);
                setKepalaPesantren(resKp.data);
                setKamarOptions(resKamar.data); // <-- SET STATE BARU DENGAN DATA DARI API
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
            const base = API_BASE;
            const res = await axios.get(`${base}/siswa`);
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
    
        // Otomatis atur kepala pesantren saat form dibuka
        const activeKepalaPesantren = kepalaPesantren.length > 0 ? kepalaPesantren[0] : null;
    
        if (siswa) {
            setCurrentSiswa({
                ...siswa,
                tanggal_lahir: siswa.tanggal_lahir ? new Date(siswa.tanggal_lahir).toISOString().split('T')[0] : '',
                // Pastikan ID kepala pesantren terisi untuk ditampilkan di form disabled
                kepala_pesantren_id: siswa.kepala_pesantren_id || (activeKepalaPesantren ? activeKepalaPesantren.id : '')
            });
        } else {
            setCurrentSiswa({
                ...initialState,
                // Langsung set kepala pesantren untuk data baru
                kepala_pesantren_id: activeKepalaPesantren ? activeKepalaPesantren.id : ''
            });
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

            const base = API_BASE;
            if (isEditing) {
                await axios.put(`${base}/siswa/${currentSiswa.id}`, dataToSave);
            } else {
                await axios.post(`${base}/siswa`, dataToSave);
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
                const base = API_BASE;
                await axios.delete(`${base}/siswa/${id}`);
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
    const handleDownload = async (siswa, reportType, format = 'docx') => {
        let endpoint = '';
        
        // 1. Logika KHUSUS untuk Laporan Identitas
        if (reportType === 'identitas') {
            endpoint = `raports/generate/identitas/${siswa.id}`;
        } 
        // 2. Logika untuk Laporan Nilai & Sikap (yang sudah berjalan baik)
        else {
            // Validasi: Pastikan Tahun Ajaran sudah dipilih
            if (!selectedTahunAjaranId) {
                alert("Silakan pilih Periode Rapor terlebih dahulu untuk mencetak.");
                return;
            }

            const selectedTahunAjaran = tahunAjaranOptions.find(ta => ta.id === parseInt(selectedTahunAjaranId, 10));
            
            if (!selectedTahunAjaran) {
                alert("Tahun ajaran yang dipilih tidak valid.");
                return;
            }

            const { id, semester } = selectedTahunAjaran;
            
            if (reportType === 'nilai') {
                endpoint = `raports/generate/nilai/${siswa.id}/${id}/${semester}`;
            } else if (reportType === 'sikap') {
                endpoint = `raports/generate/sikap/${siswa.id}/${id}/${semester}`;
            }
        }
        
        if (!endpoint) {
            alert("Tipe laporan tidak valid.");
            return;
        }

        const downloadId = `${siswa.id}-${reportType}-${format}`;
        setDownloadingIds(prev => new Set(prev).add(downloadId));
        
        try {
            const base = API_BASE;
            const url = `${base}/${endpoint}?format=${format}`;
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
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const errorData = JSON.parse(reader.result);
                    alert(`Gagal mengunduh file: ${errorData.message}`);
                } catch (e) {
                    alert(`Gagal mengunduh file. Server error.`);
                }
            };
            if (error.response?.data) {
                reader.readAsText(error.response.data);
            } else {
                alert(`Gagal mengunduh file. Pastikan data siswa lengkap dan server berjalan.`);
            }
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
                <Col md={12}>
                    <Form.Group>
                        <Form.Label><strong>Pilih Tahun Ajaran & Semester untuk Cetak Rapor</strong></Form.Label>
                        <Form.Select value={selectedTahunAjaranId} onChange={e => setSelectedTahunAjaranId(e.target.value)}>
                            <option value="">-- Pilih Periode Rapor --</option>
                            {tahunAjaranOptions.map(ta => (
                                <option key={ta.id} value={ta.id}>
                                    {ta.nama_ajaran} - Semester {ta.semester}
                                </option>
                            ))}
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
                        <th>Wali Kelas</th>
                        <th>Kamar</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredSiswas.map((siswa, index) => (
                        <tr key={siswa.id}>
                            <td>{index + 1}</td>
                            <td>{siswa.nis}</td>
                            <td>{siswa.nama}</td>
                            <td>{siswa.kelas?.nama_kelas || '-'}</td>
                            <td>{siswa.kelas?.walikelas?.nama || '-'}</td>
                            <td>{siswa.infoKamar?.nama_kamar || 'N/A'}</td>
                            <td>
                                <Dropdown className="d-inline-block me-1">
                                    <Dropdown.Toggle 
                                        variant="success" 
                                        size="sm" 
                                        id={`dropdown-cetak-${siswa.id}`}
                                        disabled={downloadingIds.has(`${siswa.id}-nilai-docx`) || downloadingIds.has(`${siswa.id}-sikap-docx`) || downloadingIds.has(`${siswa.id}-identitas-docx`)}
                                    >
                                        {downloadingIds.has(`${siswa.id}-nilai-docx`) || downloadingIds.has(`${siswa.id}-sikap-docx`) || downloadingIds.has(`${siswa.id}-identitas-docx`)
                                            ? <Spinner as="span" animation="border" size="sm" /> 
                                            : <><i className="bi bi-printer"></i> Cetak</>
                                        }
                                    </Dropdown.Toggle>

                                    <Dropdown.Menu 
                                        popperConfig={{
                                            strategy: 'fixed',
                                        }}
                                    >
                                        <Dropdown.Header>Rapor Nilai</Dropdown.Header>
                                        <Dropdown.Item onClick={() => handleDownload(siswa, 'nilai', 'docx')}>Rapor Nilai (DOCX)</Dropdown.Item>
                                        <Dropdown.Item onClick={() => handleDownload(siswa, 'nilai', 'pdf')}>Rapor Nilai (PDF)</Dropdown.Item>
                                        
                                        <Dropdown.Divider />
                                        
                                        <Dropdown.Header>Rapor Sikap</Dropdown.Header>
                                        <Dropdown.Item onClick={() => handleDownload(siswa, 'sikap', 'docx')}>Rapor Sikap (DOCX)</Dropdown.Item>
                                        <Dropdown.Item onClick={() => handleDownload(siswa, 'sikap', 'pdf')}>Rapor Sikap (PDF)</Dropdown.Item>
                                        <Dropdown.Divider />

                                        <Dropdown.Header>Identitas Siswa</Dropdown.Header>
                                        <Dropdown.Item onClick={() => handleDownload(siswa, 'identitas', 'docx')}>Identitas (DOCX)</Dropdown.Item>
                                        <Dropdown.Item onClick={() => handleDownload(siswa, 'identitas', 'pdf')}>Identitas (PDF)</Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>

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
                        {/* ==================================================== */}
                        {/* ========== BAGIAN DATA PRIBADI SISWA =============== */}
                        {/* ==================================================== */}
                        <h5>Data Pribadi Siswa</h5>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nama Lengkap</Form.Label>
                                    <Form.Control type="text" name="nama" value={currentSiswa.nama || ''} onChange={handleChange} required />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>NIS (Nomor Induk Siswa)</Form.Label>
                                    <Form.Control type="text" name="nis" value={currentSiswa.nis || ''} onChange={handleChange} required />
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
                                    <Form.Control type="text" name="agama" value={currentSiswa.agama || 'Islam'} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                        {/* --- KOTA ASAL DITAMBAHKAN DI SINI --- */}
                        <Row>
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Kota Asal</Form.Label>
                                    <Form.Control type="text" name="kota_asal" value={currentSiswa.kota_asal || ''} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Alamat Siswa</Form.Label>
                            <Form.Control as="textarea" rows={2} name="alamat" value={currentSiswa.alamat || ''} onChange={handleChange} />
                        </Form.Group>

                        <hr />
                        <h5>Data Akademik & Domisili</h5>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Kelas</Form.Label>
                                    <Form.Select name="kelas_id" value={currentSiswa.kelas_id || ''} onChange={handleChange}>
                                        <option value="">-- Pilih Kelas --</option>
                                        {kelasOptions.map(k => (
                                            <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Kamar</Form.Label>
                                    <Form.Select name="kamar_id" value={currentSiswa.kamar_id || ''} onChange={handleChange}>
                                        <option value="">-- Pilih Kamar --</option>
                                        {kamarOptions.map(k => {
                                            const terisi = k.siswa?.length || 0;
                                            const sisa = k.kapasitas - terisi;
                                            return (
                                                <option key={k.id} value={k.id} disabled={sisa <= 0}>
                                                    {k.nama_kamar} (Sisa: {sisa})
                                                </option>
                                            );
                                        })}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12}>
                                {/* ======================================================== */}
                                {/* === PERBAIKAN: UBAH INPUTAN KEPALA PESANTREN === */}
                                {/* ======================================================== */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Kepala Pesantren</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        value={kepalaPesantren.find(kp => kp.id === currentSiswa.kepala_pesantren_id)?.nama || 'Tidak Ditemukan'}
                                        disabled 
                                    />
                                </Form.Group>
                            </Col>
                        </Row>


                        <hr />
                        <h5>Data Orang Tua</h5>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nama Ayah</Form.Label>
                                    <Form.Control type="text" name="nama_ayah" value={currentSiswa.nama_ayah || ''} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Pekerjaan Ayah</Form.Label>
                                    <Form.Control type="text" name="pekerjaan_ayah" value={currentSiswa.pekerjaan_ayah || ''} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Alamat Ayah</Form.Label>
                            <Form.Control as="textarea" rows={2} name="alamat_ayah" value={currentSiswa.alamat_ayah || ''} onChange={handleChange} />
                        </Form.Group>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nama Ibu</Form.Label>
                                    <Form.Control type="text" name="nama_ibu" value={currentSiswa.nama_ibu || ''} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Pekerjaan Ibu</Form.Label>
                                    <Form.Control type="text" name="pekerjaan_ibu" value={currentSiswa.pekerjaan_ibu || ''} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Alamat Ibu</Form.Label>
                            <Form.Control as="textarea" rows={2} name="alamat_ibu" value={currentSiswa.alamat_ibu || ''} onChange={handleChange} />
                        </Form.Group>
                        <hr />
                        {/* ==================================================== */}
                        {/* === BAGIAN DATA WALI (DENGAN HEADING BARU) === */}
                        {/* ==================================================== */}
                        <h5>Data Wali (Diisi jika berbeda dengan Orang Tua)</h5>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nama Wali</Form.Label>
                                    <Form.Control type="text" name="nama_wali" value={currentSiswa.nama_wali || ''} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Pekerjaan Wali</Form.Label>
                                    <Form.Control type="text" name="pekerjaan_wali" value={currentSiswa.pekerjaan_wali || ''} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                        {/* --- ALAMAT WALI DITAMBAHKAN DI SINI --- */}
                        <Form.Group className="mb-3">
                            <Form.Label>Alamat Wali</Form.Label>
                            <Form.Control as="textarea" rows={2} name="alamat_wali" value={currentSiswa.alamat_wali || ''} onChange={handleChange} />
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

export default ManajemenSiswaPage;