import React, { useEffect, useState } from 'react'
import axios from 'axios'
import API_BASE from '../api'
import DashboardLayout from './layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Users, BookOpen, UserCheck, BookCopy, DoorOpen } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type Stat = {
  totalSiswa: number
  totalGuru: number
  totalWaliKelas: number
  totalMapel: number
  totalKitab: number
  totalKamar: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stat | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [statsRes, chartRes] = await Promise.all([
          axios.get(`${API_BASE}/dashboard/stats`),
          axios.get(`${API_BASE}/dashboard/siswa-per-kelas`),
        ])
        setStats(statsRes.data)
        setChartData(chartRes.data)
      } catch (err) {
        console.error('Gagal memuat data dashboard:', err)
        setError('Tidak dapat memuat data. Pastikan server backend berjalan.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Ringkasan statistik sistem</p>
        </div>

        {loading ? (
          <div className="text-center">Memuat data...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold">{stats?.totalSiswa ?? 0}</h3>
                    <p className="text-sm text-muted-foreground">Total Siswa</p>
                  </div>
                  <Users size={36} className="text-sky-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold">{stats?.totalGuru ?? 0}</h3>
                    <p className="text-sm text-muted-foreground">Total Guru</p>
                  </div>
                  <UserCheck size={36} className="text-emerald-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold">{stats?.totalWaliKelas ?? 0}</h3>
                    <p className="text-sm text-muted-foreground">Total Wali Kelas</p>
                  </div>
                  <UserCheck size={36} className="text-rose-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Jumlah Siswa per Kelas</CardTitle>
            <CardDescription>Distribusi siswa per kelas</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Jumlah" fill="#3b82f6" name="Jumlah Siswa" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Data siswa per kelas belum tersedia.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
