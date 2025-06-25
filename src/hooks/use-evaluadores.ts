'use client'

import { useState, useEffect } from 'react'
import { Evaluador } from '@/types/dashboard'

interface UseEvaluadoresOptions {
  process: 'ccm' | 'prr'
}

export function useEvaluadores({
  process
}: UseEvaluadoresOptions) {
  const [evaluadores, setEvaluadores] = useState<Evaluador[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEvaluadores = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log(`🔍 Fetching evaluadores: ${process.toUpperCase()}`)

      const response = await fetch(`/api/dashboard/evaluadores?process=${process}`)
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data: Evaluador[] = await response.json()
      setEvaluadores(data)
      console.log(`✅ Evaluadores cargados: ${data.length}`)

    } catch (err) {
      console.error('❌ Error fetching evaluadores:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setEvaluadores([])
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => {
    fetchEvaluadores()
  }

  // Cargar datos iniciales
  useEffect(() => {
    fetchEvaluadores()
  }, [process])

  return {
    // Data
    evaluadores,
    
    // State
    loading,
    error,
    
    // Actions
    refresh,
    
    // Stats
    stats: {
      totalEvaluadores: evaluadores.length,
      hasData: evaluadores.length > 0,
      evaluadoresList: evaluadores.map(e => e.nombre_en_base)
    }
  }
} 
 
 