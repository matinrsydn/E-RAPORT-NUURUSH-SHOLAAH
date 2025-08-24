// e-raport-client/src/pages/ValidasiRaportPage.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Table, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
        const toastId = toast.loading("Menyimpan data ke server...");

        try {
            // 🔥 PERBAIKAN: Kirim data dengan format yang benar
            const validDataToSend = draftData
                .filter(item => item.is_valid)
                .map(item => {
                    // Ambil semester dan tahun ajaran dari data
                    let semester = null;
                    let tahun_ajaran = null;
                    
                    if (item.data.nilai_ujian && item.data.nilai_ujian.length > 0) {
                        semester = item.data.nilai_ujian[0].semester;
                        tahun_ajaran = item.data.nilai_ujian[0].tahun_ajaran;
                    } else if (item.data.nilai_hafalan && item.data.nilai_hafalan.length > 0) {
                        semester = item.data.nilai_hafalan[0].semester;
                        tahun_ajaran = item.data.nilai_hafalan[0].tahun_ajaran;
                    } else if (item.data.semester) {
                        semester = item.data.semester;
                        tahun_ajaran = item.data.tahun_ajaran;
                    }
                    
                    return {
                        nis: item.data.nis,
                        semester: semester,
                        tahun_ajaran: tahun_ajaran,
                        nilaiUjian: item.data.nilai_ujian || [],
                        nilaiHafalan: item.data.nilai_hafalan || [],
                        kehadiran: {
                            sakit: item.data.sakit || 0,
                            izin: item.data.izin || 0,
                            alpha: item.data.alpha || 0,
                            kegiatan: item.data.kehadiran?.kegiatan || null // 🔥 TAMBAHAN
                        },
                        catatan_sikap: item.data.catatan_sikap || null
                    };
                });

            console.log('📤 Data yang dikirim ke backend:', JSON.stringify(validDataToSend, null, 2));

            const response = await axios.post(`http://localhost:5000/api/raports/save-validated`, {
                validatedData: validDataToSend
            });
            
            toast.update(toastId, {
                render: response.data.message,
                type: 'success',
                isLoading: false,
                autoClose: 5000,
            });

            setTimeout(() => {
                navigate('/input-nilai');
            }, 5000);

        } catch (err) {
            const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Gagal menyimpan data.';
            
            toast.update(toastId, {
                render: `Error: ${errorMessage}`,
                type: 'error',
                isLoading: false,
                autoClose: 8000,
            });

            setError(errorMessage);
        } finally {
            setConfirming(false);
        }
    };
    
    const handlePreview = (item) => {
        const { nis, semester, tahun_ajaran } = item.data;
        if (nis && semester && tahun_ajaran) {
            navigate(`/draft-raport/${nis}/${semester}/${tahun_ajaran}`);
        } else {
            alert('Data tidak lengkap untuk melihat preview (NIS, Semester, atau Tahun Ajaran kosong).');
        }
    };

    if (loading) return <Spinner animation="border" />;

    const hasValidData = draftData.some(item => item.is_valid);

    return (
        <div>
            <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
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
                            <td>{item.data.nilai_ujian?.map(n => n.kode_mapel).join(', ')}</td>
                            <td>{item.data.nilai_ujian?.map(n => `${n.pengetahuan_angka}/${n.keterampilan_angka}`).join('; ')}</td>
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