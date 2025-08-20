import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Tabs, Tab, Card, Form, Button, Row, Col, Spinner, Alert, Table } from 'react-bootstrap';
import fileDownload from 'js-file-download';

const InputNilaiPage = () => {
    // State UI
    const [key, setKey] = useState('excel');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // State Data Master
    const [kelasOptions, setKelasOptions] = useState([]);
    const [tahunAjaranOptions, setTahunAjaranOptions] = useState([]);
    const [mapelOptions, setMapelOptions] = useState([]);

    // State untuk Tab Excel
    const [filtersExcel, setFiltersExcel] = useState({
        kelas_id: '',
        tahun_ajaran: '',
        semester: 'Ganjil'
    });
    const [file, setFile] = useState(null);

    // State untuk Tab Manual
    const [filtersManual, setFiltersManual] = useState({
        kelas_id: '',
        mapel_id: '',
        tahun_ajaran: '',
        semester: 'Ganjil'
    });
    const [siswaUntukNilai, setSiswaUntukNilai] = useState([]);
    const [nilaiManual, setNilaiManual] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resKelas, resTA, resMapel] = await Promise.all([
                    axios.get('http://localhost:5000/api/kelas'),
                    axios.get('http://localhost:5000/api/tahun-ajaran'),
                    axios.get('http://localhost:5000/api/mata-pelajaran')
                ]);
                setKelasOptions(resKelas.data);
                setTahunAjaranOptions(resTA.data);
                
                // ### PERBAIKAN: Hapus filter .jenis ###
                setMapelOptions(resMapel.data); 

                const taAktif = resTA.data.find(ta => ta.status === 'aktif');
                if (taAktif) {
                    const tahunAjaranAktif = taAktif.nama_ajaran;
                    setFiltersExcel(prev => ({ ...prev, tahun_ajaran: tahunAjaranAktif }));
                    setFiltersManual(prev => ({ ...prev, tahun_ajaran: tahunAjaranAktif }));
                }
            } catch (err) {
                setError('Gagal memuat data master.');
            }
        };
        fetchData();
    }, []);

    const resetMessages = () => { setError(''); setSuccess(''); };

    // --- FUNGSI UNTUK TAB EXCEL ---
    const handleFilterChangeExcel = (e) => setFiltersExcel(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleDownloadTemplate = async () => {
        if (!filtersExcel.kelas_id) return setError('Silakan pilih kelas terlebih dahulu.');
        resetMessages(); setLoading(true);
        try {
            const response = await axios.get('http://localhost:5000/api/excel/download-template', { params: filtersExcel, responseType: 'blob' });
            const kelasTerpilih = kelasOptions.find(k => k.id == filtersExcel.kelas_id);
            const namaFile = `Template-Nilai-${kelasTerpilih?.nama_kelas || 'Siswa'}-${filtersExcel.tahun_ajaran.replace('/', '-')}-${filtersExcel.semester}.xlsx`;
            fileDownload(response.data, namaFile);
            setSuccess('Template Excel berhasil diunduh.');
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal mengunduh template.');
        } finally {
            setLoading(false);
        }
    };
    const handleUploadFile = async () => {
        if (!file) return setError('Silakan pilih file untuk diunggah.');
        resetMessages(); setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await axios.post('http://localhost:5000/api/excel/upload-nilai', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setSuccess(response.data.message);
            setFile(null);
            document.getElementById('file-upload-input').value = '';
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal mengunggah file.');
        } finally {
            setLoading(false);
        }
    };

    // --- FUNGSI UNTUK TAB MANUAL ---
    const handleFilterChangeManual = (e) => setFiltersManual(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleMuatSiswa = async () => {
        if (!filtersManual.kelas_id || !filtersManual.mapel_id) return setError('Silakan pilih kelas dan mata pelajaran.');
        resetMessages(); setLoading(true); setSiswaUntukNilai([]); setNilaiManual({});
        try {
            const response = await axios.get('http://localhost:5000/api/nilai/filter', { params: filtersManual });
            setSiswaUntukNilai(response.data);
            const initialNilai = {};
            response.data.forEach(siswa => {
                const nilai = siswa.nilai_ujian[0];
                initialNilai[siswa.id] = {
                    pengetahuan_angka: nilai?.pengetahuan_angka ?? '',
                    keterampilan_angka: nilai?.keterampilan_angka ?? ''
                };
            });
            setNilaiManual(initialNilai);
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal memuat data siswa.');
        } finally {
            setLoading(false);
        }
    };
    const handleNilaiChange = (siswaId, field, value) => {
        setNilaiManual(prev => ({ ...prev, [siswaId]: { ...prev[siswaId], [field]: value === '' ? '' : Number(value) } }));
    };
    const handleSimpanNilaiManual = async () => {
        resetMessages(); setLoading(true);
        const payload = Object.keys(nilaiManual)
            .map(siswaId => ({
                siswa_id: parseInt(siswaId, 10),
                mapel_id: parseInt(filtersManual.mapel_id, 10),
                semester: filtersManual.semester,
                tahun_ajaran: filtersManual.tahun_ajaran,
                pengetahuan_angka: nilaiManual[siswaId].pengetahuan_angka === '' ? null : nilaiManual[siswaId].pengetahuan_angka,
                keterampilan_angka: nilaiManual[siswaId].keterampilan_angka === '' ? null : nilaiManual[siswaId].keterampilan_angka,
            }))
            .filter(item => item.pengetahuan_angka !== null || item.keterampilan_angka !== null);

        if (payload.length === 0) {
            setError("Tidak ada nilai yang diisi untuk disimpan.");
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post('http://localhost:5000/api/nilai/bulk', payload);
            setSuccess(response.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal menyimpan nilai.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4">
            <h2>Input Nilai Siswa</h2>
            {error && <Alert variant="danger" onClose={resetMessages} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={resetMessages} dismissible>{success}</Alert>}

            <Tabs activeKey={key} onSelect={(k) => { setKey(k); resetMessages(); }} className="mb-3">
                <Tab eventKey="excel" title="Input via Excel">
                    <Card className="mb-4">
                        <Card.Header as="h5">1. Unduh Template Excel</Card.Header>
                        <Card.Body>
                            <Row className="align-items-end">
                                <Col md={3}><Form.Group><Form.Label>Tahun Ajaran</Form.Label><Form.Select name="tahun_ajaran" value={filtersExcel.tahun_ajaran} onChange={handleFilterChangeExcel}>
                                    <option value="">Pilih</option>{tahunAjaranOptions.map(ta => <option key={ta.id} value={ta.nama_ajaran}>{ta.nama_ajaran}</option>)}
                                </Form.Select></Form.Group></Col>
                                <Col md={3}><Form.Group><Form.Label>Semester</Form.Label><Form.Select name="semester" value={filtersExcel.semester} onChange={handleFilterChangeExcel}>
                                    <option value="Ganjil">Ganjil</option><option value="Genap">Genap</option>
                                </Form.Select></Form.Group></Col>
                                <Col md={3}><Form.Group><Form.Label>Kelas</Form.Label><Form.Select name="kelas_id" value={filtersExcel.kelas_id} onChange={handleFilterChangeExcel}>
                                    <option value="">Pilih</option>{kelasOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.nama_kelas}</option>)}
                                </Form.Select></Form.Group></Col>
                                <Col md={3}><Button onClick={handleDownloadTemplate} disabled={loading} className="w-100">{loading ? <Spinner as="span" size="sm" /> : 'Unduh Template'}</Button></Col>
                            </Row>
                        </Card.Body>
                    </Card>
                    <Card>
                        <Card.Header as="h5">2. Unggah File yang Sudah Diisi</Card.Header>
                        <Card.Body>
                            <Form.Group controlId="file-upload-input" className="mb-3">
                                <Form.Label>Pilih file Excel</Form.Label>
                                <Form.Control type="file" onChange={(e) => setFile(e.target.files[0])} accept=".xlsx, .xls" />
                            </Form.Group>
                            <Button onClick={handleUploadFile} disabled={loading || !file}>{loading ? <Spinner as="span" size="sm" /> : 'Unggah & Proses'}</Button>
                        </Card.Body>
                    </Card>
                </Tab>

                <Tab eventKey="manual" title="Input Manual">
                    <Card>
                        <Card.Body>
                            <Row className="mb-3 align-items-end">
                                <Col md={3}><Form.Group><Form.Label>Tahun Ajaran</Form.Label><Form.Select name="tahun_ajaran" value={filtersManual.tahun_ajaran} onChange={handleFilterChangeManual}>{tahunAjaranOptions.map(ta => <option key={ta.id} value={ta.nama_ajaran}>{ta.nama_ajaran}</option>)}</Form.Select></Form.Group></Col>
                                <Col md={2}><Form.Group><Form.Label>Semester</Form.Label><Form.Select name="semester" value={filtersManual.semester} onChange={handleFilterChangeManual}><option value="Ganjil">Ganjil</option><option value="Genap">Genap</option></Form.Select></Form.Group></Col>
                                <Col md={3}><Form.Group><Form.Label>Kelas</Form.Label><Form.Select name="kelas_id" value={filtersManual.kelas_id} onChange={handleFilterChangeManual}><option value="">Pilih</option>{kelasOptions.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}</Form.Select></Form.Group></Col>
                                <Col md={2}><Form.Group><Form.Label>Mata Pelajaran</Form.Label><Form.Select name="mapel_id" value={filtersManual.mapel_id} onChange={handleFilterChangeManual}><option value="">Pilih</option>{mapelOptions.map(m => <option key={m.id} value={m.id}>{m.nama_mapel}</option>)}</Form.Select></Form.Group></Col>
                                <Col md={2}><Button onClick={handleMuatSiswa} disabled={!filtersManual.kelas_id || !filtersManual.mapel_id || loading} className="w-100">{loading ? <Spinner as="span" size="sm"/> : 'Muat Siswa'}</Button></Col>
                            </Row>
                            {siswaUntukNilai.length > 0 && (
                                <>
                                    <Table striped bordered hover responsive className="mt-4">
                                        <thead><tr><th>#</th><th>NIS</th><th>Nama Siswa</th><th>Nilai Pengetahuan</th><th>Nilai Keterampilan</th></tr></thead>
                                        <tbody>{siswaUntukNilai.map((siswa, index) => (
                                            <tr key={siswa.id}>
                                                <td>{index + 1}</td><td>{siswa.nis}</td><td>{siswa.nama}</td>
                                                <td><Form.Control type="number" min="0" max="100" value={nilaiManual[siswa.id]?.pengetahuan_angka ?? ''} onChange={(e) => handleNilaiChange(siswa.id, 'pengetahuan_angka', e.target.value)} /></td>
                                                <td><Form.Control type="number" min="0" max="100" value={nilaiManual[siswa.id]?.keterampilan_angka ?? ''} onChange={(e) => handleNilaiChange(siswa.id, 'keterampilan_angka', e.target.value)} /></td>
                                            </tr>
                                        ))}</tbody>
                                    </Table>
                                    <Button onClick={handleSimpanNilaiManual} disabled={loading} variant="success">{loading ? <Spinner as="span" size="sm"/> : 'Simpan Semua Nilai'}</Button>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>
        </div>
    );
};

export default InputNilaiPage;
