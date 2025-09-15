import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import tahunAjaranService from '../../services/tahunAjaranService'
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

type TahunAjaran = {
  id: number
  nama_ajaran: string
  status: 'aktif' | 'nonaktif'
}
type FormValues = {
  nama_ajaran: string
  status: 'aktif' | 'nonaktif'
}

export default function ManajemenTahunAjaranPage() {
  const [data, setData] = useState<TahunAjaran[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<TahunAjaran | null>(null)
  const [deleting, setDeleting] = useState<TahunAjaran | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { toast } = useToast()

  const { register, handleSubmit, control, reset } = useForm<FormValues>({
    defaultValues: { nama_ajaran: '', status: 'nonaktif' }
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await tahunAjaranService.getAllMasterTahunAjaran()
      setData(res)
    } catch (e) {
      console.error(e)
      toast({ title: 'Gagal', description: 'Gagal memuat data', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleOpenDialog = (ta: TahunAjaran | null) => {
    setEditing(ta);
    if (ta) {
      reset({ nama_ajaran: ta.nama_ajaran, status: ta.status });
    } else {
      reset({ nama_ajaran: '', status: 'nonaktif' });
    }
    setDialogOpen(true);
  };

  const onSubmit = async (vals: FormValues) => {
    try {
      if (editing) {
        await tahunAjaranService.updateMasterTahunAjaran(editing.id, vals);
        toast({ title: 'Berhasil', description: 'Perubahan disimpan' });
      } else {
        await tahunAjaranService.createMasterTahunAjaran(vals);
        toast({ title: 'Berhasil', description: 'Tahun ajaran ditambahkan' });
      }
      fetchData();
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menyimpan', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await tahunAjaranService.deleteMasterTahunAjaran(deleting.id);
      fetchData();
      setDeleting(null);
      toast({ title: 'Berhasil', description: 'Tahun ajaran dihapus' });
    } catch (e: any) {
      toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menghapus', variant: 'destructive' });
    }
  };

  const columns: ColumnDef<TahunAjaran, any>[] = [
    { header: 'Nama Ajaran', accessorKey: 'nama_ajaran' },
    { header: 'Status', accessorKey: 'status' },
    {
      id: 'actions', header: 'Aksi', cell: ({ row }) => (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => handleOpenDialog(row.original)}>Edit</Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleting(row.original)}>Hapus</Button>
        </div>
      )
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Tahun Ajaran</h1>
          <p className="text-muted-foreground">Kelola master data tahun ajaran. Semester akan dibuat otomatis.</p>
        </div>

        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Daftar Tahun Ajaran</CardTitle>
                    <Button onClick={() => handleOpenDialog(null)}>Tambah Tahun Ajaran</Button>
                </div>
            </CardHeader>
          <CardContent>
            {loading ? <div>Memuat...</div> : <DataTable<TahunAjaran> columns={columns} data={data} />}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran'}</DialogTitle>
              <DialogDescription>Masukkan nama ajaran. Semester 1 & 2 akan dibuat otomatis.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nama Ajaran</Label>
                  <Input {...register('nama_ajaran', { required: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Pilih Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aktif">Aktif</SelectItem>
                          <SelectItem value="nonaktif">Nonaktif</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Batal</Button>
                <Button type="submit">Simpan</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleting} onOpenChange={(v) => { if (!v) setDeleting(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
            <div className="py-2">Yakin ingin menghapus <strong>{deleting?.nama_ajaran}</strong>?</div>
            <DialogFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
              <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}