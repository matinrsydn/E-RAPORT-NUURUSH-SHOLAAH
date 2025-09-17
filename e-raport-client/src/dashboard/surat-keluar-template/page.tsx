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
  siswa_id: number | ''
  penanggung_jawab: 'ayah' | 'ibu' | 'wali'
  jenis_keluar: 'Pindah' | 'DO'
  tujuan_nama_pesantren: string
  tujuan_alamat_pesantren: string
  alasan: string
}

type SiswaData = {
  id: number
  nama: string
  nis?: string
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

export default function SuratKeluarTemplatePage() {
  const [siswaOptions, setSiswaOptions] = useState<SiswaData[]>([])
  const [selectedSiswa, setSelectedSiswa] = useState<SiswaData | null>(null)
  const { register, handleSubmit, setValue, watch } = useForm<FormValues>({ 
    defaultValues: { 
      siswa_id: '', 
      penanggung_jawab: 'ayah',
      jenis_keluar: 'Pindah',
      tujuan_nama_pesantren: '', 
      tujuan_alamat_pesantren: '', 
      alasan: ''
    } 
  })
  const { toast } = useToast()
  const penanggungJawab = watch('penanggung_jawab')

  // Load siswa data once on mount
  useEffect(() => {
    const loadSiswa = async () => {
      try {
        const res = await siswaService.getAllSiswa({ show_all: true })
        setSiswaOptions(res || [])
      } catch (e) { 
        console.error('Error loading siswa:', e)
        toast({
          title: 'Error',
          description: 'Gagal memuat data siswa',
          variant: 'destructive'
        })
      }
    }
    loadSiswa()
  }, []) // Empty dependency array since we only want to load once

  // Track siswa_id changes using useEffect properly
  const siswaId = watch('siswa_id')
  useEffect(() => {
    const siswa = siswaOptions.find(s => s.id === Number(siswaId))
    setSelectedSiswa(siswa || null)
  }, [siswaId, siswaOptions]) // Only depend on siswaId and siswaOptions

  // Get penanggung jawab data based on selection
  const getPenanggungJawabData = () => {
    if (!selectedSiswa) return null

    switch (penanggungJawab) {
      case 'ayah':
        return {
          nama: selectedSiswa.nama_ayah,
          pekerjaan: selectedSiswa.pekerjaan_ayah,
          alamat: selectedSiswa.alamat_ayah,
        }
      case 'ibu':
        return {
          nama: selectedSiswa.nama_ibu,
          pekerjaan: selectedSiswa.pekerjaan_ibu,
          alamat: selectedSiswa.alamat_ibu,
        }
      case 'wali':
        return {
          nama: selectedSiswa.nama_wali,
          pekerjaan: selectedSiswa.pekerjaan_wali,
          alamat: selectedSiswa.alamat_wali,
        }
    }
  }

  const penanggungJawabData = getPenanggungJawabData()

  const onSubmit = async (data: FormValues) => {
    try {
      if (!selectedSiswa) {
        toast({
          title: 'Error',
          description: 'Pilih siswa terlebih dahulu',
          variant: 'destructive'
        });
        return;
      }

      const pjData = getPenanggungJawabData();
      if (!pjData || !pjData.nama) {
        toast({
          title: 'Error',
          description: `Data ${penanggungJawab} tidak ditemukan. Mohon cek laman Manajemen Siswa untuk menambahkan data.`,
          variant: 'destructive'
        });
        return;
      }

      const formData = new FormData();
      formData.append('siswa_id', String(data.siswa_id));
      formData.append('jenis_keluar', data.jenis_keluar);
      formData.append('tujuan_nama_pesantren', data.tujuan_nama_pesantren);
      formData.append('tujuan_alamat_pesantren', data.tujuan_alamat_pesantren);
      formData.append('alasan', data.alasan);
      formData.append('penanggung_jawab', data.penanggung_jawab);
      formData.append('ortu_nama', pjData.nama);
      formData.append('ortu_pekerjaan', pjData.pekerjaan || '');
      formData.append('ortu_alamat', pjData.alamat || '');

      const response = await suratKeluarService.generateFromTemplate(formData);
      
      // Create and download the generated document
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `surat_keluar_${selectedSiswa.nama}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Berhasil',
        description: 'Surat keluar berhasil dibuat',
      });
    } catch (error: any) {
      console.error('Error generating surat:', error);
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Gagal membuat surat keluar',
        variant: 'destructive'
      });
    }
  };

  const handleSiswaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value)
    setValue('siswa_id', id)
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Generate Surat Keluar</h1>
          <p className="text-muted-foreground">
            Pilih siswa dan isi data untuk generate surat keluar otomatis.
          </p>
        </div>

        <div className="grid gap-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Siswa */}
            <div>
              <Label>Siswa</Label>
              <select 
                className="w-full p-2 border rounded-md"
                {...register('siswa_id', { required: true })}
              >
                <option value="">Pilih Siswa</option>
                {siswaOptions.map(s => (
                  <option key={s.id} value={s.id}>{s.nama} {s.nis ? `- ${s.nis}` : ''}</option>
                ))}
              </select>
            </div>

            {/* Penanggung Jawab Selection */}
            <div>
              <Label>Penanggung Jawab</Label>
              <select 
                className="w-full p-2 border rounded-md"
                {...register('penanggung_jawab')}
              >
                <option value="ayah">Ayah</option>
                <option value="ibu">Ibu</option>
                <option value="wali">Wali</option>
              </select>
            </div>

            {/* Jenis Keluar Selection */}
            <div>
              <Label>Jenis Keluar</Label>
              <select 
                className="w-full p-2 border rounded-md"
                {...register('jenis_keluar')}
              >
                <option value="Pindah">Pindah Pesantren</option>
                <option value="DO">Drop Out (DO)</option>
              </select>
            </div>

            {/* Display Penanggung Jawab Data */}
            {selectedSiswa && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-medium mb-2">Data {penanggungJawab}</h3>
                {penanggungJawabData ? (
                  <div className="grid gap-2 text-sm">
                    <p><strong>Nama:</strong> {penanggungJawabData.nama || '-'}</p>
                    <p><strong>Pekerjaan:</strong> {penanggungJawabData.pekerjaan || '-'}</p>
                    <p><strong>Alamat:</strong> {penanggungJawabData.alamat || '-'}</p>
                  </div>
                ) : (
                  <p className="text-yellow-600">
                    Data {penanggungJawab} tidak ditemukan. Mohon cek laman Manajemen Siswa untuk menambahkan data.
                  </p>
                )}
              </div>
            )}

            {/* Data Pesantren Tujuan */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Nama Pesantren Tujuan</Label>
                <Input 
                  {...register('tujuan_nama_pesantren', { required: true })} 
                  placeholder="Contoh: Pesantren Al-Hidayah"
                />
              </div>
              <div>
                <Label>Alamat Pesantren Tujuan</Label>
                <Input 
                  {...register('tujuan_alamat_pesantren', { required: true })} 
                  placeholder="Contoh: Jl. Raya No. 123, Kota"
                />
              </div>
            </div>

            {/* Alasan */}
            <div>
              <Label>Alasan</Label>
              <Input 
                {...register('alasan', { required: true })} 
                placeholder="Alasan keluar/pindah"
              />
            </div>

            <Button 
              type="submit"
              disabled={!selectedSiswa || !penanggungJawabData?.nama}
            >
              Generate Surat
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}