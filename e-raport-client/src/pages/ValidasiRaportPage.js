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
        const toastId = toast.loading("Menyimpan data ke server..."); // Tampilkan notifikasi loading

        try {
            // 2. Filter untuk hanya mengirim data yang valid
            const validDataToSend = draftData
                .filter(item => item.is_valid)
                .map(item => item.processed_data); // Kirim 'processed_data'

            // 3. Panggil API endpoint yang baru di raportController
            const response = await axios.post(`http://localhost:5000/api/raports/save-validated`, {
                validatedData: validDataToSend // Kirim data dalam format yang diharapkan backend
            });
            
            // 4. Tampilkan notifikasi sukses yang jelas
            toast.update(toastId, {
                render: response.data.message,
                type: 'success',
                isLoading: false,
                autoClose: 5000,
            });

            // Beri jeda sejenak agar user bisa membaca notifikasi sebelum pindah halaman
            setTimeout(() => {
                navigate('/input-nilai');
            }, 5000);

        } catch (err) {
            // 5. Tampilkan pesan error dari backend untuk debugging
            const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Gagal menyimpan data.';
            
            toast.update(toastId, {
                render: `Error: ${errorMessage}`,
                type: 'error',
                isLoading: false,
                autoClose: 8000, // Tampilkan lebih lama
            });

            // Simpan juga error di state untuk ditampilkan di komponen Alert jika perlu
            setError(errorMessage);
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