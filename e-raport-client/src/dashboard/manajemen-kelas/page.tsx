
import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import axios from 'axios'
import API_BASE from '../../api'
import kelasService from '../../services/kelasService'
import { getAllTingkatans } from '../../services/tingkatanService'
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

type Kelas = { id: number; nama_kelas: string; kapasitas?: number | null; wali_kelas_id?: number | null; walikelas?: { id:number; nama?:string } }
type FormValues = { nama_kelas: string; kapasitas: number | string | null; wali_kelas_id: number | string | '' }

export default function ManajemenKelasPage() {
  const [data, setData] = useState<Kelas[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Kelas | null>(null)
  const [deleting, setDeleting] = useState<Kelas | null>(null)
  const [guruOptions, setGuruOptions] = useState<Array<{id:number; nama:string}>>([])
  const [tingkatanOptions, setTingkatanOptions] = useState<Array<{id?:number; nama_tingkatan:string}>>([])
  const [selectedTingkatan, setSelectedTingkatan] = useState<number | null>(null)
  const { toast } = useToast()

  const form = useForm<FormValues>({ defaultValues: { nama_kelas: '', kapasitas: '', wali_kelas_id: '' } })
  const addForm = useForm<FormValues>({ defaultValues: { nama_kelas: '', kapasitas: '', wali_kelas_id: '' } })
  const [addOpen, setAddOpen] = useState(false)

  async function fetchGuruOptions() {
    try { const res = await axios.get(`${API_BASE}/guru`); setGuruOptions(res.data || []) } catch(e){ console.error(e) }
  }

  async function fetchTingkatanOptions() {
    try { const t = await getAllTingkatans(); setTingkatanOptions(t || []) } catch(e){ console.error(e) }
  }

  async function fetchKelasForTingkatan(tingkatan_id: number | null) {
    setLoading(true)
    try {
      if (!tingkatan_id) { setData([]); return }
      const res = await kelasService.getAllKelas(`?tingkatan_id=${tingkatan_id}`)
      setData(res || [])
    } catch (e:any) { console.error(e); toast({ title: 'Gagal', description: 'Gagal memuat kelas untuk tingkatan', variant: 'destructive' }) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchTingkatanOptions(); fetchGuruOptions(); }, [])

  useEffect(() => { fetchKelasForTingkatan(selectedTingkatan) }, [selectedTingkatan])

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
          <p className="text-muted-foreground">Pilih Tingkatan terlebih dahulu, lalu kelola Kelas pada tingkatan tersebut.</p>
        </div>

        <Card>
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Label>Pilih Tingkatan</Label>
                <Select value={selectedTingkatan ?? ''} onChange={e => setSelectedTingkatan(e.target.value === '' ? null : Number(e.target.value))}>
                  <SelectItem value="">-- Pilih Tingkatan --</SelectItem>
                  {tingkatanOptions.map(t => (<SelectItem key={t.id} value={String(t.id)}>{t.nama_tingkatan}</SelectItem>))}
                </Select>
              </div>

              <div>
                <Dialog open={addOpen} onOpenChange={v => setAddOpen(v)}>
                  <DialogTrigger asChild>
                    <Button disabled={!selectedTingkatan}>Tambah Kelas</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tambah Kelas</DialogTitle>
                      <DialogDescription>Tambahkan nama kelas dan wali kelas. Tingkatan sudah ditentukan oleh filter.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={addForm.handleSubmit(async (vals) => {
                      try {
                        if (!selectedTingkatan) { toast({ title: 'Pilih Tingkatan', description: 'Pilih tingkatan terlebih dahulu', variant: 'destructive' }); return }
                        let kapasitasVal: number | null = null
                        if (vals.kapasitas !== '' && vals.kapasitas !== null) {
                          kapasitasVal = Number(vals.kapasitas as any)
                          if (isNaN(kapasitasVal)) kapasitasVal = null
                        }
                        const payload: any = { ...vals, kapasitas: kapasitasVal, wali_kelas_id: vals.wali_kelas_id === '' ? null : (typeof vals.wali_kelas_id === 'string' ? Number(vals.wali_kelas_id) : vals.wali_kelas_id), tingkatan_id: selectedTingkatan }
                        await kelasService.createKelas(payload)
                        const updated = await kelasService.getAllKelas(`?tingkatan_id=${selectedTingkatan}`)
                        setData(updated)
                        toast({ title: 'Berhasil', description: 'Kelas ditambahkan' }); addForm.reset(); setAddOpen(false)
                      } catch (e:any) { console.error(e); toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menambahkan', variant: 'destructive' }) }
                    })} className="grid grid-cols-2 gap-4 py-4">
                      <div className="space-y-2"><Label htmlFor="nama_kelas">Nama Kelas</Label><Input id="nama_kelas" {...addForm.register('nama_kelas', { required: 'Nama kelas wajib' })} /></div>
                      <div className="space-y-2"><Label htmlFor="kapasitas">Kapasitas</Label><Input id="kapasitas" type="number" {...addForm.register('kapasitas')} /></div>
                      <div className="space-y-2 col-span-2"><Label htmlFor="wali_kelas_id">Wali Kelas</Label>
                        <Controller control={addForm.control} name="wali_kelas_id" render={({ field }) => (
                          <Select id="wali_kelas_id" value={(field.value ?? '') as any} onChange={e => field.onChange((e.target as HTMLSelectElement).value)}>
                            <SelectItem value="">-- Pilih Wali --</SelectItem>
                            {guruOptions.map(g => (<SelectItem key={g.id} value={String(g.id)}>{g.nama}</SelectItem>))}
                          </Select>
                        )} />
                      </div>
                      <DialogFooter>
                        <div className="flex w-full justify-end gap-2"><Button variant="outline" type="button" onClick={() => setAddOpen(false)}>Batal</Button><Button type="submit">Simpan</Button></div>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div>
              <DataTable<Kelas> columns={columns} data={data} onEdit={(r) => { setEditing(r); form.reset({ nama_kelas: r.nama_kelas, kapasitas: r.kapasitas ?? '', wali_kelas_id: r.wali_kelas_id ?? '' }) }} onDelete={(r) => setDeleting(r)} />
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Kelas</DialogTitle><DialogDescription>Perbarui data kelas</DialogDescription></DialogHeader>
            <form onSubmit={form.handleSubmit(async (vals) => {
              if (!editing) return
              try {
                let kapasitasVal: number | null = null
                if (vals.kapasitas !== '' && vals.kapasitas !== null) {
                  kapasitasVal = Number(vals.kapasitas as any)
                  if (isNaN(kapasitasVal)) kapasitasVal = null
                }
                const payload: any = { ...vals, kapasitas: kapasitasVal, wali_kelas_id: vals.wali_kelas_id === '' ? null : (typeof vals.wali_kelas_id === 'string' ? Number(vals.wali_kelas_id) : vals.wali_kelas_id) }
                await kelasService.updateKelas(editing.id, payload)
                const updated = selectedTingkatan ? await kelasService.getAllKelas(`?tingkatan_id=${selectedTingkatan}`) : await kelasService.getAllKelas()
                setData(updated)
                setEditing(null)
                toast({ title: 'Berhasil', description: 'Perubahan disimpan' })
              } catch (e:any) { console.error(e); toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menyimpan', variant: 'destructive' }) }
            })} className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2"><Label htmlFor="edit-nama_kelas">Nama Kelas</Label><Input id="edit-nama_kelas" {...form.register('nama_kelas', { required: 'Nama kelas wajib' })} /></div>
              <div className="space-y-2"><Label htmlFor="edit-kapasitas">Kapasitas</Label><Input id="edit-kapasitas" type="number" {...form.register('kapasitas')} /></div>
              <div className="space-y-2 col-span-2"><Label htmlFor="edit-wali_kelas_id">Wali Kelas</Label>
                <Controller control={form.control} name="wali_kelas_id" render={({ field }) => (
                  <Select id="edit-wali_kelas_id" value={(field.value ?? '') as any} onChange={e => field.onChange((e.target as HTMLSelectElement).value)}>
                    <SelectItem value="">-- Pilih Wali --</SelectItem>
                    {guruOptions.map(g => (<SelectItem key={g.id} value={String(g.id)}>{g.nama}</SelectItem>))}
                  </Select>
                )} />
              </div>
              <DialogFooter><div className="flex w-full justify-end gap-2"><Button variant="outline" type="button" onClick={() => setEditing(null)}>Batal</Button><Button type="submit">Simpan</Button></div></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleting} onOpenChange={(v) => { if (!v) setDeleting(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
            <div className="py-2">Apakah Anda yakin ingin menghapus kelas <strong>{deleting?.nama_kelas}</strong> ?</div>
            <DialogFooter className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button><Button variant="destructive" onClick={async () => { if (!deleting) return; try { await kelasService.deleteKelas(deleting.id); const updated = selectedTingkatan ? await kelasService.getAllKelas(`?tingkatan_id=${selectedTingkatan}`) : await kelasService.getAllKelas(); setData(updated); setDeleting(null); toast({ title: 'Berhasil', description: 'Data dihapus' }); } catch (e:any) { console.error(e); toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menghapus', variant: 'destructive' }) } }}>Hapus</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
