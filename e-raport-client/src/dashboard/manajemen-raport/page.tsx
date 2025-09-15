import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../../dashboard/layout';
import axios from 'axios';
import raportService from '../../services/raportService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useToast } from '../../components/ui/toast';
import tahunAjaranService from '../../services/tahunAjaranService';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import API_BASE from '../../api';
import DataTable from '../../components/data-table';

// Tipe data
type SiswaRow = {
  id: number;
  nis: string;
  nama: string;
  currentHistory?: {
    id: number;
    kelas_id: number;
    catatan_akademik?: string;
    catatan_sikap?: string;
  };
};
type BatchRow = { id: number; nama: string; keterangan?: string };

export default function ManajemenRaportDashboardPage() {
  // State
  const [batchData, setBatchData] = useState<BatchRow[]>([]);
  const [loadingBatch, setLoadingBatch] = useState(true);
  const [siswaList, setSiswaList] = useState<SiswaRow[]>([]);
  const [loadingSiswa, setLoadingSiswa] = useState(true);
  const [masterOptions, setMasterOptions] = useState<any[]>([]);
  const [periodeOptions, setPeriodeOptions] = useState<any[]>([]);
  const [tingkatanOptions, setTingkatanOptions] = useState<any[]>([]);
  const [kelasOptions, setKelasOptions] = useState<any[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<number | ''>('');
  const [selectedPeriode, setSelectedPeriode] = useState<number | ''>('');
  const [selectedTingkatan, setSelectedTingkatan] = useState<number | ''>('');
  const [selectedKelas, setSelectedKelas] = useState<number | ''>('');
  const [editingNotes, setEditingNotes] = useState<Record<number, { catatan_akademik?: string; catatan_sikap?: string }>>({});
  const [deleting, setDeleting] = useState<BatchRow | null>(null);
  const { toast } = useToast();

  // Fungsi fetchBatchData - Remove toast from dependencies
  const fetchBatchData = useCallback(async () => {
    setLoadingBatch(true);
    try {
      const res = await raportService.getRaportList();
      setBatchData(res);
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal Memuat Batch', description: 'Terjadi kesalahan.', variant: 'destructive' });
    } finally {
      setLoadingBatch(false);
    }
  }, []); // Remove toast dependency

  // Fungsi loadSiswa - Remove toast from dependencies and add proper conditions
  const loadSiswa = useCallback(async () => {
    if (!selectedPeriode || !selectedKelas) {
      setSiswaList([]);
      setLoadingSiswa(false); // Set loading to false when no selection
      return;
    }
    
    setLoadingSiswa(true);
    try {
      const params = { tahun_ajaran_id: selectedPeriode, kelas_id: selectedKelas };
      const res = await axios.get<SiswaRow[]>(`${API_BASE}/siswa`, { params });
      setSiswaList(res.data || []);
      if ((res.data || []).length === 0) {
        toast({ title: 'Informasi', description: 'Tidak ada siswa yang ditemukan.' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Gagal Memuat Siswa', description: 'Gagal mengambil data siswa.', variant: 'destructive' });
      setSiswaList([]);
    } finally {
      setLoadingSiswa(false);
    }
  }, [selectedPeriode, selectedKelas]); // Remove toast dependency

  // Fixed initialization useEffect - only run once
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoadingSiswa(true);
        const masters = await tahunAjaranService.getAllMasterTahunAjaran();
        const tingkatans = (await axios.get(`${API_BASE}/tingkatans`)).data;
        setMasterOptions(masters);
        setTingkatanOptions(tingkatans);
        
        if (masters.length > 0) {
          const defaultMasterId = masters[0].id;
          setSelectedMaster(defaultMasterId);
          const periodes = await tahunAjaranService.getPeriodesForMaster(defaultMasterId);
          setPeriodeOptions(periodes);
          if (periodes.length > 0) {
            setSelectedPeriode(periodes[0].id);
          }
        }
        if (tingkatans.length > 0) {
          const defaultTingkatanId = tingkatans[0].id;
          setSelectedTingkatan(defaultTingkatanId);
          const kelasResp = await axios.get(`${API_BASE}/kelas`, { params: { tingkatan_id: defaultTingkatanId } });
          setKelasOptions(kelasResp.data || []);
          if (kelasResp.data && kelasResp.data.length > 0) {
            setSelectedKelas(kelasResp.data[0].id);
          }
        }
      } catch (error) {
        console.error("Initialization failed:", error);
        toast({ title: 'Inisialisasi Gagal', description: 'Gagal memuat data filter awal.', variant: 'destructive' });
      } finally {
        setLoadingSiswa(false);
      }
    };
    
    initialize();
    fetchBatchData();
  }, []); // Empty dependency array - only runs once

  // Handle master selection changes
  useEffect(() => {
    if (!selectedMaster) {
      setPeriodeOptions([]);
      setSelectedPeriode('');
      return;
    }
    
    const fetchPeriodes = async () => {
      try {
        const periodes = await tahunAjaranService.getPeriodesForMaster(selectedMaster);
        setPeriodeOptions(periodes);
        setSelectedPeriode(periodes.length > 0 ? periodes[0].id : '');
      } catch (error) {
        console.error('Failed to fetch periodes:', error);
        setPeriodeOptions([]);
        setSelectedPeriode('');
      }
    };
    
    fetchPeriodes();
  }, [selectedMaster]);

  // Handle tingkatan selection changes
  useEffect(() => {
    if (!selectedTingkatan) {
      setKelasOptions([]);
      setSelectedKelas('');
      return;
    }
    
    const fetchKelas = async () => {
      try {
        const resp = await axios.get(`${API_BASE}/kelas`, { params: { tingkatan_id: selectedTingkatan } });
        setKelasOptions(resp.data || []);
        setSelectedKelas(resp.data && resp.data.length > 0 ? resp.data[0].id : '');
      } catch (err) {
        console.error('Failed fetching kelas for tingkatan', err);
        setKelasOptions([]);
        setSelectedKelas('');
      }
    };
    
    fetchKelas();
  }, [selectedTingkatan]);

  // Load siswa when periode or kelas changes
  useEffect(() => {
    loadSiswa();
  }, [selectedPeriode, selectedKelas]); // Direct dependencies instead of function

  // Helper functions
  const downloadBlob = (resp: any, defaultName: string) => {
    const blob = new Blob([resp.data], { type: resp.headers['content-type'] });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    let fileName = defaultName;
    const cd = resp.headers['content-disposition'];
    if (cd) {
      const m = cd.match(/filename="(.+)"/);
      if (m) fileName = m[1];
    }
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(link.href);
  };

  const handleGenerate = async (type: 'identitas' | 'nilai' | 'sikap', siswaId: number) => {
    if ((type === 'nilai' || type === 'sikap') && !selectedPeriode) {
      return toast({ title: 'Pilih Periode', description: 'Pilih tahun ajaran dan semester dulu', variant: 'destructive' });
    }
    try {
      let resp;
      const semester = periodeOptions.find(p => p.id === selectedPeriode)?.semester;
      if (type === 'identitas') resp = await raportService.generateIdentitas(siswaId);
      if (type === 'nilai') resp = await raportService.generateNilai(siswaId, selectedPeriode, semester);
      if (type === 'sikap') resp = await raportService.generateSikap(siswaId, selectedPeriode, semester);
      
      if (resp) {
        downloadBlob(resp, `Laporan_${type}_${siswaId}.docx`);
        toast({ title: 'Sukses', description: 'File laporan berhasil diunduh.' });
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Gagal Generate', description: e?.response?.data?.message || 'Gagal membuat file laporan.', variant: 'destructive' });
    }
  };

  const handleSaveNotes = async (siswa: SiswaRow) => {
    const notes = editingNotes[siswa.id];
    if (!notes || (!notes.catatan_akademik && !notes.catatan_sikap)) return;
    
    const histId = siswa.currentHistory?.id;
    if (!histId) {
      return toast({ title: 'History Tidak Ditemukan', description: 'Tidak ada riwayat kelas untuk siswa ini.', variant: 'destructive' });
    }
    
    try {
      await axios.put(`${API_BASE}/history/${histId}/catatan`, notes);
      toast({ title: 'Berhasil', description: 'Catatan berhasil disimpan.' });
      // Clear editing notes after successful save
      setEditingNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[siswa.id];
        return newNotes;
      });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Gagal Menyimpan', description: e?.response?.data?.message || 'Gagal menyimpan catatan.', variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Raport</h1>
          <p className="text-muted-foreground">Pilih filter untuk menampilkan siswa, lalu kelola raport dan catatan per individu.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filter Siswa</CardTitle>
            <CardDescription>Ubah pilihan di bawah ini untuk memuat daftar siswa secara otomatis.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="master-ajaran">Tahun Ajaran (Master)</Label>
                <Select
                  value={String(selectedMaster)}
                  onValueChange={(value) => setSelectedMaster(value ? Number(value) : '')}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih Tahun Ajaran" />
                  </SelectTrigger>
                  <SelectContent>
                    {masterOptions.map(m => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.nama_ajaran}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="periode">Semester / Periode</Label>
                <Select
                  value={String(selectedPeriode)}
                  onValueChange={(value) => setSelectedPeriode(value ? Number(value) : '')}
                  disabled={!selectedMaster}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodeOptions.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {`Semester ${p.semester}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tingkatan">Tingkatan</Label>
                <Select
                  value={String(selectedTingkatan)}
                  onValueChange={(value) => setSelectedTingkatan(value ? Number(value) : '')}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih Tingkatan" />
                  </SelectTrigger>
                  <SelectContent>
                    {tingkatanOptions.map(t => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.nama_tingkatan}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kelas">Kelas</Label>
                <Select
                  value={String(selectedKelas)}
                  onValueChange={(value) => setSelectedKelas(value ? Number(value) : '')}
                  disabled={!selectedTingkatan}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {kelasOptions.map(k => (
                      <SelectItem key={k.id} value={String(k.id)}>
                        {k.nama_kelas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Siswa</CardTitle>
            <CardDescription>Ditemukan {siswaList.length} siswa. Generate laporan atau perbarui catatan di bawah.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSiswa ? (
              <div className="text-center text-muted-foreground">Memuat data siswa...</div>
            ) : siswaList.length === 0 ? (
              <div className="text-center text-muted-foreground">Belum ada siswa yang dimuat. Silakan sesuaikan filter di atas.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="p-3 font-medium">Siswa</th>
                      <th className="p-3 font-medium">Catatan & Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siswaList.map(s => (
                      <tr key={s.id} className="border-b">
                        <td className="p-3 align-top">
                          <p className="font-semibold">{s.nama}</p>
                          <p className="text-xs text-muted-foreground">NIS: {s.nis}</p>
                        </td>
                        <td className="p-3">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs font-semibold">Catatan Akademik</Label>
                                <textarea 
                                  className="mt-1 w-full border rounded-md p-2 text-sm" 
                                  rows={3} 
                                  value={editingNotes[s.id]?.catatan_akademik ?? s.currentHistory?.catatan_akademik ?? ''} 
                                  onChange={(e) => setEditingNotes(prev => ({ 
                                    ...prev, 
                                    [s.id]: { 
                                      ...(prev[s.id] || {}), 
                                      catatan_akademik: e.target.value 
                                    } 
                                  }))} 
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-semibold">Catatan Sikap</Label>
                                <textarea 
                                  className="mt-1 w-full border rounded-md p-2 text-sm" 
                                  rows={3} 
                                  value={editingNotes[s.id]?.catatan_sikap ?? s.currentHistory?.catatan_sikap ?? ''} 
                                  onChange={(e) => setEditingNotes(prev => ({ 
                                    ...prev, 
                                    [s.id]: { 
                                      ...(prev[s.id] || {}), 
                                      catatan_sikap: e.target.value 
                                    } 
                                  }))} 
                                />
                              </div>
                            </div>
                            <div className="flex flex-col space-y-2">
                                <p className="text-xs font-semibold mb-1">Generate Laporan</p>
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" variant="outline" onClick={() => handleGenerate('identitas', s.id)}>Identitas</Button>
                                  <Button size="sm" variant="outline" onClick={() => handleGenerate('nilai', s.id)}>Nilai</Button>
                                  <Button size="sm" variant="outline" onClick={() => handleGenerate('sikap', s.id)}>Sikap</Button>
                                </div>
                                <div className="pt-4">
                                  <Button size="sm" onClick={() => handleSaveNotes(s)}>Simpan Catatan</Button>
                                </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Batch Raport</CardTitle>
            <CardDescription>Daftar batch raport yang pernah dibuat sebelumnya.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBatch ? (
              <div>Memuat...</div>
            ) : (
              <DataTable<BatchRow>
                columns={[
                  { header: 'Nama', accessorKey: 'nama' },
                  { header: 'Keterangan', accessorKey: 'keterangan' },
                  { id: 'actions', header: 'Aksi', accessorKey: 'id' as any }
                ]}
                data={batchData}
                onDelete={(r) => setDeleting(r)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}