"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../../components/ui/button";
import DashboardLayout from '../../dashboard/layout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useToast } from "../../components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useForm, Controller } from 'react-hook-form';

import nilaiService from '../../services/nilaiService'
import siswaService from '../../services/siswaService'
import mapelService from '../../services/mapelService'
import kelasService from '../../services/kelasService'
import tahunAjaranService from '../../services/tahunAjaranService'
import excelService from '../../services/excelService'
import * as tingkatanService from '../../services/tingkatanService'

// --- TIPE DATA ---
interface Tingkatan { id: number; nama_tingkatan: string; }
interface Siswa { id: number; nis?: string; nama: string; kelas_id?: number; }
interface Mapel { id: number; nama_mapel: string; }
interface Kelas { id: number; nama_kelas: string; }
interface TahunAjaran { id: number; nama_ajaran: string; semester: string; }
interface Nilai {
  id: number;
  siswa_id: number;
  mapel_id: number;
  nilai: number;
  semester: string;
  tahun_ajaran_id: number;
  siswa?: { nama: string; nis?: string };
  mapel?: Mapel;
}
type FormData = {
  id?: number;
  siswa_id: string;
  mapel_id: string;
  nilai: string;
  semester: string;
  tahun_ajaran_id: string;
}

export default function InputNilaiPage() {
  const [nilaiList, setNilaiList] = useState<Nilai[]>([]);
  const [options, setOptions] = useState<{
    siswa: Siswa[];
    mapel: Mapel[];
    kelas: Kelas[];
    tahunAjaran: TahunAjaran[];
    tingkatan: Tingkatan[];
  }>({ siswa: [], mapel: [], kelas: [], tahunAjaran: [], tingkatan: [] });
  
  const [filters, setFilters] = useState({ 
    kelas_id: "", 
    tahun_ajaran_id: "", 
    tingkatan_id: "" 
  });

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNilai, setEditingNilai] = useState<Partial<Nilai> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  
  const { control, handleSubmit, reset, setValue, register } = useForm<FormData>({
    defaultValues: {
      siswa_id: "",
      mapel_id: "",
      nilai: "",
      semester: "",
      tahun_ajaran_id: "",
    }
  });

  const fetchNilaiData = useCallback(async () => {
    setLoading(true);
    try {
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== "")
      );
      const nilaiData = await nilaiService.getAllNilai(activeFilters);
      setNilaiList(nilaiData);
    } catch (error) {
      console.error("Gagal memuat data nilai:", error);
      toast({ title: "Gagal Memuat Nilai", description: "Tidak dapat mengambil data nilai dari server.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  // FIXED: Load options once on mount
  useEffect(() => {
    let mounted = true
    const loadOptions = async () => {
      try {
        const [siswaData, mapelData, tahunData, tingkatanData] = await Promise.all([
          siswaService.getAllSiswa({ show_all: true }),
          mapelService.getAllMapel(),
          tahunAjaranService.getAllTahunAjaran(),
          tingkatanService.getAllTingkatans(),
        ]);
        if (mounted) {
          setOptions(prev => ({ 
            ...prev, 
            siswa: siswaData, 
            mapel: mapelData, 
            tahunAjaran: tahunData, 
            tingkatan: tingkatanData 
          }));
        }
      } catch (error) {
        console.error("Gagal memuat opsi dropdown:", error);
      }
    };
    loadOptions();
    
    return () => { mounted = false }
  }, []);

  // FIXED: Debounced fetch when filters change
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    timeoutId = setTimeout(() => {
      fetchNilaiData();
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [filters]);

  // FIXED: Stable kelas fetching
  useEffect(() => {
    let mounted = true
    if (filters.tingkatan_id) {
      kelasService.getKelasByTingkatan(filters.tingkatan_id)
        .then(kelasData => {
          if (mounted) {
            setOptions(prev => ({ ...prev, kelas: kelasData }))
          }
        })
        .catch(err => console.error('Error fetching kelas:', err));
    } else {
      if (mounted) {
        setOptions(prev => ({ ...prev, kelas: [] }));
        setFilters(f => ({ ...f, kelas_id: "" }));
      }
    }
    
    return () => { mounted = false }
  }, [filters.tingkatan_id]);

  const handleOpenDialog = (nilai: Partial<Nilai> | null) => {
    setEditingNilai(nilai);
    if (nilai) {
      const ta = options.tahunAjaran.find(t => t.id === nilai.tahun_ajaran_id);
      reset({
        id: nilai.id,
        siswa_id: String(nilai.siswa_id || ""),
        mapel_id: String(nilai.mapel_id || ""),
        nilai: String(nilai.nilai || ""),
        semester: nilai.semester || ta?.semester || "",
        tahun_ajaran_id: String(nilai.tahun_ajaran_id || ""),
      });
    } else {
      reset({ siswa_id: '', mapel_id: '', nilai: '', semester: '', tahun_ajaran_id: '' });
    }
    setIsModalOpen(true);
  };

  const onSubmit = async (formData: FormData) => {
    try {
      const payload = {
        ...formData,
        siswa_id: Number(formData.siswa_id),
        mapel_id: Number(formData.mapel_id),
        tahun_ajaran_id: Number(formData.tahun_ajaran_id),
        nilai: Number(formData.nilai),
      };

      if (editingNilai?.id) {
        await nilaiService.updateNilai(editingNilai.id, payload);
        toast({ title: "Berhasil", description: "Data nilai diperbarui" });
      } else {
        await nilaiService.createNilai(payload);
        toast({ title: "Berhasil", description: "Data nilai ditambahkan" });
      }
      setIsModalOpen(false);
      fetchNilaiData();
    } catch (error: any) {
      toast({ title: "Gagal", description: error.response?.data?.message || "Gagal menyimpan data.", variant: "destructive" });
    }
  };
  
  const handleDelete = async (id: number) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data nilai ini?")) {
      try {
        await nilaiService.deleteNilai(id);
        toast({ title: "Berhasil", description: "Data nilai dihapus" });
        fetchNilaiData();
      } catch (error: any) {
        toast({
          title: "Gagal",
          description: error.response?.data?.message || "Gagal menghapus data.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDownloadTemplate = async () => {
    if (!filters.tahun_ajaran_id || !filters.tingkatan_id || !filters.kelas_id) {
      toast({
        title: "Filter Tidak Lengkap",
        description: "Harap pilih Tahun Ajaran, Tingkatan, dan Kelas terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }
    try {
      const blobData = await excelService.downloadCompleteTemplate({ 
        kelas_id: filters.kelas_id, 
        tahun_ajaran_id: filters.tahun_ajaran_id,
        tingkatan_id: filters.tingkatan_id
      });
      const blob = new Blob([blobData], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `template-nilai-lengkap.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Template berhasil diunduh" });
    } catch (e: any) {
      toast({
        title: "Gagal Unduh",
        description: e?.response?.data?.message || "Terjadi kesalahan saat membuat template.",
        variant: "destructive",
      });
    }
  };
  
  const handleUploadExcel = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast({ title: "Pilih File", description: "Silakan pilih file Excel untuk diunggah.", variant: "destructive" });
      return;
    }
    
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const json = await excelService.uploadCompleteData(fd);
      toast({ title: "Upload Selesai", description: json?.message || "File berhasil diproses." });
      fetchNilaiData();
    } catch (e: any) {
      toast({
        title: "Gagal Upload",
        description: e?.response?.data?.message || "Terjadi kesalahan saat mengunggah file.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Manajemen Input Nilai</h1>

        {/* PERBAIKAN LAYOUT: KARTU UNTUK FILTER DAN AKSI */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <CardTitle>Filter dan Aksi</CardTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
                <Button onClick={() => handleOpenDialog(null)}>Tambah Nilai</Button>
                <Button variant="outline" onClick={handleDownloadTemplate}>Download Template</Button>
                <div className="flex items-center gap-2">
                    <Input type="file" ref={fileInputRef} accept=".xlsx" className="max-w-xs"/>
                    <Button onClick={handleUploadExcel} disabled={uploading}>
                      {uploading ? "Mengunggah..." : "Upload Excel"}
                    </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-2">
                <Label>Tahun Ajaran</Label>
                <Select value={filters.tahun_ajaran_id} onValueChange={(v) => setFilters(prev => ({...prev, tahun_ajaran_id: v}))}>
                    <SelectTrigger><SelectValue placeholder="Semua Tahun Ajaran" /></SelectTrigger>
                    <SelectContent>
                        {options.tahunAjaran.map(t => <SelectItem key={t.id} value={String(t.id)}>{`${t.nama_ajaran} (Sem ${t.semester})`}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Tingkatan</Label>
                <Select value={filters.tingkatan_id} onValueChange={(v) => setFilters(prev => ({...prev, tingkatan_id: v, kelas_id: ""}))}>
                    <SelectTrigger><SelectValue placeholder="Semua Tingkatan" /></SelectTrigger>
                    <SelectContent>
                        {options.tingkatan.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.nama_tingkatan}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Kelas</Label>
                <Select value={filters.kelas_id} onValueChange={(v) => setFilters(prev => ({...prev, kelas_id: v}))} disabled={!filters.tingkatan_id}>
                    <SelectTrigger><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
                    <SelectContent>
                        {options.kelas.map(k => <SelectItem key={k.id} value={String(k.id)}>{k.nama_kelas}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          </CardContent>
        </Card>

        {/* PERBAIKAN LAYOUT: KARTU TERPISAH UNTUK TABEL DATA */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Nilai Siswa</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Siswa</TableHead>
                  <TableHead>Mata Pelajaran</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center">Memuat data...</TableCell></TableRow>
                ) : nilaiList.length > 0 ? (
                  nilaiList.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{options.siswa.find(s => s.id === item.siswa_id)?.nama || `ID: ${item.siswa_id}`}</TableCell>
                      <TableCell>{options.mapel.find(m => m.id === item.mapel_id)?.nama_mapel || `ID: ${item.mapel_id}`}</TableCell>
                      <TableCell>{item.nilai}</TableCell>
                      <TableCell>{item.semester}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenDialog(item)}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>Hapus</Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="text-center">Data tidak ditemukan.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog untuk Tambah/Edit Nilai (Tidak ada perubahan layout, hanya fungsionalitas) */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>{editingNilai?.id ? "Edit Nilai" : "Tambah Nilai Baru"}</DialogTitle>
                <DialogDescription>Lengkapi semua informasi yang diperlukan.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Siswa *</Label>
                  <Controller name="siswa_id" control={control} rules={{ required: true }} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Pilih Siswa" /></SelectTrigger>
                      <SelectContent>
                        {options.siswa.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.nis ? `${s.nis} - ${s.nama}` : s.nama}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-2">
                  <Label>Mata Pelajaran *</Label>
                  <Controller name="mapel_id" control={control} rules={{ required: true }} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Pilih Mata Pelajaran" /></SelectTrigger>
                      <SelectContent>
                        {options.mapel.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.nama_mapel}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-2">
                  <Label>Tahun Ajaran & Semester *</Label>
                  <Controller name="tahun_ajaran_id" control={control} rules={{ required: true }} render={({ field }) => (
                     <Select onValueChange={(value) => {
                         field.onChange(value);
                         const ta = options.tahunAjaran.find(t => t.id === Number(value));
                         if (ta) setValue('semester', ta.semester);
                     }} value={field.value}>
                       <SelectTrigger><SelectValue placeholder="Pilih Tahun Ajaran" /></SelectTrigger>
                       <SelectContent>
                         {options.tahunAjaran.map(t => <SelectItem key={t.id} value={String(t.id)}>{`${t.nama_ajaran} (Sem ${t.semester})`}</SelectItem>)}
                       </SelectContent>
                     </Select>
                  )} />
                </div>
                <div className="space-y-2">
                  <Label>Nilai *</Label>
                  <Input type="number" {...register('nilai', { required: true })} step="0.01" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                <Button type="submit">Simpan</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}