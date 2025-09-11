import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE from '../api';
import { Card, Form, Button, Spinner, Alert, ListGroup, Row, Col } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FileText, Trash2, UploadCloud, CheckCircle, XCircle } from 'lucide-react';

const ManajemenTemplatePage = () => {
    // State untuk file yang akan diupload
    const [identitasFile, setIdentitasFile] = useState(null);
    const [nilaiFile, setNilaiFile] = useState(null);
    const [sikapFile, setSikapFile] = useState(null);
    
    // State untuk daftar template yang sudah ada
    const [templateList, setTemplateList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const API_URL = `${API_BASE}/templates`;

    // Ambil daftar template saat halaman dimuat
    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const response = await axios.get(API_URL);
            setTemplateList(response.data);
            setError('');
        } catch (err) {
            setError('Gagal memuat daftar template dari server.');
        } finally {
            setLoading(false);
        }
    };

    // Fungsi untuk menangani perubahan file input
    const handleFileChange = (e, setFile) => {
        const file = e.target.files[0];
        if (file && file.name.endsWith('.docx')) {
            setFile(file);
        } else if (file) {
            toast.error('Hanya file .docx yang diizinkan!');
            e.target.value = null; // Reset input file
        }
    };

    // Fungsi untuk menghandle proses upload
    const handleUpload = async () => {
        if (!identitasFile && !nilaiFile && !sikapFile) {
            toast.warn('Pilih setidaknya satu file template untuk diunggah.');
            return;
        }

        const formData = new FormData();
        if (identitasFile) formData.append('identitas', identitasFile);
        if (nilaiFile) formData.append('nilai', nilaiFile);
        if (sikapFile) formData.append('sikap', sikapFile);

        setUploading(true);
        try {
            await axios.post(`${API_URL}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Template berhasil diunggah!');
            // Reset state file setelah upload
            setIdentitasFile(null);
            setNilaiFile(null);
            setSikapFile(null);
            // Reset input file di DOM
            document.getElementById('formIdentitas').value = null;
            document.getElementById('formNilai').value = null;
            document.getElementById('formSikap').value = null;
            fetchTemplates(); // Muat ulang daftar template
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal mengunggah file.');
        } finally {
            setUploading(false);
        }
    };

    // Fungsi untuk menghapus template
    const handleDelete = async (fileName) => {
        if (window.confirm(`Yakin ingin menghapus template "${fileName}"?`)) {
            try {
                await axios.delete(`${API_URL}/${fileName}`);
                toast.success('Template berhasil dihapus.');
                fetchTemplates();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Gagal menghapus template.');
            }
        }
    };
    
    // Helper untuk mengecek apakah template ada
    const isTemplateUploaded = (name) => templateList.some(t => t.fileName === name);

    return (
        <div>
            <ToastContainer position="top-right" />
            <h2>Manajemen Template Raport</h2>
            <p>Unggah atau perbarui file template .docx yang digunakan untuk generate raport.</p>

            <Row>
                <Col lg={7}>
                    <Card>
                        <Card.Header as="h5">Upload / Ganti Template</Card.Header>
                        <Card.Body>
                            <Form.Group className="mb-3">
                                <Form.Label>Template Identitas Siswa (wajib: identitas.docx)</Form.Label>
                                <Form.Control id="formIdentitas" type="file" accept=".docx" onChange={(e) => handleFileChange(e, setIdentitasFile)} />
                            </Form.Group>
                            
                            <Form.Group className="mb-3">
                                <Form.Label>Template Nilai Akademik (wajib: nilai.docx)</Form.Label>
                                <Form.Control id="formNilai" type="file" accept=".docx" onChange={(e) => handleFileChange(e, setNilaiFile)} />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Template Sikap & Kehadiran (wajib: sikap.docx)</Form.Label>
                                <Form.Control id="formSikap" type="file" accept=".docx" onChange={(e) => handleFileChange(e, setSikapFile)} />
                            </Form.Group>
                            
                            <Button variant="primary" onClick={handleUpload} disabled={uploading}>
                                {uploading ? <><Spinner size="sm" /> Mengunggah...</> : <><UploadCloud size={18} /> Unggah Template Terpilih</>}
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={5}>
                    <Card>
                        <Card.Header as="h5">Status Template di Server</Card.Header>
                        {loading ? <div className="text-center p-3"><Spinner/></div> : 
                            <ListGroup variant="flush">
                                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                                    <span>Template Identitas</span>
                                    {isTemplateUploaded('identitas.docx') ? <CheckCircle className="text-success"/> : <XCircle className="text-danger"/>}
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                                    <span>Template Nilai</span>
                                    {isTemplateUploaded('nilai.docx') ? <CheckCircle className="text-success"/> : <XCircle className="text-danger"/>}
                                </ListGroup.Item>
                                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                                    <span>Template Sikap</span>
                                    {isTemplateUploaded('sikap.docx') ? <CheckCircle className="text-success"/> : <XCircle className="text-danger"/>}
                                </ListGroup.Item>
                            </ListGroup>
                        }
                    </Card>
                    
                    <Card className="mt-3">
                        <Card.Header as="h5">Daftar File Template</Card.Header>
                        <Card.Body>
                        {loading ? <div className="text-center"><Spinner/></div> : error ? <Alert variant="danger">{error}</Alert> :
                            templateList.length > 0 ? (
                                <ListGroup>
                                    {templateList.map(template => (
                                        <ListGroup.Item key={template.fileName} className="d-flex justify-content-between align-items-center">
                                            <span><FileText size={16} className="me-2"/> {template.fileName}</span>
                                            <Button variant="outline-danger" size="sm" onClick={() => handleDelete(template.fileName)}>
                                                <Trash2 size={16}/>
                                            </Button>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            ) : (<p className="text-muted">Belum ada template yang diunggah.</p>)
                        }
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ManajemenTemplatePage;