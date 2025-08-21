import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert, Table } from 'react-bootstrap';
import { Edit, Save, X } from 'lucide-react';

// Komponen untuk mengedit nilai dalam tabel
const EditableRow = ({ item, onSave, onCancel, fields }) => {
    const [editData, setEditData] = useState(item);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <tr>
            {fields.map(field => (
                <td key={field.key}>
                    {field.editable ? (
                        <Form.Control
                            type={field.type || 'text'}
                            name={field.key}
                            value={editData[field.key] || ''}
                            onChange={handleChange}
                        />
                    ) : (
                        // Data 'nama_mapel' sudah disiapkan oleh backend, jadi bisa diakses langsung.
                        <span>{item[field.key]}</span>
                    )}
                </td>
            ))}
            <td>
                <Button variant="success" size="sm" onClick={() => onSave(editData)} className="me-2">
                    <Save size={16} />
                </Button>
                <Button variant="secondary" size="sm" onClick={onCancel}>
                    <X size={16} />
                </Button>
            </td>
        </tr>
    );
};


const ManajemenRaportPage = () => {
    // State untuk filter
    const [tahunAjaranList, setTahunAjaranList] = useState([]);
    const [kelasList, setKelasList] = useState([]);
    const [siswaList, setSiswaList] = useState([]);
    const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('');
    const [selectedKelas, setSelectedKelas] = useState('');
    const [selectedSiswa, setSelectedSiswa] = useState('');

    // State untuk data dan UI
    const [raportData, setRaportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // State untuk mode edit
    const [editingId, setEditingId] = useState(null);
    const [editingType, setEditingType] = useState('');

    // --- PENGAMBILAN DATA UNTUK FILTER ---
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                // Mengambil data tahun ajaran dan kelas secara bersamaan
                const [tahunRes, kelasRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/tahun-ajaran'),
                    axios.get('http://localhost:5000/api/kelas')
                ]);
                setTahunAjaranList(tahunRes.data);
                setKelasList(kelasRes.data);
            } catch (err) {
                setError('Gagal memuat data filter (Tahun Ajaran/Kelas). Pastikan server API berjalan.');
                console.error("Gagal mengambil data filter:", err);
            }
        };
        fetchFilters();
    }, []);

    // Ambil daftar siswa ketika kelas dipilih
    useEffect(() => {
        if (selectedKelas) {
            axios.get(`http://localhost:5000/api/siswa?kelasId=${selectedKelas}`)
                .then(res => setSiswaList(res.data))
                .catch(err => {
                    console.error("Gagal mengambil siswa:", err);
                    setSiswaList([]); // Kosongkan daftar siswa jika gagal
                });
        } else {
            setSiswaList([]);
        }
    }, [selectedKelas]);

    // --- FUNGSI UTAMA ---
    const handleFetchRaport = async () => {
        if (!selectedSiswa || !selectedTahunAjaran) {
            setError('Silakan pilih Tahun Ajaran, Kelas, dan Siswa terlebih dahulu.');
            return;
        }
        setLoading(true);
        setError('');
        setRaportData(null);
        try {
            const parts = selectedTahunAjaran.split('-');
            if (parts.length !== 2) {
                throw new Error("Format tahun ajaran dari dropdown tidak valid.");
            }
            
            const [tahunAjaranLengkap, semester] = parts;
            const [tahunAwal] = tahunAjaranLengkap.split('/');

            if (!tahunAwal || !semester) {
                throw new Error("Gagal mem-parsing tahun awal atau semester.");
            }

            const response = await axios.get(`http://localhost:5000/api/raport/${selectedSiswa}/${tahunAwal}/${semester}`);
            setRaportData(response.data);
        } catch (err) {
            setError('Gagal mengambil data raport. Pastikan siswa memiliki data di periode ini.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    // --- FUNGSI UNTUK MENYIMPAN PERUBAHAN (UPDATE) ---
    const handleSave = async (type, data) => {
        try {
            await axios.put(`http://localhost:5000/api/raport/${type}/${data.id}`, data);
            alert('Data berhasil diperbarui!');
            setEditingId(null);
            setEditingType('');
            handleFetchRaport(); // Refresh data
        } catch (err) {
            alert('Gagal memperbarui data.');
            console.error(err);
        }
    };
    
    const handleSaveKehadiran = async () => {
        if (!raportData || !raportData.kehadiran || !raportData.kehadiran.id) {
            alert('Data kehadiran tidak ditemukan, tidak dapat menyimpan.');
            return;
        }
        try {
            const { id, sakit, izin, alpha } = raportData.kehadiran;
            await axios.put(`http://localhost:5000/api/raport/kehadiran/${id}`, { sakit, izin, alpha });
            alert('Data kehadiran berhasil diperbarui!');
            handleFetchRaport();
        } catch (err) {
            alert('Gagal memperbarui data kehadiran.');
            console.error(err);
        }
    };

    const handleKehadiranChange = (e) => {
        const { name, value } = e.target;
        setRaportData(prev => ({
            ...prev,
            kehadiran: {
                ...prev.kehadiran,
                [name]: parseInt(value) || 0 // Pastikan nilai adalah angka
            }
        }));
    };

    return (
        <Container fluid>
            <h2 className="mb-4">Manajemen Nilai Raport Siswa</h2>

            {/* --- Area Filter --- */}
            <Card className="mb-4">
                <Card.Header>
                    <Card.Title>Pilih Siswa</Card.Title>
                </Card.Header>
                <Card.Body>
                    <Row className="align-items-end">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Tahun Ajaran & Semester</Form.Label>
                                <Form.Select value={selectedTahunAjaran} onChange={e => setSelectedTahunAjaran(e.target.value)}>
                                    <option value="">Pilih Tahun Ajaran</option>
                                    {/* ======================================================================== */}
                                    {/* PERBAIKAN: Menggunakan `ta.tahunAjaran` (camelCase) */}
                                    {/* ======================================================================== */}
                                    {tahunAjaranList.map(ta => (
                                        <option key={ta.id} value={`${ta.tahunAjaran}-${ta.semester}`}>
                                            {ta.tahunAjaran} - Semester {ta.semester}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Kelas</Form.Label>
                                <Form.Select value={selectedKelas} onChange={e => setSelectedKelas(e.target.value)}>
                                    <option value="">Pilih Kelas</option>
                                    {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Siswa</Form.Label>
                                <Form.Select value={selectedSiswa} onChange={e => setSelectedSiswa(e.target.value)} disabled={!selectedKelas}>
                                    <option value="">Pilih Siswa</option>
                                    {siswaList.map(s => <option key={s.id} value={s.id}>{s.nama_lengkap}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Button onClick={handleFetchRaport} className="w-100">
                                Tampilkan Data
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {loading && <div className="text-center"><Spinner animation="border" /></div>}
            {error && <Alert variant="danger">{error}</Alert>}

            {/* --- Area Tampilan Data Raport --- */}
            {raportData && (
                <Row>
                    {/* --- Kolom Kiri: Nilai Ujian & Hafalan --- */}
                    <Col lg={8}>
                        {/* Nilai Ujian */}
                        <Card className="mb-4">
                            <Card.Header><Card.Title>Nilai Ujian</Card.Title></Card.Header>
                            <Card.Body>
                                <Table striped bordered hover responsive>
                                    <thead>
                                        <tr>
                                            <th>Mata Pelajaran</th>
                                            <th>Pengetahuan</th>
                                            <th>Keterampilan</th>
                                            <th>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {raportData.nilaiUjian.map(item =>
                                            editingId === item.id && editingType === 'ujian' ? (
                                                <EditableRow
                                                    key={item.id}
                                                    item={item}
                                                    onSave={(data) => handleSave('nilai-ujian', data)}
                                                    onCancel={() => setEditingId(null)}
                                                    fields={[
                                                        { key: 'nama_mapel', editable: false },
                                                        { key: 'pengetahuan_angka', editable: true, type: 'number' },
                                                        { key: 'keterampilan_angka', editable: true, type: 'number' },
                                                    ]}
                                                />
                                            ) : (
                                                <tr key={item.id}>
                                                    <td>{item.nama_mapel}</td>
                                                    <td>{item.pengetahuan_angka}</td>
                                                    <td>{item.keterampilan_angka}</td>
                                                    <td>
                                                        <Button variant="outline-primary" size="sm" onClick={() => { setEditingId(item.id); setEditingType('ujian'); }}>
                                                            <Edit size={16} />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>

                        {/* Nilai Hafalan */}
                        <Card>
                            <Card.Header><Card.Title>Nilai Hafalan</Card.Title></Card.Header>
                            <Card.Body>
                                <Table striped bordered hover responsive>
                                     <thead>
                                        <tr>
                                            <th>Kategori Hafalan</th>
                                            <th>Nilai</th>
                                            <th>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {raportData.nilaiHafalan.map(item => 
                                            editingId === item.id && editingType === 'hafalan' ? (
                                                <EditableRow
                                                    key={item.id}
                                                    item={item}
                                                    onSave={(data) => handleSave('nilai-hafalan', data)}
                                                    onCancel={() => setEditingId(null)}
                                                    fields={[
                                                        { key: 'kategori', editable: false },
                                                        { key: 'nilai', editable: true, type: 'number' },
                                                    ]}
                                                />
                                            ) : (
                                                <tr key={item.id}>
                                                    <td>{item.kategori}</td>
                                                    <td>{item.nilai}</td>
                                                    <td>
                                                        <Button variant="outline-primary" size="sm" onClick={() => { setEditingId(item.id); setEditingType('hafalan'); }}>
                                                            <Edit size={16} />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* --- Kolom Kanan: Kehadiran & Sikap --- */}
                    <Col lg={4}>
                        <Card className="mb-4">
                            <Card.Header><Card.Title>Kehadiran</Card.Title></Card.Header>
                            <Card.Body>
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm="4">Sakit</Form.Label>
                                    <Col sm="8">
                                        <Form.Control type="number" name="sakit" value={raportData.kehadiran?.sakit || 0} onChange={handleKehadiranChange} />
                                    </Col>
                                </Form.Group>
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm="4">Izin</Form.Label>
                                    <Col sm="8">
                                        <Form.Control type="number" name="izin" value={raportData.kehadiran?.izin || 0} onChange={handleKehadiranChange} />
                                    </Col>
                                </Form.Group>
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm="4">Alpha</Form.Label>
                                    <Col sm="8">
                                        <Form.Control type="number" name="alpha" value={raportData.kehadiran?.alpha || 0} onChange={handleKehadiranChange} />
                                    </Col>
                                </Form.Group>
                                <Button className="w-100" onClick={handleSaveKehadiran} disabled={!raportData.kehadiran}>
                                    Simpan Perubahan Kehadiran
                                </Button>
                            </Card.Body>
                        </Card>
                        
                        <Card>
                            <Card.Header><Card.Title>Sikap & Catatan</Card.Title></Card.Header>
                            <Card.Body>
                                {/* Logika untuk CRUD Sikap bisa ditambahkan di sini */}
                                <p>Fitur untuk mengedit sikap dan catatan wali kelas akan ditambahkan di sini.</p>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}
        </Container>
    );
};

export default ManajemenRaportPage;
