import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import mapelService from '../../services/mapelService'
import DataTable from '../../components/data-table'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import type { ColumnDef } from '@tanstack/react-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { useForm, Controller } from 'react-hook-form'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { useToast } from '../../components/ui/toast'

type Mapel = { id: number; nama_mapel: string; jenis?: 'Ujian' | 'Hafalan' }
type FormValues = { nama_mapel: string; jenis: 'Ujian' | 'Hafalan' }

export default function ManajemenMapelPage() {
  const [data, setData] = useState<Mapel[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Mapel | null>(null)
  const [deleting, setDeleting] = useState<Mapel | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { toast } = useToast()
  
  const { register, handleSubmit, control, reset, setValue } = useForm<FormValues>({
    defaultValues: { nama_mapel: '', jenis: 'Ujian' }
  })

  const fetchData = async () => {
    setLoading(true);
    try {
      const rows = await mapelService.getAllMapel();
      setData(rows)
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal', description: 'Gagal memuat mata pelajaran', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleOpenDialog = (mapel: Mapel | null) => {
    setEditing(mapel);
    if (mapel) {
      reset({ nama_mapel: mapel.nama_mapel, jenis: mapel.jenis || 'Ujian' });
    } else {
      reset({ nama_mapel: '', jenis: 'Ujian' });
    }
    setDialogOpen(true);
  };

  const onSubmit = async (vals: FormValues) => {
    try {
      if (editing) {
        await mapelService.updateMapel(editing.id, vals);
        toast({ title: 'Berhasil', description: 'Perubahan disimpan' });
      } else {
        await mapelService.createMapel(vals);
        toast({ title: 'Berhasil', description: 'Mata pelajaran ditambahkan' });
      }
      fetchData();
      setDialogOpen(false);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menyimpan data', variant: 'destructive' });
    }
  };

  const columns: ColumnDef<Mapel, any>[] = [
    { header: 'Nama Mapel', accessorKey: 'nama_mapel' },
    { header: 'Jenis', accessorKey: 'jenis' },
    {
      id: 'actions', header: 'Aksi', cell: ({ row }) => (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => handleOpenDialog(row.original)}>Edit</Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleting(row.original)}>Hapus</Button>
        </div>
      )
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Mata Pelajaran</h1>
          <p className="text-muted-foreground">Kelola daftar mata pelajaran yang tersedia.</p>
        </div>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>Daftar Mata Pelajaran</CardTitle>
                <Button onClick={() => handleOpenDialog(null)}>Tambah Mapel</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <div>Memuat...</div> : <DataTable<Mapel> columns={columns} data={data} />}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Mapel' : 'Tambah Mapel'}</DialogTitle>
              <DialogDescription>Isi informasi mata pelajaran di bawah ini.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Nama Mapel *</Label>
                <Input {...register('nama_mapel', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>Jenis *</Label>
                <Controller
                  name="jenis"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Pilih Jenis" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ujian">Ujian</SelectItem>
                        <SelectItem value="Hafalan">Hafalan</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <DialogFooter className="col-span-2">
                <div className="flex w-full justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Batal</Button>
                  <Button type="submit">Simpan</Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleting} onOpenChange={(v) => { if (!v) setDeleting(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
            <div className="py-2">Apakah Anda yakin ingin menghapus <strong>{deleting?.nama_mapel}</strong>?</div>
            <DialogFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
              <Button variant="destructive" onClick={async () => {
                if (!deleting) return;
                try {
                  await mapelService.deleteMapel(deleting.id);
                  fetchData();
                  setDeleting(null);
                  toast({ title: 'Berhasil', description: 'Mata pelajaran dihapus' })
                } catch (e: any) {
                  console.error(e);
                  toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menghapus', variant: 'destructive' })
                }
              }}>Hapus</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}