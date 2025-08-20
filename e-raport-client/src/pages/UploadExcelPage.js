import React, { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/excel';

function UploadExcelPage() {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setMessage('');
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Silakan pilih file Excel terlebih dahulu.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file); // 'file' harus cocok dengan nama field di middleware (upload.single('file'))

        setIsLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await axios.post(`${API_URL}/upload-nilai`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setMessage(response.data.message);
            setFile(null);
            // Pastikan elemen dengan id ini ada
            if (document.getElementById('excel-file-input')) {
                document.getElementById('excel-file-input').value = ""; // Reset input file
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Terjadi kesalahan saat mengunggah file.');
            console.error('Upload error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Unggah Nilai dari Excel</h1>

            <div className="max-w-xl mx-auto bg-white p-8 rounded-lg shadow-md">
                <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700">
                    <h3 className="font-bold">Petunjuk</h3>
                    <p className="text-sm">Pastikan file Excel Anda memiliki kolom dengan header: <code className="bg-gray-200 p-1 rounded">nis</code>, <code className="bg-gray-200 p-1 rounded">kode_mapel</code>, <code className="bg-gray-200 p-1 rounded">pengetahuan_angka</code>, <code className="bg-gray-200 p-1 rounded">keterampilan_angka</code>, <code className="bg-gray-200 p-1 rounded">semester</code>, dan <code className="bg-gray-200 p-1 rounded">tahun_ajaran</code>.</p>
                </div>

                {message && <div className="mb-4 text-center p-3 bg-green-100 text-green-800 rounded-md">{message}</div>}
                {error && <div className="mb-4 text-center p-3 bg-red-100 text-red-800 rounded-md">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="excel-file-input" className="block text-sm font-medium text-gray-700 mb-2">Pilih File Excel (.xlsx)</label>
                        <input
                            id="excel-file-input"
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !file}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-indigo-300 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Memproses...' : 'Unggah dan Proses Nilai'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default UploadExcelPage;
