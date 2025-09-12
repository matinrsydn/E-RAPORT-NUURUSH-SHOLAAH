import React from 'react'
import { useReactTable, getCoreRowModel, flexRender, ColumnDef } from '@tanstack/react-table'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownActionEdit, DropdownActionDelete } from './ui/dropdown'

type DataTableProps<T> = {
  columns: ColumnDef<T, any>[]
  data: T[]
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  onPrint?: (row: T, reportType: 'nilai' | 'sikap' | 'identitas', format: 'docx' | 'pdf') => void
  searchKey?: string
}

export default function DataTable<T>({ columns, data, onEdit, onDelete, onPrint, searchKey }: DataTableProps<T>) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <TableHead key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TableHead>
                ))}
              </tr>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map(row => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id}>
        {cell.column.id === 'actions' ? (
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger />
                          <DropdownMenuContent>
          {/* Print options: render only when onPrint callback is provided (manajemen siswa) */}
          {onPrint && (
            <>
              <div className="px-2 text-xs text-slate-500">Cetak Rapor</div>
              <DropdownMenuItem onClick={() => onPrint?.(row.original as T, 'nilai', 'docx')}>Rapor Nilai (DOCX)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPrint?.(row.original as T, 'nilai', 'pdf')}>Rapor Nilai (PDF)</DropdownMenuItem>
              <div className="border-t my-1" />
              <div className="px-2 text-xs text-slate-500">Rapor Sikap</div>
              <DropdownMenuItem onClick={() => onPrint?.(row.original as T, 'sikap', 'docx')}>Rapor Sikap (DOCX)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPrint?.(row.original as T, 'sikap', 'pdf')}>Rapor Sikap (PDF)</DropdownMenuItem>
              <div className="border-t my-1" />
              <div className="px-2 text-xs text-slate-500">Identitas</div>
              <DropdownMenuItem onClick={() => onPrint?.(row.original as T, 'identitas', 'docx')}>Identitas (DOCX)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPrint?.(row.original as T, 'identitas', 'pdf')}>Identitas (PDF)</DropdownMenuItem>
              <div className="border-t my-1" />
            </>
          )}

          {/* Edit/Delete actions: render only if callbacks provided */}
          {onEdit && <DropdownActionEdit onClick={() => onEdit?.(row.original as T)} />}
          {onDelete && <DropdownActionDelete onClick={() => onDelete?.(row.original as T)} />}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ) : (
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    )}
                  </TableCell>
                ))}
              </TableRow>
            )) : (
              <tr><td colSpan={columns.length} className="p-4 text-center">No results.</td></tr>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ensure this file is treated as a module under --isolatedModules
export {}
