import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import axios from 'axios'
import raportService from '../../services/raportService'
import DataTable from '../../components/data-table'
import { Card, CardContent } from '../../components/ui/card'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { useToast } from '../../components/ui/toast'
import tahunAjaranService from '../../services/tahunAjaranService'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectItem } from '../../components/ui/select'
import API_BASE from '../../api'

type Row = { id:number; nama:string; keterangan?:string }

export default function ManajemenRaportDashboardPage(){
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<Row | null>(null)
  const { toast } = useToast()

  const fetchData = async ()=>{
    setLoading(true)
    try{
      const res = await raportService.getRaportList()
      setData(res)
    } catch (e) {
      console.error(e);
      if (axios.isAxiosError(e) && e.response) {
        if (e.response.status === 404) toast({ title: 'Endpoint tidak ditemukan', description: '/raports', variant: 'destructive' })
        else toast({ title: 'Gagal', description: e.response.data?.message || 'Gagal memuat', variant: 'destructive' })
      } else toast({ title: 'Gagal', description: String(e), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }
  useEffect(()=>{ fetchData() }, [])

  // Generate helpers
  const [taOptions, setTaOptions] = useState<any[]>([])
  const [masterOptions, setMasterOptions] = useState<any[]>([])
  const [periodeOptions, setPeriodeOptions] = useState<any[]>([])
  const [kelasOptions, setKelasOptions] = useState<any[]>([])
  const [tingkatanOptions, setTingkatanOptions] = useState<any[]>([])
  const [selectedMaster, setSelectedMaster] = useState<number | ''>('')
  const [selectedPeriode, setSelectedPeriode] = useState<number | ''>('')
  const [selectedTingkatan, setSelectedTingkatan] = useState<number | ''>('')
  const [selectedKelas, setSelectedKelas] = useState<number | ''>('')
  const [siswaList, setSiswaList] = useState<any[]>([])
  const [editingNotes, setEditingNotes] = useState<Record<number, { catatan_akademik?: string; catatan_sikap?: string }>>({})

  useEffect(()=>{
    // Load masters and kelas list
    tahunAjaranService.getAllMasterTahunAjaran().then(r=>setMasterOptions(r)).catch(()=>{})
    // Load tingkatans for cascading kelas selection
    axios.get(`${API_BASE}/tingkatans`).then(r=>setTingkatanOptions(r.data)).catch(()=>{})
  }, [])

  const downloadBlob = (resp, defaultName) => {
    const blob = new Blob([resp.data], { type: resp.headers['content-type'] })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    let fileName = defaultName
    const cd = resp.headers['content-disposition']
    if (cd) {
      const m = cd.match(/filename="(.+)"/)
      if (m) fileName = m[1]
    }
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(link.href)
  }

  const handleGenerate = async (type:string, siswaIdParam?: number) => {
    const siswaIdToUse = siswaIdParam || (siswaList && siswaList.length > 0 ? siswaList[0].id : null)
    if (!siswaIdToUse) return toast({ title: 'Pilih siswa', description: 'Muat dan pilih siswa terlebih dahulu', variant: 'destructive' })
    if ((type === 'nilai' || type === 'sikap') && !selectedPeriode) return toast({ title: 'Pilih Periode', description: 'Pilih tahun ajaran dan semester dulu', variant: 'destructive' })
    try{
      let resp
      if (type === 'identitas') resp = await raportService.generateIdentitas(siswaIdToUse)
      if (type === 'nilai') resp = await raportService.generateNilai(siswaIdToUse, selectedPeriode, periodeOptions.find(p=>p.id===selectedPeriode)?.semester)
      if (type === 'sikap') resp = await raportService.generateSikap(siswaIdToUse, selectedPeriode, periodeOptions.find(p=>p.id===selectedPeriode)?.semester)
      downloadBlob(resp, `Laporan_${siswaIdToUse}.docx`)
      toast({ title: 'Sukses', description: 'File berhasil diunduh' })
    }catch(e:any){
      console.error(e)
      toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal generate', variant: 'destructive' })
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Manajemen Raport</h1><p className="text-muted-foreground">Kelola raport dan batch</p></div>
        <Card>
          <CardContent>
            {loading ? <div>Memuat...</div> : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div>
                      <Label>Tahun Ajaran (Master)</Label>
                      <Select value={selectedMaster} onChange={async (e)=>{
                        const v = (e.target as HTMLSelectElement).value;
                        setSelectedMaster(v ? Number(v) : '')
                        setSelectedPeriode('')
                        setPeriodeOptions([])
                        if (v) {
                          const periodes = await tahunAjaranService.getPeriodesForMaster(Number(v))
                          setPeriodeOptions(periodes)
                        }
                      }}>
                        <SelectItem value="">-- Pilih Tahun Ajaran --</SelectItem>
                        {masterOptions.map(m=> <SelectItem key={m.id} value={m.id}>{m.nama_ajaran}</SelectItem>)}
                      </Select>
                    </div>
                    <div>
                      <Label>Semester / Periode</Label>
                      <Select value={selectedPeriode} onChange={(e)=>setSelectedPeriode((e.target as HTMLSelectElement).value ? Number((e.target as HTMLSelectElement).value) : '')} disabled={!selectedMaster}>
                        <SelectItem value="">-- Pilih Semester --</SelectItem>
                        {periodeOptions.map(p=> <SelectItem key={p.id} value={p.id}>{(p.master && p.master.nama_ajaran) ? `${p.master.nama_ajaran} - Semester ${p.semester}` : `${p.nama_ajaran} - Semester ${p.semester}`}</SelectItem>)}
                      </Select>
                    </div>
                    <div>
                      <Label>Tingkatan</Label>
                      <Select value={selectedTingkatan} onChange={async (e)=>{
                        const v = (e.target as HTMLSelectElement).value
                        const ting = v ? Number(v) : ''
                        setSelectedTingkatan(ting)
                        setSelectedKelas('')
                        setKelasOptions([])
                        if (ting) {
                          try{
                            const resp:any = await axios.get(`${API_BASE}/kelas`, { params: { tingkatan_id: ting } })
                            setKelasOptions(resp.data || [])
                          }catch(err){ console.error('Failed fetching kelas for tingkatan', err) }
                        }
                      }}>
                        <SelectItem value="">-- Pilih Tingkatan --</SelectItem>
                        {tingkatanOptions.map(t=> <SelectItem key={t.id} value={t.id}>{t.nama_tingkatan}</SelectItem>)}
                      </Select>
                    </div>

                    <div>
                      <Label>Kelas</Label>
                      <Select value={selectedKelas} onChange={(e)=>setSelectedKelas((e.target as HTMLSelectElement).value ? Number((e.target as HTMLSelectElement).value) : '')} disabled={!selectedTingkatan}>
                        <SelectItem value="">-- Pilih Kelas --</SelectItem>
                        {kelasOptions.map(k=> <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
                      </Select>
                    </div>
                    <div className="flex gap-2 pt-6">
                      <Button onClick={async ()=>{
                        if (!selectedPeriode || !selectedKelas || !selectedTingkatan) return toast({ title: 'Lengkapi filter', description: 'Pilih tahun ajaran, tingkatan, dan kelas', variant: 'destructive' })
                        try{
                          const params:any = { tahun_ajaran_id: selectedPeriode, kelas_id: selectedKelas, tingkatan_id: selectedTingkatan }
                          const res = await axios.get(`${API_BASE}/siswa`, { params })
                          setSiswaList(res.data)
                          toast({ title: 'Sukses', description: `Ditemukan ${res.data.length} siswa` })
                        }catch(e:any){ console.error(e); toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal memuat siswa', variant: 'destructive' }) }
                      }}>Muat Siswa</Button>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="font-semibold">Daftar Siswa</h3>
                  {siswaList.length === 0 ? <div className="text-sm text-muted-foreground">Belum ada siswa yang dimuat.</div> : (
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="text-left border-b"><th className="p-2">NIS</th><th className="p-2">Nama</th><th className="p-2">Kelas</th><th className="p-2">Aksi</th></tr>
                      </thead>
                      <tbody>
                        {siswaList.map(s => (
                          <tr key={s.id} className="border-b">
                            <td className="p-2">{s.nis}</td>
                            <td className="p-2">{s.nama}</td>
                            <td className="p-2">{s.currentHistory?.kelas_id || '-'}</td>
                            <td className="p-2">
                              <div className="flex gap-2">
                                <Button onClick={()=>handleGenerate('identitas', s.id)}>Identitas</Button>
                                <Button onClick={()=>handleGenerate('nilai', s.id)}>Nilai</Button>
                                <Button onClick={()=>handleGenerate('sikap', s.id)}>Sikap</Button>
                              </div>
                              <div className="mt-2">
                                <div className="mb-2">
                                  <label className="block text-xs">Catatan Akademik</label>
                                  <textarea className="w-full border p-1 text-sm" rows={2} value={editingNotes[s.id]?.catatan_akademik ?? s.currentHistory?.catatan_akademik ?? ''} onChange={(e)=>setEditingNotes(prev=>({ ...prev, [s.id]: { ...(prev[s.id]||{}), catatan_akademik: e.target.value } }))} />
                                </div>
                                <div className="mb-2">
                                  <label className="block text-xs">Catatan Sikap</label>
                                  <textarea className="w-full border p-1 text-sm" rows={2} value={editingNotes[s.id]?.catatan_sikap ?? s.currentHistory?.catatan_sikap ?? ''} onChange={(e)=>setEditingNotes(prev=>({ ...prev, [s.id]: { ...(prev[s.id]||{}), catatan_sikap: e.target.value } }))} />
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={async ()=>{
                                    const notes = editingNotes[s.id];
                                    if (!notes || (!notes.catatan_akademik && !notes.catatan_sikap)) return;
                                    const histId = s.currentHistory?.id;
                                    if (!histId) return toast({ title: 'History tidak ditemukan', description: 'Tidak ada record history untuk siswa ini. Muat history terlebih dahulu.', variant: 'destructive' })
                                    try{
                                      await axios.put(`${API_BASE}/history/${histId}/catatan`, notes);
                                      toast({ title: 'Berhasil', description: 'Catatan disimpan' });
                                    }catch(e:any){ console.error(e); toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menyimpan catatan', variant: 'destructive' }) }
                                  }}>Simpan Catatan</Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="mt-4">
                  <DataTable<Row> columns={[{ header:'Nama', accessorKey:'nama' },{ header:'Keterangan', accessorKey:'keterangan' },{ id:'actions', header:'Aksi', accessorKey:'id' as any }]} data={data} onDelete={(r)=>setDeleting(r)} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
