import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';

const UploadExcelPage = () => {
    const [siswaList, setSiswaList] = useState([]);
    const [selectedSiswa, setSelectedSiswa] = useState('');
    const [semester, setSemester] = useState('1 (Ganjil)');
    const [tahunAjaran, setTahunAjaran] = useState('2024/2025');
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        axios.get('/siswa').then(res => {
            setSiswaList(res.data);
        }).catch(err => {
            setError("Gagal memuat daftar siswa. Pastikan backend berjalan.");
        });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !selectedSiswa) {
            setError('Siswa dan file Excel harus dipilih.');
            return;
        }
        setIsLoading(true);
        setMessage('');
        setError('');
        const formData = new FormData();
        formData.append('fileNilai', file);
        formData.append('siswaId', selectedSiswa);
        formData.append('semester', semester);
        formData.append('tahun_ajaran', tahunAjaran);
        try {
            const res = await axios.post('/excel/upload-nilai', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessage(res.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Terjadi kesalahan saat mengunggah.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <Card.Header as="h4">Upload Nilai Raport via Excel</Card.Header>
            <Card.Body>
                <Alert variant="info">
                    <Alert.Heading>Petunjuk</Alert.Heading>
                    <ol className="list-decimal list-inside mb-0">
                        <li>Unduh template Excel yang telah disediakan.</li>
                        <li>Isi data nilai, sikap, dan kehadiran pada sheet yang sesuai.</li>
                        <li>Pilih siswa, tahun ajaran, dan semester di bawah ini.</li>
                        <li>Unggah file Excel yang sudah diisi.</li>
                    </ol>
                    <hr />
                    <a href="http://localhost:5000/templates/Template_Nilai_Raport.xlsx" download className="btn btn-success btn-sm">
                        Unduh Template Excel
                    </a>
                </Alert>
                <Form onSubmit={handleSubmit} className="mt-4">
                    <Form.Group className="mb-3">
                        <Form.Label>1. Pilih Siswa</Form.Label>
                        <Form.Select value={selectedSiswa} onChange={e => setSelectedSiswa(e.target.value)} required>
                            <option value="">-- Pilih Siswa --</option>
                            {siswaList.map(s => <option key={s.id} value={s.id}>{s.nama} ({s.nis})</option>)}
                        </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>2. Konfirmasi Tahun Ajaran & Semester</Form.Label>
                        <div className="d-flex gap-3">
                            <Form.Control type="text" value={tahunAjaran} onChange={e => setTahunAjaran(e.target.value)} />
                            <Form.Control type="text" value={semester} onChange={e => setSemester(e.target.value)} />
                        </div>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>3. Unggah File Excel</Form.Label>
                        <Form.Control type="file" onChange={(e) => setFile(e.target.files[0])} accept=".xlsx" required />
                    </Form.Group>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? <><Spinner as="span" animation="border" size="sm"/> Mengunggah...</> : 'Unggah dan Proses Nilai'}
                    </Button>
                    {message && <Alert variant="success" className="mt-3">{message}</Alert>}
                    {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
                </Form>
            </Card.Body>
        </Card>
    );
};
export default UploadExcelPage;