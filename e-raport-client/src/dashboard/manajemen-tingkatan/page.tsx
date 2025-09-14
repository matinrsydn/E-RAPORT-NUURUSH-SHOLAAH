import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import { getAllTingkatans, createTingkatan, updateTingkatan, deleteTingkatan } from '../../services/tingkatanService'
import DataTable from '../../components/data-table'
import { Card, CardContent } from '../../components/ui/card'
import type { ColumnDef } from '@tanstack/react-table'
import type { Tingkatan as TingkatanType } from '../../services/tingkatanService'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { useForm } from 'react-hook-form'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { useToast } from '../../components/ui/toast'

type Tingkatan = TingkatanType

export default function ManajemenTingkatanPage() {
  const [data, setData] = useState<Tingkatan[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Tingkatan | null>(null)
  const addForm = useForm<{ nama_tingkatan: string; urutan?: number | string }>({ defaultValues: { nama_tingkatan: '', urutan: '' } })
  const editForm = useForm<{ nama_tingkatan: string; urutan?: number | string }>({ defaultValues: { nama_tingkatan: '', urutan: '' } })
  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getAllTingkatans()
      setData(res)
    } catch (e) { console.error(e); toast({ title: 'Gagal', description: 'Tidak dapat memuat data', variant: 'destructive' }) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const columns: ColumnDef<Tingkatan, any>[] = [
    { header: 'Nama Tingkatan', accessorKey: 'nama_tingkatan' },
    { header: 'Urutan', accessorKey: 'urutan' },
    { id: 'actions', header: 'Aksi', accessorKey: 'id' as any }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Tingkatan</h1>
          <p className="text-muted-foreground">Kelola daftar tingkatan</p>
        </div>

        <Card>
          <CardContent>
            {loading ? <div>Memuat...</div> : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div />
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>Tambah Tingkatan</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Tambah Tingkatan</DialogTitle>
                        <DialogDescription>Tambahkan tingkatan baru</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={addForm.handleSubmit(async (vals) => {
                        try {
                          const ur = vals.urutan === '' ? undefined : Number(vals.urutan)
                          await createTingkatan({ nama_tingkatan: vals.nama_tingkatan, urutan: ur })
                          await fetchData(); toast({ title: 'Berhasil', description: 'Tingkatan ditambahkan' })
                          addForm.reset()
                        } catch (e:any) { console.error(e); toast({ title: 'Gagal', description: e?.message || 'Gagal menambahkan', variant: 'destructive' }) }
                      })} className="grid grid-cols-1 gap-4 py-4">
                        <div className="space-y-2"><label>Nama Tingkatan</label><Input {...addForm.register('nama_tingkatan', { required: true })} /></div>
                        <div className="space-y-2"><label>Urutan</label><Input {...addForm.register('urutan')} type="number" /></div>
                        <DialogFooter><div className="flex w-full justify-end gap-2"><Button variant="outline" type="button">Batal</Button><Button type="submit">Simpan</Button></div></DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <DataTable<Tingkatan> columns={columns} data={data} onEdit={(r)=>{ setEditing(r); editForm.reset({ nama_tingkatan: r.nama_tingkatan, urutan: r.urutan ?? '' }) }} onDelete={async (r)=>{ if (!confirm('Hapus tingkatan ini?')) return; try{ await deleteTingkatan(r.id); await fetchData(); toast({ title: 'Berhasil', description: 'Dihapus' }) } catch(e:any){ console.error(e); toast({ title: 'Gagal', description: e?.message || 'Gagal menghapus', variant: 'destructive' }) } }} />
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editing} onOpenChange={(v)=>{ if(!v) setEditing(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Tingkatan</DialogTitle><DialogDescription>Edit data tingkatan</DialogDescription></DialogHeader>
            <form onSubmit={editForm.handleSubmit(async (vals)=>{ if(!editing) return; try{ const ur = vals.urutan === '' ? undefined : Number(vals.urutan); await updateTingkatan(editing.id, { nama_tingkatan: vals.nama_tingkatan, urutan: ur }); await fetchData(); setEditing(null); toast({ title: 'Berhasil', description: 'Perubahan disimpan' }) } catch(e:any){ console.error(e); toast({ title: 'Gagal', description: e?.message || 'Gagal menyimpan', variant: 'destructive' }) } })} className="grid grid-cols-1 gap-4 py-4">
              <div className="space-y-2"><label>Nama Tingkatan</label><Input {...editForm.register('nama_tingkatan', { required: true })} /></div>
              <div className="space-y-2"><label>Urutan</label><Input {...editForm.register('urutan')} type="number" /></div>
              <DialogFooter><div className="flex w-full justify-end gap-2"><Button variant="outline" type="button" onClick={()=>setEditing(null)}>Batal</Button><Button type="submit">Simpan</Button></div></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
