import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import tahunAjaranService from '../../services/tahunAjaranService'
import DataTable from '../../components/data-table'
import { Card, CardContent } from '../../components/ui/card'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog'
import { useForm, Controller } from 'react-hook-form'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectItem } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { useToast } from '../../components/ui/toast'

// PERBAIKAN: Sesuaikan tipe dengan database
type TahunAjaran = {
  id: number
  nama_ajaran: string
  status: 'aktif' | 'nonaktif'
}

// PERBAIKAN: Sesuaikan tipe dengan database
type FormValues = {
  nama_ajaran: string
  status: 'aktif' | 'nonaktif' | ''
}

export default function ManajemenTahunAjaranPage() {
  const [data, setData] = useState<TahunAjaran[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<TahunAjaran | null>(null)
  const [deleting, setDeleting] = useState<TahunAjaran | null>(null)
  const { toast } = useToast()

  // PERBAIKAN: Gunakan 'nonaktif' sebagai nilai default
  const form = useForm<FormValues>({ defaultValues: { nama_ajaran: '', status: 'nonaktif' } })
  const addForm = useForm<FormValues>({ defaultValues: { nama_ajaran: '', status: 'nonaktif' } })
  const [addOpen, setAddOpen] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await tahunAjaranService.getAllMasterTahunAjaran()
      setData(res)
    } catch (e) {
      console.error(e)
      toast({ title: 'Gagal', description: 'Gagal memuat data tahun ajaran', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const columns: ColumnDef<TahunAjaran, any>[] = [
    { header: 'Nama Ajaran', accessorKey: 'nama_ajaran' },
    { header: 'Status', accessorKey: 'status' },
    { id: 'actions', header: 'Aksi', accessorKey: 'id' as any },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Tahun Ajaran</h1>
          <p className="text-muted-foreground">Kelola master data tahun ajaran. Semester akan dibuat otomatis.</p>
        </div>

        <Card>
          <CardContent>
            {loading ? (
              <div>Memuat...</div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div />

                  <Dialog open={addOpen} onOpenChange={setAddOpen}>
                    <DialogTrigger asChild>
                      <Button>Tambah Tahun Ajaran</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Tambah Tahun Ajaran</DialogTitle>
                        <DialogDescription>Masukkan nama ajaran baru. Semester 1 & 2 akan dibuat otomatis.</DialogDescription>
                      </DialogHeader>

                      <form
                        onSubmit={addForm.handleSubmit(async (vals) => {
                          try {
                            const payload = {
                              nama_ajaran: vals.nama_ajaran,
                              status: vals.status || 'nonaktif',
                            }
                            await tahunAjaranService.createMasterTahunAjaran(payload)
                            await fetchData()
                            toast({ title: 'Berhasil', description: 'Tahun ajaran ditambahkan' })
                            addForm.reset()
                            setAddOpen(false)
                          } catch (e: any) {
                            console.error(e)
                            toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menambahkan', variant: 'destructive' })
                          }
                        })}
                      >
                          <div className="grid grid-cols-1 gap-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="nama_ajaran">Nama Ajaran</Label>
                              <Input id="nama_ajaran" autoFocus {...addForm.register('nama_ajaran', { required: 'Nama ajaran wajib diisi' })} />
                              {addForm.formState.errors.nama_ajaran && (
                                <p className="text-sm text-rose-600">{String(addForm.formState.errors.nama_ajaran.message)}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="status">Status</Label>
                              <Controller
                                control={addForm.control}
                                name="status"
                                render={({ field }) => (
                                  // PERBAIKAN: Gunakan 'nonaktif' sebagai nilai
                                  <Select id="status" value={field.value ?? 'nonaktif'} onChange={(e) => field.onChange((e.target as HTMLSelectElement).value as FormValues['status'])}>
                                    <SelectItem value="aktif">Aktif</SelectItem>
                                    <SelectItem value="nonaktif">Nonaktif</SelectItem>
                                  </Select>
                                )}
                              />
                            </div>
                          </div>
                        <DialogFooter>
                          <div className="flex w-full justify-end gap-2">
                            <Button variant="outline" type="button" onClick={() => setAddOpen(false)}>
                              Batal
                            </Button>
                            <Button type="submit">Simpan</Button>
                          </div>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <DataTable<TahunAjaran>
                  columns={columns}
                  data={data}
                  onEdit={(r) => {
                    setEditing(r)
                    form.reset({ nama_ajaran: r.nama_ajaran, status: r.status })
                  }}
                  onDelete={(r) => setDeleting(r)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Tahun Ajaran</DialogTitle>
              <DialogDescription>Perbarui data tahun ajaran.</DialogDescription>
            </DialogHeader>

            <form
              onSubmit={form.handleSubmit(async (vals) => {
                if (!editing) return
                try {
                  const payload = { nama_ajaran: vals.nama_ajaran, status: vals.status || 'nonaktif' }
                  await tahunAjaranService.updateMasterTahunAjaran(editing.id, payload)
                  await fetchData()
                  setEditing(null)
                  toast({ title: 'Berhasil', description: 'Perubahan disimpan' })
                } catch (e: any) {
                  console.error(e)
                  toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menyimpan', variant: 'destructive' })
                }
              })}
              className="grid grid-cols-1 gap-4 py-4"
            >
              <div className="space-y-2">
                <Label htmlFor="edit-nama_ajaran">Nama Ajaran</Label>
                <Input id="edit-nama_ajaran" {...form.register('nama_ajaran', { required: 'Nama ajaran wajib diisi' })} />
                {form.formState.errors.nama_ajaran && <p className="text-sm text-rose-600">{String(form.formState.errors.nama_ajaran.message)}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Controller control={form.control} name="status" render={({ field }) => (
                  // PERBAIKAN: Gunakan 'nonaktif' sebagai nilai
                  <Select id="edit-status" value={field.value ?? 'nonaktif'} onChange={e => field.onChange((e.target as HTMLSelectElement).value as FormValues['status'])}>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="nonaktif">Nonaktif</SelectItem>
                  </Select>
                )} />
              </div>

              <DialogFooter>
                <div className="flex w-full justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setEditing(null)}>Batal</Button>
                  <Button type="submit">Simpan</Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={!!deleting} onOpenChange={(v) => { if (!v) setDeleting(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Konfirmasi Hapus</DialogTitle>
            </DialogHeader>
            <div className="py-2">Apakah Anda yakin ingin menghapus tahun ajaran <strong>{deleting?.nama_ajaran}</strong>? Ini akan menghapus semester terkait.</div>
            <DialogFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
              <Button variant="destructive" onClick={async () => {
                if (!deleting) return
                try {
                  await tahunAjaranService.deleteMasterTahunAjaran(deleting.id)
                  await fetchData()
                  setDeleting(null)
                  toast({ title: 'Berhasil', description: 'Tahun ajaran dihapus' })
                } catch (e: any) {
                  console.error(e)
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