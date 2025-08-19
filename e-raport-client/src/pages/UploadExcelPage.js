import React, { useState } from 'react';
import axios from 'axios';

const UploadExcelPage = () => {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [semester, setSemester] = useState('Ganjil');
    const [tahunAjaran, setTahunAjaran] = useState('2023/2024');

    const onFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const onUpload = async () => {
        if (!file) {
            setMessage('Pilih file terlebih dahulu.');
            return;
        }

        const formData = new FormData();
        formData.append('excel-file', file);
        formData.append('semester', semester);
        formData.append('tahun_ajaran', tahunAjaran);

        try {
            // PERBAIKAN: URL diubah ke '/api/excel/upload-nilai' agar sesuai dengan backend
            const res = await axios.post('http://localhost:5000/api/excel/upload-nilai', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setMessage(res.data.message);
        } catch (err) {
            setMessage('Gagal mengunggah file. ' + (err.response?.data?.message || err.message));
        }
    };

    return (
        <div className="container mt-4">
            <h2>Unggah Data Nilai dari Excel</h2>
            <hr />

            <div className="card">
                <div className="card-header">
                    Unduh Template dan Unggah File
                </div>
                <div className="card-body">
                    <p>
                        Silakan unduh template Excel di bawah ini, isi sesuai format, lalu unggah kembali melalui form ini.
                    </p>
                    {/* Tombol ini sekarang mengarah ke rute backend yang benar untuk download Excel */}
                    <a href="http://localhost:5000/api/templates/download-excel" className="btn btn-success btn-sm mb-3">
                        <i className="bi bi-file-earmark-excel"></i> Unduh Template Excel
                    </a>

                    <div className="row">
                        <div className="col-md-6">
                            <div className="form-group mb-3">
                                <label htmlFor="semester">Semester</label>
                                <select id="semester" className="form-control" value={semester} onChange={(e) => setSemester(e.target.value)}>
                                    <option value="Ganjil">Ganjil</option>
                                    <option value="Genap">Genap</option>
                                </select>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="form-group mb-3">
                                <label htmlFor="tahunAjaran">Tahun Ajaran</label>
                                <input type="text" id="tahunAjaran" className="form-control" value={tahunAjaran} onChange={(e) => setTahunAjaran(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="form-group mb-3">
                        <label htmlFor="file-upload">Pilih File Excel</label>
                        <input type="file" className="form-control" id="file-upload" onChange={onFileChange} accept=".xlsx, .xls" />
                    </div>

                    <button className="btn btn-primary" onClick={onUpload}>
                        <i className="bi bi-upload"></i> Unggah Sekarang
                    </button>

                    {message && <div className="alert alert-info mt-3">{message}</div>}
                </div>
            </div>
        </div>
    );
};

export default UploadExcelPage;
