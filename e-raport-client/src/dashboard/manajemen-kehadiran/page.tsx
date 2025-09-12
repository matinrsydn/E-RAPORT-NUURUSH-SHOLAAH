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
import { Button } from '../../components/ui/button'
import { Select } from '../../components/ui/select'
import { useToast } from '../../components/ui/toast'

type Kehadiran = { id:number; nama:string; kode?:string }

export default function ManajemenKehadiranPage(){
  const [data, setData] = useState<Kehadiran[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Kehadiran | null>(null)
  const [deleting, setDeleting] = useState<Kehadiran | null>(null)
  const { toast } = useToast()
  const form = useForm<{ nama:string; kode?:string }>({ defaultValues: { nama: '', kode: '' } })
  const addForm = useForm<{ nama:string; kode?:string }>({ defaultValues: { nama: '', kode: '' } })
  const [addOpen, setAddOpen] = useState(false)

  const fetchData = async ()=>{
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/kehadiran`);
      setData(res.data);
    } catch (e) {
      console.error(e);
      if (axios.isAxiosError(e) && e.response) {
        if (e.response.status === 404) toast({ title: 'Endpoint tidak ditemukan', description: '/kehadiran', variant: 'destructive' })
        else toast({ title: 'Gagal', description: e.response.data?.message || 'Gagal memuat data', variant: 'destructive' })
      } else toast({ title: 'Gagal', description: String(e), variant: 'destructive' })
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ fetchData() }, [])

  const handleAdd = async (vals: { nama:string; kode?:string }) => {
    try {
      await axios.post(`${API_BASE}/kehadiran`, vals);
      await fetchData();
      toast({ title: 'Berhasil', description: 'Ditambahkan' });
      addForm.reset();
      setAddOpen(false);
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal', description: (axios.isAxiosError(e) && (e as any).response?.data?.message) || String(e), variant: 'destructive' })
    }
  }

  const handleEdit = async (vals: { nama:string; kode?:string }) => {
    if (!editing) return;
    try {
      await axios.put(`${API_BASE}/kehadiran/${editing.id}`, vals);
      await fetchData();
      setEditing(null);
      toast({ title: 'Berhasil', description: 'Perubahan disimpan' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal', description: (axios.isAxiosError(e) && (e as any).response?.data?.message) || String(e), variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await axios.delete(`${API_BASE}/kehadiran/${deleting.id}`);
      await fetchData();
      setDeleting(null);
      toast({ title: 'Berhasil', description: 'Di hapus' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal', description: (axios.isAxiosError(e) && (e as any).response?.data?.message) || String(e), variant: 'destructive' })
    }
  }

  const columns: ColumnDef<Kehadiran, any>[] = [
    { header: 'Nama', accessorKey: 'nama' },
    { header: 'Kode', accessorKey: 'kode' },
    { id: 'actions', header: 'Aksi', accessorKey: 'id' as any }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Manajemen Kehadiran</h1><p className="text-muted-foreground">Kelola jenis kehadiran</p></div>
        <Card>
          <CardContent>
            {loading ? <div>Memuat...</div> : (
              <div>
                <div className="flex justify-between items-center mb-4"><div/> <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogTrigger asChild><Button>Tambah</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Tambah Kehadiran</DialogTitle><DialogDescription>Isi data kehadiran</DialogDescription></DialogHeader>
              <form onSubmit={addForm.handleSubmit(handleAdd)} className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2"><Label htmlFor="nama">Nama</Label><Input id="nama" {...addForm.register('nama',{ required: true })} /></div>
                <div className="space-y-2"><Label htmlFor="kode">Kode</Label><Input id="kode" {...addForm.register('kode')} /></div>
                <div className="col-span-2 mt-2"><DialogFooter><div className="flex w-full justify-end gap-2"><Button variant="outline" type="button" onClick={()=>setAddOpen(false)}>Batal</Button><Button type="submit">Simpan</Button></div></DialogFooter></div>
              </form></DialogContent></Dialog></div>
                <DataTable<Kehadiran> columns={columns} data={data} onEdit={(r)=>{ setEditing(r); form.reset({ nama: r.nama, kode: r.kode }) }} onDelete={(r)=>setDeleting(r)} />
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editing} onOpenChange={(v)=>{ if(!v) setEditing(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Kehadiran</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(handleEdit)} className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2"><Label htmlFor="edit-nama">Nama</Label><Input id="edit-nama" {...form.register('nama',{ required: true })} /></div>
              <div className="space-y-2"><Label htmlFor="edit-kode">Kode</Label><Input id="edit-kode" {...form.register('kode')} /></div>
              <DialogFooter><div className="flex w-full justify-end gap-2"><Button variant="outline" type="button" onClick={()=>setEditing(null)}>Batal</Button><Button type="submit">Simpan</Button></div></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleting} onOpenChange={(v)=>{ if(!v) setDeleting(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
            <div className="py-2">Apakah Anda yakin ingin menghapus <strong>{deleting?.nama}</strong> ?</div>
            <DialogFooter className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setDeleting(null)}>Batal</Button><Button variant="destructive" onClick={handleDelete}>Hapus</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
