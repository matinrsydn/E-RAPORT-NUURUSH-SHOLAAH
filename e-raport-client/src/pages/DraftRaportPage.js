import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, Table, Spinner, Alert, Button } from 'react-bootstrap';

const DraftRaportPage = () => {
    // Ambil semua parameter dari URL sesuai definisi di App.js
    const { nis, semester, tahun_ajaran } = useParams(); 
    const navigate = useNavigate();
    const [raportData, setRaportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!nis || !semester || !tahun_ajaran) return;

        const fetchPreview = async () => {
            try {
                const response = await axios.get(`http://localhost:5000/api/draft/preview/${nis}/${semester}/${tahun_ajaran}`);
                setRaportData(response.data);
            } catch (err) {
                console.error("Error fetching preview:", err);
                setError(err.response?.data?.message || 'Gagal memuat data preview raport.');
            } finally {
                setLoading(false);
            }
        };
        
        fetchPreview();
    }, [nis, semester, tahun_ajaran]);

    if (loading) return <Spinner animation="border" />;
    if (error) return <Alert variant="danger">{error}</Alert>;
    if (!raportData || !raportData.siswa) return <p>Data raport untuk siswa ini tidak ditemukan.</p>;

    const { siswa, nilaiUjian, kehadiran } = raportData;

    return (
        <>
            {/* Tombol untuk kembali ke halaman sebelumnya (halaman validasi) */}
            <Button variant="secondary" onClick={() => navigate(-1)} className="mb-3">
                &larr; Kembali ke Halaman Validasi
            </Button>
            <Card>
                <Card.Header>
                    <Card.Title>Draft Raport - {siswa.nama}</Card.Title>
                    <Card.Subtitle className="text-muted">
                        {siswa.kelas?.nama_kelas} - Semester {semester} T.A. {tahun_ajaran}
                    </Card.Subtitle>
                </Card.Header>
                <Card.Body>
                    <p><strong>NIS:</strong> {siswa.nis}</p>
                    <p><strong>Wali Kelas:</strong> {siswa.wali_kelas?.nama || 'N/A'}</p>
                    
                    <h5 className="mt-4">A. Nilai Akademik</h5>
                    <Table striped bordered responsive>
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Mata Pelajaran</th>
                                <th>Pengetahuan</th>
                                <th>Keterampilan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Perbaiki pemetaan data dari nilaiUjian */}
                            {nilaiUjian && nilaiUjian.length > 0 ? (
                                nilaiUjian.map((n, index) => (
                                    <tr key={n.id}>
                                        <td>{index + 1}</td>
                                        <td>{n.mapel.nama_mapel}</td>
                                        <td>{n.pengetahuan_angka}</td>
                                        <td>{n.keterampilan_angka}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="text-center">Belum ada data nilai.</td>
                                </tr>
                            )}
                        </tbody>
                    </Table>

                    <h5 className="mt-4">B. Kehadiran</h5>
                    <Table striped bordered style={{ maxWidth: '300px' }}>
                         <tbody>
                            <tr>
                                <td>Sakit</td>
                                <td>: {kehadiran?.sakit ?? 0} hari</td>
                            </tr>
                            <tr>
                                <td>Izin</td>
                                <td>: {kehadiran?.izin ?? 0} hari</td>
                            </tr>
                            <tr>
                                <td>Tanpa Keterangan</td>
                                <td>: {kehadiran?.alpha ?? 0} hari</td>
                            </tr>
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </>
    );
};

export default DraftRaportPage;