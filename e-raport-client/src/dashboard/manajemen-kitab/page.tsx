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

type Kitab = { id:number; nama_kitab:string; }
type FormValues = { nama_kitab:string; }

export default function ManajemenKitabPage(){
  const [data, setData] = useState<Kitab[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Kitab | null>(null)
  const [deleting, setDeleting] = useState<Kitab | null>(null)
  const { toast } = useToast()
  const form = useForm<FormValues>({ defaultValues: { nama_kitab:'' } })
  const addForm = useForm<FormValues>({ defaultValues: { nama_kitab:'' } })
  const [addOpen, setAddOpen] = useState(false)

  const fetchData = async ()=>{ 
    setLoading(true); 
    try { 
      const res = await axios.get(`${API_BASE}/kitab`); 
      setData(res.data) 
    } catch(e:any) { 
      console.error(e); 
      toast({ title: 'Gagal', description: 'Gagal memuat data kitab', variant:'destructive' }) 
    } finally { 
      setLoading(false) 
    } 
  }
  
  useEffect(()=>{ fetchData() }, [])

  const handleAdd = async (vals: FormValues) => {
    try {
      await axios.post(`${API_BASE}/kitab`, vals);
      await fetchData();
      toast({ title: 'Berhasil', description: 'Kitab baru ditambahkan' });
      addForm.reset();
      setAddOpen(false);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menambahkan', variant: 'destructive' });
    }
  }

  const handleEdit = async (vals: FormValues) => {
    if (!editing) return;
    try {
      await axios.put(`${API_BASE}/kitab/${editing.id}`, vals);
      await fetchData();
      setEditing(null);
      toast({ title: 'Berhasil', description: 'Perubahan disimpan' });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menyimpan', variant: 'destructive' });
    }
  }

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await axios.delete(`${API_BASE}/kitab/${deleting.id}`);
      await fetchData();
      setDeleting(null);
      toast({ title: 'Berhasil', description: 'Kitab telah dihapus' });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menghapus', variant: 'destructive' });
    }
  }

  const columns: ColumnDef<Kitab, any>[] = [
    { header: 'Nama Kitab', accessorKey: 'nama_kitab' },
    { id: 'actions', header: 'Aksi', accessorKey: 'id' as any }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Manajemen Kitab</h1><p className="text-muted-foreground">Kelola daftar kitab yang digunakan dalam pembelajaran</p></div>
        <Card>
          <CardContent>
            {loading ? <div>Memuat...</div> : (
              <div>
                <div className="flex justify-between items-center mb-4"><div/> 
                  <Dialog open={addOpen} onOpenChange={setAddOpen}>
                    <DialogTrigger asChild><Button>Tambah Kitab</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Tambah Kitab Baru</DialogTitle></DialogHeader>
                      <form onSubmit={addForm.handleSubmit(handleAdd)} className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="nama_kitab">Nama Kitab</Label>
                          <Input id="nama_kitab" {...addForm.register('nama_kitab',{ required: true })} />
                        </div>
                        <DialogFooter>
                          <div className="flex w-full justify-end gap-2">
                            <Button variant="outline" type="button" onClick={()=>setAddOpen(false)}>Batal</Button>
                            <Button type="submit">Simpan</Button>
                          </div>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <DataTable<Kitab> columns={columns} data={data} onEdit={(r)=>{ setEditing(r); form.reset({ nama_kitab: r.nama_kitab }) }} onDelete={(r)=>setDeleting(r)} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editing} onOpenChange={(v)=>{ if(!v) setEditing(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Kitab</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(handleEdit)} className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nama_kitab">Nama Kitab</Label>
                <Input id="edit-nama_kitab" {...form.register('nama_kitab',{ required: true })} />
              </div>
              <DialogFooter>
                <div className="flex w-full justify-end gap-2">
                  <Button variant="outline" type="button" onClick={()=>setEditing(null)}>Batal</Button>
                  <Button type="submit">Simpan</Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={!!deleting} onOpenChange={(v)=>{ if(!v) setDeleting(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
            <div className="py-2">Apakah Anda yakin ingin menghapus <strong>{deleting?.nama_kitab}</strong> ?</div>
            <DialogFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setDeleting(null)}>Batal</Button>
              <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}