import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, Table, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { Eye, Trash2 } from 'lucide-react';

const DraftRaportMainPage = () => {
    const navigate = useNavigate();
    const [draftBatches, setDraftBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDraftBatches();
    }, []);

    const fetchDraftBatches = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/draft/batches');
            setDraftBatches(response.data);
        } catch (err) {
            setError('Gagal memuat data draft batches.');
            console.error('Error fetching draft batches:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleViewBatch = (batchId) => {
        navigate(`/draft-raport/validasi/${batchId}`);
    };

    const handleDeleteBatch = async (batchId) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus batch ini?')) {
            try {
                await axios.delete(`http://localhost:5000/api/draft/batch/${batchId}`);
                fetchDraftBatches(); // Refresh data
            } catch (err) {
                alert('Gagal menghapus batch: ' + err.response?.data?.message);
            }
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (validRows, totalRows) => {
        const percentage = (validRows / totalRows) * 100;
        if (percentage === 100) return <Badge bg="success">Semua Valid</Badge>;
        if (percentage > 50) return <Badge bg="warning">Sebagian Valid</Badge>;
        return <Badge bg="danger">Banyak Error</Badge>;
    };

    if (loading) return <Spinner animation="border" />;

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Draft Raport</h2>
                <Button variant="primary" onClick={() => navigate('/input-nilai')}>
                    + Upload Data Baru
                </Button>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            {draftBatches.length === 0 ? (
                <Card>
                    <Card.Body className="text-center py-5">
                        <h5>Belum ada draft raport</h5>
                        <p className="text-muted">Upload file Excel melalui menu Input Nilai untuk membuat draft raport.</p>
                        <Button variant="primary" onClick={() => navigate('/input-nilai')}>
                            Upload Data Sekarang
                        </Button>
                    </Card.Body>
                </Card>
            ) : (
                <Card>
                    <Card.Header>
                        <Card.Title>Daftar Draft Batch</Card.Title>
                    </Card.Header>
                    <Card.Body>
                        <Table striped bordered hover responsive>
                            <thead>
                                <tr>
                                    <th>Batch ID</th>
                                    <th>Tanggal Upload</th>
                                    <th>Total Baris</th>
                                    <th>Valid</th>
                                    <th>Error</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {draftBatches.map(batch => {
                                    const totalRows = parseInt(batch.total_rows);
                                    const validRows = parseInt(batch.valid_rows);
                                    const errorRows = totalRows - validRows;

                                    return (
                                        <tr key={batch.upload_batch_id}>
                                            <td>
                                                <code>{batch.upload_batch_id.substring(0, 8)}...</code>
                                            </td>
                                            <td>{formatDate(batch.uploaded_at)}</td>
                                            <td>{totalRows}</td>
                                            <td>
                                                <Badge bg="success">{validRows}</Badge>
                                            </td>
                                            <td>
                                                <Badge bg="danger">{errorRows}</Badge>
                                            </td>
                                            <td>{getStatusBadge(validRows, totalRows)}</td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    <Button 
                                                        size="sm" 
                                                        variant="info"
                                                        onClick={() => handleViewBatch(batch.upload_batch_id)}
                                                    >
                                                        <Eye size={14} /> Lihat
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="danger"
                                                        onClick={() => handleDeleteBatch(batch.upload_batch_id)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )}
        </div>
    );
};

export default DraftRaportMainPage;