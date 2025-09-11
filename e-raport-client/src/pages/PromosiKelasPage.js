// src/pages/PromosiKelasPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE from '../api';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert, Table } from 'react-bootstrap';
import { ArrowRight, CheckSquare, Square } from 'lucide-react';

const PromosiKelasPage = () => {
    const [kelasList, setKelasList] = useState([]);
    const [siswaDiKelas, setSiswaDiKelas] = useState([]);
    const [selectedSiswaIds, setSelectedSiswaIds] = useState(new Set());

    const [dariKelasId, setDariKelasId] = useState('');
    const [keKelasId, setKeKelasId] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        axios.get(`${API_BASE}/kelas`)
            .then(res => setKelasList(res.data))
            .catch(err => setError('Gagal memuat daftar kelas.'));
    }, []);

    useEffect(() => {
        const fetchSiswa = async () => {
            if (!dariKelasId) {
                setSiswaDiKelas([]);
                return;
            }
            setLoading(true);
            setError('');
            try {
                const response = await axios.get(`${API_BASE}/kelas/${dariKelasId}`);
                setSiswaDiKelas(response.data.siswa || []);
                // Secara default, pilih semua siswa untuk dipromosikan
                const allSiswaIds = new Set((response.data.siswa || []).map(s => s.id));
                setSelectedSiswaIds(allSiswaIds);
            } catch (err) {
                setError('Gagal memuat daftar siswa.');
            } finally {
                setLoading(false);
            }
        };
        fetchSiswa();
    }, [dariKelasId]);

    const handleSiswaCheck = (siswaId) => {
        const newSelection = new Set(selectedSiswaIds);
        if (newSelection.has(siswaId)) {
            newSelection.delete(siswaId);
        } else {
            newSelection.add(siswaId);
        }
        setSelectedSiswaIds(newSelection);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allSiswaIds = new Set(siswaDiKelas.map(s => s.id));
            setSelectedSiswaIds(allSiswaIds);
        } else {
            setSelectedSiswaIds(new Set());
        }
    };
    
    const handlePromosi = async () => {
        setError('');
        setSuccess('');
        if (!dariKelasId || !keKelasId || selectedSiswaIds.size === 0) {
            setError('Pilih kelas asal, kelas tujuan, dan minimal satu siswa.');
            return;
        }
        if (dariKelasId === keKelasId) {
            setError('Kelas asal dan kelas tujuan tidak boleh sama.');
            return;
        }

        if(window.confirm(`Anda yakin ingin memindahkan ${selectedSiswaIds.size} siswa ke kelas tujuan?`)){
            setLoading(true);
            try {
                const response = await axios.post(`${API_BASE}/kelas/promosikan`, {
                    dari_kelas_id: dariKelasId,
                    ke_kelas_id: keKelasId,
                    siswa_ids: Array.from(selectedSiswaIds)
                });
                setSuccess(response.data.message);
                // Reset setelah berhasil
                setSiswaDiKelas([]);
                setDariKelasId('');
            } catch (err) {
                setError(err.response?.data?.message || 'Gagal melakukan promosi.');
            } finally {
                setLoading(false);
            }
        }
    };
    
    const isAllSelected = siswaDiKelas.length > 0 && selectedSiswaIds.size === siswaDiKelas.length;

    return (
        <Container fluid>
            <h2 className="mb-4">Promosi Kenaikan Kelas</h2>
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <Card className="mb-4">
                <Card.Header><Card.Title>1. Pilih Kelas</Card.Title></Card.Header>
                <Card.Body>
                    <Row className="align-items-center">
                        <Col md={5}>
                            <Form.Group>
                                <Form.Label><strong>Promosikan Dari Kelas</strong></Form.Label>
                                <Form.Select value={dariKelasId} onChange={e => setDariKelasId(e.target.value)}>
                                    <option value="">-- Pilih Kelas Asal --</option>
                                    {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={2} className="text-center d-none d-md-block">
                            <ArrowRight size={32} className="text-primary" />
                        </Col>
                        <Col md={5}>
                            <Form.Group>
                                <Form.Label><strong>Ke Kelas</strong></Form.Label>
                                <Form.Select value={keKelasId} onChange={e => setKeKelasId(e.target.value)}>
                                    <option value="">-- Pilih Kelas Tujuan --</option>
                                    {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {loading && <div className="text-center"><Spinner /></div>}
            
            {siswaDiKelas.length > 0 && (
                <Card>
                    <Card.Header><Card.Title>2. Pilih Siswa yang Akan Dipromosikan</Card.Title></Card.Header>
                    <Card.Body>
                        <Table striped bordered hover responsive>
                            <thead>
                                <tr>
                                    <th>
                                        <Form.Check 
                                            type="checkbox"
                                            label="Pilih Semua"
                                            checked={isAllSelected}
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                    <th>NIS</th>
                                    <th>Nama Siswa</th>
                                </tr>
                            </thead>
                            <tbody>
                                {siswaDiKelas.map(siswa => (
                                    <tr key={siswa.id}>
                                        <td>
                                            <Form.Check 
                                                type="checkbox"
                                                checked={selectedSiswaIds.has(siswa.id)}
                                                onChange={() => handleSiswaCheck(siswa.id)}
                                            />
                                        </td>
                                        <td>{siswa.nis}</td>
                                        <td>{siswa.nama}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                         <Button variant="primary" onClick={handlePromosi} disabled={loading}>
                            {loading ? 'Memproses...' : `Lakukan Promosi untuk ${selectedSiswaIds.size} Siswa`}
                        </Button>
                    </Card.Body>
                </Card>
            )}
        </Container>
    );
};

export default PromosiKelasPage;