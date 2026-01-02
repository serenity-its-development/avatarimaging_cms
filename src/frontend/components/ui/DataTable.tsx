import { ReactNode, useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, MoreVertical } from 'lucide-react'
import Badge from './Badge'

export interface Column<T> {
  key: string
  header: string
  width?: string
  sortable?: boolean
  render?: (row: T) => ReactNode
  editable?: boolean
  colorize?: (row: T) => string
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  onRowClick?: (row: T) => void
  onEdit?: (row: T, field: string, value: any) => void
  actions?: (row: T) => ReactNode
  className?: string
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  onRowClick,
  onEdit,
  actions,
  className,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [editingCell, setEditingCell] = useState<{ row: any; column: string } | null>(null)

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0
    const aVal = a[sortColumn]
    const bVal = b[sortColumn]
    const multiplier = sortDirection === 'asc' ? 1 : -1
    return aVal > bVal ? multiplier : -multiplier
  })

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 shadow-soft overflow-hidden', className)}>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider',
                    column.sortable && 'cursor-pointer hover:bg-gray-100 transition-colors',
                    column.width
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && sortColumn === column.key && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
              ))}
              {actions && <th className="px-4 py-3 w-12"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedData.map((row) => (
              <tr
                key={row[keyField]}
                className={cn(
                  'hover:bg-gray-50 transition-colors',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-3 text-sm',
                      column.colorize?.(row)
                    )}
                    onClick={(e) => {
                      if (column.editable) {
                        e.stopPropagation()
                        setEditingCell({ row, column: column.key })
                      }
                    }}
                  >
                    {column.render ? (
                      column.render(row)
                    ) : editingCell?.row === row && editingCell?.column === column.key ? (
                      <input
                        type="text"
                        defaultValue={row[column.key]}
                        autoFocus
                        className="w-full px-2 py-1 border border-primary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                        onBlur={(e) => {
                          onEdit?.(row, column.key, e.target.value)
                          setEditingCell(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onEdit?.(row, column.key, e.currentTarget.value)
                            setEditingCell(null)
                          }
                          if (e.key === 'Escape') {
                            setEditingCell(null)
                          }
                        }}
                      />
                    ) : (
                      <span className={cn(column.editable && 'cursor-text hover:bg-gray-100 px-2 py-1 rounded')}>
                        {row[column.key]}
                      </span>
                    )}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3">
                    <button
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
