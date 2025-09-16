import React, { useEffect, useState, useCallback } from 'react'
import DashboardLayout from '../../dashboard/layout'
import API_BASE from '../../api'
import siswaService from '../../services/siswaService'
import axios from 'axios'
import tahunAjaranService from '../../services/tahunAjaranService'
import { getAllTingkatans } from '../../services/tingkatanService'
import DataTable from '../../components/data-table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import type { ColumnDef } from '@tanstack/react-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { useForm, Controller } from 'react-hook-form'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownActionEdit,
  DropdownActionDelete
} from '../../components/ui/dropdown'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import { Button } from '../../components/ui/button'
import { useToast } from '../../components/ui/toast'

// Tipe Data
type FormData = {
  nis: string
  nama: string
  tempat_lahir?: string
  tanggal_lahir?: string
  jenis_kelamin?: 'Laki-laki' | 'Perempuan'
  agama?: string
  alamat?: string
  kota_asal?: string
  kelas_id?: string
  kamar_id?: string
  master_tahun_ajaran_id?: string
  tingkatan_id?: string
  nama_ayah?: string
  pekerjaan_ayah?: string
  alamat_ayah?: string
  nama_ibu?: string
  pekerjaan_ibu?: string
  alamat_ibu?: string
  nama_wali?: string
  pekerjaan_wali?: string
  alamat_wali?: string
}

interface Siswa {
  id: number
  nama: string
  nis: string
  tempat_lahir?: string
  tanggal_lahir?: string
  jenis_kelamin?: string
  agama?: string
  alamat?: string
  kota_asal?: string
  kelas_id?: number | null
  kamar_id?: number | null
  nama_ayah?: string
  pekerjaan_ayah?: string
  alamat_ayah?: string
  nama_ibu?: string
  pekerjaan_ibu?: string
  alamat_ibu?: string
  nama_wali?: string
  pekerjaan_wali?: string
  alamat_wali?: string
  kelas?: { id: number; nama_kelas?: string, tingkatan_id?: number } | null
  infoKamar?: { id: number; nama_kamar?: string }
}

export default function ManajemenSiswaPage() {
  const [data, setData] = useState<Siswa[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Siswa | null>(null)
  const [deleting, setDeleting] = useState<Siswa | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Options for dropdowns
  const [allKelasOptions, setAllKelasOptions] = useState<Array<{id:number; nama_kelas:string; tingkatan_id: number}>>([])
  const [kelasOptionsForFilter, setKelasOptionsForFilter] = useState<Array<{id:number; nama_kelas:string}>>([])
  const [tingkatanOptions, setTingkatanOptions] = useState<Array<{id:number; nama_tingkatan:string}>>([])
  const [kamarOptions, setKamarOptions] = useState<Array<{id:number; nama_kamar:string}>>([])
  const [masterOptions, setMasterOptions] = useState<Array<{id:number; nama_ajaran:string}>>([])
  
  // Filters
  const [selectedMasterTaId, setSelectedMasterTaId] = useState<string>('')
  const [selectedTingkatanId, setSelectedTingkatanId] = useState<string>('')
  const [selectedKelasId, setSelectedKelasId] = useState<string>('')

  const { control, register, handleSubmit, reset } = useForm<FormData>({ 
    defaultValues: { nis: '', nama: '' } 
  })
  const { toast } = useToast()

  // FIXED: Stable fetchData function
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { show_all: true }
      if (selectedMasterTaId) params.master_ta_id = selectedMasterTaId;
      if (selectedKelasId) params.kelas_id = selectedKelasId;
      if (selectedTingkatanId) params.tingkatan_id = selectedTingkatanId;
      
      const res = await siswaService.getAllSiswa(params)
      setData(res as Siswa[])
    } catch (e) {
      console.error(e)
      toast({ title: 'Gagal', description: 'Gagal memuat data siswa', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [selectedMasterTaId, selectedKelasId, selectedTingkatanId, toast])

  // FIXED: Load options once on mount
  useEffect(() => {
    let mounted = true
    const loadInitialOptions = async () => {
      try {
        const [masters, tingkatans, kamars, allKelas] = await Promise.all([
          tahunAjaranService.getAllMasterTahunAjaran(),
          getAllTingkatans(),
          axios.get(`${API_BASE}/kamar`).then(res => res.data),
          axios.get(`${API_BASE}/kelas`).then(res => res.data),
        ])
        if (mounted) {
          setMasterOptions(masters || [])
          setTingkatanOptions(tingkatans || [])
          setKamarOptions(kamars || [])
          setAllKelasOptions(allKelas || [])
        }
      } catch (err) {
        console.error("Gagal memuat opsi filter:", err)
      }
    }
    loadInitialOptions()
    
    return () => { mounted = false }
  }, [])

  // FIXED: Only fetch data when filters change
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    // Debounce the fetch to prevent excessive API calls
    timeoutId = setTimeout(() => {
      fetchData()
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [selectedMasterTaId, selectedKelasId, selectedTingkatanId])

  // FIXED: Handle kelas filtering without causing re-renders
  useEffect(() => {
    if (selectedTingkatanId) {
      const filteredKelas = allKelasOptions.filter(k => k.tingkatan_id === Number(selectedTingkatanId));
      setKelasOptionsForFilter(filteredKelas);
    } else {
      setKelasOptionsForFilter([]);
    }
    // Reset filter kelas jika tingkatan berubah
    if (selectedKelasId && selectedTingkatanId) {
      const isValidKelas = allKelasOptions.some(k => 
        k.tingkatan_id === Number(selectedTingkatanId) && k.id === Number(selectedKelasId)
      );
      if (!isValidKelas) {
        setSelectedKelasId('');
      }
    }
  }, [selectedTingkatanId, allKelasOptions, selectedKelasId])

  const handleOpenDialog = (siswa: Siswa | null) => {
    setEditing(siswa);
    if (siswa) {
      reset({
        ...siswa,
        kelas_id: String(siswa.kelas_id || ''),
        kamar_id: String(siswa.kamar_id || ''),
        tanggal_lahir: siswa.tanggal_lahir ? new Date(siswa.tanggal_lahir).toISOString().split('T')[0] : '',
        jenis_kelamin: siswa.jenis_kelamin as any,
        tingkatan_id: String(siswa.kelas?.tingkatan_id || '')
      });
    } else {
      reset({ nis: '', nama: '', jenis_kelamin: undefined }); // Reset ke nilai default untuk form tambah
    }
    setDialogOpen(true);
  };

  const onSubmit = async (vals: FormData) => {
    try {
        const payload = { ...vals,
            kelas_id: vals.kelas_id ? Number(vals.kelas_id) : null,
            kamar_id: vals.kamar_id ? Number(vals.kamar_id) : null,
            master_tahun_ajaran_id: vals.master_tahun_ajaran_id ? Number(vals.master_tahun_ajaran_id) : null,
        }

      if (editing) {
        await siswaService.updateSiswa(editing.id, payload);
        toast({ title: 'Berhasil', description: 'Perubahan siswa disimpan' });
      } else {
        await siswaService.createSiswa(payload);
        toast({ title: 'Berhasil', description: 'Siswa berhasil ditambahkan' });
      }
      fetchData();
      setDialogOpen(false);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Gagal', description: e.response?.data?.message || 'Gagal menyimpan data', variant: 'destructive' });
    }
  };
  
  const handleDelete = async () => {
    if (!deleting) return;
    try {
        await siswaService.deleteSiswa(deleting.id);
        fetchData();
        setDeleting(null);
        toast({ title: 'Berhasil', description: 'Siswa berhasil dihapus' });
    } catch (e: any) {
        console.error(e);
        toast({ title: 'Gagal', description: e.response?.data?.message || 'Gagal menghapus siswa', variant: 'destructive' });
    }
  };

  const columns: ColumnDef<Siswa, any>[] = [
    { header: 'NIS', accessorKey: 'nis' },
    { header: 'Nama', accessorKey: 'nama' },
    { header: 'Kelas', accessorFn: row => row.kelas?.nama_kelas ?? '-' },
    { header: 'Kamar', accessorFn: row => row.infoKamar?.nama_kamar ?? '-' },
    { 
      id: 'actions', 
      header: () => <div className="text-right">Aksi</div>
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Siswa</h1>
          <p className="text-muted-foreground">Kelola data siswa, kelas, dan riwayat akademik.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <CardTitle>Filter Siswa</CardTitle>
              <Button onClick={() => handleOpenDialog(null)} className="mt-2 md:mt-0">Tambah Siswa</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b">
              <Select value={selectedMasterTaId} onValueChange={setSelectedMasterTaId}>
                  <SelectTrigger className="w-auto min-w-[200px]"><SelectValue placeholder="Semua Tahun Ajaran" /></SelectTrigger>
                  <SelectContent>
                      {masterOptions.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.nama_ajaran}</SelectItem>)}
                  </SelectContent>
              </Select>
              <Select value={selectedTingkatanId} onValueChange={setSelectedTingkatanId}>
                  <SelectTrigger className="w-auto min-w-[200px]"><SelectValue placeholder="Semua Tingkatan" /></SelectTrigger>
                  <SelectContent>
                      {tingkatanOptions.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.nama_tingkatan}</SelectItem>)}
                  </SelectContent>
              </Select>
              <Select value={selectedKelasId} onValueChange={setSelectedKelasId} disabled={!selectedTingkatanId}>
                  <SelectTrigger className="w-auto min-w-[200px]"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
                  <SelectContent>
                      {kelasOptionsForFilter.map(k => <SelectItem key={k.id} value={String(k.id)}>{k.nama_kelas}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
            {loading ? <div>Memuat...</div> : (
              <DataTable<Siswa>
                columns={columns}
                data={data}
                onEdit={handleOpenDialog}
                onDelete={setDeleting}
              />
            )}
          </CardContent>
        </Card>

        {/* Dialog untuk Tambah/Edit Siswa */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Siswa' : 'Tambah Siswa'}</DialogTitle>
              <DialogDescription>Isi data siswa dengan lengkap.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2 font-semibold border-b pb-2">Data Diri Siswa</div>
                <div className="space-y-2"><Label>NIS *</Label><Input {...register('nis', { required: true })} /></div>
                <div className="space-y-2"><Label>Nama Lengkap *</Label><Input {...register('nama', { required: true })} /></div>
                <div className="space-y-2"><Label>Tempat Lahir</Label><Input {...register('tempat_lahir')} /></div>
                <div className="space-y-2"><Label>Tanggal Lahir</Label><Input type="date" {...register('tanggal_lahir')} /></div>
                <div className="space-y-2">
                  <Label>Jenis Kelamin</Label>
                  <Controller name="jenis_kelamin" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                        <SelectItem value="Perempuan">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-2"><Label>Agama</Label><Input {...register('agama')} /></div>
                <div className="space-y-2"><Label>Kota Asal</Label><Input {...register('kota_asal')} /></div>
                <div className="col-span-2 space-y-2"><Label>Alamat</Label><Textarea {...register('alamat')} /></div>
                
                <div className="col-span-2 font-semibold border-b pb-2 mt-4">Informasi Akademik</div>
                <div className="space-y-2">
                  <Label>Tahun Ajaran Masuk *</Label>
                  <Controller name="master_tahun_ajaran_id" control={control} rules={{ required: true }} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>
                        {masterOptions.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.nama_ajaran}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-2">
                  <Label>Kelas Saat Ini *</Label>
                  <Controller name="kelas_id" control={control} rules={{ required: true }} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>
                        {tingkatanOptions.map(tingkatan => (
                          <React.Fragment key={`group-${tingkatan.id}`}>
                            <p className="font-bold px-2 py-1.5 text-sm text-muted-foreground">{tingkatan.nama_tingkatan}</p>
                            {allKelasOptions.filter(k => k.tingkatan_id === tingkatan.id).map(k => (
                                <SelectItem key={k.id} value={String(k.id)}>{k.nama_kelas}</SelectItem>
                            ))}
                          </React.Fragment>
                        ))}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-2"><Label>Kamar</Label>
                  <Controller name="kamar_id" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>
                        {kamarOptions.map(k => <SelectItem key={k.id} value={String(k.id)}>{k.nama_kamar}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                </div>

                <div className="col-span-2 font-semibold border-b pb-2 mt-4">Data Orang Tua / Wali</div>
                <div className="space-y-2"><Label>Nama Ayah</Label><Input {...register('nama_ayah')} /></div>
                <div className="space-y-2"><Label>Pekerjaan Ayah</Label><Input {...register('pekerjaan_ayah')} /></div>
                <div className="col-span-2 space-y-2"><Label>Alamat Ayah</Label><Textarea {...register('alamat_ayah')} /></div>
                <div className="space-y-2"><Label>Nama Ibu</Label><Input {...register('nama_ibu')} /></div>
                <div className="space-y-2"><Label>Pekerjaan Ibu</Label><Input {...register('pekerjaan_ibu')} /></div>
                <div className="col-span-2 space-y-2"><Label>Alamat Ibu</Label><Textarea {...register('alamat_ibu')} /></div>
                <div className="space-y-2"><Label>Nama Wali</Label><Input {...register('nama_wali')} /></div>
                <div className="space-y-2"><Label>Pekerjaan Wali</Label><Input {...register('pekerjaan_wali')} /></div>
                <div className="col-span-2 space-y-2"><Label>Alamat Wali</Label><Textarea {...register('alamat_wali')} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Batal</Button>
                <Button type="submit">Simpan</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={!!deleting} onOpenChange={(v) => { if (!v) setDeleting(null) }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Konfirmasi Hapus</DialogTitle>
                </DialogHeader>
                <div className="py-2">Apakah Anda yakin ingin menghapus siswa <strong>{deleting?.nama}</strong>?</div>
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