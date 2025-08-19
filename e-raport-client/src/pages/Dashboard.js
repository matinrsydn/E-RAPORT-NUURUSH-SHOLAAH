import React from 'react';
import { Card, Alert } from 'react-bootstrap';
import { GraduationCap } from 'lucide-react';

const Dashboard = () => (
    <Card>
        <Card.Header as="h4">Selamat Datang di Aplikasi E-Raport</Card.Header>
        <Card.Body>
            <Card.Title>Sistem Manajemen Raport Digital</Card.Title>
            <Card.Text>
                Gunakan menu navigasi di sebelah kiri untuk mengelola data akademik, siswa, dan nilai.
                Aplikasi ini dirancang untuk mempermudah proses pengisian dan rekapitulasi nilai raport secara digital.
            </Card.Text>
            <Alert variant="info" className="d-flex align-items-center">
                <GraduationCap size={20} className="me-2"/>
                <strong>Tips:</strong> Mulailah dengan melengkapi data master pada menu "Master Data" sebelum mengelola data siswa dan nilai.
            </Alert>
        </Card.Body>
    </Card>
);

export default Dashboard;
