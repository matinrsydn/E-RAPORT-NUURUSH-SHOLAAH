import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import API_BASE from '../../api'
import axios from 'axios'
import nilaiService from '../../services/nilaiService'
import DataTable from '../../components/data-table'
import { Card, CardContent } from '../../components/ui/card'
import type { ColumnDef } from '@tanstack/react-table'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { useForm, Controller } from 'react-hook-form'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Button } from '../../components/ui/button'
import { Select, SelectItem } from '../../components/ui/select'
import { useToast } from '../../components/ui/toast'

type NilaiHafalan = { id:number; siswa_nis?:string; mapel_nama?:string; nilai?:number }

export default function ManajemenNilaiHafalanPage(){
  const [data, setData] = useState<NilaiHafalan[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<NilaiHafalan | null>(null)
  const [deleting, setDeleting] = useState<NilaiHafalan | null>(null)
  const { toast } = useToast()
  const form = useForm<{ siswa_id:number; mapel_id:number; nilai:number; semester:string; tahun_ajaran_id:number }>({ defaultValues: { siswa_id:0, mapel_id:0, nilai:0, semester: '1', tahun_ajaran_id: 0 } })
  const addForm = useForm<{ siswa_id:number; mapel_id:number; nilai:number; semester:string; tahun_ajaran_id:number }>({ defaultValues: { siswa_id:0, mapel_id:0, nilai:0, semester: '1', tahun_ajaran_id: 0 } })
  const [addOpen, setAddOpen] = useState(false)
  const [siswaOptions, setSiswaOptions] = useState<any[]>([])
  const [mapelOptions, setMapelOptions] = useState<any[]>([])
  const [tahunOptions, setTahunOptions] = useState<any[]>([])

  const fetchData = async ()=>{
    setLoading(true)
    try{
      // backend exposes generic /nilai endpoint (see e-raport-api/routes/nilaiRoutes.js)
  const res = await nilaiService.getAllNilai()
  // filter client-side for hafalan-type entries when backend doesn't separate endpoints
  setData(res.filter((r:any) => r.jenis === 'Hafalan' || String(r.mapel_text || '').toLowerCase().includes('hafalan')))
  }catch(e){
      console.error(e)
      if(axios.isAxiosError(e) && e.response){
        if(e.response.status === 404) toast({ title: 'Endpoint tidak ditemukan', description: '/nilai', variant:'destructive' })
        else toast({ title: 'Gagal memuat data', description: e.response.data?.message || e.message, variant:'destructive' })
      } else {
        toast({ title: 'Gagal memuat data', description: String(e), variant:'destructive' })
      }
    } finally{
      setLoading(false)
    }
  }

  const fetchOptions = async ()=>{
    try{
      const s = await axios.get(`${API_BASE}/siswa`)
      setSiswaOptions(s.data)
      // backend route is '/mata-pelajaran'
      const m = await axios.get(`${API_BASE}/mata-pelajaran`)
      setMapelOptions(m.data)
      const t = await axios.get(`${API_BASE}/tahun-ajaran`)
      setTahunOptions(t.data)
    } catch (e) {
      console.warn('fetchOptions error', e)
      if (axios.isAxiosError(e) && e.response) {
        if (e.response.status === 404) toast({ title: 'Endpoint tidak ditemukan', description: '/siswa or /mata-pelajaran', variant: 'destructive' })
        else toast({ title: 'Gagal memuat opsi', description: e.response.data?.message || e.message, variant: 'destructive' })
      } else {
        toast({ title: 'Gagal memuat opsi', description: String(e), variant: 'destructive' })
      }
    }
  }

  useEffect(()=>{ fetchData(); fetchOptions() }, [])

  // handlers
  const handleAdd = async (vals: any) => {
    try {
      // ensure numeric ids
      vals.siswa_id = Number(vals.siswa_id);
      vals.mapel_id = Number(vals.mapel_id);
      vals.tahun_ajaran_id = Number(vals.tahun_ajaran_id);
      const payload = { ...vals, jenis: 'Hafalan' };
  await nilaiService.createNilai(payload);
  await fetchData();
      toast({ title: 'Berhasil', description: 'Ditambahkan' });
      addForm.reset();
      setAddOpen(false);
    } catch (e) {
      console.error(e);
      if (axios.isAxiosError(e) && e.response) {
        if (e.response.status === 404) toast({ title: 'Endpoint tidak ditemukan', description: '/nilai', variant: 'destructive' })
        else toast({ title: 'Gagal', description: e.response.data?.message || 'Gagal menambahkan', variant: 'destructive' })
      } else toast({ title: 'Gagal', description: String(e), variant: 'destructive' })
    }
  }

  const handleEdit = async (vals: any) => {
    if (!editing) return;
    try {
      vals.siswa_id = Number(vals.siswa_id);
      vals.mapel_id = Number(vals.mapel_id);
      vals.tahun_ajaran_id = Number(vals.tahun_ajaran_id);
      const payload = { ...vals, jenis: 'Hafalan' };
  await nilaiService.updateNilai(editing.id, payload);
  await fetchData();
      setEditing(null);
      toast({ title: 'Berhasil', description: 'Perubahan disimpan' });
    } catch (e) {
      console.error(e);
      if (axios.isAxiosError(e) && e.response) {
        if (e.response.status === 404) toast({ title: 'Endpoint tidak ditemukan', description: '/nilai', variant: 'destructive' })
        else toast({ title: 'Gagal', description: e.response.data?.message || 'Gagal menyimpan', variant: 'destructive' })
      } else toast({ title: 'Gagal', description: String(e), variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deleting) return;
    try {
  await nilaiService.deleteNilai(deleting.id);
  await fetchData();
      setDeleting(null);
      toast({ title: 'Berhasil', description: 'Di hapus' });
    } catch (e) {
      console.error(e);
      if (axios.isAxiosError(e) && e.response) {
        if (e.response.status === 404) toast({ title: 'Endpoint tidak ditemukan', description: '/nilai', variant: 'destructive' })
        else toast({ title: 'Gagal', description: e.response.data?.message || 'Gagal menghapus', variant: 'destructive' })
      } else toast({ title: 'Gagal', description: String(e), variant: 'destructive' })
    }
  }

  const columns: ColumnDef<NilaiHafalan, any>[] = [
    { header: 'Siswa', accessorFn: r => r.siswa_nis || '' },
    { header: 'Mata Pelajaran', accessorFn: r => r.mapel_nama || '' },
    { header: 'Nilai', accessorKey: 'nilai' },
    { id: 'actions', header: 'Aksi', accessorKey: 'id' as any }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Manajemen Nilai Hafalan</h1><p className="text-muted-foreground">Kelola nilai hafalan siswa</p></div>
        <Card>
          <CardContent>
            {loading ? <div>Memuat...</div> : (
              <div>
                <div className="flex justify-between items-center mb-4"><div/> <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogTrigger asChild><Button>Tambah</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Tambah Nilai Hafalan</DialogTitle></DialogHeader>
        <form onSubmit={addForm.handleSubmit(handleAdd)} className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2"><Label>Siswa</Label><Controller control={addForm.control} name="siswa_id" render={({ field })=> (
                  <Select value={(field.value ?? '') as any} onChange={e => field.onChange((e.target as HTMLSelectElement).value)}>
                    <SelectItem value="">-- Pilih Siswa --</SelectItem>
                    {siswaOptions.map(s=> <SelectItem key={s.id} value={String(s.id)}>{s.nis} - {s.nama}</SelectItem>)}
                  </Select>
                )} /></div>
                <div className="space-y-2"><Label>Mapel</Label><Controller control={addForm.control} name="mapel_id" render={({ field })=> (
                  <Select value={(field.value ?? '') as any} onChange={e => field.onChange((e.target as HTMLSelectElement).value)}>
                    <SelectItem value="">-- Pilih Mapel --</SelectItem>
                    {mapelOptions.map(m=> <SelectItem key={m.id} value={String(m.id)}>{m.nama_mapel}</SelectItem>)}
                  </Select>
                )} /></div>
                <div className="space-y-2"><Label>Semester</Label><Controller control={addForm.control} name="semester" render={({ field })=> (
                  <Select value={(field.value ?? '') as any} onChange={e => field.onChange((e.target as HTMLSelectElement).value)}>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                  </Select>
                )} /></div>
                <div className="space-y-2"><Label>Tahun Ajaran</Label><Controller control={addForm.control} name="tahun_ajaran_id" render={({ field })=> (
                  <Select value={(field.value ?? '') as any} onChange={e => field.onChange((e.target as HTMLSelectElement).value)}>
                    <SelectItem value="">-- Pilih Tahun Ajaran --</SelectItem>
                    {tahunOptions.map(t=> <SelectItem key={t.id} value={String(t.id)}>{t.nama_ajaran} (Sem {t.semester})</SelectItem>)}
                  </Select>
                )} /></div>
                <div className="space-y-2"><Label>Nilai</Label><Input type="number" {...addForm.register('nilai',{ valueAsNumber:true })} /></div>
                <div className="col-span-2 mt-2"><DialogFooter><div className="flex w-full justify-end gap-2"><Button variant="outline" type="button" onClick={()=>setAddOpen(false)}>Batal</Button><Button type="submit">Simpan</Button></div></DialogFooter></div>
              </form></DialogContent></Dialog></div>
                <DataTable<NilaiHafalan> columns={columns} data={data} onEdit={(r)=>{ setEditing(r); form.reset({ siswa_id: (r as any).siswa_id || 0, mapel_id: (r as any).mapel_id || 0, nilai: r.nilai || 0 }) }} onDelete={(r)=>setDeleting(r)} />
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editing} onOpenChange={(v)=>{ if(!v) setEditing(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Nilai Hafalan</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(handleEdit)} className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2"><Label>Siswa</Label><Controller control={form.control} name="siswa_id" render={({ field })=> (
                <Select value={(field.value ?? '') as any} onChange={e => field.onChange((e.target as HTMLSelectElement).value)}>
                  <SelectItem value="">-- Pilih Siswa --</SelectItem>
                  {siswaOptions.map(s=> <SelectItem key={s.id} value={String(s.id)}>{s.nis} - {s.nama}</SelectItem>)}
                </Select>
              )} /></div>
              <div className="space-y-2"><Label>Mapel</Label><Controller control={form.control} name="mapel_id" render={({ field })=> (
                <Select value={(field.value ?? '') as any} onChange={e => field.onChange((e.target as HTMLSelectElement).value)}>
                  <SelectItem value="">-- Pilih Mapel --</SelectItem>
                  {mapelOptions.map(m=> <SelectItem key={m.id} value={String(m.id)}>{m.nama_mapel}</SelectItem>)}
                </Select>
              )} /></div>
              <div className="space-y-2"><Label>Semester</Label><Controller control={form.control} name="semester" render={({ field })=> (
                <Select value={(field.value ?? '') as any} onChange={e => field.onChange((e.target as HTMLSelectElement).value)}>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                </Select>
              )} /></div>
              <div className="space-y-2"><Label>Tahun Ajaran</Label><Controller control={form.control} name="tahun_ajaran_id" render={({ field })=> (
                <Select value={(field.value ?? '') as any} onChange={e => field.onChange((e.target as HTMLSelectElement).value)}>
                  <SelectItem value="">-- Pilih Tahun Ajaran --</SelectItem>
                  {tahunOptions.map(t=> <SelectItem key={t.id} value={String(t.id)}>{t.nama_ajaran} (Sem {t.semester})</SelectItem>)}
                </Select>
              )} /></div>
              <div className="space-y-2"><Label>Nilai</Label><Input type="number" {...form.register('nilai',{ valueAsNumber:true })} /></div>
              <DialogFooter><div className="flex w-full justify-end gap-2"><Button variant="outline" type="button" onClick={()=>setEditing(null)}>Batal</Button><Button type="submit">Simpan</Button></div></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleting} onOpenChange={(v)=>{ if(!v) setDeleting(null) }}>
            <DialogContent>
            <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
            <div className="py-2">Apakah Anda yakin ingin menghapus nilai ?</div>
            <DialogFooter className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setDeleting(null)}>Batal</Button><Button variant="destructive" onClick={handleDelete}>Hapus</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
