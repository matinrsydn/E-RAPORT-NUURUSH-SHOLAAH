import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Tabs, Tab, Card, Form, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import fileDownload from 'js-file-download';

const InputNilaiPage = () => {
    const [key, setKey] = useState('excel');
    const [kelasOptions, setKelasOptions] = useState([]);
    const [waliKelasOptions, setWaliKelasOptions] = useState([]);
    const [tahunAjaranOptions, setTahunAjaranOptions] = useState([]);
    
    const [filters, setFilters] = useState({
        filterType: 'kelas',
        selectedId: '',
        tahunAjaran: '',
        semester: 'Ganjil'
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [file, setFile] = useState(null);

    useEffect(() => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        let defaultTahunAjaran = `${currentYear}/${currentYear + 1}`;
        let defaultSemester = (currentMonth >= 6 && currentMonth <= 11) ? 'Ganjil' : 'Genap';
        if (defaultSemester === 'Genap') defaultTahunAjaran = `${currentYear - 1}/${currentYear}`;
        
        setFilters(prev => ({ ...prev, tahunAjaran: defaultTahunAjaran, semester: defaultSemester }));

        axios.get('http://localhost:5000/api/kelas').then(res => setKelasOptions(res.data));
        axios.get('http://localhost:5000/api/wali-kelas').then(res => setWaliKelasOptions(res.data));
        axios.get('http://localhost:5000/api/tahun-ajaran').then(res => {
            setTahunAjaranOptions(res.data);
            const activeYear = res.data.find(y => y.status === 'aktif');
            if (activeYear) {
                setFilters(prev => ({ ...prev, tahunAjaran: activeYear.nama_ajaran }));
            }
        });
    }, []);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        if (name === 'filterType') setFilters(prev => ({ ...prev, selectedId: '' }));
    };

    const handleDownloadTemplate = async () => {
        if (!filters.selectedId) return setError('Filter Kelas atau Wali Kelas harus diisi.');
        setError('');
        setLoading(true);
        
        const params = new URLSearchParams({
            [filters.filterType === 'kelas' ? 'kelas_id' : 'wali_kelas_id']: filters.selectedId
        });
        
        try {
            const response = await axios.get(`http://localhost:5000/api/excel/download-template?${params.toString()}`, {
                responseType: 'blob',
            });
            const kelasTerpilih = kelasOptions.find(k => k.id == filters.selectedId);
            const namaFile = `Template-Nilai-${kelasTerpilih?.nama_kelas || 'Siswa'}-${filters.tahunAjaran.replace('/', '-')}-${filters.semester}.xlsx`;
            fileDownload(response.data, namaFile);
        } catch (err) {
            setError('Gagal mengunduh. Pastikan ada siswa di filter yang dipilih.');
        } finally {
            setLoading(false);
        }
    };

    const handleUploadFile = () => alert('Fitur upload belum diimplementasikan.');

    return (
        <div className="container mt-4">
            <h2>Input Nilai Raport</h2>
            <Tabs activeKey={key} onSelect={(k) => setKey(k)} className="mb-3">
                <Tab eventKey="excel" title="Input via Excel">
                    <Card>
                        <Card.Header as="h5">1. Unduh Template Berdasarkan Filter</Card.Header>
                        <Card.Body>
                            {error && <Alert variant="danger">{error}</Alert>}
                            <Row className="mb-3 align-items-end">
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>Tahun Ajaran</Form.Label>
                                        <Form.Select name="tahunAjaran" value={filters.tahunAjaran} onChange={handleFilterChange}>
                                            {tahunAjaranOptions.map(ta => <option key={ta.id} value={ta.nama_ajaran}>{ta.nama_ajaran}</option>)}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>Semester</Form.Label>
                                        <Form.Select name="semester" value={filters.semester} onChange={handleFilterChange}>
                                            <option value="Ganjil">Ganjil</option>
                                            <option value="Genap">Genap</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>Filter Siswa</Form.Label>
                                        <Form.Select name="filterType" value={filters.filterType} onChange={handleFilterChange}>
                                            <option value="kelas">Per Kelas</option>
                                            <option value="wali_kelas">Per Wali Kelas</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="invisible">Pilihan</Form.Label>
                                        <Form.Select name="selectedId" value={filters.selectedId} onChange={handleFilterChange}>
                                            <option value="">-- Pilih {filters.filterType === 'kelas' ? 'Kelas' : 'Wali Kelas'} --</option>
                                            {filters.filterType === 'kelas' ? 
                                                kelasOptions.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>) :
                                                waliKelasOptions.map(wk => <option key={wk.id} value={wk.id}>{wk.nama}</option>)
                                            }
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Button onClick={handleDownloadTemplate} disabled={loading}>
                                {loading ? <Spinner as="span" size="sm" /> : 'Unduh Template'}
                            </Button>
                        </Card.Body>
                    </Card>
                    <Card className="mt-4">
                        <Card.Header as="h5">2. Unggah File yang Sudah Diisi</Card.Header>
                        <Card.Body>
                             <Form.Group controlId="formFile" className="mb-3">
                                <Form.Label>Pilih file Excel</Form.Label>
                                <Form.Control type="file" onChange={(e) => setFile(e.target.files[0])} accept=".xlsx, .xls" />
                            </Form.Group>
                            <Button onClick={handleUploadFile}>Unggah Nilai</Button>
                        </Card.Body>
                    </Card>
                </Tab>
                <Tab eventKey="manual" title="Input Manual">
                    <Card><Card.Body>Fitur input manual akan dikembangkan di sini. Anda bisa memilih filter di atas, lalu tabel interaktif akan muncul di sini untuk diisi.</Card.Body></Card>
                </Tab>
            </Tabs>
        </div>
    );
};

export default InputNilaiPage;
