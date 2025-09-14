import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import { useForm } from 'react-hook-form'
import siswaService from '../../services/siswaService'
import suratKeluarService from '../../services/suratKeluarService'
import { Label } from '../../components/ui/label'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { useToast } from '../../components/ui/toast'

type FormValues = {
  template: File | null
  siswa_id: number | ''
  tujuan_nama_pesantren: string
  tujuan_alamat_pesantren: string
  alasan: string
  jenis_keluar: 'Pindah' | 'Lulus' | 'DO'
  penanggung_jawab?: 'ayah'|'ibu'|'wali'
  penanggung_nama?: string
}

export default function SuratKeluarTemplatePage() {
  const [siswaOptions, setSiswaOptions] = useState<any[]>([])
  const { register, handleSubmit, setValue } = useForm<FormValues>({ defaultValues: { template: null as any, siswa_id: '', tujuan_nama_pesantren: '', tujuan_alamat_pesantren: '', alasan: '', jenis_keluar: 'Pindah', penanggung_jawab: 'wali', penanggung_nama: '' } })
  const { toast } = useToast()
  const [penanggungNama, setPenanggungNama] = useState<string>('')
  const [penanggungPilihan, setPenanggungPilihan] = useState<'ayah'|'ibu'|'wali'>('wali')

  useEffect(() => {
    (async () => {
      try {
        const res = await siswaService.getAllSiswa({ show_all: true })
        setSiswaOptions(res || [])
      } catch (e) { console.error(e) }
    })()
  }, [])

  const onSubmit = async (vals: any) => {
    if (!vals.template || !vals.siswa_id) {
      toast({ title: 'Gagal', description: 'Template dan siswa wajib diisi', variant: 'destructive' })
      return
    }

  const fd = new FormData()
  // vals.template is stored as File
  const templateFile = vals.template instanceof File ? vals.template : (vals.template && (vals.template as any)[0])
  if (templateFile) fd.append('template', templateFile)
    fd.append('siswa_id', String(vals.siswa_id))
    fd.append('tujuan_nama_pesantren', vals.tujuan_nama_pesantren)
    fd.append('tujuan_alamat_pesantren', vals.tujuan_alamat_pesantren)
    fd.append('alasan', vals.alasan)
    fd.append('jenis_keluar', vals.jenis_keluar)
  // penanggung fields
  if (penanggungPilihan) fd.append('penanggung_jawab', penanggungPilihan)
  if (penanggungNama) fd.append('penanggung_nama', penanggungNama)

    try {
      const res = await suratKeluarService.generateFromTemplate(fd)
      // trigger download
      const blob = new Blob([res.data], { type: res.headers['content-type'] })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      const cd = res.headers['content-disposition'] || ''
      let filename = 'surat.docx'
      const m = cd.match(/filename\*?=\"?(?:UTF-8'')?([^;\"]+)/)
      if (m) filename = decodeURIComponent(m[1])
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast({ title: 'Berhasil', description: 'Surat berhasil di-generate' })
    } catch (e: any) {
      console.error(e)
      toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal generate surat', variant: 'destructive' })
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Generate Surat Pindah dari Template</h1>
          <p className="text-muted-foreground">Unggah template .docx dan isi data untuk menghasilkan surat.</p>
        </div>

        <div className="max-w-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Template .docx</Label>
              <Input type="file" accept=".docx" onChange={(e)=>{ const f = (e.target as HTMLInputElement).files; if (f && f[0]) setValue('template', f[0]) }} />
            </div>

            <div>
              <Label>Pilih Siswa</Label>
              <Select {...register('siswa_id')} onChange={(e)=>{
                const id = Number((e.target as HTMLSelectElement).value)
                setValue('siswa_id', id)
                const s = siswaOptions.find(x=>x.id===id)
                if (s) {
                  const defaultName = s.nama_wali || s.nama_ayah || s.nama_ibu || ''
                  setPenanggungNama(defaultName)
                  setValue('penanggung_nama', defaultName)
                } else {
                  setPenanggungNama('')
                  setValue('penanggung_nama','')
                }
              }}>
                <option value="">-- Pilih --</option>
                {siswaOptions.map(s => (<option key={s.id} value={s.id}>{s.nis} - {s.nama}</option>))}
              </Select>
            </div>

            <div>
              <Label>Atas Nama (Penanggung)</Label>
              <div className="flex gap-2">
                <Select value={penanggungPilihan} onChange={(e)=>{ const v = e.target.value as any; setPenanggungPilihan(v); setValue('penanggung_jawab', v); }}>
                  <option value="ayah">Ayah</option>
                  <option value="ibu">Ibu</option>
                  <option value="wali">Wali</option>
                </Select>
                <Input value={penanggungNama} onChange={(e)=>{ setPenanggungNama(e.target.value); setValue('penanggung_nama', e.target.value) }} placeholder="Nama penanggung (editable)" />
              </div>
            </div>

            <div>
              <Label>Nama Pesantren Tujuan</Label>
              <Input {...register('tujuan_nama_pesantren')} />
            </div>

            <div>
              <Label>Alamat Pesantren Tujuan</Label>
              <Input {...register('tujuan_alamat_pesantren')} />
            </div>

            <div>
              <Label>Alasan Pindah</Label>
              <Input {...register('alasan')} />
            </div>

            <div>
              <Label>Jenis Keluar</Label>
              <Select {...register('jenis_keluar')}>
                <option value="Pindah">Pindah</option>
                <option value="Lulus">Lulus</option>
                <option value="DO">DO</option>
              </Select>
            </div>

            <div className="pt-4">
              <Button type="submit">Generate & Download Surat</Button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}
