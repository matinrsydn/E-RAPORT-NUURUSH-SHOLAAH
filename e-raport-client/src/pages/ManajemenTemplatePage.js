import React, { useState } from 'react';
import axios from 'axios';
import { Button, Form, Card, Alert } from 'react-bootstrap';

const ManajemenTemplatePage = () => {
    const [identitasFile, setIdentitasFile] = useState(null);
    const [nilaiFile, setNilaiFile] = useState(null);
    const [sikapFile, setSikapFile] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleFileChange = (e, setFile) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        setMessage('');
        setError('');

        if (!identitasFile && !nilaiFile && !sikapFile) {
            setError('Silakan pilih setidaknya satu file untuk diunggah.');
            return;
        }

        const formData = new FormData();
        if (identitasFile) formData.append('identitas', identitasFile);
        if (nilaiFile) formData.append('nilai', nilaiFile);
        if (sikapFile) formData.append('sikap', sikapFile);

        try {
            // PERBAIKAN: URL diubah dari '/api/template' menjadi '/api/templates'
            const res = await axios.post('http://localhost:5000/api/templates/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setMessage(res.data.message);
        } catch (err) {
            setError('Gagal mengunggah file. ' + (err.response?.data?.message || err.message));
        }
    };

    return (
        <div className="container mt-4">
            <h2>Manajemen Template Raport</h2>
            <p>Unggah file template raport dalam format .docx. Pastikan placeholder di dalam template sesuai dengan dokumentasi.</p>
            
            {message && <Alert variant="success">{message}</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}

            <Card>
                <Card.Header>Unggah Template</Card.Header>
                <Card.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Template Identitas Siswa (identitas.docx)</Form.Label>
                            <Form.Control type="file" onChange={(e) => handleFileChange(e, setIdentitasFile)} accept=".docx" />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Template Nilai (nilai.docx)</Form.Label>
                            <Form.Control type="file" onChange={(e) => handleFileChange(e, setNilaiFile)} accept=".docx" />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Template Sikap (sikap.docx)</Form.Label>
                            <Form.Control type="file" onChange={(e) => handleFileChange(e, setSikapFile)} accept=".docx" />
                        </Form.Group>

                        <Button variant="primary" onClick={handleUpload}>
                            <i className="bi bi-upload"></i> Unggah Template
                        </Button>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
};

export default ManajemenTemplatePage;
