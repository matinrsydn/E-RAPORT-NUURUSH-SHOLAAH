import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import API_BASE from '../../api'
import axios from 'axios'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Select, SelectItem } from '../../components/ui/select'
import DataTable from '../../components/data-table'
import { useToast } from '../../components/ui/toast'

export default function PromosiKelasPage() {
  const [tahun, setTahun] = useState([])
  const [kelas, setKelas] = useState([])
  const [fromTa, setFromTa] = useState('')
  const [toTa, setToTa] = useState('')
  const [kelasFrom, setKelasFrom] = useState('')
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    axios.get(`${API_BASE}/tahun-ajaran`).then(r => setTahun(r.data)).catch(() => {})
    axios.get(`${API_BASE}/kelas`).then(r => setKelas(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!kelasFrom) return setStudents([])
    setLoading(true)
    axios.get(`${API_BASE}/siswa`, { params: { kelas_id: kelasFrom } }).then(r => setStudents(r.data)).catch(() => setStudents([])).finally(() => setLoading(false))
  }, [kelasFrom])

  const handlePromote = async () => {
    if (!fromTa || !toTa || !kelasFrom) return toast({ title: 'Lengkapi pilihan', description: 'Pilih tahun ajaran asal, tujuan dan kelas asal.' })
    try {
      setLoading(true)
      const payload = { fromTaId: Number(fromTa), toTaId: Number(toTa), kelasFromId: Number(kelasFrom), mode: 'auto' }
      const res = await axios.post(`${API_BASE}/kenaikan`, payload)
      toast({ title: 'Sukses', description: 'Promosi selesai.' })
    } catch (err) {
      toast({ title: 'Gagal', description: err?.response?.data?.message || 'Gagal melakukan promosi', variant: 'destructive' })
    } finally { setLoading(false) }
  }

  const handlePromoteAll = async () => {
    if (!fromTa || !toTa) return toast({ title: 'Lengkapi pilihan', description: 'Pilih tahun ajaran asal dan tujuan.' })
    try {
      setLoading(true)
      const payload = { fromTaId: Number(fromTa), toTaId: Number(toTa), mode: 'auto' }
      const res = await axios.post(`${API_BASE}/kenaikan/all-for-tahun`, payload)
      toast({ title: 'Sukses', description: 'Promosi untuk seluruh kelas selesai.' })
    } catch (err) {
      toast({ title: 'Gagal', description: err?.response?.data?.message || 'Gagal melakukan promosi untuk seluruh tahun', variant: 'destructive' })
    } finally { setLoading(false) }
  }

  const columns = [
    { header: 'NIS', accessor: 'nis' },
    { header: 'Nama', accessor: 'nama' },
    { header: 'Kelas Saat Ini', accessor: 'kelas' }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Promosi / Kenaikan Kelas</h1>
          <p className="text-muted-foreground">Halaman ini untuk mengatur promosi atau kenaikan kelas siswa.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Promosi</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-2">Tahun Ajaran Asal</label>
              <Select value={fromTa} onChange={e => setFromTa(e.target.value)}>
                <SelectItem value="">-- Pilih --</SelectItem>
                {tahun.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.nama_ajaran} (Semester {t.semester})</SelectItem>)}
              </Select>
            </div>
            <div>
              <label className="block mb-2">Tahun Ajaran Tujuan</label>
              <Select value={toTa} onChange={e => setToTa(e.target.value)}>
                <SelectItem value="">-- Pilih --</SelectItem>
                {tahun.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.nama_ajaran} (Semester {t.semester})</SelectItem>)}
              </Select>
            </div>
            <div>
              <label className="block mb-2">Kelas Asal</label>
              <Select value={kelasFrom} onChange={e => setKelasFrom(e.target.value)}>
                <SelectItem value="">-- Pilih --</SelectItem>
                {kelas.map(k => <SelectItem key={k.id} value={String(k.id)}>{k.nama_kelas}</SelectItem>)}
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview Siswa</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <div>Memuat...</div> : <DataTable columns={columns} data={students} />}
          </CardContent>
          <div className="p-4 flex justify-end">
            <div className="flex gap-2">
              <Button onClick={handlePromote} disabled={loading}>Promosikan</Button>
              <Button variant="secondary" onClick={handlePromoteAll} disabled={loading || !fromTa || !toTa}>Promosi Semua Siswa Tahun Ini</Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
