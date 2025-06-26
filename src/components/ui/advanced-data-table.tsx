'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown, Filter, Download, Search, X, MoreVertical } from 'lucide-react'

export interface Column<T> {
  key: string
  title: string
  accessor: (item: T) => any
  sortable?: boolean
  filterable?: boolean
  width?: number
  minWidth?: number
  maxWidth?: number
  render?: (value: any, item: T) => React.ReactNode
  className?: string
  headerClassName?: string
}

export interface AdvancedDataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  pageSize?: number
  searchable?: boolean
  exportable?: boolean
  selectable?: boolean
  onRowSelect?: (selectedRows: T[]) => void
  className?: string
  emptyMessage?: string
  loading?: boolean
  getRowClassName?: (item: T) => string
}

type SortDirection = 'asc' | 'desc' | null

interface SortConfig {
  key: string
  direction: SortDirection
}

interface ColumnFilters {
  [key: string]: string
}

export function AdvancedDataTable<T>({
  data,
  columns,
  pageSize = 10,
  searchable = true,
  exportable = true,
  selectable = false,
  onRowSelect,
  className = '',
  emptyMessage = 'No hay datos disponibles',
  loading = false,
  getRowClassName,
  footer
}: AdvancedDataTableProps<T> & { footer?: React.ReactNode }) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null })
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({})
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  
  const tableRef = useRef<HTMLTableElement>(null)
  const resizeRef = useRef<{ startX: number; startWidth: number; column: string } | null>(null)

  // Initialize column widths
  useEffect(() => {
    const initialWidths: { [key: string]: number } = {}
    columns.forEach(col => {
      if (col.width) {
        initialWidths[col.key] = col.width
      }
    })
    setColumnWidths(initialWidths)
  }, [columns])

  // Filtering logic
  const filteredData = useMemo(() => {
    let filtered = [...data]

    // Apply global filter
    if (globalFilter) {
      filtered = filtered.filter(item =>
        columns.some(col => {
          const value = col.accessor(item)
          return value?.toString().toLowerCase().includes(globalFilter.toLowerCase())
        })
      )
    }

    // Apply column filters
    Object.entries(columnFilters).forEach(([key, filterValue]) => {
      if (filterValue) {
        const column = columns.find(col => col.key === key)
        if (column) {
          filtered = filtered.filter(item => {
            const value = column.accessor(item)
            return value?.toString().toLowerCase().includes(filterValue.toLowerCase())
          })
        }
      }
    })

    return filtered
  }, [data, globalFilter, columnFilters, columns])

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return filteredData

    const column = columns.find(col => col.key === sortConfig.key)
    if (!column) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = column.accessor(a)
      const bValue = column.accessor(b)

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1
      if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1

      // Convert to string for comparison if needed
      let aCompare = aValue
      let bCompare = bValue

      // Try to parse as numbers if possible
      const aNum = Number(aValue)
      const bNum = Number(bValue)
      if (!isNaN(aNum) && !isNaN(bNum)) {
        aCompare = aNum
        bCompare = bNum
      } else {
        aCompare = String(aValue).toLowerCase()
        bCompare = String(bValue).toLowerCase()
      }

      if (aCompare < bCompare) return sortConfig.direction === 'asc' ? -1 : 1
      if (aCompare > bCompare) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredData, sortConfig, columns])

  // Pagination logic
  const paginatedData = useMemo(() => {
    // Si pageSize es mayor o igual al total de datos, mostrar todo
    if (pageSize >= sortedData.length) {
      return sortedData
    }
    const startIndex = (currentPage - 1) * pageSize
    return sortedData.slice(startIndex, startIndex + pageSize)
  }, [sortedData, currentPage, pageSize])

  const totalPages = Math.ceil(sortedData.length / pageSize)

  // Sorting handlers
  const handleSort = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey)
    if (!column?.sortable) return

    setSortConfig(prev => {
      if (prev.key === columnKey) {
        if (prev.direction === 'asc') return { key: columnKey, direction: 'desc' }
        if (prev.direction === 'desc') return { key: '', direction: null }
      }
      return { key: columnKey, direction: 'asc' }
    })
  }

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(Array.from({ length: paginatedData.length }, (_, i) => i)))
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleSelectRow = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedRows)
    if (checked) {
      newSelected.add(index)
    } else {
      newSelected.delete(index)
    }
    setSelectedRows(newSelected)
  }

  // Update parent component when selection changes
  useEffect(() => {
    if (onRowSelect && selectable) {
      const selectedItems = Array.from(selectedRows).map(index => paginatedData[index])
      onRowSelect(selectedItems)
    }
  }, [selectedRows, paginatedData, onRowSelect, selectable])

  // Column resizing handlers
  const handleMouseDown = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault()
    const startX = e.clientX
    const currentWidth = columnWidths[columnKey] || 150
    
    setResizingColumn(columnKey)
    resizeRef.current = { startX, startWidth: currentWidth, column: columnKey }

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return
      
      const diff = e.clientX - resizeRef.current.startX
      const newWidth = Math.max(50, resizeRef.current.startWidth + diff)
      
      setColumnWidths(prev => ({
        ...prev,
        [resizeRef.current!.column]: newWidth
      }))
    }

    const handleMouseUp = () => {
      setResizingColumn(null)
      resizeRef.current = null
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Export functionality
  const exportToCSV = () => {
    const headers = columns.map(col => col.title).join(',')
    const rows = sortedData.map(item => 
      columns.map(col => {
        const value = col.accessor(item)
        // Escape commas and quotes in CSV
        return typeof value === 'string' && (value.includes(',') || value.includes('"'))
          ? `"${value.replace(/"/g, '""')}"`
          : value
      }).join(',')
    )
    
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'table-data.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  // Render sort icon
  const renderSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) {
      return <div className="w-4 h-4" />
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header with search and controls */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Datos ({Math.max(0, sortedData.length - 1)} operadores + 1 total = {sortedData.length} registros)
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-md border ${showFilters ? 'bg-blue-50 border-blue-300' : 'border-gray-300'} hover:bg-gray-50`}
              title="Mostrar/ocultar filtros"
            >
              <Filter className="w-4 h-4" />
            </button>
            {exportable && (
              <button
                onClick={exportToCSV}
                className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
                title="Exportar a CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {searchable && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar en todos los campos..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {globalFilter && (
              <button
                onClick={() => setGlobalFilter('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Column filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {columns.map(column => {
              if (!column.filterable) return null

              return (
                <div key={column.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filtrar {column.title}
                  </label>
                  <input
                    type="text"
                    placeholder={`Filtrar por ${column.title.toLowerCase()}...`}
                    value={columnFilters[column.key] || ''}
                    onChange={(e) => setColumnFilters(prev => ({
                      ...prev,
                      [column.key]: e.target.value
                    }))}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full min-w-max table-fixed">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none relative ${column.headerClassName || ''}`}
                  style={{ 
                    width: columnWidths[column.key] || column.width || 'auto',
                    minWidth: column.minWidth || 50,
                    maxWidth: column.maxWidth || 'none'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex items-center space-x-1 ${column.sortable !== false ? 'cursor-pointer hover:text-gray-700' : ''}`}
                      onClick={() => column.sortable !== false && handleSort(column.key)}
                    >
                      <span>{column.title}</span>
                      {column.sortable !== false && renderSortIcon(column.key)}
                    </div>
                    
                    {/* Resize handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-300 group"
                      onMouseDown={(e) => handleMouseDown(e, column.key)}
                    >
                      <div className="w-full h-full group-hover:bg-blue-400"></div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => {
                const rowClassName = getRowClassName ? getRowClassName(item) : ''
                return (
                <tr 
                  key={index}
                  className={`group hover:bg-gray-50 ${selectedRows.has(index) ? 'bg-blue-50' : ''} ${rowClassName}`}
                >
                  {selectable && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(index)}
                        onChange={(e) => handleSelectRow(index, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-2 text-sm ${column.className || ''}`}
                      style={{ 
                        width: columnWidths[column.key] || column.width || 'auto',
                        minWidth: column.minWidth || 50,
                        maxWidth: column.maxWidth || 'none'
                      }}
                    >
                      {column.render ? 
                        column.render(column.accessor(item), item) : 
                        column.accessor(item)
                      }
                    </td>
                  ))}
                                  </tr>
                )
              })
            )}
          </tbody>
          {footer && (
            <tfoot>
              {footer}
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && pageSize < sortedData.length && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, sortedData.length)} de {sortedData.length} registros
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Anterior
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm border rounded ${
                      currentPage === pageNum
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Selection info */}
      {selectable && selectedRows.size > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
          <div className="text-sm text-blue-700">
            {selectedRows.size} fila{selectedRows.size > 1 ? 's' : ''} seleccionada{selectedRows.size > 1 ? 's' : ''}
            <button
              onClick={() => setSelectedRows(new Set())}
              className="ml-2 text-blue-600 hover:text-blue-800 underline"
            >
              Limpiar selección
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 
 
 