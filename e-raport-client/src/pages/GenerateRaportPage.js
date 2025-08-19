import React, { useState, useEffect } from 'react';
import axios from 'axios';
import fileDownload from 'js-file-download';

const GenerateRaportPage = () => {
    const [kelasOptions, setKelasOptions] = useState([]);
    const [waliKelasOptions, setWaliKelasOptions] = useState([]);
    const [filterType, setFilterType] = useState('kelas');
    const [selectedId, setSelectedId] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Mengambil data kelas dan wali kelas untuk pilihan filter
        axios.get('http://localhost:5000/api/kelas').then(res => setKelasOptions(res.data));
        axios.get('http://localhost:5000/api/wali-kelas').then(res => setWaliKelasOptions(res.data));
    }, []);

    const handleDownload = async () => {
        if (!selectedId) {
            setError('Silakan pilih salah satu filter.');
            return;
        }
        setError('');
        setLoading(true);
        
        // Membangun URL berdasarkan filter yang dipilih
        let url = `http://localhost:5000/api/excel/download-template?`;
        if (filterType === 'kelas') {
            url += `kelas_id=${selectedId}`;
        } else {
            url += `wali_kelas_id=${selectedId}`;
        }

        try {
            const response = await axios.get(url, {
                responseType: 'blob', // Penting untuk menerima file
            });
            // Memberi nama file yang diunduh
            const kelasTerpilih = kelasOptions.find(k => k.id == selectedId);
            const namaFile = kelasTerpilih ? `Template-Nilai-${kelasTerpilih.nama_kelas}.xlsx` : 'Template-Nilai.xlsx';
            fileDownload(response.data, namaFile);
        } catch (err) {
            setError('Gagal mengunduh template. Pastikan ada siswa di kelas/wali kelas yang dipilih.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Generate & Download Template Nilai</h1>
            <div className="p-6 border rounded shadow-md max-w-md bg-white">
                <div className="mb-4">
                    <label className="block mb-2 font-semibold">Filter Berdasarkan:</label>
                    <select 
                        value={filterType} 
                        onChange={(e) => { setFilterType(e.target.value); setSelectedId(''); }} 
                        className="p-2 border rounded w-full"
                    >
                        <option value="kelas">Kelas</option>
                        <option value="wali_kelas">Wali Kelas</option>
                    </select>
                </div>

                <div className="mb-4">
                    <label className="block mb-2 font-semibold">Pilih {filterType === 'kelas' ? 'Kelas' : 'Wali Kelas'}:</label>
                    <select 
                        value={selectedId} 
                        onChange={(e) => setSelectedId(e.target.value)} 
                        className="p-2 border rounded w-full"
                    >
                        <option value="">-- Pilih --</option>
                        {filterType === 'kelas' ? (
                            kelasOptions.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)
                        ) : (
                            waliKelasOptions.map(wk => <option key={wk.id} value={wk.id}>{wk.nama}</option>)
                        )}
                    </select>
                </div>
                
                {error && <p className="text-red-500 mb-4">{error}</p>}

                <button 
                    onClick={handleDownload} 
                    className="bg-green-500 text-white px-4 py-2 rounded w-full hover:bg-green-600 disabled:bg-gray-400"
                    disabled={loading}
                >
                    {loading ? 'Memproses...' : 'Download Template Excel'}
                </button>
            </div>
        </div>
    );
};

export default GenerateRaportPage;
