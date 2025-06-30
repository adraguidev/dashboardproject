import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logInfo, logError } from '@/lib/logger'

export interface Evaluador {
  id: number
  nombre_en_base: string
  nombre_real?: string
  sub_equipo: string
  activo?: boolean
  fecha_ingreso?: string
  fecha_salida?: string
  lider?: boolean
  // Campos legacy para compatibilidad
  nombres_apellidos?: string
  regimen?: string
  turno?: string
  modalidad?: string
  creado_en?: string
}

interface UseEvaluadoresCRUDResult {
  evaluadores: Evaluador[]
  loading: boolean
  error: string | null
  
  // Operaciones CRUD
  refetch: () => void
  createEvaluador: (process: 'ccm' | 'prr', data: Omit<Evaluador, 'id'>) => Promise<boolean>
  updateEvaluador: (process: 'ccm' | 'prr', data: Evaluador) => Promise<boolean>
  deleteEvaluador: (process: 'ccm' | 'prr', id: number) => Promise<boolean>
  
  // Estados de operaciones
  creating: boolean
  updating: boolean
  deleting: boolean
}

interface ErrorResponse {
  error?: string;
}

// Funciones API
async function fetchEvaluadoresAPI(process: 'ccm' | 'prr'): Promise<Evaluador[]> {
  logInfo(`🔍 Obteniendo evaluadores para proceso: ${process.toUpperCase()}`);
  
      const response = await fetch(`/api/dashboard/evaluadores?process=${process}`)
      
      if (!response.ok) {
    const result: ErrorResponse = await response.json()
        throw new Error(result.error || 'Error obteniendo evaluadores')
      }
      
  const data: Evaluador[] = await response.json()
  return Array.isArray(data) ? data : []
}

async function createEvaluadorAPI(process: 'ccm' | 'prr', data: Omit<Evaluador, 'id'>): Promise<Evaluador> {
  logInfo(`➕ Creando evaluador para proceso: ${process.toUpperCase()}`);
  
      const response = await fetch(`/api/dashboard/evaluadores?process=${process}`, {
        method: 'POST',
    headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
  if (!response.ok) {
      const result: ErrorResponse = await response.json()
        throw new Error(result.error || 'Error creando evaluador')
      }
      
  return response.json()
}

async function updateEvaluadorAPI(process: 'ccm' | 'prr', data: Evaluador): Promise<Evaluador> {
  logInfo(`🔄 Actualizando evaluador ID ${data.id} para proceso: ${process.toUpperCase()}`);
  
      const response = await fetch(`/api/dashboard/evaluadores?process=${process}&id=${data.id}`, {
        method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
  if (!response.ok) {
      const result: ErrorResponse = await response.json()
        throw new Error(result.error || 'Error actualizando evaluador')
      }
      
  return response.json()
}

async function deleteEvaluadorAPI(process: 'ccm' | 'prr', id: number): Promise<void> {
  logInfo(`🗑️ Eliminando evaluador ID ${id} para proceso: ${process.toUpperCase()}`);
  
      const response = await fetch(`/api/dashboard/evaluadores?process=${process}&id=${id}`, {
        method: 'DELETE'
      })
      
  if (!response.ok) {
      const result: ErrorResponse = await response.json()
        throw new Error(result.error || 'Error eliminando evaluador')
      }
}

export function useEvaluadoresCRUD(process: 'ccm' | 'prr' = 'ccm'): UseEvaluadoresCRUDResult {
  const queryClient = useQueryClient()

  // ✅ UseQuery nativo para obtener evaluadores
  const {
    data: evaluadores = [],
    isLoading: loading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ['evaluadores', process],
    queryFn: () => fetchEvaluadoresAPI(process),
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
    refetchOnWindowFocus: false,
    retry: 2
  })

  // Error handling
  const error = queryError instanceof Error ? queryError.message : null

  // ✅ Mutación para crear evaluador con invalidación optimizada
  const createMutation = useMutation({
    mutationFn: ({ process, data }: { process: 'ccm' | 'prr', data: Omit<Evaluador, 'id'> }) => 
      createEvaluadorAPI(process, data),
    onSuccess: (_, variables) => {
      // Invalidar ambos procesos para asegurar sincronización
      queryClient.invalidateQueries({ queryKey: ['evaluadores'] })
      logInfo('✅ Evaluador creado, cache invalidado completamente')
    },
    onError: (error) => {
      logError('❌ Error en mutación crear evaluador:', error)
    }
  })

  // ✅ Mutación para actualizar evaluador con invalidación optimizada
  const updateMutation = useMutation({
    mutationFn: ({ process, data }: { process: 'ccm' | 'prr', data: Evaluador }) => 
      updateEvaluadorAPI(process, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluadores'] })
      logInfo('✅ Evaluador actualizado, cache invalidado completamente')
    },
    onError: (error) => {
      logError('❌ Error en mutación actualizar evaluador:', error)
    }
  })

  // ✅ Mutación para eliminar evaluador con invalidación optimizada
  const deleteMutation = useMutation({
    mutationFn: ({ process, id }: { process: 'ccm' | 'prr', id: number }) => 
      deleteEvaluadorAPI(process, id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluadores'] })
      logInfo('✅ Evaluador eliminado, cache invalidado completamente')
    },
    onError: (error) => {
      logError('❌ Error en mutación eliminar evaluador:', error)
    }
  })

  // ✅ Función para crear evaluador
  const createEvaluador = async (process: 'ccm' | 'prr', data: Omit<Evaluador, 'id'>): Promise<boolean> => {
    try {
      await createMutation.mutateAsync({ process, data })
        return true
    } catch (error) {
      logError('❌ Error creando evaluador:', error)
      return false
    }
  }

  // ✅ Función para actualizar evaluador
  const updateEvaluador = async (process: 'ccm' | 'prr', data: Evaluador): Promise<boolean> => {
    try {
      await updateMutation.mutateAsync({ process, data })
        return true
    } catch (error) {
      logError('❌ Error actualizando evaluador:', error)
      return false
      }
  }

  // ✅ Función para eliminar evaluador
  const deleteEvaluador = async (process: 'ccm' | 'prr', id: number): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync({ process, id })
      return true
    } catch (error) {
      logError('❌ Error eliminando evaluador:', error)
      return false
    }
  }

  return {
    evaluadores,
    loading,
    error,
    refetch,
    createEvaluador,
    updateEvaluador,
    deleteEvaluador,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,
  }
} 




