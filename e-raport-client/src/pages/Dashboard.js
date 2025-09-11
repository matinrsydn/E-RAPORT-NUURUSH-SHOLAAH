// File: pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE from '../api';
import { Card, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { Users, BookOpen, Home, UserCheck, BookCopy, DoorOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Komponen untuk kartu statistik
const StatCard = ({ title, value, icon, color }) => (
    <Card className={`text-white mb-3 bg-${color}`}>
        <Card.Body>
            <div className="d-flex justify-content-between align-items-center">
                <div>
                    <h4 className="mb-0">{value}</h4>
                    <span>{title}</span>
                </div>
                {icon}
            </div>
        </Card.Body>
    </Card>
);


const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [statsRes, chartRes] = await Promise.all([
                    axios.get(`${API_BASE}/dashboard/stats`),
                    axios.get(`${API_BASE}/dashboard/siswa-per-kelas`)
                ]);
                setStats(statsRes.data);
                setChartData(chartRes.data);
            } catch (err) {
                console.error("Gagal memuat data dashboard:", err);
                setError("Tidak dapat memuat data. Pastikan server backend berjalan.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return <div className="text-center"><Spinner animation="border" /> Memuat Data...</div>;
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }

    return (
        <div>
            <h2 className="mb-4">Dashboard</h2>
            
            {/* Kartu Statistik */}
            <Row>
                <Col md={6} lg={4} className="mb-3">
                    <StatCard title="Total Siswa" value={stats?.totalSiswa || 0} icon={<Users size={40} />} color="primary" />
                </Col>
                <Col md={6} lg={4} className="mb-3">
                    <StatCard title="Total Guru" value={stats?.totalGuru || 0} icon={<UserCheck size={40} />} color="info" />
                </Col>
                <Col md={6} lg={4} className="mb-3">
                    <StatCard title="Total Wali Kelas" value={stats?.totalWaliKelas || 0} icon={<UserCheck size={40} />} color="danger" />
                </Col>
                <Col md={6} lg={4} className="mb-3">
                    <StatCard title="Total Mapel" value={stats?.totalMapel || 0} icon={<BookOpen size={40} />} color="success" />
                </Col>
                <Col md={6} lg={4} className="mb-3">
                    <StatCard title="Total Kitab" value={stats?.totalKitab || 0} icon={<BookCopy size={40} />} color="warning" />
                </Col>
                <Col md={6} lg={4} className="mb-3">
                    <StatCard title="Total Kamar" value={stats?.totalKamar || 0} icon={<DoorOpen size={40} />} color="secondary" />
                </Col>
            </Row>

            {/* Diagram Batang */}
            <Row>
                <Col>
                    <Card>
                        <Card.Header as="h5">Jumlah Siswa per Kelas</Card.Header>
                        <Card.Body>
                            {chartData.length > 0 ? (
                                <div style={{ width: '100%', height: 300 }}>
                                    <ResponsiveContainer>
                                        <BarChart
                                            data={chartData}
                                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis allowDecimals={false} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="Jumlah" fill="#8884d8" name="Jumlah Siswa"/>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <Alert variant="info">
                                    Data siswa per kelas belum cukup untuk ditampilkan di diagram.
                                </Alert>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;