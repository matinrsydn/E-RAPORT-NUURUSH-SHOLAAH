import * as React from 'react'
import { forwardRef } from 'react'

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={`w-full border rounded px-2 py-2 ${className || ''}`} {...props} />
))
Textarea.displayName = 'Textarea'
