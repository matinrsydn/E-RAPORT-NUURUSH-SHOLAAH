import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import API_BASE from '../../api'
import axios from 'axios'
import DataTable from '../../components/data-table'
import { Card, CardContent } from '../../components/ui/card'
import type { ColumnDef } from '@tanstack/react-table'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { useForm, Controller } from 'react-hook-form'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectItem } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { useToast } from '../../components/ui/toast'

type Kelas = { id: number; nama_kelas: string; kapasitas?: number; wali_kelas_id?: number; walikelas?: { id:number; nama?:string } }
type FormValues = { nama_kelas: string; kapasitas: number | string; wali_kelas_id: number | string | '' }

export default function ManajemenKelasPage() {
  const [data, setData] = useState<Kelas[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Kelas | null>(null)
  const [deleting, setDeleting] = useState<Kelas | null>(null)
  const [guruOptions, setGuruOptions] = useState<Array<{id:number; nama:string}>>([])
  const { toast } = useToast()

  const form = useForm<FormValues>({ defaultValues: { nama_kelas: '', kapasitas: '', wali_kelas_id: '' } })
  const addForm = useForm<FormValues>({ defaultValues: { nama_kelas: '', kapasitas: '', wali_kelas_id: '' } })
  const [addOpen, setAddOpen] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [res, resGuru] = await Promise.all([axios.get(`${API_BASE}/kelas`), axios.get(`${API_BASE}/guru`)])
      setData(res.data)
      setGuruOptions(resGuru.data)
    } catch (e) {
      console.error(e)
      toast({ title: 'Gagal', description: 'Tidak dapat memuat data kelas', variant: 'destructive' })
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const columns: ColumnDef<Kelas, any>[] = [
    { header: 'Nama Kelas', accessorKey: 'nama_kelas' },
    { header: 'Kapasitas', accessorKey: 'kapasitas' },
    { header: 'Wali Kelas', accessorFn: row => row.walikelas?.nama ?? '-' },
    { id: 'actions', header: 'Aksi', accessorKey: 'id' as any }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Kelas</h1>
          <p className="text-muted-foreground">Kelola data kelas dan wali kelas</p>
        </div>

        <Card>
          <CardContent>
            {loading ? <div>Memuat...</div> : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div />
                  <Dialog open={addOpen} onOpenChange={setAddOpen}>
                    <DialogTrigger asChild>
                      <Button>Tambah Kelas</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Tambah Kelas</DialogTitle>
                        <DialogDescription>Tambahkan nama kelas, tingkat, dan wali kelas.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={addForm.handleSubmit(async (vals)=>{
                        try {
                          const payload = { ...vals, kapasitas: vals.kapasitas === '' ? null : Number(vals.kapasitas), wali_kelas_id: vals.wali_kelas_id === '' ? null : (typeof vals.wali_kelas_id === 'string' ? Number(vals.wali_kelas_id) : vals.wali_kelas_id) }
                          await axios.post(`${API_BASE}/kelas`, payload)
                          await fetchData(); toast({ title: 'Berhasil', description: 'Kelas ditambahkan' }); addForm.reset(); setAddOpen(false)
                        } catch (e:any) { console.error(e); toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menambahkan', variant: 'destructive' }) }
                      })} className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2"><Label htmlFor="nama_kelas">Nama Kelas</Label><Input id="nama_kelas" {...addForm.register('nama_kelas',{ required: 'Nama kelas wajib' })} /></div>
                        <div className="space-y-2"><Label htmlFor="kapasitas">Kapasitas</Label><Input id="kapasitas" type="number" {...addForm.register('kapasitas',{ valueAsNumber: true })} /></div>
                        <div className="space-y-2 col-span-2"><Label htmlFor="wali_kelas_id">Wali Kelas</Label>
                          <Controller control={addForm.control} name="wali_kelas_id" render={({ field }) => (
                            <Select id="wali_kelas_id" value={(field.value ?? '') as any} onChange={e=>field.onChange((e.target as HTMLSelectElement).value)}>
                              <SelectItem value="">-- Pilih Wali --</SelectItem>
                              {guruOptions.map(g=> (<SelectItem key={g.id} value={String(g.id)}>{g.nama}</SelectItem>))}
                            </Select>
                          )} />
                        </div>
                        <DialogFooter>
                          <div className="flex w-full justify-end gap-2"><Button variant="outline" type="button" onClick={()=>setAddOpen(false)}>Batal</Button><Button type="submit">Simpan</Button></div>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <DataTable<Kelas> columns={columns} data={data} onEdit={(r)=>{ setEditing(r); form.reset({ nama_kelas: r.nama_kelas, kapasitas: r.kapasitas ?? '', wali_kelas_id: r.wali_kelas_id ?? '' }) }} onDelete={(r)=>setDeleting(r)} />
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editing} onOpenChange={(v)=>{ if(!v) setEditing(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Kelas</DialogTitle><DialogDescription>Perbarui data kelas</DialogDescription></DialogHeader>
            <form onSubmit={form.handleSubmit(async (vals)=>{ if(!editing) return; try{ const payload = { ...vals, wali_kelas_id: vals.wali_kelas_id === '' ? null : (typeof vals.wali_kelas_id === 'string' ? Number(vals.wali_kelas_id) : vals.wali_kelas_id) }; await axios.put(`${API_BASE}/kelas/${editing.id}`, payload); await fetchData(); setEditing(null); toast({ title: 'Berhasil', description: 'Perubahan disimpan' }); } catch(e:any){ console.error(e); toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menyimpan', variant: 'destructive' }) } })} className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2"><Label htmlFor="edit-nama_kelas">Nama Kelas</Label><Input id="edit-nama_kelas" {...form.register('nama_kelas',{ required: 'Nama kelas wajib' })} /></div>
              <div className="space-y-2"><Label htmlFor="edit-kapasitas">Kapasitas</Label><Input id="edit-kapasitas" type="number" {...form.register('kapasitas')} /></div>
              <div className="space-y-2 col-span-2"><Label htmlFor="edit-wali_kelas_id">Wali Kelas</Label>
                <Controller control={form.control} name="wali_kelas_id" render={({ field }) => (
                  <Select id="edit-wali_kelas_id" value={(field.value ?? '') as any} onChange={e=>field.onChange((e.target as HTMLSelectElement).value)}>
                    <SelectItem value="">-- Pilih Wali --</SelectItem>
                    {guruOptions.map(g=> (<SelectItem key={g.id} value={String(g.id)}>{g.nama}</SelectItem>))}
                  </Select>
                )} />
              </div>
              <DialogFooter><div className="flex w-full justify-end gap-2"><Button variant="outline" type="button" onClick={()=>setEditing(null)}>Batal</Button><Button type="submit">Simpan</Button></div></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleting} onOpenChange={(v)=>{ if(!v) setDeleting(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
            <div className="py-2">Apakah Anda yakin ingin menghapus kelas <strong>{deleting?.nama_kelas}</strong> ?</div>
            <DialogFooter className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setDeleting(null)}>Batal</Button><Button variant="destructive" onClick={async ()=>{ if(!deleting) return; try{ await axios.delete(`${API_BASE}/kelas/${deleting.id}`); await fetchData(); setDeleting(null); toast({ title: 'Berhasil', description: 'Data dihapus' }); } catch(e:any){ console.error(e); toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menghapus', variant:'destructive' }) } }}>Hapus</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
