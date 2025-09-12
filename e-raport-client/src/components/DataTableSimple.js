import React from 'react'
import { useReactTable, flexRender, getCoreRowModel } from '@tanstack/react-table'

export default function DataTableSimple({ columns, data, searchKey, searchPlaceholder = 'Search...' }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
      {searchKey && (
        <div className="py-2">
          <input placeholder={searchPlaceholder} className="border px-2 py-1 rounded w-full max-w-sm" onChange={(e) => { const val = e.target.value; const col = table.getColumn(searchKey); if (col) col.setFilterValue(val) }} />
        </div>
      )}
      <div className="rounded-md border">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th key={h.id} className="text-left p-2 text-sm font-medium text-gray-600">{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map(row => (
              <tr key={row.id} className="border-t">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="p-2 text-sm">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            )) : (
              <tr><td colSpan={columns.length} className="p-4 text-center">No results.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
