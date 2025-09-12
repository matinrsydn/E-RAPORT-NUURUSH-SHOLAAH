import React, { useState } from 'react'

export default function FormDialog({ title, triggerText = 'Open', fields = [], onSubmit }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(false)

  const handleChange = (name, value) => setForm(prev => ({ ...prev, [name]: value }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(form)
      setOpen(false)
      setForm({})
    } catch (err) {
      console.error(err)
      alert(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={() => setOpen(true)} className="px-3 py-1 bg-sky-600 text-white rounded">{triggerText}</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white p-6 rounded w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <form onSubmit={submit} className="space-y-3">
              {fields.map(f => (
                <div key={f.name}>
                  <label className="block text-sm font-medium mb-1">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea className="w-full border p-2 rounded" value={form[f.name] || ''} onChange={e => handleChange(f.name, e.target.value)} />
                  ) : (
                    <input className="w-full border p-2 rounded" type={f.type || 'text'} value={form[f.name] || ''} onChange={e => handleChange(f.name, e.target.value)} />
                  )}
                </div>
              ))}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="px-3 py-1 border rounded">Batal</button>
                <button type="submit" disabled={loading} className="px-3 py-1 bg-sky-600 text-white rounded">{loading ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
