import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';

const GenerateRaportPage = () => {
    const [siswaList, setSiswaList] = useState([]);
    const [selectedSiswa, setSelectedSiswa] = useState('');
    const [semester, setSemester] = useState('1 (Ganjil)');
    const [tahunAjaran, setTahunAjaran] = useState('2024/2025');
    const [error, setError] = useState('');

    useEffect(() => {
        axios.get('/siswa').then(res => setSiswaList(res.data));
    }, []);

    const handleGenerate = () => {
        if (!selectedSiswa) {
            alert('Silakan pilih siswa terlebih dahulu.');
            return;
        }
        
        axios({
            url: `http://localhost:5000/api/template/generate/${selectedSiswa}/${encodeURIComponent(semester)}/${encodeURIComponent(tahunAjaran)}`,
            method: 'GET',
            responseType: 'blob',
        }).then((response) => {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            const siswa = siswaList.find(s => s.id === parseInt(selectedSiswa));
            link.href = url;
            link.setAttribute('download', `Raport_${siswa.nama}.docx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        }).catch(err => {
            setError('Gagal membuat raport. Pastikan data nilai siswa untuk semester ini sudah diisi.');
        });
    };

    return (
        <Card>
            <Card.Header as="h4">Cetak Raport Siswa</Card.Header>
            <Card.Body>
                <Form.Group className="mb-3">
                    <Form.Label>Pilih Siswa</Form.Label>
                    <Form.Select value={selectedSiswa} onChange={e => setSelectedSiswa(e.target.value)}>
                        <option value="">-- Pilih Siswa --</option>
                        {siswaList.map(s => <option key={s.id} value={s.id}>{s.nama} ({s.nis})</option>)}
                    </Form.Select>
                </Form.Group>
                 <Form.Group className="mb-3">
                    <Form.Label>Tahun Ajaran</Form.Label>
                    <Form.Control type="text" value={tahunAjaran} onChange={e => setTahunAjaran(e.target.value)} />
                </Form.Group>
                 <Form.Group className="mb-3">
                    <Form.Label>Semester</Form.Label>
                    <Form.Control type="text" value={semester} onChange={e => setSemester(e.target.value)} />
                </Form.Group>
                <Button onClick={handleGenerate} variant="success">
                    Unduh Raport Final
                </Button>
                {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
            </Card.Body>
        </Card>
    );
};
export default GenerateRaportPage;