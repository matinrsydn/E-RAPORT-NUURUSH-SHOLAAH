import React, { useEffect, useState, useCallback } from 'react'
import DashboardLayout from '../../dashboard/layout'
import axios from 'axios'
import API_BASE from '../../api'
import kelasService from '../../services/kelasService'
import { getAllTingkatans } from '../../services/tingkatanService'
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

type Kelas = { id: number; nama_kelas: string; kapasitas?: number | null; wali_kelas_id?: number | null; walikelas?: { id: number; nama?: string } }
type FormValues = { nama_kelas: string; kapasitas: number | string | null; wali_kelas_id: string }

export default function ManajemenKelasPage() {
  const [data, setData] = useState<Kelas[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Kelas | null>(null)
  const [deleting, setDeleting] = useState<Kelas | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [guruOptions, setGuruOptions] = useState<Array<{ id: number; nama: string }>>([])
  const [tingkatanOptions, setTingkatanOptions] = useState<Array<{ id?: number; nama_tingkatan: string }>>([])
  const [selectedTingkatan, setSelectedTingkatan] = useState<string>('')
  const { toast } = useToast()

  const { register, handleSubmit, control, reset } = useForm<FormValues>({
    defaultValues: { nama_kelas: '', kapasitas: '', wali_kelas_id: '' }
  })

  // FIXED: Stable function with proper dependencies
  const fetchKelasForTingkatan = useCallback(async (tingkatan_id: string) => {
    if (!tingkatan_id) {
      setData([]);
      setLoading(false);
      return;
    }
    
    setLoading(true)
    try {
      const res = await kelasService.getAllKelas(`?tingkatan_id=${tingkatan_id}`)
      setData(res || [])
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Gagal', description: 'Gagal memuat kelas untuk tingkatan', variant: 'destructive' })
    } finally { 
      setLoading(false) 
    }
  }, [toast])

  // FIXED: Load options once on mount
  useEffect(() => {
    let mounted = true
    async function fetchOptions() {
      try {
        const [tingkatans, gurus] = await Promise.all([
          getAllTingkatans(),
          axios.get(`${API_BASE}/guru`).then(res => res.data)
        ]);
        if (mounted) {
          setTingkatanOptions(tingkatans || [])
          setGuruOptions(gurus || [])
        }
      } catch (e) { 
        console.error(e) 
      }
    }
    fetchOptions()
    
    return () => { mounted = false }
  }, [])

  // FIXED: Debounced fetch when tingkatan changes
  useEffect(() => { 
    let timeoutId: NodeJS.Timeout
    timeoutId = setTimeout(() => {
      fetchKelasForTingkatan(selectedTingkatan)
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [selectedTingkatan])

  const handleOpenDialog = (kelas: Kelas | null) => {
    setEditing(kelas);
    if (kelas) {
      reset({
        nama_kelas: kelas.nama_kelas,
        kapasitas: kelas.kapasitas ?? '',
        wali_kelas_id: String(kelas.wali_kelas_id ?? '')
      });
    } else {
      reset({ nama_kelas: '', kapasitas: '', wali_kelas_id: '' });
    }
    setDialogOpen(true);
  };

  const onSubmit = async (vals: FormValues) => {
    if (!selectedTingkatan) {
      toast({ title: 'Pilih Tingkatan', description: 'Pilih tingkatan terlebih dahulu', variant: 'destructive' });
      return;
    }
    try {
      const payload = {
        ...vals,
        kapasitas: vals.kapasitas ? Number(vals.kapasitas) : null,
        wali_kelas_id: vals.wali_kelas_id ? Number(vals.wali_kelas_id) : null,
        tingkatan_id: Number(selectedTingkatan)
      };

      if (editing) {
        await kelasService.updateKelas(editing.id, payload);
        toast({ title: 'Berhasil', description: 'Perubahan disimpan' });
      } else {
        await kelasService.createKelas(payload);
        toast({ title: 'Berhasil', description: 'Kelas berhasil ditambahkan' });
      }

      fetchKelasForTingkatan(selectedTingkatan);
      setDialogOpen(false);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menyimpan data', variant: 'destructive' })
    }
  };

  const columns: ColumnDef<Kelas, any>[] = [
    { header: 'Nama Kelas', accessorKey: 'nama_kelas' },
    { header: 'Kapasitas', accessorKey: 'kapasitas' },
    { header: 'Wali Kelas', accessorFn: row => row.walikelas?.nama ?? '-' },
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
          <h1 className="text-3xl font-bold">Manajemen Kelas</h1>
          <p className="text-muted-foreground">Pilih Tingkatan, lalu kelola Kelas pada tingkatan tersebut.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div className="flex items-center gap-4">
                    <Label className="whitespace-nowrap">Filter Tingkatan</Label>
                    <Select value={selectedTingkatan} onValueChange={setSelectedTingkatan}>
                        <SelectTrigger className="w-[250px]"><SelectValue placeholder="-- Pilih Tingkatan --" /></SelectTrigger>
                        <SelectContent>
                            {tingkatanOptions.map(t => (<SelectItem key={t.id} value={String(t.id)}>{t.nama_tingkatan}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={() => handleOpenDialog(null)} disabled={!selectedTingkatan} className="mt-2 md:mt-0">
                    Tambah Kelas
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <div>Memuat...</div> : <DataTable<Kelas> columns={columns} data={data} />}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Kelas' : 'Tambah Kelas'}</DialogTitle>
              <DialogDescription>Isi informasi kelas di bawah ini.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2"><Label>Nama Kelas *</Label><Input {...register('nama_kelas', { required: true })} /></div>
              <div className="space-y-2"><Label>Kapasitas</Label><Input type="number" {...register('kapasitas')} /></div>
              <div className="space-y-2 col-span-2"><Label>Wali Kelas</Label>
                <Controller control={control} name="wali_kelas_id" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="-- Pilih Wali Kelas --" /></SelectTrigger>
                    <SelectContent>
                        {guruOptions.map(g => (<SelectItem key={g.id} value={String(g.id)}>{g.nama}</SelectItem>))}
                    </SelectContent>
                  </Select>
                )} />
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
            <div className="py-2">Apakah Anda yakin ingin menghapus kelas <strong>{deleting?.nama_kelas}</strong>?</div>
            <DialogFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
              <Button variant="destructive" onClick={async () => {
                if (!deleting) return;
                try {
                  await kelasService.deleteKelas(deleting.id);
                  fetchKelasForTingkatan(selectedTingkatan);
                  setDeleting(null);
                  toast({ title: 'Berhasil', description: 'Data kelas dihapus' });
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