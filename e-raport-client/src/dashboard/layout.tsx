import React from 'react'
import DashboardNav from '../components/dashboard-nav'
import { Card } from '../components/ui/card'

type Props = {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: Props) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardNav />
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
