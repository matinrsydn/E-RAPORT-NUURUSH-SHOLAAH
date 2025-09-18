import React, { useEffect, useState, useMemo, useCallback } from 'react';
import DashboardLayout from '../../dashboard/layout';
import kurikulumService from '../../services/kurikulumService';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useToast } from '../../components/ui/toast';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../components/ui/dropdown';

// --- TIPE DATA ---
type Kurikulum = {
  id: number;
  mapel: { nama_mapel: string; jenis: 'Ujian' | 'Hafalan' };
  kitab: { nama_kitab: string } | null;
  batas_hafalan: string | null;
  mapel_id: number;
  kitab_id: number | null;
};

type FormValues = {
  mapel_id: string;
  kitab_id: string;
  batas_hafalan?: string;
};

type MasterData = {
  tingkatans: Array<{ id: number; nama_tingkatan: string }>;
  mapel: Array<{ id: number; nama_mapel: string; jenis: 'Ujian' | 'Hafalan' }>;
  kitab: Array<{ id: number; nama_kitab: string }>;
};

export default function ManajemenKurikulumPage() {
  const [data, setData] = useState<Kurikulum[]>([]);
  const [masterData, setMasterData] = useState<MasterData>({ tingkatans: [], mapel: [], kitab: [] });
  const [filters, setFilters] = useState({ tingkatan_id: '' });
  const [loading, setLoading] = useState(true);
  const [loadingKurikulum, setLoadingKurikulum] = useState(false);
  const [editing, setEditing] = useState<Kurikulum | null>(null);
  const [deleting, setDeleting] = useState<Kurikulum | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, control, watch, setValue, reset } = useForm<FormValues>();
  const watchedMapelId = watch('mapel_id');
  const [isHafalan, setIsHafalan] = useState(false);

  const fetchData = useCallback(async () => {
    if (!filters.tingkatan_id) {
      setData([]);
      return;
    }
    setLoadingKurikulum(true);
    try {
      const params = { tingkatan_id: Number(filters.tingkatan_id) };
      const rows = await kurikulumService.getAllKurikulum(params);
      setData(rows);
    } catch (error) {
      toast({ title: 'Gagal Memuat Kurikulum', variant: 'destructive' });
    } finally {
      setLoadingKurikulum(false);
    }
  }, [filters.tingkatan_id]);

  useEffect(() => {
    const loadMasterData = async () => {
      setLoading(true);
      try {
        const [mapel, kitab, tingkatans] = await Promise.all([
          mapelService.getAllMapel(),
          kitabService.getAllKitab(),
          getAllTingkatans(),
        ]);
        setMasterData({ tingkatans, mapel, kitab });
      } catch (error) {
        toast({ title: 'Gagal Memuat Data Master', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    loadMasterData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const selectedMapel = masterData.mapel.find(m => String(m.id) === String(watchedMapelId));
    setIsHafalan(selectedMapel?.jenis === 'Hafalan');
  }, [watchedMapelId, masterData.mapel]);

  const handleOpenDialog = (kurikulum: Kurikulum | null) => {
    setEditing(kurikulum);
    if (kurikulum) {
      reset({
        mapel_id: String(kurikulum.mapel_id),
        kitab_id: String(kurikulum.kitab_id ?? ''),
        batas_hafalan: kurikulum.batas_hafalan ?? ''
      });
      const selectedMapel = masterData.mapel.find(m => m.id === kurikulum.mapel_id);
      setIsHafalan(selectedMapel?.jenis === 'Hafalan');
    } else {
      reset({ mapel_id: '', kitab_id: '', batas_hafalan: '' });
      setIsHafalan(false);
    }
    setDialogOpen(true);
  };

  const onSubmit = async (vals: FormValues) => {
    if (!filters.tingkatan_id) return;
    try {
      const payload = {
        ...vals,
        tingkatan_id: Number(filters.tingkatan_id),
        mapel_id: Number(vals.mapel_id),
        kitab_id: Number(vals.kitab_id),
      };
      if (editing) {
        await kurikulumService.updateKurikulum(editing.id, payload);
        toast({ title: 'Berhasil', description: 'Kurikulum diperbarui.' });
      } else {
        await kurikulumService.createKurikulum(payload);
        toast({ title: 'Berhasil', description: 'Mata pelajaran ditambahkan ke kurikulum.' });
      }
      fetchData();
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: 'Gagal', description: e?.response?.data?.message || 'Gagal menyimpan data.', variant: 'destructive' });
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

  const columns = useMemo<ColumnDef<Kurikulum, any>[]>(() => [
    { header: 'Mata Pelajaran', accessorFn: (row: Kurikulum) => row.mapel?.nama_mapel || 'N/A' },
    { header: 'Jenis', accessorFn: (row: Kurikulum) => row.mapel?.jenis || 'N/A' },
    { header: 'Kitab', accessorFn: (row: Kurikulum) => row.kitab?.nama_kitab || '-' },
    { header: 'Batas Hafalan', accessorKey: 'batas_hafalan' },
    { id: 'actions', header: 'Aksi' }
  ], []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Kurikulum</h1>
          <p className="text-muted-foreground">Atur mata pelajaran, kitab, dan target untuk setiap tingkatan.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Pilih Tingkatan</CardTitle></CardHeader>
          <CardContent>
            <Select value={filters.tingkatan_id} onValueChange={(v) => setFilters({ tingkatan_id: v })}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder={loading ? "Memuat..." : "-- Pilih Tingkatan --"} />
              </SelectTrigger>
              <SelectContent>
                {masterData.tingkatans.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.nama_tingkatan}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {filters.tingkatan_id && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Daftar Kurikulum</CardTitle>
                <Button onClick={() => handleOpenDialog(null)}>Tambah Mapel</Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingKurikulum ? <div className="text-center">Memuat...</div> : 
              <DataTable<Kurikulum>
                columns={columns} 
                data={data}
                onEdit={handleOpenDialog}
                onDelete={setDeleting}
              />}
            </CardContent>
          </Card>
        )}
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? `Edit: ${editing.mapel.nama_mapel}` : 'Tambah Mapel ke Kurikulum'}</DialogTitle>
              <DialogDescription>Pilih mata pelajaran dan opsi kitab serta target hafalan.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Mata Pelajaran</Label>
                <Controller name="mapel_id" control={control} rules={{ required: true }} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={String(field.value)} disabled={!!editing}>
                    <SelectTrigger><SelectValue placeholder="-- Pilih Mapel --" /></SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {masterData.mapel.map(m => <SelectItem key={m.id} value={String(m.id)}>{`${m.nama_mapel} (${m.jenis})`}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-2">
                <Label>Kitab yang Digunakan</Label>
                <Controller name="kitab_id" control={control} rules={{ required: true }} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={String(field.value)}>
                    <SelectTrigger><SelectValue placeholder="-- Pilih Kitab --" /></SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {masterData.kitab.map(k => <SelectItem key={k.id} value={String(k.id)}>{k.nama_kitab}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              {isHafalan && (
                <div className="space-y-2">
                  <Label>Batas Hafalan</Label>
                  <Input {...register('batas_hafalan', { required: isHafalan })} placeholder="Contoh: Juz 30, Hadits ke-20" />
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Batal</Button>
                <Button type="submit">Simpan</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleting} onOpenChange={(v) => { if (!v) setDeleting(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
            <p className="mt-4">Yakin ingin menghapus <strong>{deleting?.mapel.nama_mapel}</strong> dari kurikulum ini?</p>
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