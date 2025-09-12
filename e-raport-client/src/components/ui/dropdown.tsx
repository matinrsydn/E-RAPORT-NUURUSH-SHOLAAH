import React from 'react'
import { MoreVertical, Edit2, Trash2 } from 'lucide-react'

type ContextType = {
  open: boolean
  setOpen: (v: boolean) => void
  rootRef: React.RefObject<HTMLDivElement>
}

const DropdownContext = React.createContext<ContextType | null>(null)

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className="relative inline-block text-left" ref={rootRef}>
      <DropdownContext.Provider value={{ open, setOpen, rootRef }}>
        {children}
      </DropdownContext.Provider>
    </div>
  )
}

export function DropdownMenuTrigger() {
  const ctx = React.useContext(DropdownContext)
  if (!ctx) return null
  return (
    <button onClick={() => ctx.setOpen(!ctx.open)} className="p-1 rounded hover:bg-slate-100">
      <MoreVertical size={16} />
    </button>
  )
}

export function DropdownMenuContent({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(DropdownContext)
  if (!ctx) return null
  if (!ctx.open) return null
  return (
    <div className="absolute right-0 mt-2 w-40 rounded-md bg-white border shadow-md z-10">
      <div className="py-1">{children}</div>
    </div>
  )
}

export function DropdownMenuItem({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  const ctx = React.useContext(DropdownContext)
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
        ctx?.setOpen(false)
      }}
      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
    >
      {children}
    </button>
  )
}

export function DropdownActionEdit({ onClick }: { onClick?: () => void }) {
  return (
    <DropdownMenuItem onClick={onClick}>
      <Edit2 size={14} /> <span>Edit</span>
    </DropdownMenuItem>
  )
}

export function DropdownActionDelete({ onClick }: { onClick?: () => void }) {
  return (
    <DropdownMenuItem onClick={onClick}>
      <Trash2 size={14} /> <span>Hapus</span>
    </DropdownMenuItem>
  )
}

export default DropdownMenu

// ensure this file is treated as a module under --isolatedModules
export {}
