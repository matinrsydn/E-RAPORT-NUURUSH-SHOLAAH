import React from 'react'
import { Label } from './ui/label'
import { Select } from './ui/select'

type Option = { value: string; label: React.ReactNode; disabled?: boolean }

type Props = {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  options: Option[]
}

export default function FilterSelect({ id, label, value, onChange, placeholder, options }: Props) {
  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}
      <Select id={id} value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </Select>
    </div>
  )
}
