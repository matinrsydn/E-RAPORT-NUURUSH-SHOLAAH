import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import DataTable from '../../components/data-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import templateService from '../../services/templateService'
import { useToast } from '../../components/ui/toast'

export default function ManajemenTemplatePage() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [files, setFiles] = useState({ identitas: null, nilai: null, sikap: null })
  const { toast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const res = await templateService.getTemplates()
      setTemplates(res)
    } catch (e) {
      toast({ title: 'Gagal', description: 'Tidak dapat memuat daftar template.', variant: 'destructive' })
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleFileChange = (e, key) => {
    setFiles(prev => ({ ...prev, [key]: e.target.files[0] || null }))
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    try {
      const form = new FormData()
      if (files.identitas) form.append('identitas', files.identitas)
      if (files.nilai) form.append('nilai', files.nilai)
      if (files.sikap) form.append('sikap', files.sikap)
      await templateService.uploadTemplates(form)
      toast({ title: 'Sukses', description: 'Template berhasil diunggah.' })
      setUploadOpen(false)
      setFiles({ identitas: null, nilai: null, sikap: null })
      load()
    } catch (err) {
      toast({ title: 'Gagal', description: err?.response?.data?.message || 'Gagal mengunggah template', variant: 'destructive' })
    }
  }

  const handleDelete = async (fileName) => {
    if (!confirm(`Hapus template ${fileName}?`)) return
    try {
      await templateService.deleteTemplate(fileName)
      toast({ title: 'Sukses', description: 'Template dihapus.' })
      load()
    } catch (err) {
      toast({ title: 'Gagal', description: err?.response?.data?.message || 'Gagal menghapus template', variant: 'destructive' })
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Manajemen Template</h1>
            <p className="text-muted-foreground">Kelola file template (.docx) untuk identitas, nilai, dan sikap.</p>
          </div>
          <div>
            <Button onClick={() => setUploadOpen(true)}>Unggah Template</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Template</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <div>Memuat...</div> : (
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr className="text-left">
                    <th>Nama File</th>
                    <th>Ukuran (bytes)</th>
                    <th>Last Modified</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.length === 0 && <tr><td colSpan={4}>Belum ada template.</td></tr>}
                  {templates.map(t => (
                    <tr key={t.fileName} className="border-t">
                      <td>{t.fileName}</td>
                      <td>{t.size}</td>
                      <td>{new Date(t.lastModified).toLocaleString()}</td>
                      <td className="flex gap-2">
                        <a href={t.url} target="_blank" rel="noreferrer"><Button variant="outline">Download</Button></a>
                        <Button variant="destructive" onClick={() => handleDelete(t.fileName)}>Hapus</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Upload Dialog */}
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unggah Template (.docx)</DialogTitle>
              <DialogDescription>Unggah file identitas.docx, nilai.docx, dan/atau sikap.docx. Nama file akan distandarisasi di server.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpload} className="grid gap-4 py-4">
              <div>
                <label className="block mb-1">Identitas (identitas.docx)</label>
                <input type="file" accept=".docx" onChange={(e) => handleFileChange(e, 'identitas')} />
              </div>
              <div>
                <label className="block mb-1">Nilai (nilai.docx)</label>
                <input type="file" accept=".docx" onChange={(e) => handleFileChange(e, 'nilai')} />
              </div>
              <div>
                <label className="block mb-1">Sikap (sikap.docx)</label>
                <input type="file" accept=".docx" onChange={(e) => handleFileChange(e, 'sikap')} />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setUploadOpen(false)}>Batal</Button>
                <Button type="submit">Unggah</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
