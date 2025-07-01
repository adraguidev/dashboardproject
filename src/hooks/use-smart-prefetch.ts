import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Prefetch silencioso de vistas Producción e Ingresos para CCM/PRR.
 * Calienta Redis y el caché del navegador sin bloquear la UI.
 *
 * @param proceso 'ccm' | 'prr' | cualquier otro (otros se ignoran)
 */
export function useSmartPrefetch(proceso: string) {
  const qc = useQueryClient()

  useEffect(() => {
    if (proceso !== 'ccm' && proceso !== 'prr') return

    // Valor en mayúsculas para endpoints históricos (la BD usa 'CCM' | 'PRR')
    const procesoUpper = proceso.toUpperCase()

    // Lanzar 15 s después de que el usuario esté en la pantalla
    const timer = setTimeout(() => {
      const endpoints = [
        // 1️⃣ Pendientes (por defecto: year)
        `/api/dashboard/pendientes-report?process=${proceso}&groupBy=year`, // básica
        `/api/dashboard/pendientes-report?process=${proceso}&groupBy=quarter`,
        `/api/dashboard/pendientes-report?process=${proceso}&groupBy=month`,

        // 2️⃣ Producción (por defecto: 20 días, todos los días)
        `/api/dashboard/produccion-report?process=${proceso}&days=20&dayType=TODOS`, // básica
        // Variantes de tipo de día para los 20 días
        `/api/dashboard/produccion-report?process=${proceso}&days=20&dayType=LABORABLES`,
        `/api/dashboard/produccion-report?process=${proceso}&days=20&dayType=FIN_DE_SEMANA`,
        // Rangos más amplios (todos los días)
        `/api/dashboard/produccion-report?process=${proceso}&days=15`,
        `/api/dashboard/produccion-report?process=${proceso}&days=30`,
        `/api/dashboard/produccion-report?process=${proceso}&days=60`,

        // 3️⃣ Ingresos (por defecto: 30 días)
        `/api/dashboard/ingresos?process=${proceso}&days=30`, // básica
        `/api/dashboard/ingresos?process=${proceso}&days=15`,
        `/api/dashboard/ingresos?process=${proceso}&days=45`,
        `/api/dashboard/ingresos?process=${proceso}&days=60`,
        `/api/dashboard/ingresos?process=${proceso}&days=90`,

        // 4️⃣ Throughput (por defecto 30 días, corregido param "proceso")
        `/api/analysis/throughput?proceso=${proceso}&days=30`, // básica
        `/api/analysis/throughput?proceso=${proceso}&days=60`,
        `/api/analysis/throughput?proceso=${proceso}&days=90`,
        `/api/analysis/throughput?proceso=${proceso}&days=15`,
        `/api/analysis/throughput?proceso=${proceso}&days=7`,

        // 5️⃣ Resueltos (análisis anual)
        `/api/analysis/resueltos?proceso=${proceso}`,

        // 6️⃣ Históricos opcionales (pesados) - NOTA: estos endpoints esperan 'proceso' en mayúsculas
        `/api/historico/avance-pendientes?proceso=${procesoUpper}`,
        `/api/historico/sin-asignar?proceso=${procesoUpper}&dias=30`,

        // 7️⃣ KPIs y evaluadores (ligeros)
        `/api/dashboard/kpis`,
        `/api/dashboard/evaluadores?process=${proceso}`,
      ]

      endpoints.forEach((url) => {
        const key = url // usar la url completa como parte de la queryKey
        qc.prefetchQuery({
          queryKey: ['prefetch', key],
          queryFn: () => fetch(url).then((r) => r.json()),
          staleTime: Infinity,
        })
      })
    }, 15_000) // 15 segundos

    return () => clearTimeout(timer)
  }, [proceso, qc])
} 