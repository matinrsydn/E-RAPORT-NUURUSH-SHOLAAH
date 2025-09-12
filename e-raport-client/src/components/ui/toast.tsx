import React from 'react'

type ToastItem = { id: string; title?: string; description?: string; variant?: 'default' | 'destructive' }
type ToastInput = Omit<ToastItem, 'id'>

const ToastContext = React.createContext<{
  push: (t: ToastInput) => void
} | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const push = (t: ToastInput) => {
    const id = String(Date.now())
    setToasts((s) => [...s, { ...t, id }])
    setTimeout(() => setToasts((s) => s.filter(x => x.id !== id)), 4000)
  }

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`rounded-md px-3 py-2 shadow ${t.variant==='destructive'?'bg-rose-600 text-white':'bg-slate-800 text-white'}`}>
            <div className="font-semibold">{t.title}</div>
            {t.description && <div className="text-sm opacity-90">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(){
  const ctx = React.useContext(ToastContext)
  if(!ctx) throw new Error('useToast must be used within ToastProvider')
  // return a loose-typed wrapper so consumers can call toast({title, description, variant})
  return { toast: (t: any) => ctx.push(t) }
}

export default ToastProvider
