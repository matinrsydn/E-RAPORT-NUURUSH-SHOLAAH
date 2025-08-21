import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Tabs, Tab, Card, Form, Button, Row, Col, Spinner, Alert, Table } from 'react-bootstrap';
import fileDownload from 'js-file-download';
import { useNavigate } from 'react-router-dom';
const InputNilaiPage = () => {
    const navigate = useNavigate();
    // State UI
    // State UI
    const [key, setKey] = useState('excel');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // State Data Master
    const [kelasOptions, setKelasOptions] = useState([]);
    const [tahunAjaranOptions, setTahunAjaranOptions] = useState([]);
    const [mapelOptions, setMapelOptions] = useState([]);

    // State untuk Tab Excel
    const [filtersExcel, setFiltersExcel] = useState({
        kelas_id: '',
        tahun_ajaran: '',
        semester: '1' // UBAH dari 'Ganjil' ke '1'
    });
    const [file, setFile] = useState(null);

    // State untuk Tab Manual
    const [filtersManual, setFiltersManual] = useState({
        kelas_id: '',
        mapel_id: '',
        tahun_ajaran: '',
        semester: '1' // UBAH dari 'Ganjil' ke '1'
    });
    const [siswaUntukNilai, setSiswaUntukNilai] = useState([]);
    const [nilaiManual, setNilaiManual] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resKelas, resTA, resMapel] = await Promise.all([
                    axios.get('http://localhost:5000/api/kelas'),
                    axios.get('http://localhost:5000/api/tahun-ajaran'),
                    axios.get('http://localhost:5000/api/mata-pelajaran')
                ]);
                setKelasOptions(resKelas.data);
                setTahunAjaranOptions(resTA.data);
                
                setMapelOptions(resMapel.data); 

                const taAktif = resTA.data.find(ta => ta.status === 'aktif');
                if (taAktif) {
                    const tahunAjaranAktif = taAktif.nama_ajaran;
                    setFiltersExcel(prev => ({ ...prev, tahun_ajaran: tahunAjaranAktif }));
                    setFiltersManual(prev => ({ ...prev, tahun_ajaran: tahunAjaranAktif }));
                }
            } catch (err) {
                setError('Gagal memuat data master.');
            }
        };
        fetchData();
    }, []);

    const resetMessages = () => { setError(''); setSuccess(''); };

    // --- FUNGSI UNTUK TAB EXCEL ---
    const handleFilterChangeExcel = (e) => setFiltersExcel(prev => ({ ...prev, [e.target.name]: e.target.value }));
    
    // PERBAIKAN UTAMA: Ganti endpoint dan tambah debug log
    const handleDownloadTemplate = async () => {
        if (!filtersExcel.kelas_id) return setError('Silakan pilih kelas terlebih dahulu.');
        resetMessages(); 
        setLoading(true);
        
        console.log('Download parameters:', filtersExcel); // Debug log
        
        try {
            // UBAH ENDPOINT DARI /download-template KE /download-complete-template
            const response = await axios.get('http://localhost:5000/api/excel/download-complete-template', { 
                params: filtersExcel, 
                responseType: 'blob' 
            });
            
            const kelasTerpilih = kelasOptions.find(k => k.id == filtersExcel.kelas_id);
            // UBAH NAMA FILE UNTUK TEMPLATE LENGKAP
            const namaFile = `Template-Lengkap-${kelasTerpilih?.nama_kelas || 'Siswa'}-Semester-${filtersExcel.semester}-${filtersExcel.tahun_ajaran.replace('/', '-')}.xlsx`;
            
            fileDownload(response.data, namaFile);
            setSuccess('Template Excel lengkap berhasil diunduh dengan 5 sheet (Nilai Ujian, Hafalan, Kehadiran, Sikap, Panduan).');
        } catch (err) {
            console.error('Download error:', err); // Debug log
            setError(err.response?.data?.message || 'Gagal mengunduh template lengkap.');
        } finally {
            setLoading(false);
        }
    };

    const handleUploadFile = async () => {
        if (!file) return setError('Silakan pilih file untuk diunggah.');
        resetMessages(); 
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            // Ganti endpoint ke API draft yang baru
            const response = await axios.post('http://localhost:5000/api/draft/upload', formData, { 
                headers: { 'Content-Type': 'multipart/form-data' } 
            });
            
            // Arahkan ke halaman validasi dengan batchId
            navigate(`/validasi-raport/${response.data.upload_batch_id}`);
            
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal mengunggah file.');
        } finally {
            setLoading(false);
        }
    };

    // --- FUNGSI UNTUK TAB MANUAL ---
    const handleFilterChangeManual = (e) => setFiltersManual(prev => ({ ...prev, [e.target.name]: e.target.value }));
    
    const handleMuatSiswa = async () => {
        if (!filtersManual.kelas_id || !filtersManual.mapel_id) return setError('Silakan pilih kelas dan mata pelajaran.');
        resetMessages(); setLoading(true); setSiswaUntukNilai([]); setNilaiManual({});
        try {
            // UNTUK MANUAL INPUT, KONVERSI SEMESTER KE FORMAT YANG DIPERLUKAN BACKEND
            const manualParams = {
                ...filtersManual,
                semester: filtersManual.semester === '1' ? 'Ganjil' : 'Genap'
            };
            
            const response = await axios.get('http://localhost:5000/api/nilai/filter', { params: manualParams });
            setSiswaUntukNilai(response.data);
            const initialNilai = {};
            response.data.forEach(siswa => {
                const nilai = siswa.nilai_ujian[0];
                initialNilai[siswa.id] = {
                    pengetahuan_angka: nilai?.pengetahuan_angka ?? '',
                    keterampilan_angka: nilai?.keterampilan_angka ?? ''
                };
            });
            setNilaiManual(initialNilai);
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal memuat data siswa.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleNilaiChange = (siswaId, field, value) => {
        setNilaiManual(prev => ({ ...prev, [siswaId]: { ...prev[siswaId], [field]: value === '' ? '' : Number(value) } }));
    };
    
    const handleSimpanNilaiManual = async () => {
        resetMessages(); setLoading(true);
        const payload = Object.keys(nilaiManual)
            .map(siswaId => ({
                siswa_id: parseInt(siswaId, 10),
                mapel_id: parseInt(filtersManual.mapel_id, 10),
                semester: filtersManual.semester === '1' ? 'Ganjil' : 'Genap', // Konversi semester
                tahun_ajaran: filtersManual.tahun_ajaran,
                pengetahuan_angka: nilaiManual[siswaId].pengetahuan_angka === '' ? null : nilaiManual[siswaId].pengetahuan_angka,
                keterampilan_angka: nilaiManual[siswaId].keterampilan_angka === '' ? null : nilaiManual[siswaId].keterampilan_angka,
            }))
            .filter(item => item.pengetahuan_angka !== null || item.keterampilan_angka !== null);

        if (payload.length === 0) {
            setError("Tidak ada nilai yang diisi untuk disimpan.");
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post('http://localhost:5000/api/nilai/bulk', payload);
            setSuccess(response.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal menyimpan nilai.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4">
            <h2>Input Nilai Siswa</h2>
            {error && <Alert variant="danger" onClose={resetMessages} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={resetMessages} dismissible>{success}</Alert>}

            <Tabs activeKey={key} onSelect={(k) => { setKey(k); resetMessages(); }} className="mb-3">
                <Tab eventKey="excel" title="Input via Excel Lengkap">
                    <Card className="mb-4">
                        <Card.Header as="h5">
                            <i className="fas fa-download me-2"></i>
                            1. Unduh Template Excel Lengkap
                            <small className="text-muted ms-2">(5 Sheet: Nilai, Hafalan, Kehadiran, Sikap, Panduan)</small>
                        </Card.Header>
                        <Card.Body>
                            <Row className="align-items-end">
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>Tahun Ajaran</Form.Label>
                                        <Form.Select name="tahun_ajaran" value={filtersExcel.tahun_ajaran} onChange={handleFilterChangeExcel}>
                                            <option value="">Pilih Tahun Ajaran</option>
                                            {tahunAjaranOptions.map(ta => 
                                                <option key={ta.id} value={ta.nama_ajaran}>{ta.nama_ajaran}</option>
                                            )}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>Semester</Form.Label>
                                        <Form.Select name="semester" value={filtersExcel.semester} onChange={handleFilterChangeExcel}>
                                            <option value="1">Semester 1 (Ganjil)</option>
                                            <option value="2">Semester 2 (Genap)</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>Kelas</Form.Label>
                                        <Form.Select name="kelas_id" value={filtersExcel.kelas_id} onChange={handleFilterChangeExcel}>
                                            <option value="">Pilih Kelas</option>
                                            {kelasOptions.map(opt => 
                                                <option key={opt.id} value={opt.id}>{opt.nama_kelas}</option>
                                            )}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Button 
                                        onClick={handleDownloadTemplate} 
                                        disabled={loading || !filtersExcel.kelas_id || !filtersExcel.tahun_ajaran} 
                                        className="w-100"
                                        variant="primary"
                                    >
                                        {loading ? <Spinner as="span" size="sm" /> : <><i className="fas fa-file-excel me-1"></i>Unduh Template Lengkap</>}
                                    </Button>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                    
                    <Card>
                        <Card.Header as="h5">
                            <i className="fas fa-upload me-2"></i>
                            2. Unggah File yang Sudah Diisi
                        </Card.Header>
                        <Card.Body>
                            <Form.Group controlId="file-upload-input" className="mb-3">
                                <Form.Label>Pilih file Excel (.xlsx)</Form.Label>
                                <Form.Control 
                                    type="file" 
                                    onChange={(e) => setFile(e.target.files[0])} 
                                    accept=".xlsx, .xls" 
                                />
                                <Form.Text className="text-muted">
                                    File harus berisi sheet: Template Nilai Ujian, Template Hafalan, Template Kehadiran, Template Sikap
                                </Form.Text>
                            </Form.Group>
                            <Button 
                                onClick={handleUploadFile} 
                                disabled={loading || !file}
                                variant="success"
                            >
                                {loading ? <Spinner as="span" size="sm" /> : <><i className="fas fa-cloud-upload-alt me-1"></i>Unggah & Proses Data</>}
                            </Button>
                        </Card.Body>
                    </Card>
                </Tab>

                <Tab eventKey="manual" title="Input Manual">
                    <Card>
                        <Card.Header as="h5">Input Nilai Manual</Card.Header>
                        <Card.Body>
                            <Row className="mb-3 align-items-end">
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>Tahun Ajaran</Form.Label>
                                        <Form.Select name="tahun_ajaran" value={filtersManual.tahun_ajaran} onChange={handleFilterChangeManual}>
                                            <option value="">Pilih Tahun Ajaran</option>
                                            {tahunAjaranOptions.map(ta => 
                                                <option key={ta.id} value={ta.nama_ajaran}>{ta.nama_ajaran}</option>
                                            )}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={2}>
                                    <Form.Group>
                                        <Form.Label>Semester</Form.Label>
                                        <Form.Select name="semester" value={filtersManual.semester} onChange={handleFilterChangeManual}>
                                            <option value="1">Semester 1</option>
                                            <option value="2">Semester 2</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>Kelas</Form.Label>
                                        <Form.Select name="kelas_id" value={filtersManual.kelas_id} onChange={handleFilterChangeManual}>
                                            <option value="">Pilih Kelas</option>
                                            {kelasOptions.map(k => 
                                                <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                                            )}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={2}>
                                    <Form.Group>
                                        <Form.Label>Mata Pelajaran</Form.Label>
                                        <Form.Select name="mapel_id" value={filtersManual.mapel_id} onChange={handleFilterChangeManual}>
                                            <option value="">Pilih Mata Pelajaran</option>
                                            {mapelOptions.map(m => 
                                                <option key={m.id} value={m.id}>{m.nama_mapel}</option>
                                            )}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={2}>
                                    <Button 
                                        onClick={handleMuatSiswa} 
                                        disabled={!filtersManual.kelas_id || !filtersManual.mapel_id || loading} 
                                        className="w-100"
                                    >
                                        {loading ? <Spinner as="span" size="sm"/> : 'Muat Siswa'}
                                    </Button>
                                </Col>
                            </Row>
                            
                            {siswaUntukNilai.length > 0 && (
                                <>
                                    <Table striped bordered hover responsive className="mt-4">
                                        <thead className="table-dark">
                                            <tr>
                                                <th style={{width: '5%'}}>#</th>
                                                <th style={{width: '15%'}}>NIS</th>
                                                <th style={{width: '35%'}}>Nama Siswa</th>
                                                <th style={{width: '22.5%'}}>Nilai Pengetahuan (0-100)</th>
                                                <th style={{width: '22.5%'}}>Nilai Keterampilan (0-100)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {siswaUntukNilai.map((siswa, index) => (
                                                <tr key={siswa.id}>
                                                    <td>{index + 1}</td>
                                                    <td>{siswa.nis}</td>
                                                    <td>{siswa.nama}</td>
                                                    <td>
                                                        <Form.Control 
                                                            type="number" 
                                                            min="0" 
                                                            max="100" 
                                                            value={nilaiManual[siswa.id]?.pengetahuan_angka ?? ''} 
                                                            onChange={(e) => handleNilaiChange(siswa.id, 'pengetahuan_angka', e.target.value)}
                                                            placeholder="0-100" 
                                                        />
                                                    </td>
                                                    <td>
                                                        <Form.Control 
                                                            type="number" 
                                                            min="0" 
                                                            max="100" 
                                                            value={nilaiManual[siswa.id]?.keterampilan_angka ?? ''} 
                                                            onChange={(e) => handleNilaiChange(siswa.id, 'keterampilan_angka', e.target.value)}
                                                            placeholder="0-100" 
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                    <div className="d-flex justify-content-end">
                                        <Button 
                                            onClick={handleSimpanNilaiManual} 
                                            disabled={loading} 
                                            variant="success"
                                            size="lg"
                                        >
                                            {loading ? <Spinner as="span" size="sm"/> : <><i className="fas fa-save me-1"></i>Simpan Semua Nilai</>}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>
        </div>
    );
};

export default InputNilaiPage;