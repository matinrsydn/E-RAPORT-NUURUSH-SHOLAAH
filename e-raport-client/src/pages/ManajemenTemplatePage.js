import React, { useState } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';

const ManajemenTemplatePage = () => {
    const [identitasFile, setIdentitasFile] = useState(null);
    const [nilaiFile, setNilaiFile] = useState(null);
    const [sikapFile, setSikapFile] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        const formData = new FormData();
        if (identitasFile) formData.append('identitas', identitasFile);
        if (nilaiFile) formData.append('nilai', nilaiFile);
        if (sikapFile) formData.append('sikap', sikapFile);

        if (formData.entries().next().done) {
            setError('Pilih setidaknya satu file template untuk diunggah.');
            return;
        }

        try {
            const res = await axios.post('/template/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessage(res.data.message);
        } catch (err) {
            setError('Gagal mengunggah template.');
        }
    };

    return (
        <Card>
            <Card.Header as="h4">Manajemen Template Raport (.docx)</Card.Header>
            <Card.Body>
                <Form onSubmit={handleSubmit} className="space-y-4">
                    <Form.Group>
                        <Form.Label>Template Identitas Siswa</Form.Label>
                        <Form.Control type="file" onChange={(e) => setIdentitasFile(e.target.files[0])} accept=".docx" />
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Template Nilai Raport</Form.Label>
                        <Form.Control type="file" onChange={(e) => setNilaiFile(e.target.files[0])} accept=".docx" />
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Template Nilai Sikap</Form.Label>
                        <Form.Control type="file" onChange={(e) => setSikapFile(e.target.files[0])} accept=".docx" />
                    </Form.Group>
                    <Button type="submit" className="mt-3">
                        Unggah Template
                    </Button>
                    {message && <Alert variant="success" className="mt-3">{message}</Alert>}
                    {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
                </Form>
            </Card.Body>
        </Card>
    );
};
export default ManajemenTemplatePage;