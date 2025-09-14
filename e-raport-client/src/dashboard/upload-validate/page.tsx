import React, { useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import API_BASE from '../../api'
import axios from 'axios'
import FileUpload from '../../components/FileUpload'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
// use native checkbox input (project has no ui/checkbox component)

export default function UploadValidatePage() {
  const [parsed, setParsed] = useState<any[] | null>(null)
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(false)

  const handlePreview = (data: any[]) => {
    setParsed(data)
    const initial = new Set<number>()
    if (Array.isArray(data)) data.forEach((r, idx) => { if (r.is_valid) initial.add(idx) })
    setSelected(initial)
  }

  const toggleRow = (idx) => {
    const s = new Set(selected)
    if (s.has(idx)) s.delete(idx)
    else s.add(idx)
    setSelected(s)
  }

  const handleSaveSelected = async () => {
    if (!parsed || parsed.length === 0) return alert('Tidak ada data untuk disimpan')
    const rowsToSave = Array.from(selected).map((i: number) => {
      const p = parsed[i]
      const d = p.data
      return {
        nis: d.nis,
        nama_siswa: d.nama_siswa,
        semester: String(d.semester),
        tahun_ajaran: d.tahun_ajaran,
        nilaiUjian: d.nilai_ujian || [],
        nilaiHafalan: d.nilai_hafalan || [],
        kehadiran_detail: d.kehadiran_detail || [],
        sikap: d.sikap || {},
        upload_batch_id: Date.now().toString()
      }
    })

    if (rowsToSave.length === 0) return alert('Pilih baris yang valid untuk disimpan')

    setLoading(true)
    try {
      const res = await axios.post(`${API_BASE}/raport/save-validated`, { validatedData: rowsToSave })
      alert(res.data?.message || 'Data berhasil disimpan')
      setParsed(null)
      setSelected(new Set())
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || err.message || 'Gagal menyimpan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Upload & Validate</h1>
          <p className="text-muted-foreground">Unggah file Excel, periksa hasil parsing, dan pilih baris yang ingin disimpan.</p>
        </div>

        <Card>
          <CardContent>
            {/* FileUpload requires onUpload prop in this project; provide noop */}
            <FileUpload onPreview={handlePreview} onUpload={() => {}} />
          </CardContent>
        </Card>

        {parsed && (
          <Card>
            <CardContent>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold">Preview Results</div>
                  <div className="text-sm text-muted-foreground">Total: {parsed.length} | Valid: {parsed.filter(p=>p.is_valid).length} | Invalid: {parsed.filter(p=>!p.is_valid).length}</div>
                </div>
                <div>
                  <Button onClick={handleSaveSelected} disabled={loading}>Simpan yang dipilih</Button>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-auto">
                {parsed.map((row, idx) => (
                  <div key={idx} className="p-2 border rounded bg-white flex gap-4 items-start">
                    <div className="w-8">
                      <input type="checkbox" checked={selected.has(idx)} onChange={() => toggleRow(idx)} disabled={!row.is_valid} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{row.data.nis} — {row.data.nama_siswa} (row {row.row_number})</div>
                      <div className="text-xs text-muted-foreground">Semester: {row.data.semester} | Tahun Ajaran: {row.data.tahun_ajaran}</div>
                      {row.is_valid ? (
                        <div className="text-xs text-green-600">Valid</div>
                      ) : (
                        <div className="text-xs text-red-600">Invalid: {row.validation_errors ? row.validation_errors.join('; ') : 'Unknown'}</div>
                      )}

                      {/* Show a compact list of mapel/hafalan if present */}
                      {row.data.nilai_ujian && row.data.nilai_ujian.length > 0 && (
                        <div className="mt-2 text-xs">
                          <div className="font-semibold">Nilai Ujian:</div>
                          <ul className="list-disc list-inside">
                            {row.data.nilai_ujian.map((n, i) => (
                              <li key={i}>{n.nama_mapel} — nilai: {n.nilai || '-'} — predikat: {n.predikat || '-'}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {row.data.nilai_hafalan && row.data.nilai_hafalan.length > 0 && (
                        <div className="mt-2 text-xs">
                          <div className="font-semibold">Nilai Hafalan:</div>
                          <ul className="list-disc list-inside">
                            {row.data.nilai_hafalan.map((n, i) => (
                              <li key={i}>{n.nama_mapel} — nilai angka: {n.nilai_angka || '-'}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </DashboardLayout>
  )
}
