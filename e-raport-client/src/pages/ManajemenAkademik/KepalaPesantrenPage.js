// file: src/pages/KepalaPesantrenPage.js
import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Spinner, Alert, Image, Col, Row } from 'react-bootstrap';
import axios from 'axios';
import API_BASE, { UPLOADS_BASE } from '../../api';

const KepalaPesantrenPage = () => {
    const [kepala, setKepala] = useState(null);
    const [formData, setFormData] = useState({ nama: '', nip: '' });
    const [signatureFile, setSignatureFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const API_URL = `${API_BASE}/kepala-pesantren`;

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await axios.get(API_URL);
                if (res.data.length > 0) {
                    setKepala(res.data[0]);
                    setFormData({ nama: res.data[0].nama || '', nip: res.data[0].nip || '' });
                } else {
                    setKepala(null); // Menandakan belum ada data
                }
            } catch (err) {
                setError('Gagal memuat data.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleFileChange = (e) => setSignatureFile(e.target.files[0]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!kepala) {
            alert("Belum ada data Kepala Pesantren untuk di-update. Fitur 'Tambah' perlu dibuat jika diperlukan.");
            return;
        }

        const data = new FormData();
        data.append('nama', formData.nama);
        data.append('nip', formData.nip);
        if (signatureFile) {
            data.append('tanda_tangan', signatureFile);
        }

        try {
            const response = await axios.put(`${API_URL}/${kepala.id}/kepalapesantren`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setKepala(response.data.kepalaPesantren);
            setSuccess(response.data.message);
            setSignatureFile(null); // Reset input file
            document.getElementById('signature-file-input').value = ""; // Clear file input visual
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal menyimpan data.');
        }
    };

    if (loading) {
        return <div className="text-center p-5"><Spinner animation="border" /></div>;
    }

    return (
        <Card className="m-3">
            <Card.Header as="h4">Manajemen Kepala Pesantren</Card.Header>
            <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                {kepala ? (
                    <Form onSubmit={handleSubmit}>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nama</Form.Label>
                                    <Form.Control name="nama" value={formData.nama} onChange={handleChange} required />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>NIP</Form.Label>
                                    <Form.Control name="nip" value={formData.nip} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <hr />
                        <h5>Tanda Tangan Digital</h5>
                        <Row className="align-items-center">
                            <Col md={6} className="text-center">
                                <p className="mb-2">Tanda Tangan Saat Ini:</p>
                                {kepala.tanda_tangan ? (
                                    <Image 
                                        src={`${UPLOADS_BASE}/uploads/signatures/${kepala.tanda_tangan}`}
                                        alt="Tanda Tangan"
                                        thumbnail
                                        style={{ maxWidth: '200px' }}
                                    />
                                ) : <p className="text-muted fst-italic">Belum ada</p>}
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Unggah Tanda Tangan Baru</Form.Label>
                                    <Form.Control 
                                        id="signature-file-input"
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleFileChange} 
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Button variant="primary" type="submit" className="mt-4">
                            Simpan Perubahan
                        </Button>
                    </Form>
                ) : (
                    <Alert variant="info">
                        Data Kepala Pesantren belum ada. Silakan tambahkan melalui database untuk pertama kali.
                    </Alert>
                )}
            </Card.Body>
        </Card>
    );
};
export default KepalaPesantrenPage;