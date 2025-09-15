import React from 'react'
import { Label } from './ui/label'
// PERBAIKAN: Impor semua bagian yang diperlukan dari komponen Select kustom Anda
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

// Tipe data untuk opsi dropdown
type Option = { value: string; label: React.ReactNode; disabled?: boolean }

// Tipe data untuk properti komponen
type Props = {
  id?: string
  label?: string
  value: string
  // PERBAIKAN: Ganti nama prop agar konsisten
  onValueChange: (value: string) => void
  placeholder?: string
  options: Option[]
  disabled?: boolean
  className?: string // Tambahkan className untuk fleksibilitas styling
}

export default function FilterSelect({
  id,
  label,
  value,
  onValueChange,
  placeholder,
  options,
  disabled,
  className
}: Props) {
  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      {/* PERBAIKAN: Gunakan struktur Select yang benar */}
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger id={id} className={className}>
          <SelectValue placeholder={placeholder || "Pilih..."} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem
              key={String(opt.value)}
              value={opt.value}
              disabled={opt.disabled}
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}