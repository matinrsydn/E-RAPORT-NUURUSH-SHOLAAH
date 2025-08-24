import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert, Table } from 'react-bootstrap';
import { Edit, Save, X, Eye, FileText } from 'lucide-react';

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
    const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('');
    const [selectedKelas, setSelectedKelas] = useState('');

    // State untuk data kelas dan siswa
    const [kelasData, setKelasData] = useState(null);
    const [siswaList, setSiswaList] = useState([]);
    const [selectedSiswaForDetail, setSelectedSiswaForDetail] = useState(null);
    const [raportData, setRaportData] = useState(null);

    // State untuk UI
    const [loading, setLoading] = useState(false);
    const [loadingRaport, setLoadingRaport] = useState(false);
    const [error, setError] = useState('');
    
    // State untuk mode edit
    const [editingId, setEditingId] = useState(null);
    const [editingType, setEditingType] = useState('');

    // --- PENGAMBILAN DATA UNTUK FILTER ---
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const [tahunRes, kelasRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/tahun-ajaran'),
                    axios.get('http://localhost:5000/api/kelas')
                ]);
                
                console.log("DATA TAHUN AJARAN DARI API:", tahunRes.data);
                console.log("DATA KELAS DARI API:", kelasRes.data);
                
                setTahunAjaranList(tahunRes.data);
                setKelasList(kelasRes.data);
            } catch (err) {
                setError('Gagal memuat data filter. Pastikan server API berjalan.');
                console.error("Gagal mengambil data filter:", err);
            }
        };
        fetchFilters();
    }, []);

    // Ambil data siswa per kelas ketika kelas dipilih
    const handleShowKelasData = async () => {
        if (!selectedTahunAjaran || !selectedKelas) {
            setError('Silakan pilih Tahun Ajaran dan Kelas terlebih dahulu.');
            return;
        }

        setLoading(true);
        setError('');
        setSiswaList([]);
        setKelasData(null);
        
        try {
            // Ambil data kelas beserta siswa-siswanya
            const kelasResponse = await axios.get(`http://localhost:5000/api/kelas/${selectedKelas}`);
            const siswaResponse = await axios.get(`http://localhost:5000/api/siswa?kelasId=${selectedKelas}`);
            
            setKelasData(kelasResponse.data);
            setSiswaList(siswaResponse.data);
            
        } catch (err) {
            setError('Gagal mengambil data kelas dan siswa.');
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Fungsi untuk melihat detail raport siswa
    const handleViewRaportDetail = async (siswa) => {
        if (!selectedTahunAjaran) {
            setError('Data tahun ajaran tidak valid.');
            return;
        }

        setLoadingRaport(true);
        setError('');
        setRaportData(null);
        setSelectedSiswaForDetail(siswa);

        try {
            // Parse tahun ajaran dari dropdown
            const selectedTahunAjaranData = tahunAjaranList.find(ta => ta.id === selectedTahunAjaran);
            if (!selectedTahunAjaranData) {
                throw new Error("Data tahun ajaran tidak ditemukan.");
            }

            const tahunAwal = selectedTahunAjaranData.nama_ajaran.split('/')[0];
            const semester = selectedTahunAjaranData.semester;

            const response = await axios.get(`http://localhost:5000/api/raports/${siswa.id}/${tahunAwal}/${semester}`);
            setRaportData(response.data);
            
        } catch (err) {
            setError(`Gagal mengambil data raport untuk ${siswa.nama}: ${err.message}`);
            console.error("Error detail:", err);
        } finally {
            setLoadingRaport(false);
        }
    };
    
    // --- FUNGSI UNTUK MENYIMPAN PERUBAHAN (UPDATE) ---
    const handleSave = async (type, data) => {
        try {
            await axios.put(`http://localhost:5000/api/raports/${type}/${data.id}`, data);
            alert('Data berhasil diperbarui!');
            setEditingId(null);
            setEditingType('');
            
            if (selectedSiswaForDetail) {
                await handleViewRaportDetail(selectedSiswaForDetail);
            }
        } catch (err) {
            alert('Gagal memperbarui data.');
        }
    };
    
    const handleSaveKehadiran = async () => {
        if (!raportData || !raportData.kehadiran || !raportData.kehadiran.id) {
            alert('Data kehadiran tidak ditemukan.');
            return;
        }
        try {
            const { id, sakit, izin, alpha } = raportData.kehadiran;
            await axios.put(`http://localhost:5000/api/raports/kehadiran/${id}`, { sakit, izin, alpha });
            alert('Data kehadiran berhasil diperbarui!');
            
            // Refresh data
            if (selectedSiswaForDetail) {
                await handleViewRaportDetail(selectedSiswaForDetail);
            }
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
                [name]: parseInt(value) || 0
            }
        }));
    };

    const groupedSikap = useMemo(() => {
        if (!raportData || !raportData.sikap) return {};
        
        return raportData.sikap.reduce((acc, sikap) => {
            // Hanya proses item yang memiliki `jenis_sikap` yang valid (bukan null atau undefined)
            if (!sikap.jenis_sikap) {
                return acc; // Lewati item ini
            }

            const { jenis_sikap, indikator, angka, deskripsi } = sikap;
            
            // Buat grup jika belum ada
            if (!acc[jenis_sikap]) {
                acc[jenis_sikap] = {
                    indicators: [],
                    deskripsi: 'Tidak ada catatan' // Default deskripsi
                };
            }
            
            // Tambahkan indikator jika ada
            if (indikator) {
                acc[jenis_sikap].indicators.push({ indikator, angka });
            }

            // Selalu perbarui deskripsi dengan yang terbaru ditemukan untuk grup tersebut
            if (deskripsi) {
                acc[jenis_sikap].deskripsi = deskripsi;
            }
            
            return acc;
        }, {});
    }, [raportData]);

    return (
        <Container fluid>
            <h2 className="mb-4">Manajemen Nilai Raport Siswa</h2>

            {/* --- Area Filter --- */}
            <Card className="mb-4">
                <Card.Header>
                    <Card.Title>Pilih Kelas</Card.Title>
                </Card.Header>
                <Card.Body>
                    <Row className="align-items-end">
                        <Col md={5}>
                            <Form.Group>
                                <Form.Label>Tahun Ajaran & Semester</Form.Label>
                                <Form.Select value={selectedTahunAjaran} onChange={e => setSelectedTahunAjaran(e.target.value)}>
                                    <option value="">Pilih Tahun Ajaran</option>
                                    {tahunAjaranList.map(ta => (
                                        <option key={ta.id} value={ta.id}>
                                            {ta.display || `${ta.nama_ajaran} - Semester ${ta.semester}`}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Kelas</Form.Label>
                                <Form.Select value={selectedKelas} onChange={e => setSelectedKelas(e.target.value)}>
                                    <option value="">Pilih Kelas</option>
                                    {kelasList.map(k => (
                                        <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Button onClick={handleShowKelasData} className="w-100" disabled={!selectedTahunAjaran || !selectedKelas}>
                                Tampilkan Data Kelas
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {loading && <div className="text-center mb-4"><Spinner animation="border" /> Loading...</div>}
            {error && <Alert variant="danger">{error}</Alert>}

            {/* --- Tabel Daftar Siswa Per Kelas --- */}
            {kelasData && siswaList.length > 0 && (
                <Card className="mb-4">
                    <Card.Header>
                        <Card.Title>Daftar Siswa - {kelasData.nama_kelas}</Card.Title>
                        <small className="text-muted">
                            Wali Kelas: {kelasData.walikelas?.nama || 'Belum ditentukan'} | 
                            Total Siswa: {siswaList.length}
                        </small>
                    </Card.Header>
                    <Card.Body>
                        <Table striped bordered hover responsive>
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>NIS</th>
                                    <th>Nama Lengkap</th>
                                    <th>Jenis Kelamin</th>
                                    <th>Kamar</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {siswaList.map((siswa, index) => (
                                    <tr key={siswa.id}>
                                        <td>{index + 1}</td>
                                        <td>{siswa.nis}</td>
                                        <td>{siswa.nama}</td>
                                        <td>{siswa.jenis_kelamin}</td>
                                        <td>{siswa.kamar || '-'}</td>
                                        <td>
                                            <Button 
                                                variant="primary" 
                                                size="sm" 
                                                onClick={() => handleViewRaportDetail(siswa)}
                                                disabled={loadingRaport}
                                            >
                                                <Eye size={16} className="me-1" />
                                                {loadingRaport && selectedSiswaForDetail?.id === siswa.id ? 'Loading...' : 'Lihat Raport'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )}

            {/* --- Detail Raport Siswa Terpilih --- */}
            {selectedSiswaForDetail && raportData && (
                <>
                    <Alert variant="info" className="mb-4">
                        <strong>Detail Raport:</strong> {selectedSiswaForDetail.nama} ({selectedSiswaForDetail.nis})
                        <Button 
                            variant="outline-secondary" 
                            size="sm" 
                            className="float-end"
                            onClick={() => {
                                setSelectedSiswaForDetail(null);
                                setRaportData(null);
                            }}
                        >
                            <X size={16} /> Tutup Detail
                        </Button>
                    </Alert>

                    <Row>
                        {/* --- Kolom Kiri: Nilai Ujian & Hafalan --- */}
                        <Col lg={8}>
                            {/* Nilai Ujian */}
                            {raportData.nilaiUjian && raportData.nilaiUjian.length > 0 && (
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
                                                            <td>{item.pengetahuan_angka || '-'}</td>
                                                            <td>{item.keterampilan_angka || '-'}</td>
                                                            <td>
                                                                <Button 
                                                                    variant="outline-primary" 
                                                                    size="sm" 
                                                                    onClick={() => { setEditingId(item.id); setEditingType('ujian'); }}
                                                                >
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
                            )}

                            {/* Nilai Hafalan */}
                            {raportData.nilaiHafalan && raportData.nilaiHafalan.length > 0 && (
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
                                                                { key: 'nilai_angka', editable: true, type: 'number' },
                                                            ]}
                                                        />
                                                    ) : (
                                                        <tr key={item.id}>
                                                            <td>{item.kategori}</td>
                                                            <td>{item.nilai_angka || '-'}</td>
                                                            <td>
                                                                <Button 
                                                                    variant="outline-primary" 
                                                                    size="sm" 
                                                                    onClick={() => { setEditingId(item.id); setEditingType('hafalan'); }}
                                                                >
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
                            )}
                        </Col>

                        {/* --- Kolom Kanan: Kehadiran & Sikap --- */}
                        <Col lg={4}>
                            {/* Kehadiran */}
                            <Card className="mb-4">
                                <Card.Header><Card.Title>Kehadiran</Card.Title></Card.Header>
                                <Card.Body>
                                    {raportData.kehadiran ? (
                                        <>
                                            <Form.Group as={Row} className="mb-3">
                                                <Form.Label column sm="4">Sakit</Form.Label>
                                                <Col sm="8">
                                                    <Form.Control 
                                                        type="number" 
                                                        name="sakit" 
                                                        value={raportData.kehadiran.sakit || 0} 
                                                        onChange={handleKehadiranChange} 
                                                    />
                                                </Col>
                                            </Form.Group>
                                            <Form.Group as={Row} className="mb-3">
                                                <Form.Label column sm="4">Izin</Form.Label>
                                                <Col sm="8">
                                                    <Form.Control 
                                                        type="number" 
                                                        name="izin" 
                                                        value={raportData.kehadiran.izin || 0} 
                                                        onChange={handleKehadiranChange} 
                                                    />
                                                </Col>
                                            </Form.Group>
                                            <Form.Group as={Row} className="mb-3">
                                                <Form.Label column sm="4">Alpha</Form.Label>
                                                <Col sm="8">
                                                    <Form.Control 
                                                        type="number" 
                                                        name="alpha" 
                                                        value={raportData.kehadiran.alpha || raportData.kehadiran.absen || 0} 
                                                        onChange={handleKehadiranChange} 
                                                    />
                                                </Col>
                                            </Form.Group>
                                            <Button className="w-100" onClick={handleSaveKehadiran}>
                                                Simpan Perubahan Kehadiran
                                            </Button>
                                        </>
                                    ) : (
                                        <p className="text-muted">Data kehadiran belum tersedia.</p>
                                    )}
                                </Card.Body>
                            </Card>
                            
                            {/* Sikap */}
                            <Card>
                                <Card.Header><Card.Title>Sikap & Catatan</Card.Title></Card.Header>
                                <Card.Body>
                                    {Object.keys(groupedSikap).length > 0 ? (
                                        Object.keys(groupedSikap).map(jenisSikap => (
                                            <div key={jenisSikap} className="mb-3">
                                                <h6 className="text-capitalize"><strong>Sikap {jenisSikap}</strong></h6>
                                                <ul className="list-unstyled ps-3">
                                                    {groupedSikap[jenisSikap].indicators.map((item, index) => (
                                                        <li key={index}>
                                                            {item.indikator}: <span className="badge bg-secondary">{item.angka}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <p className="mb-0 mt-2">
                                                    <strong>Catatan:</strong> 
                                                    <br/>
                                                    <em>{groupedSikap[jenisSikap].deskripsi}</em>
                                                </p>
                                                {Object.keys(groupedSikap).length > 1 && <hr/>}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-muted">Data sikap dan catatan belum tersedia.</p>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </>
            )}

            {/* Pesan jika tidak ada data */}
            {kelasData && siswaList.length === 0 && (
                <Alert variant="warning">
                    Tidak ada siswa ditemukan di kelas {kelasData.nama_kelas}.
                </Alert>
            )}
        </Container>
    );
};

export default ManajemenRaportPage;