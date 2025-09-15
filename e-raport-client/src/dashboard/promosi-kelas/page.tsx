import React, { useEffect, useMemo, useState, useCallback } from 'react'
import DashboardLayout from '../../dashboard/layout'
import API_BASE from '../../api'
import axios from 'axios'
import tahunAjaranService from '../../services/tahunAjaranService'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { useToast } from '../../components/ui/toast'
import { Label } from '../../components/ui/label'
import { Input } from '../../components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'

// --- TIPE DATA ---
type TahunAjaran = { id: number; nama_ajaran: string; semester?: string }
type Kelas = { id: number; nama_kelas: string; tingkatan_id?: number }
type PromosiResult = { promotedCount: number; promosiLog?: any; note?: string; kelas_from_id?: number; }

export default function PromosiKelasPage() {
  const [tahunAsal, setTahunAsal] = useState<TahunAjaran[]>([])
  const [tahunTujuan, setTahunTujuan] = useState<TahunAjaran[]>([])
  const [kelas, setKelas] = useState<Kelas[]>([])
  const [tingkatans, setTingkatans] = useState<any[]>([])
  const [fromTa, setFromTa] = useState('')
  const [toTa, setToTa] = useState('')
  const [kelasFrom, setKelasFrom] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [defaultTargetKelasId, setDefaultTargetKelasId] = useState<number | null>(null)
  const [targetKelasOptions, setTargetKelasOptions] = useState<Kelas[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [promosiResults, setPromosiResults] = useState<PromosiResult[]>([])
  const { toast } = useToast()
  const [decisions, setDecisions] = useState<Record<number, { status: 'naik' | 'tinggal', kelas_to_id: number | null }>>({})

  useEffect(() => {
    (async () => {
      try {
        const [masters, kelasRes, tingkatanRes] = await Promise.all([
          tahunAjaranService.getAllMasterTahunAjaran(),
          axios.get(`${API_BASE}/kelas`),
          axios.get(`${API_BASE}/tingkatans`)
        ]);
        setKelas(kelasRes.data);
        setTingkatans(tingkatanRes.data || []);
        const fromList: any[] = [];
        const toList: any[] = [];
        for (const m of masters) {
          const periodes = await tahunAjaranService.getPeriodesForMaster(m.id);
          for (const p of periodes) {
            if (String(p.semester) === '2') fromList.push(p);
            if (String(p.semester) === '1') toList.push(p);
          }
        }
        setTahunAsal(fromList);
        setTahunTujuan(toList);
      } catch (e) { console.error(e) }
    })();
  }, []);

  const formatTa = (t?: TahunAjaran | null) => t ? `${t.nama_ajaran}${t.semester ? ` (Semester ${t.semester})` : ''}` : '—';

  useEffect(() => {
    if (!fromTa && !kelasFrom) { setStudents([]); return; }
    setLoading(true);
    const params: any = { show_all: true };
    if (kelasFrom) params.kelas_id = Number(kelasFrom);
    if (fromTa) params.tahun_ajaran_id = Number(fromTa);
    axios.get(`${API_BASE}/siswa`, { params }).then(r => setStudents(r.data)).catch(() => setStudents([])).finally(() => setLoading(false));
  }, [kelasFrom, fromTa]);

  useEffect(() => {
    if (!kelasFrom) { setTargetKelasOptions([]); setDefaultTargetKelasId(null); return; }
    const kFrom = kelas.find(k => String(k.id) === String(kelasFrom));
    if (!kFrom?.tingkatan_id) { setTargetKelasOptions([]); setDefaultTargetKelasId(null); return; }
    const currentTing = tingkatans.find(t => t.id === kFrom.tingkatan_id);
    if (!currentTing) { setTargetKelasOptions([]); setDefaultTargetKelasId(null); return; }
    const nextTingkatan = tingkatans.find(t => Number(t.urutan) === Number(currentTing.urutan) + 1);
    if (!nextTingkatan) { setTargetKelasOptions([]); setDefaultTargetKelasId(null); return; }
    axios.get(`${API_BASE}/kelas`, { params: { tingkatan_id: nextTingkatan.id } }).then(r => {
      setTargetKelasOptions(r.data || []);
      setDefaultTargetKelasId((r.data?.[0]) ? r.data[0].id : null);
    }).catch(e => { console.error(e); setTargetKelasOptions([]); setDefaultTargetKelasId(null); });
  }, [kelasFrom, kelas, tingkatans]);

  useEffect(() => {
    if (!students) return;
    const d: Record<number, { status: 'naik' | 'tinggal', kelas_to_id: number | null }> = {};
    for (const s of students) {
      d[s.id] = { status: 'naik', kelas_to_id: defaultTargetKelasId };
    }
    setDecisions(d);
  }, [students, defaultTargetKelasId]);

  const setDecisionFor = (siswaId: number, payload: Partial<{ status: 'naik' | 'tinggal', kelas_to_id: number | null }>) => {
    setDecisions(prev => ({ ...prev, [siswaId]: { ...(prev[siswaId] || { status: 'naik', kelas_to_id: defaultTargetKelasId }), ...payload } }));
  };

  const handlePromote = async () => {
    if (!fromTa || !toTa || !kelasFrom) {
      toast({ title: 'Lengkapi pilihan', description: 'Pilih tahun ajaran asal, tujuan dan kelas asal.', variant: 'destructive' });
      return;
    }
    try {
      setLoading(true);
      const promotions = students.map(s => {
        const dec = decisions[s.id] || { status: 'naik', kelas_to_id: defaultTargetKelasId };
        return { siswa_id: s.id, status: dec.status, kelas_to_id: dec.status === 'naik' ? dec.kelas_to_id : null };
      });
      const payload = {
        periode_ajaran_from_id: Number(fromTa),
        kelas_from_id: Number(kelasFrom),
        periode_ajaran_to_id: Number(toTa),
        promotions
      };
      await axios.post(`${API_BASE}/promosi/execute`, payload);
      toast({ title: 'Sukses', description: 'Promosi selesai.' });
    } catch (err: any) {
      toast({ title: 'Gagal', description: err?.response?.data?.message || 'Gagal melakukan promosi', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteAll = async () => {
    if (!fromTa || !toTa) {
      toast({ title: 'Lengkapi pilihan', description: 'Pilih tahun ajaran asal dan tujuan.', variant: 'destructive' });
      return;
    }
    try {
      setLoading(true);
      const payload = { fromTaId: Number(fromTa), toTaId: Number(toTa), mode: 'auto' };
      const res = await axios.post(`${API_BASE}/kenaikan/all-for-tahun`, payload);
      if (res?.data?.success) {
        setPromosiResults(res.data.results || []);
        toast({ title: 'Sukses', description: 'Promosi untuk seluruh kelas selesai.' });
      } else {
        toast({ title: 'Gagal', description: res?.data?.message || 'Promosi selesai dengan masalah', variant: 'destructive' });
      }
    } catch (err: any) {
      console.error('promoteAll error', err);
      toast({ title: 'Gagal', description: err?.response?.data?.message || 'Gagal melakukan promosi untuk seluruh tahun', variant: 'destructive' });
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Promosi / Kenaikan Kelas</h1>
          <p className="text-muted-foreground">Atur kenaikan kelas siswa per individu atau seluruh angkatan.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Pengaturan Promosi</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tahun Ajaran Asal (Semester Genap)</Label>
              <Select value={fromTa} onValueChange={setFromTa}>
                <SelectTrigger><SelectValue placeholder="-- Pilih --" /></SelectTrigger>
                <SelectContent>
                  {tahunAsal.map(t => <SelectItem key={t.id} value={String(t.id)}>{formatTa(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tahun Ajaran Tujuan (Semester Ganjil)</Label>
              <Select value={toTa} onValueChange={setToTa}>
                <SelectTrigger><SelectValue placeholder="-- Pilih --" /></SelectTrigger>
                <SelectContent>
                  {tahunTujuan.map(t => <SelectItem key={t.id} value={String(t.id)}>{formatTa(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kelas Asal</Label>
              <Select value={kelasFrom} onValueChange={setKelasFrom}>
                <SelectTrigger><SelectValue placeholder="-- Pilih --" /></SelectTrigger>
                <SelectContent>
                  {kelas.map(k => <SelectItem key={k.id} value={String(k.id)}>{k.nama_kelas}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {promosiResults.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Hasil Promosi</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-auto">
                {promosiResults.map((item, index) => {
                  const kelasFromData = kelas.find(k => k.id === item.kelas_from_id);
                  return (
                    <div key={index} className="p-3 border rounded">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold">Kelas: {kelasFromData?.nama_kelas || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{item.note || ''}</div>
                        </div>
                        <div className="text-sm">Dipromosikan: <strong>{item.promotedCount} siswa</strong></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" onClick={() => setPromosiResults([])}>Tutup Hasil</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Preview Siswa</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div>Memuat...</div> : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NIS</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Aksi Kenaikan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map(s => {
                      const dec = decisions[s.id] || { status: 'naik', kelas_to_id: defaultTargetKelasId };
                      return (
                        <TableRow key={s.id}>
                          <TableCell>{s.nis}</TableCell>
                          <TableCell>{s.nama}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1"><input type="radio" name={`status-${s.id}`} checked={dec.status === 'naik'} onChange={() => setDecisionFor(s.id, { status: 'naik' })} /> Naik</label>
                                <label className="flex items-center gap-1"><input type="radio" name={`status-${s.id}`} checked={dec.status === 'tinggal'} onChange={() => setDecisionFor(s.id, { status: 'tinggal' })} /> Tinggal</label>
                              </div>
                              <Select 
                                value={String(dec.kelas_to_id ?? '')} 
                                onValueChange={(v) => setDecisionFor(s.id, { kelas_to_id: v ? Number(v) : null })} 
                                disabled={dec.status !== 'naik'}
                              >
                                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Pilih Kelas Tujuan" /></SelectTrigger>
                                <SelectContent>
                                  {targetKelasOptions.map(k => <SelectItem key={k.id} value={String(k.id)}>{k.nama_kelas}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          <CardFooter className="p-4 border-t flex justify-end gap-2">
              <Button onClick={handlePromote} disabled={loading || students.length === 0}>Promosikan Siswa Terpilih</Button>
              <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" disabled={loading || !fromTa || !toTa}>Promosi Semua Angkatan</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Konfirmasi Promosi Semua</DialogTitle>
                    <DialogDescription>
                      Anda akan mempromosikan semua siswa dari <strong>{formatTa(tahunAsal.find(t => String(t.id) === fromTa))}</strong> ke <strong>{formatTa(tahunTujuan.find(t => String(t.id) === toTa))}</strong>.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-2">
                    <Label htmlFor="confirm-input" className="text-sm text-muted-foreground">Ketik <code>PROMOSI</code> untuk mengonfirmasi.</Label>
                    <Input id="confirm-input" value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="PROMOSI" />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setConfirmOpen(false); setConfirmText('') }}>Batal</Button>
                    <Button onClick={handlePromoteAll} disabled={loading || confirmText !== 'PROMOSI'}>Ya, Promosikan Semua</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  )
}