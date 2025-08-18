import React, { useState, useEffect } from 'react';
import { Card, Table, Spinner, Alert, Button } from 'react-bootstrap';
import axios from 'axios';

const ManajemenSiswaPage = () => {
    const [siswaList, setSiswaList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await axios.get('/siswa');
                setSiswaList(res.data);
            } catch (err) {
                setError('Gagal memuat data siswa.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <Card>
            <Card.Header as="h4">Manajemen Siswa</Card.Header>
            <Card.Body>
                <Button className="mb-3">Tambah Siswa Baru</Button>
                {error && <Alert variant="danger">{error}</Alert>}
                {loading ? (
                    <div className="text-center"><Spinner animation="border" /></div>
                ) : (
                    <Table striped bordered hover responsive>
                        <thead>
                            <tr>
                                <th>NIS</th>
                                <th>Nama</th>
                                <th>Kelas</th>
                                <th>Wali Kelas</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {siswaList.map(siswa => (
                                <tr key={siswa.id}>
                                    <td>{siswa.nis}</td>
                                    <td>{siswa.nama}</td>
                                    <td>{siswa.kelas}</td>
                                    <td>{siswa.wali_kelas?.nama || '-'}</td>
                                    <td>
                                        <Button variant="info" size="sm" className="me-2">Detail</Button>
                                        <Button variant="warning" size="sm" className="me-2">Edit</Button>
                                        <Button variant="danger" size="sm">Hapus</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Card.Body>
        </Card>
    );
};
export default ManajemenSiswaPage;