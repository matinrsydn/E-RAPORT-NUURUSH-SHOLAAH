import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ManajemenIndikatorSikapPage = () => {
    const [indikator, setIndikator] = useState([]);
    const [formData, setFormData] = useState({ jenis_sikap: 'spiritual', indikator: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    const API_URL = 'http://localhost:5000/api/indikator-sikap';

    useEffect(() => {
        fetchIndikator();
    }, []);

    // Mengambil data indikator dari server
    const fetchIndikator = async () => {
        const response = await axios.get(API_URL);
        setIndikator(response.data);
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
        fetchIndikator();
        resetForm();
    };

    // Menyiapkan form untuk mode edit
    const handleEdit = (data) => {
        setFormData({ jenis_sikap: data.jenis_sikap, indikator: data.indikator });
        setIsEditing(true);
        setCurrentId(data.id);
    };

    // Menghapus data indikator
    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus indikator ini?')) {
            await axios.delete(`${API_URL}/${id}`);
            fetchIndikator();
        }
    };

    // Mereset form ke kondisi awal
    const resetForm = () => {
        setFormData({ jenis_sikap: 'spiritual', indikator: '' });
        setIsEditing(false);
        setCurrentId(null);
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Manajemen Indikator Sikap</h1>
            
            {/* Form untuk Tambah/Edit Indikator */}
            <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded shadow-md bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select name="jenis_sikap" value={formData.jenis_sikap} onChange={handleInputChange} className="p-2 border rounded">
                        <option value="spiritual">Spiritual</option>
                        <option value="sosial">Sosial</option>
                    </select>
                    <input type="text" name="indikator" value={formData.indikator} onChange={handleInputChange} placeholder="Tulis Indikator di sini" className="p-2 border rounded" required />
                </div>
                <div className="mt-4">
                    <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded mr-2 hover:bg-blue-600">{isEditing ? 'Update' : 'Tambah Indikator'}</button>
                    {isEditing && <button type="button" onClick={resetForm} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Batal</button>}
                </div>
            </form>

            {/* Tabel untuk Menampilkan Data Indikator */}
            <table className="min-w-full bg-white border">
                <thead className="bg-gray-200">
                    <tr>
                        <th className="py-2 px-4 border-b">Jenis Sikap</th>
                        <th className="py-2 px-4 border-b">Indikator</th>
                        <th className="py-2 px-4 border-b">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {indikator.map(item => (
                        <tr key={item.id}>
                            <td className="py-2 px-4 border-b capitalize text-center">{item.jenis_sikap}</td>
                            <td className="py-2 px-4 border-b">{item.indikator}</td>
                            <td className="py-2 px-4 border-b text-center">
                                <button onClick={() => handleEdit(item)} className="bg-yellow-500 text-white px-2 py-1 rounded mr-2 hover:bg-yellow-600">Edit</button>
                                <button onClick={() => handleDelete(item.id)} className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Hapus</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ManajemenIndikatorSikapPage;
