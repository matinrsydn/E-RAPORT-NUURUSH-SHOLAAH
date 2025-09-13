import React, { useEffect, useState, useMemo, useCallback } from 'react';
import DashboardLayout from '../../dashboard/layout';
import API_BASE from '../../api';
import kurikulumService from '../../services/kurikulumService';
import tahunAjaranService from '../../services/tahunAjaranService';
import kelasService from '../../services/kelasService';
import mapelService from '../../services/mapelService';
import kitabService from '../../services/kitabService.js';
import DataTable from '../../components/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import type { ColumnDef } from '@tanstack/react-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { useForm, Controller } from 'react-hook-form';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Select, SelectItem } from '../../components/ui/select';
import { useToast } from '../../components/ui/toast';
import FilterSelect from '../../components/FilterSelect';

// --- DEFINISI TIPE DATA ---
type Kurikulum = {
  id: number;
  mapel: { nama_mapel: string; jenis: 'Ujian' | 'Hafalan' };
  kitab: { nama_kitab: string } | null;
  batas_hafalan: string | null;
  mapel_id: number;
  kitab_id: number | null;
  semester: '1' | '2';
};

type FormValues = {
  mapel_id: string | number;
  kitab_id: string | number;
  batas_hafalan?: string;
};

type MasterData = {
  tahunAjaran: Array<{ id: number; nama_ajaran: string; semester: '1' | '2' }>;
  kelas: Array<{ id: number; nama_kelas: string }>;
  mapel: Array<{ id: number; nama_mapel: string; jenis: 'Ujian' | 'Hafalan' }>;
  kitab: Array<{ id: number; nama_kitab: string }>;
};

export default function ManajemenKurikulumPage() {
  // --- STATE MANAGEMENT ---
  const [data, setData] = useState<Kurikulum[]>([]);
  const [masterData, setMasterData] = useState<MasterData>({ tahunAjaran: [], kelas: [], mapel: [], kitab: [] });
  const [filters, setFilters] = useState({ tahun_ajaran_id: '', kelas_id: '' });
  
  const [loading, setLoading] = useState(true);
  const [loadingKurikulum, setLoadingKurikulum] = useState(false);

  const [editing, setEditing] = useState<Kurikulum | null>(null);
  const [deleting, setDeleting] = useState<Kurikulum | null>(null);
  const [adding, setAdding] = useState<{ open: boolean; semester: '1' | '2' | null }>({ open: false, semester: null });

  const { toast } = useToast();
  const form = useForm<FormValues>();

  // --- DATA FETCHING (useEffect-based, stable) ---
  // Keep a ref to toast so we don't need to include it in effect deps (some implementations return unstable objects)
  const toastRef = React.useRef(toast);
  React.useEffect(() => { toastRef.current = toast }, [toast]);

  // small toggle to trigger kurikulum reloads from handlers (avoid passing functions to effects)
  const [kurikulumReload, setKurikulumReload] = useState(0);

  // Fetch master data once on mount
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      try {
        const [tahunAjaran, kelas, mapel, kitab] = await Promise.all([
          tahunAjaranService.getAllTahunAjaran(),
          kelasService.getAllKelas(),
          mapelService.getAllMapel(),
          kitabService.getAllKitab(),
        ]);
        if (!mounted) return;
        setMasterData({
          tahunAjaran,
          kelas,
          mapel,
          kitab,
        });
      } catch (error) {
        toastRef.current?.({ title: 'Gagal Memuat Data Master', description: 'Periksa koneksi ke server.', variant: 'destructive' });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false };
  }, []);

  // Fetch kurikulum when filters change OR when masterData is updated OR when reload toggled
  useEffect(() => {
    let mounted = true;
    if (!filters.tahun_ajaran_id || !filters.kelas_id) {
      setData([]);
      return;
    }

    const run = async () => {
      setLoadingKurikulum(true);
      try {
        const semester = masterData.tahunAjaran.find(ta => ta.id === Number(filters.tahun_ajaran_id))?.semester;
        if (!semester) {
          // no semester info yet, clear data and stop
          if (mounted) setData([]);
          return;
        }
        const params = { ...filters, semester };
  const rows = await kurikulumService.getAllKurikulum(params);
  if (!mounted) return;
  setData(rows);
      } catch (error) {
        toastRef.current?.({ title: 'Gagal Memuat Kurikulum', description: 'Tidak dapat mengambil data kurikulum untuk filter yang dipilih.', variant: 'destructive' });
      } finally {
        if (mounted) setLoadingKurikulum(false);
      }
    };

    run();
    return () => { mounted = false };
  // eslint-disable-next-line
  }, [filters.tahun_ajaran_id, filters.kelas_id, masterData.tahunAjaran, kurikulumReload]);

  // --- HANDLER UNTUK OPERASI CRUD ---
  const handleAdd = async (vals: FormValues) => {
    if (!filters.tahun_ajaran_id || !filters.kelas_id || !adding.semester) return;
    if (!vals.kitab_id) {
      toast({ title: 'Validasi', description: 'Kitab harus dipilih.', variant: 'destructive' });
      return;
    }
    try {
      const payload = {
        ...vals,
        tahun_ajaran_id: Number(filters.tahun_ajaran_id),
        kelas_id: Number(filters.kelas_id),
        semester: adding.semester,
        mapel_id: Number(vals.mapel_id),
        kitab_id: Number(vals.kitab_id),
      };
      await kurikulumService.createKurikulum(payload);
      toast({ title: 'Berhasil', description: 'Mata pelajaran ditambahkan ke kurikulum.' });
      setAdding({ open: false, semester: null });
      setKurikulumReload(n => n + 1);
    } catch (e: any) {
      toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menambahkan.', variant: 'destructive' });
    }
  };

  const handleEdit = async (vals: FormValues) => {
    if (!editing) return;
    if (!vals.kitab_id) {
      toast({ title: 'Validasi', description: 'Kitab harus dipilih.', variant: 'destructive' });
      return;
    }
    try {
      const payload = {
        kitab_id: Number(vals.kitab_id),
        batas_hafalan: vals.batas_hafalan,
      };
      await kurikulumService.updateKurikulum(editing.id, payload);
      toast({ title: 'Berhasil', description: 'Kurikulum diperbarui.' });
      setEditing(null);
      setKurikulumReload(n => n + 1);
    } catch (e: any) {
      toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menyimpan.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
  await kurikulumService.deleteKurikulum(deleting.id);
      toast({ title: 'Berhasil', description: 'Entri kurikulum dihapus.' });
      setData(prev => prev.filter(item => item.id !== deleting.id));
      setDeleting(null);
    } catch (e: any) {
      toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menghapus.', variant: 'destructive' });
    }
  };
  
  // --- DEFINISI KOLOM UNTUK TABEL ---
  const columns = useMemo<ColumnDef<Kurikulum, any>[]>(() => [
    { header: 'Mata Pelajaran', accessorFn: row => row.mapel?.nama_mapel || 'N/A' },
    { header: 'Jenis', accessorFn: row => row.mapel?.jenis || 'N/A' },
    { header: 'Kitab', accessorFn: row => row.kitab?.nama_kitab || '-' },
    { header: 'Batas Hafalan', accessorKey: 'batas_hafalan' },
    { id: 'actions', header: 'Aksi', cell: ({ row }) => (
      <div className="flex justify-end gap-2">
         <Button variant="outline" size="sm" onClick={() => { setEditing(row.original); form.reset({ kitab_id: row.original.kitab_id ?? '', batas_hafalan: row.original.batas_hafalan ?? '' }); }}>Edit</Button>
         <Button variant="destructive" size="sm" onClick={() => setDeleting(row.original)}>Hapus</Button>
      </div>
    )}
  ], [form]);

  const selectedTA = masterData.tahunAjaran.find(ta => ta.id === Number(filters.tahun_ajaran_id));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Kurikulum</h1>
          <p className="text-muted-foreground">Atur mata pelajaran, kitab, dan target hafalan untuk setiap kelas per tahun ajaran.</p>
        </div>

        {/* --- FILTER --- */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Kurikulum</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FilterSelect
              id="filter-ta"
              label="Tahun Ajaran & Semester"
              value={filters.tahun_ajaran_id}
              onChange={(v) => setFilters(prev => ({ ...prev, tahun_ajaran_id: v }))}
              placeholder={loading ? "Memuat..." : "-- Pilih Tahun Ajaran --"}
              options={masterData.tahunAjaran.map(ta => ({ value: String(ta.id), label: `${ta.nama_ajaran} (Semester ${ta.semester})` }))}
            />
            <FilterSelect
              id="filter-kelas"
              label="Kelas"
              value={filters.kelas_id}
              onChange={(v) => setFilters(prev => ({ ...prev, kelas_id: v }))}
              placeholder={loading ? "Memuat..." : "-- Pilih Kelas --"}
              options={masterData.kelas.map(k => ({ value: String(k.id), label: k.nama_kelas }))}
            />
          </CardContent>
        </Card>

        {/* --- TAMPILAN DATA --- */}
        {filters.tahun_ajaran_id && filters.kelas_id && (
          <Card>
             <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Kurikulum Semester {selectedTA?.semester}</CardTitle>
                    <Button onClick={() => { form.reset(); setAdding({ open: true, semester: selectedTA?.semester ?? null }); }}>Tambah Mapel</Button>
                </div>
            </CardHeader>
            <CardContent>
              {loadingKurikulum ? <div className="text-center">Memuat data kurikulum...</div> : <DataTable columns={columns} data={data} />}
            </CardContent>
          </Card>
        )}
        
        {/* --- DIALOG --- */}
        {/* DIALOG TAMBAH */}
        <Dialog open={adding.open} onOpenChange={(v) => { if (!v) setAdding({ open: false, semester: null }) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Mapel ke Kurikulum (Semester {adding.semester})</DialogTitle>
              <DialogDescription>Pilih mata pelajaran dan opsi kitab serta target hafalan untuk ditambahkan ke kurikulum.</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleAdd)} className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Mata Pelajaran</Label>
                <Controller name="mapel_id" control={form.control} rules={{ required: true }} render={({ field }) => (
                  <Select {...field} onChange={e => field.onChange(e.target.value)}>
                    <SelectItem value="">-- Pilih Mapel --</SelectItem>
                    {masterData.mapel.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.nama_mapel} ({m.jenis})</SelectItem>)}
                  </Select>
                )} />
              </div>
               <div className="space-y-2">
                <Label>Kitab yang Digunakan</Label>
                <Controller name="kitab_id" control={form.control} rules={{ required: true }} render={({ field }) => (
                  <Select {...field} onChange={e => field.onChange(e.target.value)}>
                    <SelectItem value="">-- Pilih Kitab --</SelectItem>
                    {masterData.kitab.map(k => <SelectItem key={k.id} value={String(k.id)}>{k.nama_kitab}</SelectItem>)}
                  </Select>
                )} />
                <p className="text-sm text-muted-foreground">Pilih kitab yang digunakan untuk mata pelajaran ini. Field wajib diisi.</p>
              </div>
              <div className="space-y-2">
                <Label>Batas Hafalan (Opsional)</Label>
                <Input {...form.register('batas_hafalan')} placeholder="Contoh: Juz 30, Hadits ke-20" />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setAdding({ open: false, semester: null })}>Batal</Button>
                <Button type="submit">Simpan</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DIALOG EDIT */}
         <Dialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Kurikulum: {editing?.mapel.nama_mapel}</DialogTitle>
              <DialogDescription>Ubah kitab yang digunakan atau target hafalan untuk mata pelajaran ini.</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleEdit)} className="grid gap-4 py-4">
               <div className="space-y-2">
                <Label>Kitab yang Digunakan</Label>
                <Controller name="kitab_id" control={form.control} rules={{ required: true }} render={({ field }) => (
                  <Select {...field} onChange={e => field.onChange(e.target.value)}>
                    <SelectItem value="">-- Pilih Kitab --</SelectItem>
                    {masterData.kitab.map(k => <SelectItem key={k.id} value={String(k.id)}>{k.nama_kitab}</SelectItem>)}
                  </Select>
                )} />
                <p className="text-sm text-muted-foreground">Pilih kitab yang digunakan. Wajib diisi.</p>
              </div>
              <div className="space-y-2">
                <Label>Batas Hafalan (Opsional)</Label>
                <Input {...form.register('batas_hafalan')} placeholder="Contoh: Juz 30, Hadits ke-20" />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setEditing(null)}>Batal</Button>
                <Button type="submit">Simpan Perubahan</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DIALOG HAPUS */}
        <Dialog open={!!deleting} onOpenChange={(v) => { if (!v) setDeleting(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Konfirmasi Hapus</DialogTitle>
              <DialogDescription>Tindakan ini akan menghapus mata pelajaran dari kurikulum untuk tahun ajaran dan kelas yang dipilih.</DialogDescription>
            </DialogHeader>
            <p className="mt-4">Apakah Anda yakin ingin menghapus mata pelajaran <strong>{deleting?.mapel.nama_mapel}</strong> dari kurikulum ini?</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
              <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

