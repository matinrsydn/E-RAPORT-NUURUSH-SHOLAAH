import React, { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import API_BASE from '../../api'
import axios from 'axios'
import tahunAjaranService from '../../services/tahunAjaranService'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Select, SelectItem } from '../../components/ui/select'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import DataTable from '../../components/data-table'
import { useToast } from '../../components/ui/toast'

type TahunAjaran = { id: number; nama_ajaran: string; semester?: string }
type Kelas = { id: number; nama_kelas: string; tingkatan_id?: number }

type PromosiLogMinimal = {
  id?: number
  kelas_from_id?: number
  createdAt?: string
  created_at?: string
  note?: string
}

type PromosiResult = {
  promosiLog?: PromosiLogMinimal
  promosiLogId?: number
  promotedCount: number
  // back-compat if backend returns promosiLog directly
  id?: number
  note?: string
}

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

  useEffect(() => {
  // Load masters and periodes. We'll pick periodes filtered by semester for Asal (2) and Tujuan (1)
  (async ()=>{
    try{
      const [masters, kelasRes, tingkatanRes] = await Promise.all([
        tahunAjaranService.getAllMasterTahunAjaran(),
        axios.get(`${API_BASE}/kelas`),
        axios.get(`${API_BASE}/tingkatans`)
      ])
      setKelas(kelasRes.data)
      setTingkatans(tingkatanRes.data || [])
      // load periodes for each master and split by semester
      const fromList:any[] = []
      const toList:any[] = []
      for (const m of masters) {
        const periodes = await tahunAjaranService.getPeriodesForMaster(m.id)
        for (const p of periodes) {
          if (p.semester === '2' || p.semester === 2) fromList.push(p)
          if (p.semester === '1' || p.semester === 1) toList.push(p)
        }
      }
      setTahunAsal(fromList)
      setTahunTujuan(toList)
    }catch(e){ console.error(e) }
  })()
  }, [])

  const formatTa = (t?: TahunAjaran | null) => {
    if (!t) return '—'
    return `${t.nama_ajaran}${t.semester ? ` (Semester ${t.semester})` : ''}`
  }

  useEffect(() => {
    // Preview students when fromTa or kelasFrom changes.
    // If neither selected -> empty. If fromTa selected and kelasFrom not -> load all students for that tahun.
    // If kelasFrom selected -> load students for that kelas (and optionally filter by fromTa if present).
    if (!fromTa && !kelasFrom) return setStudents([])
    setLoading(true)
    const params: any = { show_all: true }
    if (kelasFrom) params.kelas_id = Number(kelasFrom)
    if (fromTa) params.tahun_ajaran_id = Number(fromTa)
    axios.get(`${API_BASE}/siswa`, { params }).then(r => setStudents(r.data)).catch(() => setStudents([])).finally(() => setLoading(false))
  }, [kelasFrom, fromTa])

  // When kelasFrom changes, determine its Tingkatan and load next Tingkatan's kelas
  useEffect(() => {
    if (!kelasFrom) {
      setTargetKelasOptions([])
      setDefaultTargetKelasId(null)
      return
    }
    const kFrom = kelas.find(k => String(k.id) === String(kelasFrom))
    if (!kFrom || !kFrom.tingkatan_id) {
      setTargetKelasOptions([])
      setDefaultTargetKelasId(null)
      return
    }
    const currentTing = tingkatans.find(t => t.id === kFrom.tingkatan_id)
    if (!currentTing) {
      setTargetKelasOptions([])
      setDefaultTargetKelasId(null)
      return
    }
    // find next tingkatan by urutan
    const nextTingkatan = tingkatans.find(t => Number(t.urutan) === Number(currentTing.urutan) + 1)
    if (!nextTingkatan) {
      setTargetKelasOptions([])
      setDefaultTargetKelasId(null)
      return
    }
    // fetch kelas for next tingkatan
    axios.get(`${API_BASE}/kelas`, { params: { tingkatan_id: nextTingkatan.id } }).then(r => {
      setTargetKelasOptions(r.data || [])
      setDefaultTargetKelasId((r.data && r.data[0]) ? r.data[0].id : null)
    }).catch(e => { console.error('Failed to load target kelas', e); setTargetKelasOptions([]); setDefaultTargetKelasId(null) })

  }, [kelasFrom, kelas, tingkatans])

  // UI state representing per-student decision
  const [decisions, setDecisions] = useState<Record<number, { status: 'naik' | 'tinggal', kelas_to_id: number | null }>>({})

  useEffect(() => {
    // when students or defaultTargetKelasId changes, initialize decisions: default to 'naik' to defaultTarget
    if (!students) return
    const d: Record<number, { status: 'naik' | 'tinggal', kelas_to_id: number | null }> = {}
    for (const s of students) {
      d[s.id] = { status: 'naik', kelas_to_id: defaultTargetKelasId }
    }
    setDecisions(d)
  }, [students, defaultTargetKelasId])

  const setDecisionFor = (siswaId: number, payload: { status?: 'naik' | 'tinggal', kelas_to_id?: number | null }) => {
    setDecisions(prev => ({ ...prev, [siswaId]: { ...(prev[siswaId] || { status: 'naik', kelas_to_id: defaultTargetKelasId }), ...payload } }))
  }

  const handlePromote = async () => {
    if (!fromTa || !toTa || !kelasFrom) return toast({ title: 'Lengkapi pilihan', description: 'Pilih tahun ajaran asal, tujuan dan kelas asal.' })
    try {
      setLoading(true)
      // build promotions array from decisions
      const promotions = students.map(s => {
        const dec = decisions[s.id] || { status: 'naik', kelas_to_id: defaultTargetKelasId }
        return { siswa_id: s.id, status: dec.status, kelas_to_id: dec.status === 'naik' ? dec.kelas_to_id : null }
      })
      const payload = {
        periode_ajaran_from_id: Number(fromTa),
        kelas_from_id: Number(kelasFrom),
        periode_ajaran_to_id: Number(toTa),
        promotions
      }
      const res = await axios.post(`${API_BASE}/promosi/execute`, payload)
      toast({ title: 'Sukses', description: 'Promosi selesai.' })
    } catch (err) {
      toast({ title: 'Gagal', description: err?.response?.data?.message || 'Gagal melakukan promosi', variant: 'destructive' })
    } finally { setLoading(false) }
  }

  const handlePromoteAll = async () => {
    if (!fromTa || !toTa) return toast({ title: 'Lengkapi pilihan', description: 'Pilih tahun ajaran asal dan tujuan.' })
    try {
      setLoading(true)
      const payload = { fromTaId: Number(fromTa), toTaId: Number(toTa), mode: 'auto' }
      const res = await axios.post(`${API_BASE}/kenaikan/all-for-tahun`, payload)
      // backend returns { success: true, results: [ { promosiLog, promotedCount } ] }
      if (res?.data?.success) {
        const list: PromosiResult[] = (res.data.results || []).map((it: any) => {
          // support old shape where item is a PromosiLog instance
          if (it && typeof it.promosiLog !== 'undefined') return { ...it, promotedCount: Number(it.promotedCount || 0) }
          // if backend returned plain promosiLog object
          if (it && it.id) return { promosiLog: it, promotedCount: Number(it.promotedCount || 0), id: it.id }
          return { promotedCount: Number(it?.promotedCount || 0), note: it?.note }
        })
        setPromosiResults(list)
        toast({ title: 'Sukses', description: 'Promosi untuk seluruh kelas selesai.' })
      } else {
        toast({ title: 'Gagal', description: res?.data?.message || 'Promosi selesai dengan masalah', variant: 'destructive' })
      }
    } catch (err) {
      console.error('promoteAll error', err)
      toast({ title: 'Gagal', description: err?.response?.data?.message || 'Gagal melakukan promosi untuk seluruh tahun', variant: 'destructive' })
    } finally { setLoading(false); setConfirmOpen(false) }
  }

  // We will render a custom table below

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Promosi / Kenaikan Kelas</h1>
          <p className="text-muted-foreground">Halaman ini untuk mengatur promosi atau kenaikan kelas siswa.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Promosi</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-2">Tahun Ajaran Asal</label>
              <Select value={fromTa} onChange={e => setFromTa(e.target.value)}>
                <SelectItem value="">-- Pilih --</SelectItem>
                {tahunAsal.map(t => <SelectItem key={t.id} value={String(t.id)}>{formatTa(t)}</SelectItem>)}
              </Select>
            </div>
            <div>
              <label className="block mb-2">Tahun Ajaran Tujuan</label>
              <Select value={toTa} onChange={e => setToTa(e.target.value)}>
                <SelectItem value="">-- Pilih --</SelectItem>
                {tahunTujuan.map(t => <SelectItem key={t.id} value={String(t.id)}>{formatTa(t)}</SelectItem>)}
              </Select>
            </div>
            <div>
              <label className="block mb-2">Kelas Asal</label>
              <Select value={kelasFrom} onChange={e => setKelasFrom(e.target.value)}>
                <SelectItem value="">-- Pilih --</SelectItem>
                {kelas.map(k => <SelectItem key={k.id} value={String(k.id)}>{k.nama_kelas}</SelectItem>)}
              </Select>
            </div>
          </CardContent>
        </Card>
        {promosiResults && promosiResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Hasil Promosi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-auto">
                        {promosiResults.map((item) => {
                          const log = item.promosiLog || (item.id ? { id: item.id, ...item } : undefined)
                          const kelasFrom = kelas.find(k => k.id === (log?.kelas_from_id || (log && (log as any).kelas_from) || undefined))
                          return (
                            <div key={log?.id || Math.random()} className="p-3 border rounded">
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-semibold">Kelas: {kelasFrom ? kelasFrom.nama_kelas : (log?.kelas_from_id || '—')}</div>
                                  <div className="text-sm text-muted-foreground">Log ID: {log?.id || '-'} • Dibuat: {new Date(log?.createdAt || log?.created_at || Date.now()).toLocaleString()}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm">Promoted: <strong>{item.promotedCount}</strong></div>
                                  <div className="text-sm">{item.note || log?.note || ''}</div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
              </div>
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" onClick={()=>setPromosiResults([])}>Tutup Hasil</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Preview Siswa</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <div>Memuat...</div> : (
              <div className="overflow-auto">
                <table className="w-full table-auto border-collapse">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="p-2">NIS</th>
                      <th className="p-2">Nama</th>
                      <th className="p-2">Kelas Saat Ini</th>
                      <th className="p-2">Aksi Kenaikan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => {
                      const dec = decisions[s.id] || { status: 'naik', kelas_to_id: defaultTargetKelasId }
                      return (
                        <tr key={s.id} className="border-b">
                          <td className="p-2 align-top">{s.nis}</td>
                          <td className="p-2 align-top">{s.nama}</td>
                          <td className="p-2 align-top">{s.kelas ? s.kelas.nama_kelas || s.kelas : '—'}</td>
                          <td className="p-2 align-top">
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-1"><input type="radio" name={`status-${s.id}`} checked={dec.status==='naik'} onChange={()=>setDecisionFor(s.id, { status: 'naik' })} /> Naik</label>
                              <label className="flex items-center gap-1"><input type="radio" name={`status-${s.id}`} checked={dec.status==='tinggal'} onChange={()=>setDecisionFor(s.id, { status: 'tinggal' })} /> Tinggal</label>
                              <select value={dec.kelas_to_id ?? ''} onChange={(e)=>setDecisionFor(s.id, { kelas_to_id: e.target.value ? Number(e.target.value) : null })} disabled={dec.status !== 'naik'} className="border rounded px-2 py-1">
                                <option value="">-- Pilih Kelas Tujuan --</option>
                                {targetKelasOptions.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                              </select>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
            <div className="p-4 flex justify-end">
              <div className="flex gap-2">
                <Button onClick={handlePromote} disabled={loading}>Promosikan</Button>
                <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" onClick={()=>setConfirmOpen(true)} disabled={loading || !fromTa || !toTa}>Promosi Semua Siswa Tahun Ini</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Konfirmasi Promosi Semua</DialogTitle>
                      <DialogDescription>Apakah Anda yakin ingin mempromosikan semua siswa dari {tahunAsal.find(t=>String(t.id)===fromTa)?.nama_ajaran || 'Tahun Ajaran Asal'} ke {tahunTujuan.find(t=>String(t.id)===toTa)?.nama_ajaran || 'Tahun Ajaran Tujuan'}?</DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                      <div className="mb-2 text-sm text-muted-foreground">Ketik <code>PROMOSI</code> untuk mengonfirmasi aksi ini.</div>
                      <input className="w-full border rounded p-2" value={confirmText} onChange={e=>setConfirmText(e.target.value)} placeholder="Ketik PROMOSI untuk konfirmasi" />
                    </div>
                    <div className="py-4 flex justify-end gap-2">
                      <Button variant="outline" onClick={()=>{ setConfirmOpen(false); setConfirmText('') }}>Batal</Button>
                      <Button onClick={handlePromoteAll} disabled={loading || confirmText !== 'PROMOSI'}>Ya, Promosikan</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
