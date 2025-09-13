import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import API_BASE, { UPLOADS_BASE } from '../../api'
import axios from 'axios'
import guruService from '../../services/guruService'
import DataTable from '../../components/data-table'
import { Card, CardContent } from '../../components/ui/card'
import type { ColumnDef } from '@tanstack/react-table'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { useForm, Controller } from 'react-hook-form'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Select, SelectItem } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { useToast } from '../../components/ui/toast'

type Guru = { id:number; nama:string; nip?:string; jenis_kelamin?:string; tempat_lahir?:string; tanggal_lahir?:string; telepon?:string; alamat?:string; status?:string; tanda_tangan?:string }
type FormValues = { nama:string; nip?:string; jenis_kelamin?:string; tempat_lahir?:string; tanggal_lahir?:string; telepon?:string; alamat?:string; status?:string }

export default function ManajemenGuruPage(){
  const [data, setData] = useState<Guru[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Guru | null>(null)
  const [deleting, setDeleting] = useState<Guru | null>(null)
  const { toast } = useToast()
  const form = useForm<FormValues>({ defaultValues: { nama: '', nip: '', jenis_kelamin: '', tempat_lahir: '', tanggal_lahir: '', telepon: '', alamat: '', status: 'Aktif' } })
  const addForm = useForm<FormValues>({ defaultValues: { nama: '', nip: '', jenis_kelamin: '', tempat_lahir: '', tanggal_lahir: '', telepon: '', alamat: '', status: 'Aktif' } })
  const [addOpen, setAddOpen] = useState(false)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)

  const fetchData = async ()=>{ setLoading(true); try{ const res = await guruService.getAllGuru(); setData(res) }catch(e){ console.error(e); toast({ title: 'Gagal', description: 'Gagal memuat guru', variant:'destructive' }) } finally{ setLoading(false) } }
  useEffect(()=>{ fetchData() }, [])

  const columns: ColumnDef<Guru, any>[] = [ { header: 'Nama', accessorKey: 'nama' }, { header: 'NIP', accessorKey: 'nip' }, { header: 'Telepon', accessorKey: 'telepon' }, { header: 'Status', accessorKey: 'status' }, { id: 'actions', header: 'Aksi', accessorKey: 'id' as any } ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Manajemen Guru</h1><p className="text-muted-foreground">Kelola data guru</p></div>
        <Card><CardContent>{loading ? <div>Memuat...</div> : (
          <div>
            <div className="flex justify-between items-center mb-4"><div/> <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogTrigger asChild><Button>Tambah Guru</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Tambah Guru</DialogTitle><DialogDescription>Isi informasi guru</DialogDescription></DialogHeader>
              <form onSubmit={addForm.handleSubmit(async (vals)=>{ try{ const payload = new FormData(); Object.keys(vals).forEach(k=>{ if(vals[k as keyof FormValues] !== undefined) payload.append(k, (vals as any)[k]) }); if(signatureFile) payload.append('tanda_tangan', signatureFile); await guruService.createGuru(payload); const updated = await guruService.getAllGuru(); setData(updated); toast({ title: 'Berhasil', description: 'Guru ditambahkan' }); addForm.reset(); setAddOpen(false); setSignatureFile(null) }catch(e:any){ console.error(e); toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menambahkan', variant:'destructive' }) } })} className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2"><Label htmlFor="nama">Nama</Label><Input id="nama" {...addForm.register('nama',{ required: true })} /></div>
                <div className="space-y-2"><Label htmlFor="nip">NIP</Label><Input id="nip" {...addForm.register('nip')} /></div>
                <div className="space-y-2"><Label htmlFor="jenis_kelamin">Jenis Kelamin</Label><Input id="jenis_kelamin" {...addForm.register('jenis_kelamin')} /></div>
                <div className="space-y-2"><Label htmlFor="telepon">Telepon</Label><Input id="telepon" {...addForm.register('telepon')} /></div>
                <div className="space-y-2"><Label htmlFor="tempat_lahir">Tempat Lahir</Label><Input id="tempat_lahir" {...addForm.register('tempat_lahir')} /></div>
                <div className="space-y-2"><Label htmlFor="tanggal_lahir">Tanggal Lahir</Label><Input id="tanggal_lahir" type="date" {...addForm.register('tanggal_lahir')} /></div>
                <div className="col-span-2 space-y-2"><Label htmlFor="alamat">Alamat</Label><Textarea id="alamat" {...addForm.register('alamat')} /></div>
                <div className="space-y-2"><Label htmlFor="status">Status</Label><Input id="status" {...addForm.register('status')} /></div>
                <div className="col-span-2">
                  <Label>Unggah Tanda Tangan (opsional)</Label>
                  <input type="file" accept="image/png,image/jpeg" onChange={(e)=>setSignatureFile(e.target.files?.[0] ?? null)} />
                </div>
                <DialogFooter><div className="flex w-full justify-end gap-2"><Button variant="outline" type="button" onClick={()=>{ setAddOpen(false); setSignatureFile(null) }}>Batal</Button><Button type="submit">Simpan</Button></div></DialogFooter>
              </form></DialogContent></Dialog></div>
            <DataTable<Guru> columns={columns} data={data} onEdit={(r)=>{ setEditing(r); form.reset({ nama: r.nama, nip: r.nip, jenis_kelamin: r.jenis_kelamin ?? '', tempat_lahir: r.tempat_lahir ?? '', tanggal_lahir: r.tanggal_lahir ? new Date(r.tanggal_lahir).toISOString().split('T')[0] : '', telepon: r.telepon ?? '', alamat: r.alamat ?? '', status: r.status ?? 'Aktif' }) }} onDelete={(r)=>setDeleting(r)} />
          </div>
        )}</CardContent></Card>

        <Dialog open={!!editing} onOpenChange={(v)=>{ if(!v) setEditing(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Guru</DialogTitle><DialogDescription>Edit informasi guru dan tanda tangan</DialogDescription></DialogHeader>
            <form onSubmit={form.handleSubmit(async (vals)=>{ if(!editing) return; try{ // prepare FormData to allow file upload
                const payload = new FormData(); Object.keys(vals).forEach(k=>{ if(vals[k as keyof FormValues] !== undefined) payload.append(k, (vals as any)[k]) });
                // append signature if present in state or editing has new file input element in UI
                if ((document.getElementById('edit-tanda-tangan') as HTMLInputElement | null)?.files?.[0]) {
                  payload.append('tanda_tangan', (document.getElementById('edit-tanda-tangan') as HTMLInputElement).files[0]);
                }
                await guruService.updateGuru(editing.id, payload);
                const updated = await guruService.getAllGuru(); setData(updated); setEditing(null); toast({ title: 'Berhasil', description: 'Perubahan disimpan' }) }catch(e:any){ console.error(e); toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menyimpan', variant: 'destructive' }) } })} className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label htmlFor="edit-nama">Nama</Label><Input id="edit-nama" {...form.register('nama',{ required: true })} /></div>
            <div className="space-y-2"><Label htmlFor="edit-nip">NIP</Label><Input id="edit-nip" {...form.register('nip')} /></div>
            <div className="space-y-2"><Label htmlFor="edit-jenis_kelamin">Jenis Kelamin</Label><Input id="edit-jenis_kelamin" {...form.register('jenis_kelamin')} /></div>
            <div className="space-y-2"><Label htmlFor="edit-telepon">Telepon</Label><Input id="edit-telepon" {...form.register('telepon')} /></div>
            <div className="space-y-2"><Label htmlFor="edit-tempat_lahir">Tempat Lahir</Label><Input id="edit-tempat_lahir" {...form.register('tempat_lahir')} /></div>
            <div className="space-y-2"><Label htmlFor="edit-tanggal_lahir">Tanggal Lahir</Label><Input id="edit-tanggal_lahir" type="date" {...form.register('tanggal_lahir')} /></div>
            <div className="col-span-2 space-y-2"><Label htmlFor="edit-alamat">Alamat</Label><Textarea id="edit-alamat" {...form.register('alamat')} /></div>
            <div className="space-y-2"><Label htmlFor="edit-status">Status</Label><Input id="edit-status" {...form.register('status')} /></div>
            {/* Signature upload inside edit dialog */}
            <div className="col-span-2">
              <Label>Unggah Tanda Tangan Baru (opsional)</Label>
              <input id="edit-tanda-tangan" type="file" accept="image/png,image/jpeg" />
              {editing?.tanda_tangan ? (
                <div className="mt-2">
                  <Label>Preview Tanda Tangan Saat Ini</Label>
                  <div className="mt-1">
                    <img src={`${UPLOADS_BASE}/uploads/signatures/${editing.tanda_tangan}`} alt={`Tanda tangan ${editing.nama}`} style={{ maxWidth: '200px', maxHeight: '120px', objectFit: 'contain', border: '1px solid #e5e7eb', padding: 4 }} />
                  </div>
                </div>
              ) : null}
            </div>
            <DialogFooter><div className="flex w-full justify-end gap-2"><Button variant="outline" type="button" onClick={()=>setEditing(null)}>Batal</Button><Button type="submit">Simpan</Button></div></DialogFooter>
          </form></DialogContent></Dialog>

        <Dialog open={!!deleting} onOpenChange={(v)=>{ if(!v) setDeleting(null) }}><DialogContent>
          <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
          <div className="py-2">Apakah Anda yakin ingin menghapus guru <strong>{deleting?.nama}</strong> ?</div>
          <DialogFooter className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setDeleting(null)}>Batal</Button><Button variant="destructive" onClick={async ()=>{ if(!deleting) return; try{ await guruService.deleteGuru(deleting.id); const updated = await guruService.getAllGuru(); setData(updated); setDeleting(null); toast({ title: 'Berhasil', description: 'Guru dihapus' }) }catch(e:any){ console.error(e); toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menghapus', variant:'destructive' }) } }}>Hapus</Button></DialogFooter>
        </DialogContent></Dialog>
      </div>
    </DashboardLayout>
  )
}
