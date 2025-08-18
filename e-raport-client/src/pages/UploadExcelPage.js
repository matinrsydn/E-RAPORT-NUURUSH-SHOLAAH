const UploadExcelPageComponent = () => {
    const [siswaList, setSiswaList] = useState([]);
    const [selectedSiswa, setSelectedSiswa] = useState('');
    const [semester, setSemester] = useState('1 (Ganjil)');
    const [tahunAjaran, setTahunAjaran] = useState('2024/2025');
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        axios.get('/siswa').then(res => {
            setSiswaList(res.data);
        }).catch(err => {
            setError("Gagal memuat daftar siswa. Pastikan backend berjalan.");
        });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !selectedSiswa) {
            setError('Siswa dan file Excel harus dipilih.');
            return;
        }
        setIsLoading(true);
        setMessage('');
        setError('');
        const formData = new FormData();
        formData.append('fileNilai', file);
        formData.append('siswaId', selectedSiswa);
        formData.append('semester', semester);
        formData.append('tahun_ajaran', tahunAjaran);
        try {
            const res = await axios.post('/excel/upload-nilai', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessage(res.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Terjadi kesalahan saat mengunggah.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Upload Nilai Raport via Excel</h2>
            <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
                <h3 className="font-semibold text-blue-800">Petunjuk</h3>
                <ol className="list-decimal list-inside text-sm text-blue-700 mt-2">
                    <li>Unduh template Excel yang telah disediakan.</li>
                    <li>Isi data nilai, sikap, dan kehadiran pada sheet yang sesuai.</li>
                    <li>Pilih siswa, tahun ajaran, dan semester di bawah ini.</li>
                    <li>Unggah file Excel yang sudah diisi.</li>
                </ol>
                <a href="http://localhost:5000/templates/Template_Nilai_Raport.xlsx" download className="mt-4 inline-block bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                    Unduh Template Excel
                </a>
            </div>
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
                 <div>
                    <label className="block font-medium">1. Pilih Siswa</label>
                    <select value={selectedSiswa} onChange={e => setSelectedSiswa(e.target.value)} className="w-full p-2 border rounded mt-1" required>
                        <option value="">-- Pilih Siswa --</option>
                        {siswaList.map(s => <option key={s.id} value={s.id}>{s.nama} ({s.nis})</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block font-medium">2. Konfirmasi Tahun Ajaran & Semester</label>
                    <div className="flex gap-4 mt-1">
                        <input type="text" value={tahunAjaran} onChange={e => setTahunAjaran(e.target.value)} className="w-full p-2 border rounded" />
                        <input type="text" value={semester} onChange={e => setSemester(e.target.value)} className="w-full p-2 border rounded" />
                    </div>
                </div>
                <div>
                    <label className="block font-medium">3. Unggah File Excel</label>
                    <input type="file" onChange={(e) => setFile(e.target.files[0])} accept=".xlsx" className="w-full p-2 border rounded mt-1" required />
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400">
                    {isLoading ? 'Mengunggah...' : 'Unggah dan Proses Nilai'}
                </button>
                {message && <p className="mt-4 text-center text-green-600">{message}</p>}
                {error && <p className="mt-4 text-center text-red-600">{error}</p>}
            </form>
        </div>
    );
};