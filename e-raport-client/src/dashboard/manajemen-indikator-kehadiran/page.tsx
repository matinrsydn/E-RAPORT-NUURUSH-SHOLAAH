import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import API_BASE from '../../api'
import axios from 'axios'
import DataTable from '../../components/data-table'
import { Card, CardContent } from '../../components/ui/card'
import type { ColumnDef } from '@tanstack/react-table'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { useForm } from 'react-hook-form'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Button } from '../../components/ui/button'
import { useToast } from '../../components/ui/toast'

type Indikator = { id:number; nama_kegiatan:string; is_active?: boolean }
type FormValues = { nama_kegiatan: string; is_active?: boolean }

export default function ManajemenIndikatorKehadiranPage(){
  const [data, setData] = useState<Indikator[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Indikator | null>(null)
  const [deleting, setDeleting] = useState<Indikator | null>(null)
  const { toast } = useToast()
  const form = useForm<FormValues>({ defaultValues: { nama_kegiatan: '', is_active: true } })
  const addForm = useForm<FormValues>({ defaultValues: { nama_kegiatan: '', is_active: true } })
  const [addOpen, setAddOpen] = useState(false)

  const fetchData = async ()=>{
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/indikator-kehadiran`);
      setData(res.data);
    } catch (e) {
      console.error(e);
      if (axios.isAxiosError(e) && e.response) {
        if (e.response.status === 404) {
          toast({ title: 'Endpoint tidak ditemukan', description: '/indikator-kehadiran', variant: 'destructive' });
        } else {
          toast({ title: 'Gagal', description: e.response.data?.message || 'Gagal memuat data', variant: 'destructive' });
        }
      } else {
        toast({ title: 'Gagal', description: String(e), variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [])

  const handleAdd = async (vals: FormValues) => {
    try {
      await axios.post(`${API_BASE}/indikator-kehadiran`, vals);
      await fetchData();
      toast({ title: 'Berhasil', description: 'Indikator ditambahkan' });
      addForm.reset();
      setAddOpen(false);
    } catch (e) {
      console.error(e);
      if (axios.isAxiosError(e) && e.response) {
        if (e.response.status === 404) toast({ title: 'Endpoint tidak ditemukan', description: '/indikator-kehadiran', variant: 'destructive' })
        else toast({ title: 'Gagal', description: e.response.data?.message || 'Gagal menambahkan', variant: 'destructive' })
      } else toast({ title: 'Gagal', description: String(e), variant: 'destructive' })
    }
  }

  const handleEdit = async (vals: FormValues) => {
    if (!editing) return;
    try {
      await axios.put(`${API_BASE}/indikator-kehadiran/${editing.id}`, vals);
      await fetchData();
      setEditing(null);
      toast({ title: 'Berhasil', description: 'Perubahan disimpan' });
    } catch (e) {
      console.error(e);
      if (axios.isAxiosError(e) && e.response) {
        if (e.response.status === 404) toast({ title: 'Endpoint tidak ditemukan', description: '/indikator-kehadiran', variant: 'destructive' })
        else toast({ title: 'Gagal', description: e.response.data?.message || 'Gagal menyimpan', variant: 'destructive' })
      } else toast({ title: 'Gagal', description: String(e), variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await axios.delete(`${API_BASE}/indikator-kehadiran/${deleting.id}`);
      await fetchData();
      setDeleting(null);
      toast({ title: 'Berhasil', description: 'Indikator dihapus' });
    } catch (e) {
      console.error(e);
      if (axios.isAxiosError(e) && e.response) {
        if (e.response.status === 404) toast({ title: 'Endpoint tidak ditemukan', description: '/indikator-kehadiran', variant: 'destructive' })
        else toast({ title: 'Gagal', description: e.response.data?.message || 'Gagal menghapus', variant: 'destructive' })
      } else toast({ title: 'Gagal', description: String(e), variant: 'destructive' })
    }
  }

  const columns: ColumnDef<Indikator, any>[] = [
    { header: 'Nama Kegiatan', accessorKey: 'nama_kegiatan' },
    { header: 'Aktif', accessorFn: r => r.is_active ? 'Ya' : 'Tidak' },
    { id: 'actions', header: 'Aksi', accessorKey: 'id' as any }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Manajemen Indikator Kehadiran</h1><p className="text-muted-foreground">Kelola indikator kehadiran</p></div>
        <Card>
          <CardContent>
            {loading ? <div>Memuat...</div> : (
              <div>
                <div className="flex justify-between items-center mb-4"><div/> <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogTrigger asChild><Button>Tambah Indikator</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Tambah Indikator Kehadiran</DialogTitle><DialogDescription>Isi nama kegiatan indikator</DialogDescription></DialogHeader>
              <form onSubmit={addForm.handleSubmit(handleAdd)} className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2"><Label htmlFor="nama_kegiatan">Nama Kegiatan</Label><Input id="nama_kegiatan" {...addForm.register('nama_kegiatan',{ required: true })} /></div>
                <div className="col-span-2 mt-2"><DialogFooter><div className="flex w-full justify-end gap-2"><Button variant="outline" type="button" onClick={()=>setAddOpen(false)}>Batal</Button><Button type="submit">Simpan</Button></div></DialogFooter></div>
              </form></DialogContent></Dialog></div>
                <DataTable<Indikator> columns={columns} data={data} onEdit={(r)=>{ setEditing(r); form.reset({ nama_kegiatan: r.nama_kegiatan, is_active: r.is_active }) }} onDelete={(r)=>setDeleting(r)} />
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editing} onOpenChange={(v)=>{ if(!v) setEditing(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Indikator Kehadiran</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(handleEdit)} className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2"><Label htmlFor="edit-nama_kegiatan">Nama Kegiatan</Label><Input id="edit-nama_kegiatan" {...form.register('nama_kegiatan',{ required: true })} /></div>
              <DialogFooter><div className="flex w-full justify-end gap-2"><Button variant="outline" type="button" onClick={()=>setEditing(null)}>Batal</Button><Button type="submit">Simpan</Button></div></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleting} onOpenChange={(v)=>{ if(!v) setDeleting(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
            <div className="py-2">Apakah Anda yakin ingin menghapus indikator <strong>{deleting?.nama_kegiatan}</strong> ?</div>
            <DialogFooter className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setDeleting(null)}>Batal</Button><Button variant="destructive" onClick={handleDelete}>Hapus</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
