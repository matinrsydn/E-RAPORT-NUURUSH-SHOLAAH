const ManajemenTemplatePageComponent = () => {
    const [identitasFile, setIdentitasFile] = useState(null);
    const [nilaiFile, setNilaiFile] = useState(null);
    const [sikapFile, setSikapFile] = useState(null);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        if (identitasFile) formData.append('identitas', identitasFile);
        if (nilaiFile) formData.append('nilai', nilaiFile);
        if (sikapFile) formData.append('sikap', sikapFile);

        try {
            const res = await axios.post('/template/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessage(res.data.message);
        } catch (error) {
            setMessage('Gagal mengunggah template.');
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Manajemen Template Raport (.docx)</h2>
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
                <div>
                    <label className="block font-medium">Template Identitas Siswa</label>
                    <input type="file" onChange={(e) => setIdentitasFile(e.target.files[0])} accept=".docx" className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block font-medium">Template Nilai Raport</label>
                    <input type="file" onChange={(e) => setNilaiFile(e.target.files[0])} accept=".docx" className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block font-medium">Template Nilai Sikap</label>
                    <input type="file" onChange={(e) => setSikapFile(e.target.files[0])} accept=".docx" className="w-full p-2 border rounded" />
                </div>
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                    Unggah Template
                </button>
                {message && <p className="mt-4 text-green-600">{message}</p>}
            </form>
        </div>
    );
};