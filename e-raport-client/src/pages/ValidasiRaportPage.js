import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Table, Button, Alert, Spinner, Badge } from 'react-bootstrap';

const ValidasiRaportPage = () => {
    const { batchId } = useParams();
    const navigate = useNavigate();
    const [draftData, setDraftData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        const fetchDraftData = async () => {
            try {
                const response = await axios.get(`http://localhost:5000/api/draft/${batchId}`);
                setDraftData(response.data);
            } catch (err) {
                setError('Gagal memuat data draft.');
            } finally {
                setLoading(false);
            }
        };
        fetchDraftData();
    }, [batchId]);

    const handleConfirm = async () => {
        setConfirming(true);
        setError('');
        try {
            // Panggil API konfirmasi yang sudah dibuat di backend
            await axios.post(`http://localhost:5000/api/draft/confirm/${batchId}`);
            alert('Data berhasil disimpan permanen!');
            navigate('/input-nilai');
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal menyimpan data.');
        } finally {
            setConfirming(false);
        }
    };
    
    // --- FUNGSI YANG DIPERBAIKI ---
    const handlePreview = (item) => {
        const { nis, semester, tahun_ajaran } = item.data;
        if (nis && semester && tahun_ajaran) {
            // Navigasi ke URL lengkap dengan semua parameter
            navigate(`/draft-raport/${nis}/${semester}/${tahun_ajaran}`);
        } else {
            alert('Data tidak lengkap untuk melihat preview (NIS, Semester, atau Tahun Ajaran kosong).');
        }
    };

    if (loading) return <Spinner animation="border" />;

    const hasValidData = draftData.some(item => item.is_valid);

    return (
        <div>
            <h2>Validasi Data Unggahan - <small className="text-muted">{batchId}</small></h2>
            {error && <Alert variant="danger">{error}</Alert>}
            <Table striped bordered hover responsive size="sm">
                <thead>
                    <tr>
                        <th>Baris</th>
                        <th>Status</th>
                        <th>NIS</th>
                        <th>Kode Mapel</th>
                        <th>Nilai P/K</th>
                        <th>Kesalahan</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {draftData.map(item => (
                        <tr key={item.id} className={!item.is_valid ? 'table-danger' : ''}>
                            <td>{item.row_number}</td>
                            <td>
                                {item.is_valid 
                                    ? <Badge bg="success">Valid</Badge> 
                                    : <Badge bg="danger">Error</Badge>
                                }
                            </td>
                            <td>{item.data.nis}</td>
                            <td>{item.data.kode_mapel}</td>
                            <td>{`${item.data.pengetahuan_angka} / ${item.data.keterampilan_angka}`}</td>
                            <td>{item.validation_errors?.join(', ')}</td>
                            <td>
                                <Button size="sm" variant="info" onClick={() => handlePreview(item)} disabled={!item.is_valid}>
                                    Lihat Draft
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
            <Button 
                variant="primary" 
                onClick={handleConfirm}
                disabled={confirming || !hasValidData}
            >
                {confirming ? <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Menyimpan...</> : 'Konfirmasi & Simpan Data Valid'}
            </Button>
        </div>
    );
};

export default ValidasiRaportPage;