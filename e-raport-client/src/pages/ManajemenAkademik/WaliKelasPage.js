const WaliKelasPageComponent = () => {
    const [listData, setListData] = useState([]);
    const [formData, setFormData] = useState({ nama: '', nip: '' });
    const [isEditing, setIsEditing] = useState(null);

    const fetchData = async () => {
        const res = await axios.get('/walikelas');
        setListData(res.data);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isEditing) {
            await axios.put(`/walikelas/${isEditing}`, formData);
        } else {
            await axios.post('/walikelas', formData);
        }
        fetchData();
        setFormData({ nama: '', nip: '' });
        setIsEditing(null);
    };

    const handleEdit = (item) => {
        setIsEditing(item.id);
        setFormData({ nama: item.nama, nip: item.nip });
    };
    
    const handleDelete = async (id) => {
        if (window.confirm('Yakin ingin menghapus data ini?')) {
            await axios.delete(`/walikelas/${id}`);
            fetchData();
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Manajemen Wali Kelas</h2>
            <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow-md mb-6">
                <h3 className="font-semibold mb-2">{isEditing ? 'Edit' : 'Tambah'} Wali Kelas</h3>
                <div className="flex gap-4 items-end">
                    <div className="flex-grow"><label>Nama</label><input name="nama" value={formData.nama} onChange={handleChange} className="p-2 border rounded w-full" /></div>
                    <div className="flex-grow"><label>NIP</label><input name="nip" value={formData.nip} onChange={handleChange} className="p-2 border rounded w-full" /></div>
                    <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded h-fit">{isEditing ? 'Update' : 'Simpan'}</button>
                    {isEditing && <button type="button" onClick={() => { setIsEditing(null); setFormData({ nama: '', nip: '' });}} className="bg-gray-500 text-white px-4 py-2 rounded h-fit">Batal</button>}
                </div>
            </form>
            <div className="bg-white p-4 rounded shadow-md">
                <table className="w-full">
                    <thead><tr className="border-b"><th className="p-2 text-left">Nama</th><th className="p-2 text-left">NIP</th><th className="p-2 text-left">Aksi</th></tr></thead>
                    <tbody>
                        {listData.map(item => (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                                <td className="p-2">{item.nama}</td><td className="p-2">{item.nip}</td>
                                <td className="p-2 flex gap-2"><button onClick={() => handleEdit(item)} className="text-yellow-500">Edit</button><button onClick={() => handleDelete(item.id)} className="text-red-500">Hapus</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};