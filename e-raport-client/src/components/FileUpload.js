import React, { useState } from 'react'
import API_BASE from '../api'

export default function FileUpload({ onUpload, accept = '.xlsx,.xls' }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setFile(e.target.files?.[0] || null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return alert('Pilih file terlebih dahulu')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
  const res = await fetch(`${API_BASE.replace(/\/api\/?$/,'')}/api/excel/upload-nilai`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Upload gagal')
      if (onUpload) onUpload(data)
      alert(data.message || 'Upload selesai')
    } catch (err) {
      console.error(err)
      alert(err.message || 'Error saat upload')
    } finally {
      setLoading(false)
      setFile(null)
      if (document.getElementById('file-upload-input')) document.getElementById('file-upload-input').value = ''
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input id="file-upload-input" type="file" accept={accept} onChange={handleChange} />
      <div>
        <button type="submit" className="px-3 py-1 bg-sky-600 text-white rounded" disabled={loading}>{loading ? 'Mengirim...' : 'Upload'}</button>
      </div>
    </form>
  )
}
