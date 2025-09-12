import * as React from 'react'
import { forwardRef } from 'react'

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  children?: React.ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => {
  return (
    <select ref={ref} className={`w-full border rounded px-2 py-1 ${className || ''}`} {...props}>
      {children}
    </select>
  )
})
Select.displayName = 'Select'

export const SelectTrigger = (props: any) => {
  // simple passthrough for compatibility with usage patterns
  return <div {...props} />
}

export const SelectContent = (props: any) => {
  return <div {...props} />
}

export const SelectItem = (props: any) => {
  return <option {...props} />
}
