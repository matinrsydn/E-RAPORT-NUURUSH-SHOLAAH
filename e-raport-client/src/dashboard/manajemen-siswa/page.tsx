import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import API_BASE from '../../api'
import siswaService from '../../services/siswaService'
import axios from 'axios'
import tahunAjaranService from '../../services/tahunAjaranService'
import { getAllTingkatans } from '../../services/tingkatanService'
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
  master_tahun_ajaran_id?: number | string | ''
  tingkatan_id?: number | string | ''
  tahun_ajaran_masuk?: number | string | ''
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
  const [tingkatanOptions, setTingkatanOptions] = useState<Array<{id:number; nama_tingkatan:string}>>([])
  const [kamarOptions, setKamarOptions] = useState<Array<{id:number; nama_kamar:string; kapasitas:number; siswa?:any[]}>>([])
  // normalize semester to string to avoid TS mismatches and simplify UI logic
  const [tahunAjaranOptions, setTahunAjaranOptions] = useState<Array<{id:number; nama_ajaran:string; semester: string; status?: string}>>([])
  const [masterOptions, setMasterOptions] = useState<Array<{id:number; nama_ajaran:string}>>([])
  // Periode filter removed; use master TA selector and kelas selector only
  const [selectedMasterTaId, setSelectedMasterTaId] = useState<number | ''>('')
  const [selectedTingkatanId, setSelectedTingkatanId] = useState<number | ''>('')
  const [selectedKelasId, setSelectedKelasId] = useState<number | ''>('')

  const form = useForm<FormData>({ defaultValues: { nis: '', nama: '', kelas_id: '', kamar_id: '', jenis_kelamin: '', master_tahun_ajaran_id: '', tahun_ajaran_masuk: '' } })
  const addForm = useForm<FormData>({
    defaultValues: { nis: '', nama: '', kelas_id: '', kamar_id: '', jenis_kelamin: '', master_tahun_ajaran_id: '', tahun_ajaran_masuk: '', tingkatan_id: '' }
  })

  const { toast } = useToast()
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [taList, kelasRes, masterList, kamarRes] = await Promise.all([
          tahunAjaranService.getAllTahunAjaran(),
          axios.get(`${API_BASE}/kelas`),
          tahunAjaranService.getAllMasterTahunAjaran().catch(() => []),
          axios.get(`${API_BASE}/kamar`),
        ])

        const kelasList = (kelasRes as any).data
        const kamarList = (kamarRes as any).data as Array<{ id:number; nama_kamar:string; kapasitas:number; siswa?: any[] }>

        // pick active TA as default (prefer semester '2') and select its master
        const active = (taList as any[]).find((t:any)=>t.status === 'aktif' && String(t.semester) === '2')
          || (taList as any[]).find((t:any)=>t.status === 'aktif') || (taList as any[])[0]
        if (active) {
          const master = (masterList as any[]).find((m:any)=>m.nama_ajaran === active.nama_ajaran)
          if (master) setSelectedMasterTaId(master.id)
        }

        // dedupe master options by id (just in case)
        setMasterOptions(Array.from(new Map(((masterList as any[]) || []).map((m:any)=>[m.id, m])).values()) as Array<{id:number; nama_ajaran:string}>)

        // fetch siswa with show_all for the selected master TA (attach hasHistory)
        const resSiswa = await siswaService.getAllSiswa({ show_all: true, master_ta_id: active ? ((masterList as any[]).find((m:any)=>m.nama_ajaran === active.nama_ajaran)?.id) : undefined })

        setData(resSiswa as Siswa[])
        setKelasOptions(kelasList)
        // also load semua tingkatan for add form
        try{ const t = await getAllTingkatans(); setTingkatanOptions(t || []) } catch(e){ console.error(e) }
        setKamarOptions(kamarList)
        setTahunAjaranOptions((taList as any[]).map((t:any)=>({ ...t, semester: String(t.semester) })))

        // default add form tahun ajaran to active MASTER TA (prefer semester 2 if active)
        if (active) {
          const master = (masterList as any[]).find((m:any)=>m.nama_ajaran === active.nama_ajaran)
          if (master) addForm.setValue('master_tahun_ajaran_id', String(master.id))
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // when any filter changes, reload siswa list with show_all -> hasHistory flag
  useEffect(()=>{
    const loadForFilters = async () => {
      try{
        setLoading(true)
        const params:any = {}
        if (selectedMasterTaId) params.master_ta_id = selectedMasterTaId
        if (selectedKelasId) params.kelas_id = selectedKelasId
        if (selectedTingkatanId) params.tingkatan_id = selectedTingkatanId
        params.show_all = true
        const res = await siswaService.getAllSiswa(params)
        setData(res as Siswa[])
      }catch(e){ console.error(e) }finally{ setLoading(false) }
    }
    // always load at least once (fetch all) -- but only after masterOptions are loaded
    loadForFilters()
  }, [selectedMasterTaId, selectedKelasId, selectedTingkatanId])

  // highlight bagian perubahan: pakai master_tahun_ajaran_id di semua tempat
  const columns: ColumnDef<Siswa, any>[] = [
    { header: 'NIS', accessorKey: 'nis' },
    { header: 'Nama', accessorKey: 'nama' },
    { header: 'Kelas Saat Ini', accessorFn: row => row.kelas?.nama_kelas ?? '-' },
    { header: 'Tahun Ajaran Saat Ini', accessorFn: row => {
        const ch:any = (row as any).currentHistory
        if (ch && ch.master_tahun_ajaran_id) {
          const ta = masterOptions.find(m => m.id === ch.master_tahun_ajaran_id)
          return ta ? ta.nama_ajaran : '-'
        }
        return '-'
      }
    },
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
                    <label className="text-sm font-medium">Pilih Tahun Ajaran</label>
                    <div className="flex items-center gap-2">
                      {/* Master tahun ajaran selector */}
                      <select className="ml-2 border rounded px-2 py-1" value={selectedMasterTaId === '' ? '' : String(selectedMasterTaId)} onChange={(e)=>{
                        const masterId = e.target.value ? Number(e.target.value) : null
                        setSelectedMasterTaId(masterId ?? '')
                      }}>
                        <option value="">-- Pilih Tahun Ajaran --</option>
                        {masterOptions.map(m => (<option key={m.id} value={m.id}>{m.nama_ajaran}</option>))}
                      </select>

                              {/* Optional Kelas filter: if selected, apply additional filtering */}
                              <select className="ml-2 border rounded px-2 py-1" value={selectedTingkatanId === '' ? '' : String(selectedTingkatanId)} onChange={async (e)=>{ const ting = e.target.value ? Number(e.target.value) : ''; setSelectedTingkatanId(ting); if (!ting) { setKelasOptions([]); return } const resp:any = await axios.get(`${API_BASE}/kelas`, { params: { tingkatan_id: ting } }); setKelasOptions(resp.data || []) }}>
                                <option value="">-- Pilih Tingkatan --</option>
                                {tingkatanOptions.map(t => (<option key={t.id} value={t.id}>{t.nama_tingkatan}</option>))}
                              </select>

                              <select className="ml-2 border rounded px-2 py-1" value={selectedKelasId === '' ? '' : String(selectedKelasId)} onChange={(e)=>{ const v = e.target.value ? Number(e.target.value) : ''; setSelectedKelasId(v) }}>
                                <option value="">-- Semua Kelas --</option>
                                {kelasOptions.map(k => (<option key={k.id} value={k.id}>{k.nama_kelas}</option>))}
                              </select>
                    </div>
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
                          // Normalize and sanitize fields to match backend expectations
                          let jk:any = vals.jenis_kelamin ?? ''
                          if (typeof jk === 'string') jk = jk.trim()
                          if (!jk) jk = null
                          else {
                            const low = String(jk).toLowerCase()
                            if (low === 'l' || low === 'laki' || low === 'laki-laki' || low === 'laki laki') jk = 'Laki-laki'
                            else if (low === 'p' || low === 'perempuan') jk = 'Perempuan'
                            else if (low === 'laki-laki' || low === 'perempuan') jk = jk
                            else {
                              // fallback: attempt to map common variants, otherwise keep original trimmed value
                              if (low.startsWith('l')) jk = 'Laki-laki'
                              else if (low.startsWith('p')) jk = 'Perempuan'
                            }
                          }

                          const payload = { ...vals,
                            kelas_id: vals.kelas_id === '' ? null : (typeof vals.kelas_id === 'string' ? Number(vals.kelas_id) : vals.kelas_id),
                            kamar_id: vals.kamar_id === '' ? null : (typeof vals.kamar_id === 'string' ? Number(vals.kamar_id) : vals.kamar_id),
                            // send master_tahun_ajaran_id to backend so backend can create history linked to master
                            master_tahun_ajaran_id: vals.master_tahun_ajaran_id === '' ? null : (typeof vals.master_tahun_ajaran_id === 'string' ? Number(vals.master_tahun_ajaran_id) : vals.master_tahun_ajaran_id),
                            jenis_kelamin: jk
                          }
                          const resp = await siswaService.createSiswa(payload)
                          // backend returns { siswa, history }
                          const res = await siswaService.getAllSiswa()
                          setData(res)
                          if (resp && resp.history) {
                            toast({title: 'Berhasil', description: 'Siswa dan histori masuk berhasil dibuat'})
                          } else {
                            toast({title: 'Berhasil', description: 'Siswa berhasil ditambahkan (history tidak dibuat)'})
                          }
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
                            <Label htmlFor="add-tahun_master_id">Tahun Ajaran Masuk</Label>
                            <Controller
                              control={addForm.control}
                              name="master_tahun_ajaran_id"
                              rules={{ required: 'Tahun ajaran wajib dipilih' }}
                              render={({ field }) => (
                                <Select
                                  id="add-tahun_master_id"
                                  value={(field.value ?? '') as any}
                                  onChange={(e) => field.onChange((e.target as HTMLSelectElement).value)}
                                >
                                  <SelectItem value="">-- Pilih Tahun Ajaran --</SelectItem>
                                  {masterOptions.map(m => (
                                    <SelectItem key={m.id} value={String(m.id)}>
                                      {m.nama_ajaran}
                                    </SelectItem>
                                  ))}
                                </Select>
                              )}
                            />
                            {addForm.formState.errors.master_tahun_ajaran_id && <p className="text-sm text-rose-600">{String(addForm.formState.errors.master_tahun_ajaran_id.message)}</p>}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="add-tingkatan_id">Tingkatan</Label>
                            <Controller control={addForm.control} name="tingkatan_id" rules={{ required: 'Tingkatan wajib dipilih' }} render={({ field }) => (
                              <Select id="add-tingkatan_id" value={(field.value ?? '') as any} onChange={async (e) => {
                                const val = (e.target as HTMLSelectElement).value
                                field.onChange(val)
                                // fetch kelas for this tingkatan and enable kelas select
                                if (val) {
                                  try {
                                    const resp:any = await axios.get(`${API_BASE}/kelas`, { params: { tingkatan_id: Number(val) } })
                                    setKelasOptions(resp.data || [])
                                  } catch(err){ console.error('Failed fetching kelas for tingkatan', err) }
                                } else {
                                  setKelasOptions([])
                                }
                              }}>
                                <SelectItem value="">-- Pilih Tingkatan --</SelectItem>
                                {tingkatanOptions.map(t => (<SelectItem key={t.id} value={String(t.id)}>{t.nama_tingkatan}</SelectItem>))}
                              </Select>
                            )} />
                            {addForm.formState.errors.tingkatan_id && <p className="text-sm text-rose-600">{String(addForm.formState.errors.tingkatan_id.message)}</p>}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="add-kelas_id">Kelas</Label>
                            <Controller control={addForm.control} name="kelas_id" rules={{ required: 'Kelas wajib dipilih' }} render={({ field }) => (
                              <Select id="add-kelas_id" value={(field.value ?? '') as any} onChange={e => field.onChange((e.target as HTMLSelectElement).value)} disabled={kelasOptions.length === 0}>
                                <SelectItem value="">-- Pilih Kelas --</SelectItem>
                                {kelasOptions.map(k => (<SelectItem key={k.id} value={String(k.id)}>{k.nama_kelas}</SelectItem>))}
                              </Select>
                            )} />
                            {addForm.formState.errors.kelas_id && <p className="text-sm text-rose-600">{String(addForm.formState.errors.kelas_id.message)}</p>}
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
                  data={
                    // Only apply kelas filter client-side; server already filters by master_ta_id when requested
                    (() => {
                      let list = data
                      if (selectedKelasId) list = list.filter(d => (d.kelas_id ?? (d.kelas && d.kelas.id)) === selectedKelasId)
                      return list
                    })()
                  }
                  onEdit={async (r) => {
                    // Prefill edit form and prefer the student's currentHistory.tahun_ajaran_id when available
                    const taId = (r as any).currentHistory?.master_tahun_ajaran_id ?? ''
                    // attempt to fetch earliest history to prefill Tahun Ajaran Masuk
                    let masukId = ''
                    try {
                      const resp = await fetch(`${API_BASE}/siswa/${r.id}/earliest-history`)
                      if (resp.ok) {
                        const json = await resp.json()
                        // Prefer master_tahun_ajaran_id if available on the history row
                        masukId = json?.master_tahun_ajaran_id ?? ''
                      }
                    } catch (e) {
                      // ignore, we'll fallback to blank
                    }

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
                      master_tahun_ajaran_id: taId ? String(taId) : '',
                      tahun_ajaran_masuk: masukId ? String(masukId) : ''
                    })
                    setEditing(r)
                  }}
                  onDelete={(r) => setDeleting(r)}
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
                  master_tahun_ajaran_id: vals.master_tahun_ajaran_id === '' ? null : (typeof vals.master_tahun_ajaran_id === 'string' ? Number(vals.master_tahun_ajaran_id) : vals.master_tahun_ajaran_id)
                }
                await siswaService.updateSiswa(editing.id, payload)
                const res = await siswaService.getAllSiswa()
                setData(res)
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
                <Label htmlFor="edit-tahun_masuk">Tahun Ajaran Masuk</Label>
                <Controller
                  control={form.control}
                  name="master_tahun_ajaran_id"
                  render={({ field }) => (
                    <Select
                      id="edit-tahun_masuk"
                      value={(field.value ?? '') as any}
                      onChange={e => field.onChange((e.target as HTMLSelectElement).value)}
                    >
                      <SelectItem value="">-- Pilih Tahun Ajaran Masuk --</SelectItem>
                      {masterOptions.map(m => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.nama_ajaran}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                />
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
                  await siswaService.deleteSiswa(deleting.id)
                  const res = await siswaService.getAllSiswa()
                  setData(res)
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
