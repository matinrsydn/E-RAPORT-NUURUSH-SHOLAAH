import React, { useEffect, useState } from 'react'
import DashboardLayout from '../../dashboard/layout'
import API_BASE from '../../api'
import axios from 'axios'
import DataTable from '../../components/data-table'
import { Card, CardContent } from '../../components/ui/card'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { useToast } from '../../components/ui/toast'

type Row = { id:number; nama:string; keterangan?:string }

export default function ManajemenRaportDashboardPage(){
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<Row | null>(null)
  const { toast } = useToast()

  const fetchData = async ()=>{
    setLoading(true)
    try{
      const res = await axios.get(`${API_BASE}/raport`)
      setData(res.data)
    } catch (e) {
      console.error(e);
      if (axios.isAxiosError(e) && e.response) {
        if (e.response.status === 404) toast({ title: 'Endpoint tidak ditemukan', description: '/raport', variant: 'destructive' })
        else toast({ title: 'Gagal', description: e.response.data?.message || 'Gagal memuat', variant: 'destructive' })
      } else toast({ title: 'Gagal', description: String(e), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }
  useEffect(()=>{ fetchData() }, [])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Manajemen Raport</h1><p className="text-muted-foreground">Kelola raport dan batch</p></div>
        <Card>
          <CardContent>
            {loading ? <div>Memuat...</div> : (
              <div>
                <div className="flex justify-end mb-4"><Button>Generate</Button></div>
                <DataTable<Row> columns={[{ header:'Nama', accessorKey:'nama' },{ header:'Keterangan', accessorKey:'keterangan' },{ id:'actions', header:'Aksi', accessorKey:'id' as any }]} data={data} onDelete={(r)=>setDeleting(r)} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
