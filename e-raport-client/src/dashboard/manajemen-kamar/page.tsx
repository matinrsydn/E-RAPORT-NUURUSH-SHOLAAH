import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import API_BASE from '../../api'
import kamarService from '../../services/kamarService'
import DataTable from '../../components/data-table'
import { Card, CardContent } from '../../components/ui/card'
import type { ColumnDef } from '@tanstack/react-table'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { useForm } from 'react-hook-form'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import { useToast } from '../../components/ui/toast'

type Kamar = { id:number; nama_kamar:string; kapasitas:number; keterangan?:string }
type FormValues = { nama_kamar:string; kapasitas:number | string; keterangan?:string }

export default function ManajemenKamarPage(){
  const [data, setData] = useState<Kamar[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Kamar | null>(null)
  const [deleting, setDeleting] = useState<Kamar | null>(null)
  const { toast } = useToast()
  const form = useForm<FormValues>({ defaultValues: { nama_kamar: '', kapasitas: '', keterangan: '' } })
  const addForm = useForm<FormValues>({ defaultValues: { nama_kamar: '', kapasitas: '', keterangan: '' } })
  const [addOpen, setAddOpen] = useState(false)

  const fetchData = async ()=>{ setLoading(true); try{ const res = await kamarService.getAllKamar(); setData(res) }catch(e){ console.error(e); toast({ title: 'Gagal', description: 'Gagal memuat kamar', variant:'destructive' }) } finally{ setLoading(false) } }
  useEffect(()=>{ fetchData() }, [])

  const columns: ColumnDef<Kamar, any>[] = [ { header: 'Nama Kamar', accessorKey: 'nama_kamar' }, { header: 'Kapasitas', accessorKey: 'kapasitas' }, { header: 'Keterangan', accessorKey: 'keterangan' }, { id: 'actions', header: 'Aksi', accessorKey: 'id' as any } ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Manajemen Kamar</h1><p className="text-muted-foreground">Kelola kamar dan kapasitas</p></div>
        <Card><CardContent>{loading ? <div>Memuat...</div> : (
          <div>
            <div className="flex justify-between items-center mb-4"><div/> <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogTrigger asChild><Button>Tambah Kamar</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Tambah Kamar</DialogTitle><DialogDescription>Isi informasi kamar</DialogDescription></DialogHeader>
              <form onSubmit={addForm.handleSubmit(async (vals)=>{ try{ const payload = { ...vals, kapasitas: Number(vals.kapasitas) || 0 }; await kamarService.createKamar(payload); const updated = await kamarService.getAllKamar(); setData(updated); toast({ title: 'Berhasil', description: 'Kamar ditambahkan' }); addForm.reset(); setAddOpen(false) }catch(e:any){ console.error(e); toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menambahkan', variant:'destructive' }) } })} className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2"><Label htmlFor="nama_kamar">Nama Kamar</Label><Input id="nama_kamar" {...addForm.register('nama_kamar',{ required: 'Nama kamar wajib' })} /></div>
                <div className="space-y-2"><Label htmlFor="kapasitas">Kapasitas</Label><Input id="kapasitas" type="number" {...addForm.register('kapasitas')} /></div>
                <div className="col-span-2 space-y-2"><Label htmlFor="keterangan">Keterangan</Label><Textarea id="keterangan" {...addForm.register('keterangan')} /></div>
                <DialogFooter><div className="flex w-full justify-end gap-2"><Button variant="outline" type="button" onClick={()=>setAddOpen(false)}>Batal</Button><Button type="submit">Simpan</Button></div></DialogFooter>
              </form></DialogContent></Dialog></div>
            <DataTable<Kamar> columns={columns} data={data} onEdit={(r)=>{ setEditing(r); form.reset({ nama_kamar: r.nama_kamar, kapasitas: r.kapasitas, keterangan: r.keterangan }) }} onDelete={(r)=>setDeleting(r)} />
          </div>
        )}</CardContent></Card>

        <Dialog open={!!editing} onOpenChange={(v)=>{ if(!v) setEditing(null) }}><DialogContent>
          <DialogHeader><DialogTitle>Edit Kamar</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(async (vals)=>{ if(!editing) return; try{ const payload = { ...vals, kapasitas: Number(vals.kapasitas) }; await kamarService.updateKamar(editing.id, payload); const updated = await kamarService.getAllKamar(); setData(updated); setEditing(null); toast({ title: 'Berhasil', description: 'Perubahan disimpan' }) }catch(e:any){ console.error(e); toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menyimpan', variant:'destructive' }) } })} className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label htmlFor="edit-nama_kamar">Nama Kamar</Label><Input id="edit-nama_kamar" {...form.register('nama_kamar',{ required: true })} /></div>
            <div className="space-y-2"><Label htmlFor="edit-kapasitas">Kapasitas</Label><Input id="edit-kapasitas" type="number" {...form.register('kapasitas',{ valueAsNumber: true })} /></div>
            <div className="col-span-2 space-y-2"><Label htmlFor="edit-keterangan">Keterangan</Label><Textarea id="edit-keterangan" {...form.register('keterangan')} /></div>
            <DialogFooter><div className="flex w-full justify-end gap-2"><Button variant="outline" type="button" onClick={()=>setEditing(null)}>Batal</Button><Button type="submit">Simpan</Button></div></DialogFooter>
          </form></DialogContent></Dialog>

        <Dialog open={!!deleting} onOpenChange={(v)=>{ if(!v) setDeleting(null) }}><DialogContent>
          <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
          <div className="py-2">Apakah Anda yakin ingin menghapus kamar <strong>{deleting?.nama_kamar}</strong> ?</div>
          <DialogFooter className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setDeleting(null)}>Batal</Button><Button variant="destructive" onClick={async ()=>{ if(!deleting) return; try{ await kamarService.deleteKamar(deleting.id); const updated = await kamarService.getAllKamar(); setData(updated); setDeleting(null); toast({ title: 'Berhasil', description: 'Kamar dihapus' }) }catch(e:any){ console.error(e); toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menghapus', variant:'destructive' }) } }}>Hapus</Button></DialogFooter>
        </DialogContent></Dialog>
      </div>
    </DashboardLayout>
  )
}
