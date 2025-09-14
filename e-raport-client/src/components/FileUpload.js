import React, { useState } from 'react'
import API_BASE from '../api'

export default function FileUpload({ onUpload, onPreview, accept = '.xlsx,.xls' }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)

  const handleChange = (e) => setFile(e.target.files?.[0] || null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return alert('Pilih file terlebih dahulu')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      // Preview mode (no commit)
      const res = await fetch(`${API_BASE}/raport/upload`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Upload gagal')
      // Expect parsed preview
  const parsed = data.parsed || null
  setPreview(parsed)
  if (onUpload) onUpload(data)
  if (onPreview) onPreview(parsed)
    } catch (err) {
      console.error(err)
      alert(err.message || 'Error saat upload')
    } finally {
      setLoading(false)
      // keep file for potential confirm action
      if (document.getElementById('file-upload-input')) document.getElementById('file-upload-input').value = ''
    }
  }

  const handleConfirm = async () => {
    if (!file) return alert('Tidak ada file untuk disimpan')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API_BASE}/raport/upload?commit=1`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Commit gagal')
      alert(data.message || 'Data berhasil disimpan')
      setPreview(null)
      setFile(null)
      if (document.getElementById('file-upload-input')) document.getElementById('file-upload-input').value = ''
    } catch (err) {
      console.error(err)
      alert(err.message || 'Error saat commit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input id="file-upload-input" type="file" accept={accept} onChange={handleChange} />
      <div>
        <button type="submit" className="px-3 py-1 bg-sky-600 text-white rounded" disabled={loading}>{loading ? 'Mengirim...' : 'Upload'}</button>
      </div>
      {preview && (
        <div className="mt-3 p-3 border rounded bg-white">
          <div className="mb-2 font-semibold">Preview Hasil Parsing</div>
          <div>Jumlah baris: {preview.length}</div>
          <div>Valid: {preview.filter(p=>p.is_valid).length}</div>
          <div>Invalid: {preview.filter(p=>!p.is_valid).length}</div>
          <div className="mt-2">
            <button type="button" className="px-3 py-1 bg-green-600 text-white rounded mr-2" onClick={handleConfirm} disabled={loading}>Konfirmasi Simpan</button>
            <button type="button" className="px-3 py-1 bg-gray-300 rounded" onClick={()=>{ setPreview(null); setFile(null); if (document.getElementById('file-upload-input')) document.getElementById('file-upload-input').value = '' }}>Batal</button>
          </div>
        </div>
      )}
    </form>
  )
}
