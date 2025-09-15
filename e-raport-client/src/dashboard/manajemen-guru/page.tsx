import React, { useEffect, useState, useCallback } from 'react'
import DashboardLayout from '../../dashboard/layout'
import { UPLOADS_BASE } from '../../api'
import guruService from '../../services/guruService'
import DataTable from '../../components/data-table'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import type { ColumnDef } from '@tanstack/react-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { useForm, Controller } from 'react-hook-form'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { useToast } from '../../components/ui/toast'

// Tipe data
type Guru = { id: number; nama: string; nip?: string; jenis_kelamin?: string; tempat_lahir?: string; tanggal_lahir?: string; telepon?: string; alamat?: string; status?: string; tanda_tangan?: string }
type FormValues = { nama: string; nip?: string; jenis_kelamin?: 'Laki-laki' | 'Perempuan'; tempat_lahir?: string; tanggal_lahir?: string; telepon?: string; alamat?: string; status?: 'aktif' | 'nonaktif' }

export default function ManajemenGuruPage() {
  const [data, setData] = useState<Guru[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Guru | null>(null)
  const [deleting, setDeleting] = useState<Guru | null>(null)
  const { toast } = useToast()

  const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      nama: '',
      nip: '',
      jenis_kelamin: undefined,
      tempat_lahir: '',
      tanggal_lahir: '',
      telepon: '',
      alamat: '',
      status: 'aktif'
    }
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)

  const fetchData = useCallback(async () => {
  setLoading(true);
  try {
    const res = await guruService.getAllGuru();
    setData(res)
  } catch (e) {
    console.error(e);
    toast({ title: 'Gagal', description: 'Gagal memuat guru', variant: 'destructive' })
  } finally {
    setLoading(false)
  }
}, []) 

  useEffect(() => { fetchData() }, [fetchData])

  const handleOpenDialog = (guru: Guru | null) => {
    setEditing(guru);
    if (guru) {
      // Mode Edit: Isi form dengan data yang ada
      setValue('nama', guru.nama);
      setValue('nip', guru.nip || '');
      setValue('jenis_kelamin', guru.jenis_kelamin as any);
      setValue('tempat_lahir', guru.tempat_lahir || '');
      setValue('tanggal_lahir', guru.tanggal_lahir ? new Date(guru.tanggal_lahir).toISOString().split('T')[0] : '');
      setValue('telepon', guru.telepon || '');
      setValue('alamat', guru.alamat || '');
      setValue('status', guru.status as any);
    } else {
      // Mode Tambah: Reset form ke nilai default
      reset();
    }
    setSignatureFile(null);
    setDialogOpen(true);
  };

  // GANTIKAN DENGAN FUNGSI onSubmit YANG BARU INI
const onSubmit = async (vals: FormValues) => {
    try {
      // Validasi data wajib
      if (!vals.nama?.trim()) {
        toast({ title: 'Error', description: 'Nama guru wajib diisi', variant: 'destructive' });
        return;
      }

      const payload = new FormData();
      
      // Memastikan setiap field dimasukkan ke FormData dengan benar
      Object.entries(vals).forEach(([key, value]) => {
        // Jika string, trim dulu
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed !== '') {
            payload.append(key, trimmed);
          }
        } 
        // Jika bukan string dan bukan null/undefined, masukkan langsung
        else if (value != null) {
          payload.append(key, String(value));
        }
      });

      // Tambahkan file tanda tangan jika ada
      if (signatureFile) {
        payload.append('tanda_tangan', signatureFile);
      }

      if (editing) {
        // Mode Update
        await guruService.updateGuru(editing.id, payload);
        toast({ title: 'Berhasil', description: 'Perubahan disimpan' });
      } else {
        // Mode Create
        await guruService.createGuru(payload);
        toast({ title: 'Berhasil', description: 'Guru berhasil ditambahkan' });
      }
      
      fetchData(); // Cukup panggil fetchData sekali untuk memuat ulang data
      setDialogOpen(false); // Tutup dialog
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menyimpan data', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if(!deleting) return;
    try {
      await guruService.deleteGuru(deleting.id);
      fetchData();
      setDeleting(null);
      toast({ title: 'Berhasil', description: 'Guru dihapus' })
    } catch(e:any) {
      console.error(e);
      toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menghapus', variant:'destructive' })
    }
  };

  const columns: ColumnDef<Guru, any>[] = [
    { header: 'Nama', accessorKey: 'nama' },
    { header: 'NIP', accessorKey: 'nip' },
    { header: 'Telepon', accessorKey: 'telepon' },
    { 
      header: 'Status', 
      accessorKey: 'status',
      cell: ({ row }) => (
        <div className={`${
          row.original.status === 'aktif' ? 'text-green-600' : 'text-red-600'
        }`}>
          {row.original.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
        </div>
      )
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Aksi</div>,
      cell: () => null // DataTable akan menghandle render actions
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Manajemen Guru</h1><p className="text-muted-foreground">Kelola data guru, wali kelas, dan informasi lainnya.</p></div>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Daftar Guru</CardTitle>
              <Button onClick={() => handleOpenDialog(null)}>Tambah Guru</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <div>Memuat...</div> : (
              <DataTable<Guru> 
                columns={columns} 
                data={data}
                onEdit={handleOpenDialog}
                onDelete={setDeleting}
              />
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Guru' : 'Tambah Guru'}</DialogTitle>
              <DialogDescription>Isi informasi guru di bawah ini.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Nama *</Label>
                <Input 
                  {...register('nama', { 
                    required: 'Nama guru wajib diisi',
                    minLength: { value: 2, message: 'Nama minimal 2 karakter' }
                  })} 
                  className={errors.nama ? 'border-red-500' : ''}
                />
                {errors.nama && (
                  <p className="text-sm text-red-500">{errors.nama.message}</p>
                )}
              </div>
              <div className="space-y-2"><Label>NIP</Label><Input {...register('nip')} /></div>
              
              <div className="space-y-2">
                <Label>Jenis Kelamin</Label>
                <Controller
                  name="jenis_kelamin"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Pilih Jenis Kelamin" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                        <SelectItem value="Perempuan">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2"><Label>Telepon</Label><Input {...register('telepon')} /></div>
              <div className="space-y-2"><Label>Tempat Lahir</Label><Input {...register('tempat_lahir')} /></div>
              <div className="space-y-2"><Label>Tanggal Lahir</Label><Input type="date" {...register('tanggal_lahir')} /></div>
              <div className="col-span-2 space-y-2"><Label>Alamat</Label><Textarea {...register('alamat')} /></div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  name="status"
                  control={control}
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

              <div className="col-span-2">
                <Label>Unggah Tanda Tangan (opsional)</Label>
                <Input type="file" accept="image/png,image/jpeg" onChange={(e) => setSignatureFile(e.target.files?.[0] ?? null)} />
                {editing?.tanda_tangan && (
                  <div className="mt-2">
                    <Label>Preview Tanda Tangan Saat Ini</Label>
                    <div className="mt-1 p-2 border rounded-md inline-block">
                      <img src={`${UPLOADS_BASE}/signatures/${editing.tanda_tangan}`} alt={`Tanda tangan ${editing.nama}`} className="max-w-[200px] max-h-[100px] object-contain" />
                    </div>
                  </div>
                )}
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
            <div className="py-2">Apakah Anda yakin ingin menghapus guru <strong>{deleting?.nama}</strong>?</div>
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