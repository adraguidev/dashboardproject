'use client'

import { useState, useEffect } from 'react'
import { CCMRecord, PRRRecord } from '@/types/dashboard'

interface PendientesData {
  data: (CCMRecord | PRRRecord)[]
  pagination: {
    page: number
    limit: number
    offset: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  filters: Record<string, any>
}

interface PendientesApiResponse {
  success: boolean;
  data: (CCMRecord | PRRRecord)[];
  pagination: PendientesData['pagination'];
  filters: PendientesData['filters'];
  error?: string;
}

interface UsePendientesOptions {
  process: 'ccm' | 'prr'
  initialPage?: number
  initialPageSize?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

export function usePendientes({
  process,
  initialPage = 1,
  initialPageSize = 50,
  autoRefresh = false,
  refreshInterval = 30000
}: UsePendientesOptions) {
  const [data, setData] = useState<(CCMRecord | PRRRecord)[]>([])
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: initialPageSize,
    offset: 0,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPendientes = async (page?: number, pageSize?: number) => {
    setLoading(true)
    setError(null)

    try {
      const currentPage = page || pagination.page
      const currentPageSize = pageSize || pagination.limit

      const params = new URLSearchParams({
        process,
        page: currentPage.toString(),
        limit: currentPageSize.toString()
      })

      console.log(`🔍 Fetching pendientes: ${process.toUpperCase()} - Página ${currentPage}`)

      const response = await fetch(`/api/dashboard/pendientes?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const result: PendientesApiResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error desconocido')
      }

      setData(result.data)
      setPagination(result.pagination)
      setFilters(result.filters)

      console.log(`✅ Datos cargados: ${result.data.length} registros de ${result.pagination.total} total`)

    } catch (err) {
      console.error('❌ Error fetching pendientes:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchPendientes(page)
    }
  }

  const changePageSize = (newPageSize: number) => {
    fetchPendientes(1, newPageSize)
  }

  const refresh = () => {
    fetchPendientes()
  }

  // Cargar datos iniciales
  useEffect(() => {
    fetchPendientes()
  }, [process])

  // Auto-refresh si está habilitado
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      console.log(`🔄 Auto-refresh pendientes ${process.toUpperCase()}`)
      fetchPendientes()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, process, pagination.page, pagination.limit])

  return {
    // Data
    data,
    pagination,
    filters,
    
    // State
    loading,
    error,
    
    // Actions
    refresh,
    goToPage,
    changePageSize,
    
    // Stats
    stats: {
      totalRecords: pagination.total,
      currentPage: pagination.page,
      totalPages: pagination.totalPages,
      recordsPerPage: pagination.limit,
      recordsShown: data.length,
      hasData: data.length > 0
    }
  }
} 
 
 