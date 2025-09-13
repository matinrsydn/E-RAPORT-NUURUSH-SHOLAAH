"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../../components/ui/button";
import DashboardLayout from '../../dashboard/layout';
import FilterSelect from '../../components/FilterSelect';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectItem } from "../../components/ui/select";
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

import API_BASE from "../../api";
import nilaiService from '../../services/nilaiService'
import siswaService from '../../services/siswaService'
import mapelService from '../../services/mapelService'
import kelasService from '../../services/kelasService'
import tahunAjaranService from '../../services/tahunAjaranService'
import excelService from '../../services/excelService'

// --- TIPE DATA ---
interface Siswa {
  id: number;
  nis?: string;
  nama: string;
  kelas_id?: number;
}

interface Mapel {
  id: number;
  nama_mapel: string;
}

interface Kelas {
  id: number;
  nama_kelas: string;
}

interface TahunAjaran {
  id: number;
  nama_ajaran: string;
  semester: string;
}

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

interface FormData {
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
  }>({
    siswa: [],
    mapel: [],
    kelas: [],
    tahunAjaran: [],
  });
  const [filters, setFilters] = useState({ kelas_id: "", tahun_ajaran_id: "" });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentNilai, setCurrentNilai] = useState<Partial<Nilai> | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const { toast } = useToast()

  // --- FETCH DATA (FIXED) ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [nilaiData, siswaData, mapelData, kelasData, tahunData] = await Promise.all([
        nilaiService.getAllNilai(),
        siswaService.getAllSiswa(),
        mapelService.getAllMapel(),
        kelasService.getAllKelas(),
        tahunAjaranService.getAllTahunAjaran(),
      ])

      setNilaiList(nilaiData);
      setOptions({
        siswa: siswaData,
        mapel: mapelData,
        kelas: kelasData,
        tahunAjaran: tahunData,
      });
    } catch (error) {
      console.error("Gagal memuat data:", error);
      toast({ title: "Gagal", description: "Periksa koneksi ke server", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []); // <-- PERBAIKAN: Hapus [toast] dari sini

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- CRUD ---
  const handleAddNew = () => {
    setCurrentNilai({});
    setIsModalOpen(true);
  };

  const handleEdit = (nilai: Nilai) => {
    setCurrentNilai(nilai);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data nilai ini?")) {
      try {
        await nilaiService.deleteNilai(id)
        toast({ title: "Berhasil", description: "Data nilai dihapus" });
        fetchData();
      } catch (error: any) {
        toast({
          title: "Gagal",
          description: error.response?.data?.message || "Gagal menghapus data.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = async (formData: FormData) => {
    try {
      const payload = {
        ...formData,
        siswa_id: Number(formData.siswa_id),
        mapel_id: Number(formData.mapel_id),
        tahun_ajaran_id: Number(formData.tahun_ajaran_id),
        nilai: Number(formData.nilai),
      };

      if (currentNilai?.id) {
        await nilaiService.updateNilai(currentNilai.id, payload)
        toast({ title: "Berhasil", description: "Data nilai diperbarui" });
      } else {
        await nilaiService.createNilai(payload)
        toast({ title: "Berhasil", description: "Data nilai ditambahkan" });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Gagal",
        description: error.response?.data?.message || "Gagal menyimpan data.",
        variant: "destructive",
      });
    }
  };

  // --- FILTER ---
  const filteredNilai = nilaiList.filter((nilai) => {
    const siswaData = options.siswa.find(s => s.id === nilai.siswa_id);
    
    const kelasMatch = !filters.kelas_id || (siswaData && siswaData.kelas_id == Number(filters.kelas_id));
    const tahunMatch = !filters.tahun_ajaran_id || nilai.tahun_ajaran_id == Number(filters.tahun_ajaran_id);
    
    return kelasMatch && tahunMatch;
  });

  // --- IMPORT / EXPORT EXCEL ---
  const handleDownloadTemplate = async () => {
    if (!filters.kelas_id || !filters.tahun_ajaran_id) {
      toast({
        title: "Pilih Kelas & Tahun Ajaran",
        description: "Silakan pilih filter dulu",
        variant: "destructive",
      });
      return;
    }
    try {
      const blobData = await excelService.downloadCompleteTemplate({ kelas_id: filters.kelas_id, tahun_ajaran_id: filters.tahun_ajaran_id })
      const blob = new Blob([blobData], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template-nilai.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Template berhasil diunduh" });
    } catch (e: any) {
      toast({
        title: "Gagal unduh",
        description: e?.response?.data?.message || e.message,
        variant: "destructive",
      });
    }
  };

  const handleUploadExcel = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast({
        title: "Pilih file",
        description: "Silakan pilih file Excel",
        variant: "destructive",
      });
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    try {
      setUploading(true);
      setUploadProgress(0)
      const json = await excelService.uploadCompleteData(fd, (percent:number) => setUploadProgress(percent))
      toast({ title: "Upload selesai", description: json?.message || "Selesai" });
      fetchData();
    } catch (e: any) {
      toast({
        title: "Gagal upload",
        description: e?.response?.data?.message || e.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setTimeout(()=>setUploadProgress(null), 800)
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Manajemen Input Nilai</h1>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Filter dan Aksi</CardTitle>
              <div className="flex gap-2">
                <Button onClick={handleAddNew}>Tambah Nilai Manual</Button>
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  Download Template
                </Button>
                <Input type="file" ref={fileInputRef} accept=".xlsx" className="max-w-xs"/>
                <Button onClick={handleUploadExcel} disabled={uploading}>
                  {uploading ? "Mengunggah..." : "Upload Excel"}
                </Button>
                {uploadProgress !== null && (
                  <div className="w-56">
                    <div className="h-2 bg-gray-200 rounded overflow-hidden mt-2">
                      <div className="h-2 bg-blue-500" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{uploadProgress}%</div>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FilterSelect
              id="filter-kelas"
              label="Filter Berdasarkan Kelas"
              value={filters.kelas_id}
              onChange={(v)=>setFilters(prev=>({...prev, kelas_id: v}))}
              placeholder="Semua Kelas"
              options={options.kelas.map(k=>({ value: String(k.id), label: k.nama_kelas }))}
            />
            <FilterSelect
              id="filter-tahun"
              label="Filter Berdasarkan Tahun Ajaran"
              value={filters.tahun_ajaran_id}
              onChange={(v)=>setFilters(prev=>({...prev, tahun_ajaran_id: v}))}
              placeholder="Semua Tahun"
              options={options.tahunAjaran.map(t=>({ value: String(t.id), label: `${t.nama_ajaran} (Sem ${t.semester})` }))}
            />
          </CardContent>
        </Card>

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
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : filteredNilai.length > 0 ? (
                  filteredNilai.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.siswa?.nama || `Siswa ID: ${item.siswa_id}`}</TableCell>
                      <TableCell>{item.mapel?.nama_mapel || `Mapel ID: ${item.mapel_id}`}</TableCell>
                      <TableCell>{item.nilai}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          Hapus
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Data tidak ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <NilaiDialog
          isOpen={isModalOpen}
          setIsOpen={setIsModalOpen}
          nilai={currentNilai}
          onSubmit={handleSubmit}
          options={options}
        />
      </div>
    </DashboardLayout>
  );
}

// --- DIALOG ---
function NilaiDialog({
  isOpen,
  setIsOpen,
  nilai,
  onSubmit,
  options,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  nilai: Partial<Nilai> | null;
  onSubmit: (data: FormData) => void;
  options: { siswa: Siswa[]; mapel: Mapel[]; tahunAjaran: TahunAjaran[] };
}) {
  const [formData, setFormData] = useState<FormData>({
    siswa_id: "",
    mapel_id: "",
    nilai: "",
    semester: "",
    tahun_ajaran_id: "",
  });

  useEffect(() => {
    if (nilai) {
      const tahunAjaran = options.tahunAjaran.find(
        (ta) => ta.id === nilai.tahun_ajaran_id
      );
      setFormData({
        id: nilai.id,
        siswa_id: String(nilai.siswa_id || ""),
        mapel_id: String(nilai.mapel_id || ""),
        nilai: String(nilai.nilai || ""),
        semester: nilai.semester || tahunAjaran?.semester || "",
        tahun_ajaran_id: String(nilai.tahun_ajaran_id || ""),
      });
    } else {
      setFormData({
        siswa_id: "",
        mapel_id: "",
        nilai: "",
        semester: "",
        tahun_ajaran_id: "",
      });
    }
  }, [nilai, isOpen, options.tahunAjaran]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    let updatedFormData = { ...formData, [name]: value };
    if (name === "tahun_ajaran_id") {
      const selectedTahun = options.tahunAjaran.find(
        (ta) => ta.id === Number(value)
      );
      if (selectedTahun) {
        updatedFormData.semester = selectedTahun.semester;
      }
    }
    setFormData(updatedFormData);
  };
  

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <form onSubmit={handleFormSubmit}>
          <DialogHeader>
            <DialogTitle>{nilai?.id ? "Edit Nilai" : "Tambah Nilai Baru"}</DialogTitle>
            <DialogDescription>
              Lengkapi semua informasi yang diperlukan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Siswa</Label>
              <Select name="siswa_id" value={formData.siswa_id} onChange={handleSelectChange} required>
                <option value="">Pilih Siswa</option>
                {options.siswa.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.nis ? `${s.nis} - ${s.nama}` : s.nama}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mata Pelajaran</Label>
              <Select name="mapel_id" value={formData.mapel_id} onChange={handleSelectChange} required>
                <option value="">Pilih Mata Pelajaran</option>
                {options.mapel.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.nama_mapel}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tahun Ajaran & Semester</Label>
              <Select name="tahun_ajaran_id" value={formData.tahun_ajaran_id} onChange={handleSelectChange} required>
                <option value="">Pilih Tahun Ajaran</option>
                {options.tahunAjaran.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.nama_ajaran} (Sem {t.semester})
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nilai</Label>
              <Input
                name="nilai"
                type="number"
                value={formData.nilai}
                onChange={handleChange}
                required
                step="0.01"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Batal
              </Button>
            </DialogClose>
            <Button type="submit">Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}