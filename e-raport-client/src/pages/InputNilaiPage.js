import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Button, Form, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { Download, Upload } from 'lucide-react'; // Menambahkan ikon
import API_BASE from '../api';
import { useNavigate } from 'react-router-dom';

const InputNilaiPage = () => {
    const navigate = useNavigate();
    // State UI
    const [key, setKey] = useState('excel');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // State Data Master
    const [kelasOptions, setKelasOptions] = useState([]);
    const [tahunAjaranOptions, setTahunAjaranOptions] = useState([]);

    // State untuk Tab Excel
    const [selectedKelasExcel, setSelectedKelasExcel] = useState('');
    const [selectedTahunAjaranExcel, setSelectedTahunAjaranExcel] = useState(''); // Akan menyimpan ID
    const [file, setFile] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const base = API_BASE;
                const [resKelas, resTA] = await Promise.all([
                    axios.get(`${base}/kelas`),
                    axios.get(`${base}/tahun-ajaran`)
                ]);
                setKelasOptions(resKelas.data);
                setTahunAjaranOptions(resTA.data);
                
                // Set default filter ke tahun ajaran yang aktif jika ada
                const taAktif = resTA.data.find(ta => ta.status === 'aktif' && ta.semester === '1');
                if (taAktif) {
                    setSelectedTahunAjaranExcel(taAktif.id);
                }
            } catch (err) {
                setError('Gagal memuat data master.');
            }
        };
        fetchData();
    }, []);

    const resetMessages = () => { setError(''); setSuccess(''); };

    // --- FUNGSI UNTUK TAB EXCEL ---
    
    const handleDownloadTemplate = async () => {
        if (!selectedKelasExcel || !selectedTahunAjaranExcel) {
            return setError('Silakan pilih Tahun Ajaran dan Kelas terlebih dahulu.');
        }
        resetMessages(); 
        setLoading(true);
        
        try {
            const base = API_BASE;
            const response = await axios.get(`${base}/excel/download-complete-template`, { 
                params: {
                    kelas_id: selectedKelasExcel,
                    tahun_ajaran_id: selectedTahunAjaranExcel // Mengirim ID yang benar
                }, 
                responseType: 'blob' 
            });
            
            // Logika untuk men-trigger download di browser
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const contentDisposition = response.headers['content-disposition'];
            let fileName = 'template-input-nilai.xlsx';
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
                if (fileNameMatch && fileNameMatch.length === 2) fileName = fileNameMatch[1];
            }
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            setSuccess('Template Excel berhasil diunduh.');
        } catch (err) {
            console.error('Download error:', err);
            setError(err.response?.data?.message || 'Gagal mengunduh template.');
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
            // Langkah 2: Kirim file ke ENDPOINT API BACKEND yang benar
            const base = API_BASE;
            const response = await axios.post(`${base}/draft/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Langkah 3 & 4: Ambil ID dan arahkan ke RUTE FRONTEND
            const { upload_batch_id } = response.data;
            if (upload_batch_id) {
                // Menggunakan URL yang cocok dengan <Route path="/validasi-raport/:batchId" ... />
                navigate(`/validasi-raport/${upload_batch_id}`);
            } else {
                setError('Upload berhasil, tetapi tidak mendapatkan ID batch.');
            }

        } catch (err) {
            setError(err.response?.data?.message || 'Gagal mengunggah file.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4">
            <h2>Input Nilai Siswa</h2>
            <p className="text-muted">Gunakan fitur ini untuk mengunduh template, mengisi nilai, dan mengunggahnya kembali ke sistem.</p>

            {error && <Alert variant="danger" onClose={resetMessages} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={resetMessages} dismissible>{success}</Alert>}

            {/* Cukup satu tab karena template sudah lengkap */}
            <Card className="mb-4">
                <Card.Header as="h5">
                    <Download size={20} className="me-2" />
                    Langkah 1: Unduh Template Excel Lengkap
                </Card.Header>
                <Card.Body>
                    <Row className="align-items-end">
                        <Col md={5}>
                            <Form.Group>
                                <Form.Label>Tahun Ajaran & Semester</Form.Label>
                                <Form.Select 
                                    value={selectedTahunAjaranExcel} 
                                    onChange={(e) => setSelectedTahunAjaranExcel(e.target.value)}
                                >
                                    <option value="">-- Pilih Tahun Ajaran & Semester --</option>
                                    {tahunAjaranOptions.map(ta => 
                                        // Tampilkan teks gabungan, simpan ID sebagai value
                                        <option key={ta.id} value={ta.id}>
                                            {ta.nama_ajaran} - Semester {ta.semester}
                                        </option>
                                    )}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Kelas</Form.Label>
                                <Form.Select 
                                    value={selectedKelasExcel} 
                                    onChange={(e) => setSelectedKelasExcel(e.target.value)}
                                >
                                    <option value="">-- Pilih Kelas --</option>
                                    {kelasOptions.map(opt => 
                                        <option key={opt.id} value={opt.id}>{opt.nama_kelas}</option>
                                    )}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Button 
                                onClick={handleDownloadTemplate} 
                                disabled={loading || !selectedKelasExcel || !selectedTahunAjaranExcel} 
                                className="w-100"
                                variant="primary"
                            >
                                {loading ? <Spinner as="span" size="sm" /> : <>Unduh Template</>}
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
            
            <Card>
                <Card.Header as="h5">
                    <Upload size={20} className="me-2" />
                    Langkah 2: Unggah File yang Sudah Diisi
                </Card.Header>
                <Card.Body>
                    <Form.Group controlId="file-upload-input" className="mb-3">
                        <Form.Label>Pilih file Excel (.xlsx)</Form.Label>
                        <Form.Control 
                            type="file" 
                            onChange={(e) => setFile(e.target.files[0])} 
                            accept=".xlsx"
                        />
                    </Form.Group>
                    <Button 
                        onClick={handleUploadFile} 
                        disabled={loading || !file}
                        variant="success"
                    >
                        {loading ? <Spinner as="span" size="sm" /> : <>Unggah & Proses</>}
                    </Button>
                </Card.Body>
            </Card>
        </div>
    );
};

export default InputNilaiPage;