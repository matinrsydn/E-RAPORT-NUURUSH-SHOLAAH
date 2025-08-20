import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ManajemenKelasPage = () => {
    const [kelas, setKelas] = useState([]);
    const [waliKelasOptions, setWaliKelasOptions] = useState([]);
    const [formData, setFormData] = useState({ nama_kelas: '', kapasitas: '', wali_kelas_id: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    // Konfigurasi URL API
    const API_URL = 'http://localhost:5000/api/kelas';
    const WALI_KELAS_API_URL = 'http://localhost:5000/api/wali-kelas';

    // Mengambil data saat komponen dimuat
    useEffect(() => {
        fetchKelas();
        fetchWaliKelas();
    }, []);

    // Fungsi untuk mengambil data kelas dari server
    const fetchKelas = async () => {
        try {
            const response = await axios.get(API_URL);
            setKelas(response.data);
        } catch (error) {
            console.error("Error fetching kelas:", error);
        }
    };

    // Fungsi untuk mengambil data wali kelas (untuk dropdown)
    const fetchWaliKelas = async () => {
        try {
            const response = await axios.get(WALI_KELAS_API_URL);
            setWaliKelasOptions(response.data);
        } catch (error) {
            console.error("Error fetching wali kelas:", error);
        }
    };

    // Menangani perubahan input pada form
    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Menangani submit form (tambah atau update)
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isEditing) {
            await axios.put(`${API_URL}/${currentId}`, formData);
        } else {
            await axios.post(API_URL, formData);
        }
        fetchKelas(); // Muat ulang data setelah submit
        resetForm();
    };

    // Menyiapkan form untuk mode edit
    const handleEdit = (data) => {
        setFormData({ nama_kelas: data.nama_kelas, kapasitas: data.kapasitas, wali_kelas_id: data.wali_kelas_id || '' });
        setIsEditing(true);
        setCurrentId(data.id);
    };

    // Menghapus data kelas
    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus kelas ini?')) {
            await axios.delete(`${API_URL}/${id}`);
            fetchKelas();
        }
    };
    
    // Mereset form ke kondisi awal
    const resetForm = () => {
        setFormData({ nama_kelas: '', kapasitas: '', wali_kelas_id: '' });
        setIsEditing(false);
        setCurrentId(null);
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Manajemen Kelas</h1>
            
            {/* Form untuk Tambah/Edit Kelas */}
            <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded shadow-md bg-white">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" name="nama_kelas" value={formData.nama_kelas} onChange={handleInputChange} placeholder="Nama Kelas" className="p-2 border rounded" required />
                    <input type="number" name="kapasitas" value={formData.kapasitas} onChange={handleInputChange} placeholder="Kapasitas" className="p-2 border rounded" required />
                    <select name="wali_kelas_id" value={formData.wali_kelas_id} onChange={handleInputChange} className="p-2 border rounded">
                        <option value="">Pilih Wali Kelas</option>
                        {waliKelasOptions.map(wk => <option key={wk.id} value={wk.id}>{wk.nama}</option>)}
                    </select>
                </div>
                <div className="mt-4">
                    <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded mr-2 hover:bg-blue-600">{isEditing ? 'Update' : 'Tambah Kelas'}</button>
                    {isEditing && <button type="button" onClick={resetForm} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Batal</button>}
                </div>
            </form>

            {/* Tabel untuk Menampilkan Data Kelas */}
            <table className="min-w-full bg-white border">
                <thead className="bg-gray-200">
                    <tr>
                        <th className="py-2 px-4 border-b">Nama Kelas</th>
                        <th className="py-2 px-4 border-b">Kapasitas</th>
                        <th className="py-2 px-4 border-b">Wali Kelas</th>
                        <th className="py-2 px-4 border-b">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {kelas.map(k => (
                        <tr key={k.id}>
                            <td className="py-2 px-4 border-b text-center">{k.nama_kelas}</td>
                            <td className="py-2 px-4 border-b text-center">{k.kapasitas}</td>
                            <td className="py-2 px-4 border-b text-center">{k.walikelas?.nama || 'N/A'}</td>
                            <td className="py-2 px-4 border-b text-center">
                                <button onClick={() => handleEdit(k)} className="bg-yellow-500 text-white px-2 py-1 rounded mr-2 hover:bg-yellow-600">Edit</button>
                                <button onClick={() => handleDelete(k.id)} className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Hapus</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ManajemenKelasPage;
