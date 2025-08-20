import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/templates';

function ManajemenTemplatePage() {
    const [identitasFile, setIdentitasFile] = useState(null);
    const [nilaiFile, setNilaiFile] = useState(null);
    const [sikapFile, setSikapFile] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const fetchTemplates = useCallback(async () => {
        try {
            const response = await axios.get(API_URL);
            setTemplates(response.data);
        } catch (error) {
            console.error('Error fetching templates:', error);
            setMessage('Gagal memuat daftar template.');
        }
    }, []);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const handleFileChange = (e, setFile) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!identitasFile && !nilaiFile && !sikapFile) {
            setMessage('Pilih setidaknya satu file template untuk diunggah.');
            return;
        }

        const formData = new FormData();
        if (identitasFile) formData.append('identitas', identitasFile);
        if (nilaiFile) formData.append('nilai', nilaiFile);
        if (sikapFile) formData.append('sikap', sikapFile);

        setIsLoading(true);
        setMessage('');

        try {
            const response = await axios.post(`${API_URL}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setMessage(response.data.message);
            // Reset file inputs
            setIdentitasFile(null);
            setNilaiFile(null);
            setSikapFile(null);
            document.getElementById('identitas-file-input').value = "";
            document.getElementById('nilai-file-input').value = "";
            document.getElementById('sikap-file-input').value = "";
            // Refresh the list
            fetchTemplates();
        } catch (error) {
            setMessage(error.response?.data?.message || 'Terjadi kesalahan saat mengunggah.');
            console.error('Upload error:', error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDelete = async (fileName) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus template ${fileName}?`)) {
            try {
                const response = await axios.delete(`${API_URL}/${fileName}`);
                setMessage(response.data.message);
                fetchTemplates(); // Refresh list
            } catch (error) {
                setMessage(error.response?.data?.message || 'Gagal menghapus template.');
                console.error('Delete error:', error);
            }
        }
    };


    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Manajemen Template Raport</h1>

            {message && <p className="mb-4 text-center p-2 bg-gray-200 rounded">{message}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Upload Form Section */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Unggah Template Baru</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label htmlFor="identitas-file-input" className="block text-sm font-medium text-gray-700">Template Identitas Siswa (.docx)</label>
                            <input id="identitas-file-input" type="file" accept=".docx" onChange={(e) => handleFileChange(e, setIdentitasFile)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                        </div>
                        <div className="mb-4">
                            <label htmlFor="nilai-file-input" className="block text-sm font-medium text-gray-700">Template Nilai (.docx)</label>
                            <input id="nilai-file-input" type="file" accept=".docx" onChange={(e) => handleFileChange(e, setNilaiFile)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"/>
                        </div>
                        <div className="mb-4">
                            <label htmlFor="sikap-file-input" className="block text-sm font-medium text-gray-700">Template Sikap & Kehadiran (.docx)</label>
                            <input id="sikap-file-input" type="file" accept=".docx" onChange={(e) => handleFileChange(e, setSikapFile)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"/>
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-blue-300">
                            {isLoading ? 'Mengunggah...' : 'Unggah Template'}
                        </button>
                    </form>
                </div>

                {/* Existing Templates Section */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Template Tersimpan</h2>
                    {templates.length > 0 ? (
                        <ul className="space-y-3">
                            {templates.map((template) => (
                                <li key={template.fileName} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                    <div>
                                        <a href={template.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">{template.fileName}</a>
                                        <p className="text-xs text-gray-500">
                                            Ukuran: {Math.round(template.size / 1024)} KB, 
                                            Diubah: {new Date(template.lastModified).toLocaleString()}
                                        </p>
                                    </div>
                                    <button onClick={() => handleDelete(template.fileName)} className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm">
                                        Hapus
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500">Belum ada template yang diunggah.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ManajemenTemplatePage;
