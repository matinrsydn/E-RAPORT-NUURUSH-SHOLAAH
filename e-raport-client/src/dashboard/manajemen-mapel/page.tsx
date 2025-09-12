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
import { Button } from '../../components/ui/button'
import { useToast } from '../../components/ui/toast'

type Mapel = { id:number; nama_mapel:string; jenis?: 'Ujian' | 'Hafalan' }
type FormValues = { nama_mapel:string; jenis: 'Ujian' | 'Hafalan' }

export default function ManajemenMapelPage(){
  const [data, setData] = useState<Mapel[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Mapel | null>(null)
  const [deleting, setDeleting] = useState<Mapel | null>(null)
  const { toast } = useToast()
  
  const form = useForm<FormValues>({ defaultValues: { nama_mapel: '', jenis: 'Ujian' } })
  const addForm = useForm<FormValues>({ defaultValues: { nama_mapel: '', jenis: 'Ujian' } })
  const [addOpen, setAddOpen] = useState(false)

  const fetchData = async ()=>{ 
    setLoading(true); 
    try { 
      const res = await axios.get(`${API_BASE}/mata-pelajaran`); 
      setData(res.data) 
    } catch(e) { 
      console.error(e); 
      toast({ title: 'Gagal', description: 'Gagal memuat mata pelajaran', variant:'destructive' }) 
    } finally { 
      setLoading(false) 
    } 
  }
  
  useEffect(()=>{ fetchData() }, [])

  const columns: ColumnDef<Mapel, any>[] = [ 
    { header: 'Nama Mapel', accessorKey: 'nama_mapel' }, 
    { header: 'Jenis', accessorKey: 'jenis' }, 
    { id: 'actions', header: 'Aksi', accessorKey: 'id' as any } 
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Mata Pelajaran</h1>
          <p className="text-muted-foreground">Kelola daftar mata pelajaran</p>
        </div>
        <Card>
          <CardContent>
            {loading ? <div>Memuat...</div> : (
              <div>
                  <div className="flex justify-between items-center mb-4">
                    <div/> 
                    <Dialog open={addOpen} onOpenChange={setAddOpen}>
                      <DialogTrigger asChild><Button>Tambah Mapel</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Tambah Mapel</DialogTitle>
                          <DialogDescription>Isi informasi mata pelajaran</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={addForm.handleSubmit(async (vals)=>{ 
                          try { 
                            await axios.post(`${API_BASE}/mata-pelajaran`, vals); 
                            await fetchData(); 
                            toast({ title: 'Berhasil', description: 'Mata pelajaran ditambahkan' }); 
                            addForm.reset(); 
                            setAddOpen(false) 
                          } catch(e:any) { 
                            console.error(e); 
                            toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menambahkan', variant:'destructive' }) 
                          } 
                        })} className="grid grid-cols-2 gap-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="nama_mapel">Nama Mapel</Label>
                            <Input id="nama_mapel" {...addForm.register('nama_mapel',{ required: true })} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="jenis">Jenis</Label>
                            {/* --- PERBAIKAN: Menggunakan onChange standar --- */}
                            <Controller
                              name="jenis"
                              control={addForm.control}
                              render={({ field }) => (
                                <Select 
                                  id="jenis"
                                  value={field.value} 
                                  onChange={e => field.onChange((e.target as HTMLSelectElement).value as 'Ujian' | 'Hafalan')}
                                >
                                  <SelectItem value="Ujian">Ujian</SelectItem>
                                  <SelectItem value="Hafalan">Hafalan</SelectItem>
                                </Select>
                              )}
                            />
                          </div>
                          <DialogFooter className="col-span-2">
                            <div className="flex w-full justify-end gap-2">
                              <Button variant="outline" type="button" onClick={()=>setAddOpen(false)}>Batal</Button>
                              <Button type="submit">Simpan</Button>
                            </div>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                <DataTable<Mapel> 
                  columns={columns} 
                  data={data} 
                  onEdit={(r)=>{ setEditing(r); form.reset({ nama_mapel: r.nama_mapel, jenis: r.jenis ?? 'Ujian' }) }} 
                  onDelete={(r)=>setDeleting(r)} 
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- DIALOG EDIT --- */}
        <Dialog open={!!editing} onOpenChange={(v)=>{ if(!v) setEditing(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Mapel</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(async (vals)=>{ 
              if(!editing) return; 
              try { 
                await axios.put(`${API_BASE}/mata-pelajaran/${editing.id}`, vals); 
                await fetchData(); 
                setEditing(null); 
                toast({ title: 'Berhasil', description: 'Perubahan disimpan' }) 
              } catch(e:any) { 
                console.error(e); 
                toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menyimpan', variant:'destructive' }) 
              } 
            })} className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nama_mapel">Nama Mapel</Label>
                <Input id="edit-nama_mapel" {...form.register('nama_mapel',{ required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-jenis">Jenis</Label>
                {/* --- PERBAIKAN: Menggunakan onChange standar --- */}
                <Controller
                  name="jenis"
                  control={form.control}
                  render={({ field }) => (
                    <Select 
                      id="edit-jenis"
                      value={field.value} 
                      onChange={e => field.onChange((e.target as HTMLSelectElement).value as 'Ujian' | 'Hafalan')}
                    >
                      <SelectItem value="Ujian">Ujian</SelectItem>
                      <SelectItem value="Hafalan">Hafalan</SelectItem>
                    </Select>
                  )}
                />
              </div>
              <DialogFooter className="col-span-2">
                <div className="flex w-full justify-end gap-2">
                  <Button variant="outline" type="button" onClick={()=>setEditing(null)}>Batal</Button>
                  <Button type="submit">Simpan</Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* --- DIALOG HAPUS --- */}
        <Dialog open={!!deleting} onOpenChange={(v)=>{ if(!v) setDeleting(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
            <div className="py-2">Apakah Anda yakin ingin menghapus mata pelajaran <strong>{deleting?.nama_mapel}</strong> ?</div>
            <DialogFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setDeleting(null)}>Batal</Button>
              <Button variant="destructive" onClick={async ()=>{ 
                if(!deleting) return; 
                try { 
                  await axios.delete(`${API_BASE}/mata-pelajaran/${deleting.id}`); 
                  await fetchData(); 
                  setDeleting(null); 
                  toast({ title: 'Berhasil', description: 'Mata pelajaran dihapus' }) 
                } catch(e:any) { 
                  console.error(e); 
                  toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menghapus', variant:'destructive' }) 
                } 
              }}>Hapus</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}