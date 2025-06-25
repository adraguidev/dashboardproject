import { useState, useCallback } from 'react'

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
  fetchEvaluadores: (process: 'ccm' | 'prr') => Promise<void>
  createEvaluador: (process: 'ccm' | 'prr', data: Omit<Evaluador, 'id'>) => Promise<boolean>
  updateEvaluador: (process: 'ccm' | 'prr', data: Evaluador) => Promise<boolean>
  deleteEvaluador: (process: 'ccm' | 'prr', id: number) => Promise<boolean>
  
  // Estados de operaciones
  creating: boolean
  updating: boolean
  deleting: boolean
}

export function useEvaluadoresCRUD(): UseEvaluadoresCRUDResult {
  const [evaluadores, setEvaluadores] = useState<Evaluador[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // GET - Obtener evaluadores
  const fetchEvaluadores = useCallback(async (process: 'ccm' | 'prr') => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/dashboard/evaluadores?process=${process}`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Error obteniendo evaluadores')
      }
      
      // El nuevo endpoint devuelve directamente el array
      if (Array.isArray(result)) {
        setEvaluadores(result)
      } else if (result.success) {
        // Formato legacy por compatibilidad
        setEvaluadores(result.data || [])
      } else {
        throw new Error(result.error || 'Respuesta inválida del servidor')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error('Error fetching evaluadores:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // POST - Crear evaluador
  const createEvaluador = useCallback(async (process: 'ccm' | 'prr', data: Omit<Evaluador, 'id'>): Promise<boolean> => {
    setCreating(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/dashboard/evaluadores?process=${process}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Error creando evaluador')
      }
      
      // El nuevo endpoint devuelve directamente el objeto creado
      if (result && result.id) {
        // Refrescar la lista después de crear
        await fetchEvaluadores(process)
        return true
      } else if (result.success) {
        // Formato legacy por compatibilidad
        await fetchEvaluadores(process)
        return true
      } else {
        throw new Error(result.error || 'Error en la respuesta del servidor')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error('Error creating evaluador:', err)
      return false
    } finally {
      setCreating(false)
    }
  }, [fetchEvaluadores])

  // PUT - Actualizar evaluador
  const updateEvaluador = useCallback(async (process: 'ccm' | 'prr', data: Evaluador): Promise<boolean> => {
    setUpdating(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/dashboard/evaluadores?process=${process}&id=${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Error actualizando evaluador')
      }
      
      // El nuevo endpoint devuelve directamente el objeto actualizado
      if (result && result.id) {
        // Refrescar la lista después de actualizar
        await fetchEvaluadores(process)
        return true
      } else if (result.success) {
        // Formato legacy por compatibilidad
        await fetchEvaluadores(process)
        return true
      } else {
        throw new Error(result.error || 'Error en la respuesta del servidor')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error('Error updating evaluador:', err)
      return false
    } finally {
      setUpdating(false)
    }
  }, [fetchEvaluadores])

  // DELETE - Eliminar evaluador
  const deleteEvaluador = useCallback(async (process: 'ccm' | 'prr', id: number): Promise<boolean> => {
    setDeleting(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/dashboard/evaluadores?process=${process}&id=${id}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Error eliminando evaluador')
      }
      
      // El nuevo endpoint devuelve un mensaje de confirmación
      if (result && result.message) {
        // Refrescar la lista después de eliminar
        await fetchEvaluadores(process)
        return true
      } else if (result.success) {
        // Formato legacy por compatibilidad
        await fetchEvaluadores(process)
        return true
      } else {
        throw new Error(result.error || 'Error en la respuesta del servidor')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error('Error deleting evaluador:', err)
      return false
    } finally {
      setDeleting(false)
    }
  }, [fetchEvaluadores])

  return {
    evaluadores,
    loading,
    error,
    fetchEvaluadores,
    createEvaluador,
    updateEvaluador,
    deleteEvaluador,
    creating,
    updating,
    deleting
  }
} 




