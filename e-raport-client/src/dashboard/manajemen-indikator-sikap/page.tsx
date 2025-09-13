import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import API_BASE from '../../api'
import indikatorSikapService from '../../services/indikatorSikapService'
import DataTable from '../../components/data-table'
import { Card, CardContent } from '../../components/ui/card'
import type { ColumnDef } from '@tanstack/react-table'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { useForm } from 'react-hook-form'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Button } from '../../components/ui/button'
import { useToast } from '../../components/ui/toast'

type Indikator = { id:number; indikator:string; jenis_sikap:string; is_active?: boolean }
type FormValues = { indikator: string; jenis_sikap: 'Spiritual' | 'Sosial'; is_active?: boolean }

export default function ManajemenIndikatorSikapPage(){
  const [data, setData] = useState<Indikator[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Indikator | null>(null)
  const [deleting, setDeleting] = useState<Indikator | null>(null)
  const { toast } = useToast()
  const form = useForm<FormValues>({ defaultValues: { indikator: '', jenis_sikap: 'Spiritual', is_active: true } })
  const addForm = useForm<FormValues>({ defaultValues: { indikator: '', jenis_sikap: 'Spiritual', is_active: true } })
  const [addOpen, setAddOpen] = useState(false)

  const fetchData = async ()=>{
    setLoading(true);
    try {
  const rows = await indikatorSikapService.getAllIndikatorSikap();
      setData(rows);
    } catch (e) {
      console.error(e);
      // @ts-ignore
      if (e?.response?.status === 404) {
        toast({ title: 'Endpoint tidak ditemukan', description: '/indikator-sikap', variant: 'destructive' });
      } else {
        // @ts-ignore
        toast({ title: 'Gagal', description: e?.response?.data?.message || String(e), variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [])

  const handleAdd = async (vals: FormValues) => {
    try {
  await indikatorSikapService.createIndikatorSikap(vals);
      await fetchData();
      toast({ title: 'Berhasil', description: 'Indikator ditambahkan' });
  addForm.reset();
      setAddOpen(false);
    } catch (e) {
      console.error(e);
      // @ts-ignore
      if (e?.response?.status === 404) toast({ title: 'Endpoint tidak ditemukan', description: '/indikator-sikap', variant: 'destructive' })
      else toast({ title: 'Gagal', description: e?.response?.data?.message || String(e), variant: 'destructive' })
    }
  }

  const handleEdit = async (vals: FormValues) => {
    if (!editing) return;
    try {
  await indikatorSikapService.updateIndikatorSikap(editing.id, vals);
      await fetchData();
      setEditing(null);
      toast({ title: 'Berhasil', description: 'Perubahan disimpan' });
    } catch (e) {
      console.error(e);
      // @ts-ignore
      if (e?.response?.status === 404) toast({ title: 'Endpoint tidak ditemukan', description: '/indikator-sikap', variant: 'destructive' })
      else toast({ title: 'Gagal', description: e?.response?.data?.message || String(e), variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await indikatorSikapService.deleteIndikatorSikap(deleting.id);
      await fetchData();
      setDeleting(null);
      toast({ title: 'Berhasil', description: 'Indikator dihapus' });
    } catch (e) {
      console.error(e);
      // @ts-ignore
      if (e?.response?.status === 404) toast({ title: 'Endpoint tidak ditemukan', description: '/indikator-sikap', variant: 'destructive' })
      else toast({ title: 'Gagal', description: e?.response?.data?.message || String(e), variant: 'destructive' })
    }
  }

  const columns: ColumnDef<Indikator, any>[] = [
    { header: 'Jenis', accessorKey: 'jenis_sikap' },
    { header: 'Indikator', accessorKey: 'indikator' },
    { header: 'Aktif', accessorFn: r => r.is_active ? 'Ya' : 'Tidak' },
    { id: 'actions', header: 'Aksi', accessorKey: 'id' as any }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Manajemen Indikator Sikap</h1><p className="text-muted-foreground">Kelola indikator sikap</p></div>
        <Card>
          <CardContent>
            {loading ? <div>Memuat...</div> : (
              <div>
                <div className="flex justify-between items-center mb-4"><div/> <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogTrigger asChild><Button>Tambah Indikator</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Tambah Indikator Sikap</DialogTitle><DialogDescription>Isi indikator sikap</DialogDescription></DialogHeader>
              <form onSubmit={addForm.handleSubmit(handleAdd)} className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2"><Label htmlFor="indikator">Indikator</Label><Input id="indikator" {...addForm.register('indikator',{ required: true })} /></div>
                <div className="space-y-2"><Label htmlFor="jenis_sikap">Jenis Sikap</Label>
                  <select id="jenis_sikap" {...addForm.register('jenis_sikap')} className="w-full border rounded px-2 py-1">
                    <option value="Spiritual">Spiritual</option>
                    <option value="Sosial">Sosial</option>
                  </select>
                </div>
                <div className="col-span-2 mt-2"><DialogFooter><div className="flex w-full justify-end gap-2"><Button variant="outline" type="button" onClick={()=>setAddOpen(false)}>Batal</Button><Button type="submit">Simpan</Button></div></DialogFooter></div>
              </form></DialogContent></Dialog></div>
                <DataTable<Indikator> columns={columns} data={data} onEdit={(r)=>{ setEditing(r); form.reset({ indikator: r.indikator, jenis_sikap: r.jenis_sikap, is_active: r.is_active } as FormValues) }} onDelete={(r)=>setDeleting(r)} />
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editing} onOpenChange={(v)=>{ if(!v) setEditing(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Indikator Sikap</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(handleEdit)} className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2"><Label htmlFor="edit-indikator">Indikator</Label><Input id="edit-indikator" {...form.register('indikator',{ required: true })} /></div>
              <div className="space-y-2"><Label htmlFor="edit-jenis_sikap">Jenis Sikap</Label>
                <select id="edit-jenis_sikap" {...form.register('jenis_sikap')} className="w-full border rounded px-2 py-1">
                  <option value="Spiritual">Spiritual</option>
                  <option value="Sosial">Sosial</option>
                </select>
              </div>
              <DialogFooter><div className="flex w-full justify-end gap-2"><Button variant="outline" type="button" onClick={()=>setEditing(null)}>Batal</Button><Button type="submit">Simpan</Button></div></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleting} onOpenChange={(v)=>{ if(!v) setDeleting(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
            <div className="py-2">Apakah Anda yakin ingin menghapus indikator <strong>{deleting?.indikator}</strong> ?</div>
            <DialogFooter className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setDeleting(null)}>Batal</Button><Button variant="destructive" onClick={handleDelete}>Hapus</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
