import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import API_BASE from '../../api'
import kehadiranService from '../../services/kehadiranService'
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

type Kehadiran = { id:number; nama_kegiatan:string; is_active?: boolean }

export default function ManajemenKehadiranPage(){
  const [data, setData] = useState<Kehadiran[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Kehadiran | null>(null)
  const [deleting, setDeleting] = useState<Kehadiran | null>(null)
  const { toast } = useToast()
  const form = useForm<{ nama_kegiatan:string }>({ defaultValues: { nama_kegiatan: '' } })
  const addForm = useForm<{ nama_kegiatan:string }>({ defaultValues: { nama_kegiatan: '' } })
  const [addOpen, setAddOpen] = useState(false)

  const fetchData = async ()=>{
    setLoading(true);
    try {
      const rows = await kehadiranService.getAllKehadiran();
      setData(rows);
    } catch (e) {
      console.error(e);
      // @ts-ignore
      if (e?.response?.status === 404) toast({ title: 'Endpoint tidak ditemukan', description: '/kehadiran', variant: 'destructive' })
      else toast({ title: 'Gagal', description: e?.response?.data?.message || String(e), variant: 'destructive' })
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ fetchData() }, [])

  const handleAdd = async (vals: { nama_kegiatan:string }) => {
    try {
      await kehadiranService.createKehadiran({ nama_kegiatan: vals.nama_kegiatan });
      await fetchData();
      toast({ title: 'Berhasil', description: 'Ditambahkan' });
      addForm.reset();
      setAddOpen(false);
    } catch (e) {
      console.error(e);
      // @ts-ignore
      toast({ title: 'Gagal', description: e?.response?.data?.message || String(e), variant: 'destructive' })
    }
  }

  const handleEdit = async (vals: { nama_kegiatan:string }) => {
    if (!editing) return;
    try {
      await kehadiranService.updateKehadiran(editing.id, { nama_kegiatan: vals.nama_kegiatan });
      await fetchData();
      setEditing(null);
      toast({ title: 'Berhasil', description: 'Perubahan disimpan' });
    } catch (e) {
      console.error(e);
      // @ts-ignore
      toast({ title: 'Gagal', description: e?.response?.data?.message || String(e), variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await kehadiranService.deleteKehadiran(deleting.id);
      await fetchData();
      setDeleting(null);
      toast({ title: 'Berhasil', description: 'Di hapus' });
    } catch (e) {
      console.error(e);
      // @ts-ignore
      toast({ title: 'Gagal', description: e?.response?.data?.message || String(e), variant: 'destructive' })
    }
  }

  const columns: ColumnDef<Kehadiran, any>[] = [
    { header: 'Nama Kegiatan', accessorKey: 'nama_kegiatan' },
    { header: 'Aktif', accessorFn: r => r.is_active ? 'Ya' : 'Tidak' },
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
                <div className="space-y-2"><Label htmlFor="nama_kegiatan">Nama Kegiatan</Label><Input id="nama_kegiatan" {...addForm.register('nama_kegiatan',{ required: true })} /></div>
                <div className="col-span-2 mt-2"><DialogFooter><div className="flex w-full justify-end gap-2"><Button variant="outline" type="button" onClick={()=>setAddOpen(false)}>Batal</Button><Button type="submit">Simpan</Button></div></DialogFooter></div>
              </form></DialogContent></Dialog></div>
                <DataTable<Kehadiran> columns={columns} data={data} onEdit={(r)=>{ setEditing(r); form.reset({ nama_kegiatan: r.nama_kegiatan }) }} onDelete={(r)=>setDeleting(r)} />
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editing} onOpenChange={(v)=>{ if(!v) setEditing(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Kehadiran</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(handleEdit)} className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2"><Label htmlFor="edit-nama_kegiatan">Nama Kegiatan</Label><Input id="edit-nama_kegiatan" {...form.register('nama_kegiatan',{ required: true })} /></div>
              <DialogFooter><div className="flex w-full justify-end gap-2"><Button variant="outline" type="button" onClick={()=>setEditing(null)}>Batal</Button><Button type="submit">Simpan</Button></div></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleting} onOpenChange={(v)=>{ if(!v) setDeleting(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
            <div className="py-2">Apakah Anda yakin ingin menghapus <strong>{deleting?.nama_kegiatan}</strong> ?</div>
            <DialogFooter className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setDeleting(null)}>Batal</Button><Button variant="destructive" onClick={handleDelete}>Hapus</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
