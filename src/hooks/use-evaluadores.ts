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
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        try {
          const errorResult = await response.json() as { error?: string };
          errorMessage = errorResult.error || errorMessage;
        } catch (e) {
          // Si el json falla, mantenemos el error original
        }
        throw new Error(errorMessage);
      }

      const data: Evaluador[] = await response.json()
      setEvaluadores(data)
              // Evaluadores loaded successfully

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
 
 