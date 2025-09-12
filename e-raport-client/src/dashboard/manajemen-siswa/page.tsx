import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import API_BASE from '../../api'
import axios from 'axios'
import DataTable from '../../components/data-table'
import { Card, CardContent } from '../../components/ui/card'
import type { ColumnDef } from '@tanstack/react-table'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { useForm, Controller } from 'react-hook-form'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectItem } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import { Button } from '../../components/ui/button'
import { useToast } from '../../components/ui/toast'

type FormData = {
  nis: string
  nama: string
  tempat_lahir?: string
  tanggal_lahir?: string
  jenis_kelamin?: string
  agama?: string
  alamat?: string
  kota_asal?: string
  kelas_id?: number | string | ''
  kamar_id?: number | string | ''
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
  kamar?: string
  nama_ayah?: string
  pekerjaan_ayah?: string
  alamat_ayah?: string
  nama_ibu?: string
  pekerjaan_ibu?: string
  alamat_ibu?: string
  nama_wali?: string
  pekerjaan_wali?: string
  alamat_wali?: string
  kelas?: { id: number; nama_kelas?: string; walikelas?: { id:number; nama?:string } } | null
  infoKamar?: { id:number; nama_kamar?: string }
}

export default function ManajemenSiswaPage() {
  const [data, setData] = useState<Siswa[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Siswa | null>(null)
  const [deleting, setDeleting] = useState<Siswa | null>(null)
  const [kelasOptions, setKelasOptions] = useState<Array<{id:number; nama_kelas:string}>>([])
  const [kamarOptions, setKamarOptions] = useState<Array<{id:number; nama_kamar:string; kapasitas:number; siswa?:any[]}>>([])
  const [tahunAjaranOptions, setTahunAjaranOptions] = useState<Array<{id:number; nama_ajaran:string; semester:number}>>([])
  const [selectedTahunAjaranId, setSelectedTahunAjaranId] = useState<number | ''>('')

  const form = useForm<FormData>({ defaultValues: { nis: '', nama: '', kelas_id: '', kamar_id: '', jenis_kelamin: '' } })
  const addForm = useForm<FormData>({ defaultValues: { nis: '', nama: '', kelas_id: '', kamar_id: '', jenis_kelamin: '' } })
  const { toast } = useToast()
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [resSiswa, resKelas, resKamar, resTa] = await Promise.all([
          axios.get(`${API_BASE}/siswa`),
          axios.get(`${API_BASE}/kelas`),
          axios.get(`${API_BASE}/kamar`),
          axios.get(`${API_BASE}/tahun-ajaran`),
        ])
        setData(resSiswa.data)
        setKelasOptions(resKelas.data)
        setKamarOptions(resKamar.data)
        setTahunAjaranOptions(resTa.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const columns: ColumnDef<Siswa, any>[] = [
    { header: 'NIS', accessorKey: 'nis' },
    { header: 'Nama', accessorKey: 'nama' },
    { header: 'Kelas', accessorFn: row => row.kelas?.nama_kelas ?? '-' },
    { header: 'Kamar', accessorFn: row => row.infoKamar?.nama_kamar ?? '-' },
    { id: 'actions', header: 'Aksi', accessorKey: 'id' as any },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Siswa</h1>
          <p className="text-muted-foreground">Kelola data siswa</p>
        </div>

        <Card>
          <CardContent>
            {loading ? (
              <div>Memuat...</div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <label className="text-sm font-medium">Pilih Periode Rapor</label>
                    <select className="ml-2 border rounded px-2 py-1" value={selectedTahunAjaranId === '' ? '' : String(selectedTahunAjaranId)} onChange={(e)=>setSelectedTahunAjaranId(e.target.value ? parseInt(e.target.value,10) : '')}>
                      <option value="">-- Pilih Periode --</option>
                      {tahunAjaranOptions.map(ta=> (
                        <option key={ta.id} value={ta.id}>{ta.nama_ajaran} - Semester {ta.semester}</option>
                      ))}
                    </select>
                  </div>

                  <Dialog open={addOpen} onOpenChange={setAddOpen}>
                    <DialogTrigger asChild>
                      <Button>Tambah Siswa</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Tambah Siswa</DialogTitle>
                          <DialogDescription>Isi semua data yang diperlukan untuk siswa baru. Klik simpan jika sudah selesai.</DialogDescription>
                        </DialogHeader>

                        <form onSubmit={addForm.handleSubmit(async (vals)=>{
                        try{
                          const payload = { ...vals,
                            kelas_id: vals.kelas_id === '' ? null : (typeof vals.kelas_id === 'string' ? Number(vals.kelas_id) : vals.kelas_id),
                            kamar_id: vals.kamar_id === '' ? null : (typeof vals.kamar_id === 'string' ? Number(vals.kamar_id) : vals.kamar_id),
                          }
                          await axios.post(`${API_BASE}/siswa`, payload)
                          const res = await axios.get(`${API_BASE}/siswa`)
                          setData(res.data)
                          toast({title: 'Berhasil', description: 'Siswa berhasil ditambahkan'})
                          addForm.reset()
                          setAddOpen(false)
                        }catch(e:any){
                          console.error(e)
                          toast({title: 'Gagal', description: e.response?.data?.message || 'Gagal menambahkan siswa', variant: 'destructive'})
                        }
                      })}>
                        <div className="grid grid-cols-2 gap-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="add-nis">NIS</Label>
                            <Input id="add-nis" autoFocus {...addForm.register('nis', { required: 'NIS wajib diisi' })} />
                            {addForm.formState.errors.nis && <p className="text-sm text-rose-600">{String(addForm.formState.errors.nis.message)}</p>}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="add-nama">Nama</Label>
                            <Input id="add-nama" {...addForm.register('nama', { required: 'Nama wajib diisi' })} />
                            {addForm.formState.errors.nama && <p className="text-sm text-rose-600">{String(addForm.formState.errors.nama.message)}</p>}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="add-tempat_lahir">Tempat Lahir</Label>
                            <Input id="add-tempat_lahir" {...addForm.register('tempat_lahir')} />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="add-tanggal_lahir">Tanggal Lahir</Label>
                            <Input id="add-tanggal_lahir" type="date" {...addForm.register('tanggal_lahir')} />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="add-jenis_kelamin">Jenis Kelamin</Label>
                            <Controller control={addForm.control} name="jenis_kelamin" render={({ field }) => (
                              <Select id="add-jenis_kelamin" value={field.value ?? ''} onChange={e => field.onChange((e.target as HTMLSelectElement).value)}>
                                <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                                <SelectItem value="Perempuan">Perempuan</SelectItem>
                              </Select>
                            )} />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="add-agama">Agama</Label>
                            <Input id="add-agama" {...addForm.register('agama')} />
                          </div>

                          <div className="space-y-2 col-span-2">
                            <Label htmlFor="add-kota_asal">Kota Asal</Label>
                            <Input id="add-kota_asal" {...addForm.register('kota_asal')} />
                          </div>

                          <div className="space-y-2 col-span-2">
                            <Label htmlFor="add-alamat">Alamat</Label>
                            <Textarea id="add-alamat" {...addForm.register('alamat')} />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="add-kelas_id">Kelas</Label>
                            <Controller control={addForm.control} name="kelas_id" render={({ field }) => (
                              <Select id="add-kelas_id" value={(field.value ?? '') as any} onChange={e => field.onChange((e.target as HTMLSelectElement).value)}>
                                <SelectItem value="">-- Pilih Kelas --</SelectItem>
                                {kelasOptions.map(k => (<SelectItem key={k.id} value={String(k.id)}>{k.nama_kelas}</SelectItem>))}
                              </Select>
                            )} />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="add-kamar_id">Kamar</Label>
                            <Controller control={addForm.control} name="kamar_id" render={({ field }) => (
                              <Select id="add-kamar_id" value={(field.value ?? '') as any} onChange={e => field.onChange((e.target as HTMLSelectElement).value)}>
                                <SelectItem value="">-- Pilih Kamar --</SelectItem>
                                {kamarOptions.map(k => {
                                  const terisi = k.siswa?.length || 0
                                  const sisa = k.kapasitas - terisi
                                  return (<SelectItem key={k.id} value={String(k.id)} disabled={sisa <= 0}>{k.nama_kamar} (Sisa: {sisa})</SelectItem>)
                                })}
                              </Select>
                            )} />
                          </div>

                          <div className="col-span-2 mt-4">
                            <h4 className="font-semibold">Data Orang Tua</h4>
                            <hr className="mt-1"/>
                          </div>

                          <div className="space-y-2">
                            <Label>Nama Ayah</Label>
                            <Input {...addForm.register('nama_ayah')} />
                          </div>

                          <div className="space-y-2">
                            <Label>Pekerjaan Ayah</Label>
                            <Input {...addForm.register('pekerjaan_ayah')} />
                          </div>

                          <div className="col-span-2 space-y-2">
                            <Label>Alamat Ayah</Label>
                            <Textarea {...addForm.register('alamat_ayah')} />
                          </div>

                          <div className="space-y-2">
                            <Label>Nama Ibu</Label>
                            <Input {...addForm.register('nama_ibu')} />
                          </div>

                          <div className="space-y-2">
                            <Label>Pekerjaan Ibu</Label>
                            <Input {...addForm.register('pekerjaan_ibu')} />
                          </div>

                          <div className="col-span-2 space-y-2">
                            <Label>Alamat Ibu</Label>
                            <Textarea {...addForm.register('alamat_ibu')} />
                          </div>

                          <div className="space-y-2">
                            <Label>Nama Wali</Label>
                            <Input {...addForm.register('nama_wali')} />
                          </div>

                          <div className="space-y-2">
                            <Label>Pekerjaan Wali</Label>
                            <Input {...addForm.register('pekerjaan_wali')} />
                          </div>

                          <div className="col-span-2 space-y-2">
                            <Label>Alamat Wali</Label>
                            <Textarea {...addForm.register('alamat_wali')} />
                          </div>
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

                <DataTable<Siswa>
                  columns={columns}
                  data={data}
                  onEdit={(r) => {
                    setEditing(r)
                    form.reset({
                      nis: r.nis,
                      nama: r.nama,
                      tempat_lahir: r.tempat_lahir,
                      tanggal_lahir: r.tanggal_lahir ? new Date(r.tanggal_lahir).toISOString().split('T')[0] : undefined,
                      jenis_kelamin: r.jenis_kelamin,
                      agama: r.agama,
                      alamat: r.alamat,
                      kota_asal: r.kota_asal,
                      kelas_id: r.kelas_id ?? '',
                      kamar_id: r.kamar_id ?? '',
                      nama_ayah: r.nama_ayah,
                      pekerjaan_ayah: r.pekerjaan_ayah,
                      alamat_ayah: r.alamat_ayah,
                      nama_ibu: r.nama_ibu,
                      pekerjaan_ibu: r.pekerjaan_ibu,
                      alamat_ibu: r.alamat_ibu,
                      nama_wali: r.nama_wali,
                      pekerjaan_wali: r.pekerjaan_wali,
                      alamat_wali: r.alamat_wali,
                    })
                  }}
                  onDelete={(r) => setDeleting(r)}
                  onPrint={async (r, reportType, format) => {
                    if (!selectedTahunAjaranId && (reportType === 'nilai' || reportType === 'sikap')) {
                      toast({ title: 'Pilih Periode', description: 'Silakan pilih periode rapor terlebih dahulu', variant: 'destructive' })
                      return
                    }
                    try {
                      const endpoint = reportType === 'identitas'
                        ? `raports/generate/identitas/${r.id}`
                        : `raports/generate/${reportType}/${r.id}/${selectedTahunAjaranId}/${(tahunAjaranOptions.find(t=>t.id===selectedTahunAjaranId)?.semester ?? '')}`
                      const url = `${API_BASE}/${endpoint}?format=${format}`
                      const resp = await axios.get(url, { responseType: 'blob' })
                      const blob = new Blob([resp.data], { type: resp.headers['content-type'] })
                      const link = document.createElement('a')
                      link.href = window.URL.createObjectURL(blob)
                      let fileName = `Laporan_${r.nama.replace(/\s+/g,'_')}.${format}`
                      const cd = resp.headers['content-disposition']
                      if (cd) {
                        const m = cd.match(/filename="(.+)"/)
                        if (m) fileName = m[1]
                      }
                      link.download = fileName
                      document.body.appendChild(link)
                      link.click()
                      link.remove()
                      window.URL.revokeObjectURL(link.href)
                      toast({ title: 'Unduhan selesai', description: `${fileName}` })
                    } catch (e:any) {
                      console.error(e)
                      toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal mengunduh', variant: 'destructive' })
                    }
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editing} onOpenChange={(v)=>{ if(!v) setEditing(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Siswa</DialogTitle>
              <DialogDescription>Perbarui data siswa. Ubah kolom yang diperlukan lalu klik simpan.</DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(async (vals)=>{
              if(!editing) return
              try{
                const payload = { ...vals,
                  kelas_id: vals.kelas_id === '' ? null : (typeof vals.kelas_id === 'string' ? Number(vals.kelas_id) : vals.kelas_id),
                  kamar_id: vals.kamar_id === '' ? null : (typeof vals.kamar_id === 'string' ? Number(vals.kamar_id) : vals.kamar_id),
                }
                await axios.put(`${API_BASE}/siswa/${editing.id}`, payload)
                const res = await axios.get(`${API_BASE}/siswa`)
                setData(res.data)
                setEditing(null)
                toast({title:'Berhasil', description: 'Perubahan siswa disimpan'})
              }catch(e:any){
                console.error(e)
                toast({title:'Gagal', description: e.response?.data?.message || 'Gagal menyimpan perubahan', variant:'destructive'})
              }
            })} className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nis">NIS</Label>
                <Input id="edit-nis" {...form.register('nis', { required: 'NIS wajib diisi' })} />
                {form.formState.errors.nis && <p className="text-sm text-rose-600">{String(form.formState.errors.nis.message)}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-nama">Nama</Label>
                <Input id="edit-nama" {...form.register('nama', { required: 'Nama wajib diisi' })} />
                {form.formState.errors.nama && <p className="text-sm text-rose-600">{String(form.formState.errors.nama.message)}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-tempat_lahir">Tempat Lahir</Label>
                <Input id="edit-tempat_lahir" {...form.register('tempat_lahir')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-tanggal_lahir">Tanggal Lahir</Label>
                <Input id="edit-tanggal_lahir" type="date" {...form.register('tanggal_lahir')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-jenis_kelamin">Jenis Kelamin</Label>
                <Controller control={form.control} name="jenis_kelamin" render={({ field }) => (
                  <Select id="edit-jenis_kelamin" value={field.value ?? ''} onChange={e => field.onChange((e.target as HTMLSelectElement).value)}>
                    <SelectItem value="">-- Pilih --</SelectItem>
                    <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                    <SelectItem value="Perempuan">Perempuan</SelectItem>
                  </Select>
                )} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-agama">Agama</Label>
                <Input id="edit-agama" {...form.register('agama')} />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-kota_asal">Kota Asal</Label>
                <Input id="edit-kota_asal" {...form.register('kota_asal')} />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-alamat">Alamat</Label>
                <Textarea id="edit-alamat" {...form.register('alamat')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-kelas_id">Kelas</Label>
                <Controller control={form.control} name="kelas_id" render={({ field }) => (
                  <Select id="edit-kelas_id" value={(field.value ?? '') as any} onChange={e => field.onChange((e.target as HTMLSelectElement).value)}>
                    <SelectItem value="">-- Pilih Kelas --</SelectItem>
                    {kelasOptions.map(k => (<SelectItem key={k.id} value={String(k.id)}>{k.nama_kelas}</SelectItem>))}
                  </Select>
                )} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-kamar_id">Kamar</Label>
                <Controller control={form.control} name="kamar_id" render={({ field }) => (
                  <Select id="edit-kamar_id" value={(field.value ?? '') as any} onChange={e => field.onChange((e.target as HTMLSelectElement).value)}>
                    <SelectItem value="">-- Pilih Kamar --</SelectItem>
                    {kamarOptions.map(k => {
                      const terisi = k.siswa?.length || 0
                      const sisa = k.kapasitas - terisi
                      return (<SelectItem key={k.id} value={String(k.id)} disabled={sisa <= 0}>{k.nama_kamar} (Sisa: {sisa})</SelectItem>)
                    })}
                  </Select>
                )} />
              </div>

              <div className="col-span-2 mt-4">
                <h4 className="font-semibold">Data Orang Tua</h4>
                <hr className="mt-1"/>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-nama_ayah">Nama Ayah</Label>
                <Input id="edit-nama_ayah" {...form.register('nama_ayah')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-pekerjaan_ayah">Pekerjaan Ayah</Label>
                <Input id="edit-pekerjaan_ayah" {...form.register('pekerjaan_ayah')} />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-alamat_ayah">Alamat Ayah</Label>
                <Textarea id="edit-alamat_ayah" {...form.register('alamat_ayah')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-nama_ibu">Nama Ibu</Label>
                <Input id="edit-nama_ibu" {...form.register('nama_ibu')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-pekerjaan_ibu">Pekerjaan Ibu</Label>
                <Input id="edit-pekerjaan_ibu" {...form.register('pekerjaan_ibu')} />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-alamat_ibu">Alamat Ibu</Label>
                <Textarea id="edit-alamat_ibu" {...form.register('alamat_ibu')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-nama_wali">Nama Wali</Label>
                <Input id="edit-nama_wali" {...form.register('nama_wali')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-pekerjaan_wali">Pekerjaan Wali</Label>
                <Input id="edit-pekerjaan_wali" {...form.register('pekerjaan_wali')} />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-alamat_wali">Alamat Wali</Label>
                <Textarea id="edit-alamat_wali" {...form.register('alamat_wali')} />
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

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleting} onOpenChange={(v)=>{ if(!v) setDeleting(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Konfirmasi Hapus</DialogTitle>
            </DialogHeader>
            <div className="py-2">Apakah Anda yakin ingin menghapus siswa <strong>{deleting?.nama}</strong> ?</div>
            <DialogFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setDeleting(null)}>Batal</Button>
              <Button variant="destructive" onClick={async()=>{
                if(!deleting) return
                try{
                  await axios.delete(`${API_BASE}/siswa/${deleting.id}`)
                  const res = await axios.get(`${API_BASE}/siswa`)
                  setData(res.data)
                  setDeleting(null)
                  toast({title:'Berhasil', description: 'Siswa berhasil dihapus'})
                }catch(e:any){ console.error(e); toast({title:'Gagal', description: e.response?.data?.message || 'Gagal menghapus siswa', variant:'destructive'}) }
              }}>Hapus</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
