import React, { useEffect, useState, useMemo, useCallback } from 'react';
import DashboardLayout from '../../dashboard/layout';
import API_BASE from '../../api';
import kurikulumService from '../../services/kurikulumService';
import kelasService from '../../services/kelasService';
import { getAllTingkatans } from '../../services/tingkatanService';
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
};

type FormValues = {
  mapel_id: string | number;
  kitab_id: string | number;
  batas_hafalan?: string;
};

type MasterData = {
  kelas: Array<{ id: number; nama_kelas: string }>;
  tingkatans: Array<{ id: number; nama_tingkatan: string }>;
  mapel: Array<{ id: number; nama_mapel: string; jenis: 'Ujian' | 'Hafalan' }>;
  kitab: Array<{ id: number; nama_kitab: string }>;
};

export default function ManajemenKurikulumPage() {
  // --- STATE MANAGEMENT ---
  const [data, setData] = useState<Kurikulum[]>([]);
  const [masterData, setMasterData] = useState<MasterData>({ kelas: [], tingkatans: [], mapel: [], kitab: [] });
  const [filters, setFilters] = useState({ tingkatan_id: '' });
  
  const [loading, setLoading] = useState(true);
  const [loadingKurikulum, setLoadingKurikulum] = useState(false);

  const [editing, setEditing] = useState<Kurikulum | null>(null);
  const [deleting, setDeleting] = useState<Kurikulum | null>(null);
  const [adding, setAdding] = useState<{ open: boolean }>({ open: false });

  const { toast } = useToast();
  const form = useForm<FormValues>();
  const { watch, control, formState } = form;
  const [isHafalan, setIsHafalan] = useState(false);

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
        const [kelas, mapel, kitab, tingkatans] = await Promise.all([
          kelasService.getAllKelas(),
          mapelService.getAllMapel(),
          kitabService.getAllKitab(),
          getAllTingkatans(),
        ]);
        if (!mounted) return;
        setMasterData({
          kelas,
          tingkatans,
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

  // Fetch kurikulum when filters change OR when reload toggled
  useEffect(() => {
    let mounted = true;
    if (!filters.tingkatan_id) {
      setData([]);
      return;
    }
    const run = async () => {
      setLoadingKurikulum(true);
      try {
        const params = { tingkatan_id: Number(filters.tingkatan_id) };
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
  }, [filters.tingkatan_id, kurikulumReload]);

  // Watch selected mapel in the add dialog to decide if "batas_hafalan" should be shown/required
  const watchedMapelId = watch('mapel_id');
  useEffect(() => {
    // Prefer the runtime-selected mapel when adding. masterData.mapel contains master list.
    if (watchedMapelId) {
      const mid = Number(watchedMapelId);
      const found = masterData.mapel.find(m => m.id === mid);
      const isH = !!found && found.jenis === 'Hafalan';
      setIsHafalan(isH);
      if (!isH) {
        form.setValue('batas_hafalan', '');
      }
    } else {
      // If no selected mapel, reset
      setIsHafalan(false);
      form.setValue('batas_hafalan', '');
    }
  }, [watchedMapelId, masterData.mapel, form]);

  // When editing an existing kurikulum, ensure batas_hafalan visibility matches the mapel type
  useEffect(() => {
    if (editing) {
      const isH = editing?.mapel?.jenis === 'Hafalan';
      setIsHafalan(!!isH);
      if (!isH) form.setValue('batas_hafalan', '');
    }
  }, [editing, form]);

  // --- HANDLER UNTUK OPERASI CRUD ---
  const handleAdd = async (vals: FormValues) => {
    if (!filters.tingkatan_id) return;
    if (!vals.kitab_id) {
      toast({ title: 'Validasi', description: 'Kitab harus dipilih.', variant: 'destructive' });
      return;
    }
    try {
      const payload = {
        ...vals,
        tingkatan_id: Number(filters.tingkatan_id),
        mapel_id: Number(vals.mapel_id),
        kitab_id: Number(vals.kitab_id),
      };
      await kurikulumService.createKurikulum(payload);
      toast({ title: 'Berhasil', description: 'Mata pelajaran ditambahkan ke kurikulum.' });
      setAdding({ open: false });
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Kurikulum</h1>
          <p className="text-muted-foreground">Atur mata pelajaran, kitab, dan target hafalan untuk setiap tingkatan per tahun ajaran.</p>
        </div>

        {/* --- FILTER --- */}
        <Card>
          <CardHeader>
            <CardTitle>Pilih Tingkatan</CardTitle>
          </CardHeader>
          <CardContent>
            <FilterSelect
              id="filter-tingkatan"
              label="Tingkatan"
              value={filters.tingkatan_id}
              onChange={(v) => setFilters(prev => ({ ...prev, tingkatan_id: v }))}
              placeholder={loading ? "Memuat..." : "-- Pilih Tingkatan --"}
              options={masterData.tingkatans.map(t => ({ value: String(t.id), label: t.nama_tingkatan }))}
            />
          </CardContent>
        </Card>

        {/* --- TAMPILAN DATA --- */}
    {filters.tingkatan_id && (
          <Card>
             <CardHeader>
                <div className="flex justify-between items-center">
      <CardTitle>Kurikulum Tingkatan</CardTitle>
      <Button onClick={() => { form.reset(); setAdding({ open: true }); }}>Tambah Mapel</Button>
                </div>
            </CardHeader>
            <CardContent>
              {loadingKurikulum ? <div className="text-center">Memuat data kurikulum...</div> : <DataTable columns={columns} data={data} />}
            </CardContent>
          </Card>
        )}
        
        {/* --- DIALOG --- */}
        {/* DIALOG TAMBAH */}
        <Dialog open={adding.open} onOpenChange={(v) => { if (!v) setAdding({ open: false }) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Mapel ke Kurikulum</DialogTitle>
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
              {isHafalan ? (
                <div className="space-y-2">
                  <Label>Batas Hafalan</Label>
                  <Controller name="batas_hafalan" control={form.control} rules={{ required: 'Batas hafalan wajib untuk mapel hafalan' }} render={({ field, fieldState }) => (
                    <>
                      <Input {...field} placeholder="Contoh: Juz 30, Hadits ke-20" />
                      {fieldState.error && <p className="text-sm text-destructive">{String(fieldState.error.message)}</p>}
                    </>
                  )} />
                </div>
              ) : null}
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setAdding({ open: false })}>Batal</Button>
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
              {isHafalan ? (
                <div className="space-y-2">
                  <Label>Batas Hafalan</Label>
                  <Controller name="batas_hafalan" control={form.control} rules={{ required: 'Batas hafalan wajib untuk mapel hafalan' }} render={({ field, fieldState }) => (
                    <>
                      <Input {...field} placeholder="Contoh: Juz 30, Hadits ke-20" />
                      {fieldState.error && <p className="text-sm text-destructive">{String(fieldState.error.message)}</p>}
                    </>
                  )} />
                </div>
              ) : null}
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

