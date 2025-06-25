'use client'

import React, { useState, useMemo } from 'react'
import { Card } from './card'
import { Badge } from './badge'
import { TableColumn, ProcessFilters } from '@/types/dashboard'

interface DynamicTableProps {
  data: any[]
  columns: TableColumn[]
  filters?: ProcessFilters
  onFiltersChange?: (filters: ProcessFilters) => void
  loading?: boolean
  totalRecords?: number
  currentPage?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
  className?: string
}

export function DynamicTable({
  data,
  columns,
  filters = {},
  onFiltersChange,
  loading = false,
  totalRecords = 0,
  currentPage = 1,
  pageSize = 50,
  onPageChange,
  onPageSizeChange,
  className = ''
}: DynamicTableProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  } | null>(null)

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})

  // Datos filtrados y ordenados
  const processedData = useMemo(() => {
    let filteredData = [...data]

    // Aplicar filtros de columna
    Object.entries(columnFilters).forEach(([key, filterValue]) => {
      if (filterValue) {
        filteredData = filteredData.filter(item => {
          const value = item[key]
          if (value === null || value === undefined) return false
          return value.toString().toLowerCase().includes(filterValue.toLowerCase())
        })
      }
    })

    // Aplicar ordenamiento
    if (sortConfig) {
      filteredData.sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]

        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }

    return filteredData
  }, [data, columnFilters, sortConfig])

  const handleSort = (column: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig?.key === column) {
        return prevConfig.direction === 'asc'
          ? { key: column, direction: 'desc' }
          : null
      }
      return { key: column, direction: 'asc' }
    })
  }

  const handleColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }))
  }

  const renderCellValue = (value: any, column: TableColumn) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">-</span>
    }

    switch (column.type) {
      case 'status':
        const statusColors = {
          'PENDIENTE': 'bg-yellow-100 text-yellow-800',
          'EN PROCESO': 'bg-blue-100 text-blue-800',
          'FINALIZADO': 'bg-green-100 text-green-800',
          'RECHAZADO': 'bg-red-100 text-red-800'
        }
        return (
          <Badge className={statusColors[value as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
            {value}
          </Badge>
        )
      case 'number':
        return <span className="font-mono">{value}</span>
      case 'date':
        return <span className="text-sm">{value}</span>
      default:
        return <span>{value}</span>
    }
  }

  const getSortIcon = (column: string) => {
    if (sortConfig?.key !== column) {
      return '↕️'
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  const totalPages = Math.ceil(totalRecords / pageSize)

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Encabezado con estadísticas */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold text-lg">
              Registros: {processedData.length.toLocaleString()}
            </h3>
            {totalRecords > 0 && (
              <span className="text-sm text-gray-600">
                de {totalRecords.toLocaleString()} total
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Filas por página:</span>
            <select 
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: column.width ? `${column.width}px` : 'auto' }}
                >
                  <div className="space-y-2">
                    {/* Encabezado con ordenamiento */}
                    <div className="flex items-center gap-1">
                      <span>{column.label}</span>
                      {column.sortable && (
                        <button
                          onClick={() => handleSort(column.key)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title={`Ordenar por ${column.label}`}
                        >
                          {getSortIcon(column.key)}
                        </button>
                      )}
                    </div>
                    
                    {/* Filtro de columna */}
                    {column.filterable && (
                      <input
                        type="text"
                        placeholder={`Filtrar ${column.label}...`}
                        value={columnFilters[column.key] || ''}
                        onChange={(e) => handleColumnFilter(column.key, e.target.value)}
                        className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {processedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  No se encontraron registros con los filtros aplicados
                </td>
              </tr>
            ) : (
              processedData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-sm">
                      {renderCellValue(row[column.key], column)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && onPageChange && (
        <div className="p-4 bg-gray-50 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Anterior
              </button>
              
              {/* Números de página */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1
                  return (
                    <button
                      key={page}
                      onClick={() => onPageChange(page)}
                      className={`px-3 py-1 text-sm border rounded ${
                        page === currentPage
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
} 
 
 