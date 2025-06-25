/**
 * Cliente HTTP para Neon Data API (PostgREST)
 * Conecta directamente a la API REST de la base de datos
 */

import { logDebug, logInfo, logWarn, logError } from './logger'

interface NeonDataResponse<T = any> {
  data: T[]
  count?: number
}

export class NeonDataAPI {
  private readonly baseUrl: string

  constructor() {
    // URL de tu Neon Data API real
    this.baseUrl = 'https://app-delicate-river-89418359.dpl.myneon.app'
  }

  /**
   * Realizar petición GET con reintentos automáticos para manejar base de datos dormida
   */
  private async get<T = any>(endpoint: string, params?: Record<string, string>): Promise<T[]> {
    // Construir URL con parámetros
    let url = `${this.baseUrl}${endpoint}`
    if (params) {
      const urlParams = new URLSearchParams(params)
      url += `?${urlParams.toString()}`
    }

    logDebug(`🔍 Petición GET: ${url}`)

    const maxRetries = 5
    const baseDelay = 3000 // 3 segundos

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'UFSM-Dashboard/1.0'
          },
          // Agregar timeout para evitar colgarse
          signal: AbortSignal.timeout(15000) // 15 segundos para el primer intento
        })

        if (response.ok) {
          const data = await response.json()
          logInfo(`✅ Respuesta recibida (intento ${attempt}/${maxRetries}): ${Array.isArray(data) ? data.length : 'N/A'} elementos`)
          return Array.isArray(data) ? data : [data]
        }

        // Si es un error 503 (Service Unavailable) y no es el último intento, reintentar
        if (response.status === 503 && attempt < maxRetries) {
          const delay = baseDelay * attempt // Incrementar delay con cada intento
          logWarn(`⚠️ HTTP 503: Base de datos probablemente dormida. Reintentando en ${delay}ms... (intento ${attempt}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        // Para otros errores o último intento fallido
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)

      } catch (error) {
        // Si es el último intento, lanzar el error
        if (attempt === maxRetries) {
          logError(`❌ Error en petición GET después de ${maxRetries} intentos:`, error)
          throw error
        }

        // Si es un error de timeout o red y no es el último intento, reintentar
        if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('fetch'))) {
          const delay = baseDelay * attempt
          logWarn(`⚠️ Error de conexión. Reintentando en ${delay}ms... (intento ${attempt}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        // Para otros tipos de error, lanzar inmediatamente
        throw error
      }
    }

    // Este punto no debería alcanzarse nunca
    throw new Error('Error inesperado en el bucle de reintentos')
  }

  /**
   * Obtener datos de table_ccm
   */
  async getTableCCM(limit: number = 100) {
    return this.get('/table_ccm', { 
      limit: limit.toString(),
      order: 'anio.desc,mes.desc'
    })
  }

  /**
   * Obtener datos de table_prr
   */
  async getTablePRR(limit: number = 100) {
    return this.get('/table_prr', { 
      limit: limit.toString(),
      order: 'anio.desc,mes.desc'
    })
  }

  /**
   * Contar filas en table_ccm
   */
  async countTableCCM(): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/table_ccm`, {
        method: 'HEAD',
        headers: {
          'Prefer': 'count=exact',
          'User-Agent': 'UFSM-Dashboard/1.0'
        },
        signal: AbortSignal.timeout(10000)
      })
      
      const contentRange = response.headers.get('content-range')
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/)
        return match ? parseInt(match[1]) : 0
      }
      
      return 0
    } catch (error) {
      logError('Error contando table_ccm:', error)
      return 0
    }
  }

  /**
   * Contar filas en table_prr
   */
  async countTablePRR(): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/table_prr`, {
        method: 'HEAD',
        headers: {
          'Prefer': 'count=exact',
          'User-Agent': 'UFSM-Dashboard/1.0'
        },
        signal: AbortSignal.timeout(10000)
      })
      
      const contentRange = response.headers.get('content-range')
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/)
        return match ? parseInt(match[1]) : 0
      }
      
      return 0
    } catch (error) {
      logError('Error contando table_prr:', error)
      return 0
    }
  }

  /**
   * Obtener muestra de datos de table_ccm
   */
  async getSampleCCM(limit: number = 5) {
    return this.getTableCCM(limit)
  }

  /**
   * Obtener muestra de datos de table_prr
   */
  async getSamplePRR(limit: number = 5) {
    return this.getTablePRR(limit)
  }

  /**
   * Verificar conexión a la API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'UFSM-Dashboard/1.0'
        },
        signal: AbortSignal.timeout(5000) // 5 segundos timeout
      })
      
      return response.ok
    } catch (error) {
      logError('Conexión a Neon Data API falló:')
      if (error instanceof Error) {
        logError('Error details:', error.message)
      }
      return false
    }
  }

  /**
   * Inspeccionar ambas tablas
   */
  async inspectTables() {
    const [ccmCount, prrCount, ccmSample, prrSample] = await Promise.all([
      this.countTableCCM(),
      this.countTablePRR(), 
      this.getSampleCCM(3),
      this.getSamplePRR(3)
    ])

    return {
      table_ccm: {
        exists: true,
        rowCount: ccmCount,
        sampleData: ccmSample,
        description: 'Tabla CCM - Datos reales desde Neon Data API'
      },
      table_prr: {
        exists: true,
        rowCount: prrCount,
        sampleData: prrSample,
        description: 'Tabla PRR - Datos reales desde Neon Data API'
      }
    }
  }

  /**
   * Obtener datos filtrados de CCM para módulo "Pendientes"
   */
  async getCCMPendientes(limit: number = 100, offset: number = 0) {
    const params: Record<string, string> = {
      // Filtros específicos para CCM Pendientes
      'ultimaetapa': 'eq.EVALUACIÓN - I',
      'estadopre': 'is.null', // Para campos en blanco
      'estadotramite': 'eq.PENDIENTE',
      'limit': limit.toString(),
      'offset': offset.toString(),
      'order': 'fechaexpendiente.desc,numerotramite.asc'
    }

    return this.get('/table_ccm', params)
  }

  /**
   * Obtener datos filtrados de PRR para módulo "Pendientes"
   */
  async getPRRPendientes(limit: number = 100, offset: number = 0) {
    // Para múltiples valores en ultimaetapa usamos el operador 'in'
    const ultimaetapaValues = [
      'ACTUALIZAR DATOS BENEFICIARIO - F',
      'ACTUALIZAR DATOS BENEFICIARIO - I', 
      'ASOCIACION BENEFICIARIO - F',
      'ASOCIACION BENEFICIARIO - I',
      'CONFORMIDAD SUB-DIREC.INMGRA. - I',
      'PAGOS, FECHA Y NRO RD. - F',
      'PAGOS, FECHA Y NRO RD. - I',
      'RECEPCIÓN DINM - F'
    ]

    const params: Record<string, string> = {
      'ultimaetapa': `in.(${ultimaetapaValues.map(v => `"${v}"`).join(',')})`,
      'estadopre': 'is.null', // Para campos en blanco
      'estadotramite': 'eq.PENDIENTE',
      'limit': limit.toString(),
      'offset': offset.toString(),
      'order': 'fechaexpendiente.desc,numerotramite.asc'
    }

    return this.get('/table_prr', params)
  }

  private async fetchAllRows(endpoint: string, baseParams: Record<string, string>, batchSize?: number): Promise<any[]> {
    // Permitir override por variable de entorno
    const envBatch = parseInt(process.env.BATCH_SIZE || '', 10)
    const effectiveBatchSize = batchSize ?? (Number.isFinite(envBatch) && envBatch > 0 ? envBatch : 2000)
    // Descarga todos los registros de la tabla en lotes para evitar respuestas gigantes
    let offset = 0
    const resultados: any[] = []

    while (true) {
      const params: Record<string, string> = {
        ...baseParams,
        limit: effectiveBatchSize.toString(),
        offset: offset.toString()
      }

      const lote = await this.get(endpoint, params)
      resultados.push(...lote)

      // Si el lote es menor que el tamaño solicitado, ya no hay más datos
      if (lote.length < effectiveBatchSize) {
        break
      }

      offset += effectiveBatchSize
    }

    return resultados
  }

  /**
   * Obtener TODOS los datos de CCM pendientes para reporte (sin límite)
   */
  async getAllCCMPendientes() {
    const baseParams: Record<string, string> = {
      'ultimaetapa': 'eq.EVALUACIÓN - I',
      'estadopre': 'is.null',
      'estadotramite': 'eq.PENDIENTE',
      // Sólo las columnas que realmente usa el reporte de pendientes
      'select': 'operador,fechaexpendiente',
      'order': 'fechaexpendiente.desc'
    }

    logInfo('📦 Descargando CCM pendientes en lotes…')
    return this.fetchAllRows('/table_ccm', baseParams)
  }

  /**
   * Obtener TODOS los datos de PRR pendientes para reporte (sin límite)
   */
  async getAllPRRPendientes() {
    const ultimaetapaValues = [
      'ACTUALIZAR DATOS BENEFICIARIO - F',
      'ACTUALIZAR DATOS BENEFICIARIO - I', 
      'ASOCIACION BENEFICIARIO - F',
      'ASOCIACION BENEFICIARIO - I',
      'CONFORMIDAD SUB-DIREC.INMGRA. - I',
      'PAGOS, FECHA Y NRO RD. - F',
      'PAGOS, FECHA Y NRO RD. - I',
      'RECEPCIÓN DINM - F'
    ]

    const baseParams: Record<string, string> = {
      'ultimaetapa': `in.(${ultimaetapaValues.map(v => `"${v}"`).join(',')})`,
      'estadopre': 'is.null',
      'estadotramite': 'eq.PENDIENTE',
      // Columnas mínimas necesarias para el reporte
      'select': 'operador,fechaexpendiente',
      'order': 'fechaexpendiente.desc'
    }

    logInfo('📦 Descargando PRR pendientes en lotes…')
    return this.fetchAllRows('/table_prr', baseParams)
  }

  /**
   * Contar registros filtrados de CCM para módulo "Pendientes"
   */
  async countCCMPendientes(): Promise<number> {
    try {
      const params = new URLSearchParams({
        'ultimaetapa': 'eq.EVALUACIÓN - I',
        'estadopre': 'is.null',
        'estadotramite': 'eq.PENDIENTE'
      })

      const response = await fetch(`${this.baseUrl}/table_ccm?${params.toString()}`, {
        method: 'HEAD',
        headers: {
          'Prefer': 'count=exact',
          'User-Agent': 'UFSM-Dashboard/1.0'
        },
        signal: AbortSignal.timeout(10000)
      })
      
      const contentRange = response.headers.get('content-range')
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/)
        return match ? parseInt(match[1]) : 0
      }
      
      return 0
    } catch (error) {
      logError('Error contando CCM pendientes:')
      return 0
    }
  }

  /**
   * Contar registros filtrados de PRR para módulo "Pendientes"
   */
  async countPRRPendientes(): Promise<number> {
    try {
      const ultimaetapaValues = [
        'ACTUALIZAR DATOS BENEFICIARIO - F',
        'ACTUALIZAR DATOS BENEFICIARIO - I',
        'ASOCIACION BENEFICIARIO - F', 
        'ASOCIACION BENEFICIARIO - I',
        'CONFORMIDAD SUB-DIREC.INMGRA. - I',
        'PAGOS, FECHA Y NRO RD. - F',
        'PAGOS, FECHA Y NRO RD. - I',
        'RECEPCIÓN DINM - F'
      ]

      const params = new URLSearchParams({
        'ultimaetapa': `in.(${ultimaetapaValues.map(v => `"${v}"`).join(',')})`,
        'estadopre': 'is.null',
        'estadotramite': 'eq.PENDIENTE'
      })

      const response = await fetch(`${this.baseUrl}/table_prr?${params.toString()}`, {
        method: 'HEAD',
        headers: {
          'Prefer': 'count=exact',
          'User-Agent': 'UFSM-Dashboard/1.0'
        },
        signal: AbortSignal.timeout(10000)
      })
      
      const contentRange = response.headers.get('content-range')
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/)
        return match ? parseInt(match[1]) : 0
      }
      
      return 0
    } catch (error) {
      logError('Error contando PRR pendientes:')
      return 0
    }
  }

  /**
   * Obtener datos con filtros personalizados
   */
  async getFilteredData(
    table: 'table_ccm' | 'table_prr',
    filters: Record<string, any>,
    limit: number = 100,
    offset: number = 0,
    orderBy?: string
  ) {
    const params: Record<string, string> = {
      'limit': limit.toString(),
      'offset': offset.toString()
    }

    // Aplicar filtros
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Múltiples valores
          params[key] = `in.(${value.map(v => `"${v}"`).join(',')})`
        } else if (value === '') {
          // Campo en blanco
          params[key] = 'is.null'
        } else {
          // Valor único
          params[key] = `eq.${value}`
        }
      }
    })

    if (orderBy) {
      params['order'] = orderBy
    }

    return this.get(`/${table}`, params)
  }

  /**
   * Obtener evaluadores CCM
   */
  async getEvaluadoresCCM() {
    return this.get('/evaluadores_ccm')
  }

  /**
   * Obtener evaluadores PRR
   */
  async getEvaluadoresPRR() {
    return this.get('/evaluadores_prr')
  }

  /**
   * Obtener TODOS los datos de CCM de producción para reporte
   * Basado en fechapre y operadorpre
   * Obtiene más datos de los solicitados para detectar el rango real de fechas
   */
  async getAllCCMProduccion(daysBack: number = 20) {
    // Obtener un rango amplio de datos para detectar fechas reales
    // Usar hasta 90 días adicionales para asegurar que encontramos datos
    const maxDaysToFetch = Math.max(daysBack + 90, 180)
    
    // Calcular fecha de hace N días (amplio)
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - maxDaysToFetch)
    const fechaInicio = startDate.toISOString().split('T')[0] // formato YYYY-MM-DD

    logInfo(`📊 Obteniendo datos CCM producción: últimos ${maxDaysToFetch} días desde ${fechaInicio}`)

    const params: Record<string, string> = {
      'fechapre': `gte.${fechaInicio}`, // fechas >= hace N días
      'operadorpre': 'not.is.null', // operadorpre no nulo
      'select': 'operadorpre,fechapre,numerotramite,dependencia',
      'order': 'fechapre.desc'
    }

    return this.get('/table_ccm', params)
  }

  /**
   * Obtener TODOS los datos de PRR de producción para reporte
   * Basado en fechapre y operadorpre
   * Obtiene más datos de los solicitados para detectar el rango real de fechas
   */
  async getAllPRRProduccion(daysBack: number = 20) {
    // Obtener un rango amplio de datos para detectar fechas reales
    // Usar hasta 90 días adicionales para asegurar que encontramos datos
    const maxDaysToFetch = Math.max(daysBack + 90, 180)
    
    // Calcular fecha de hace N días (amplio)
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - maxDaysToFetch)
    const fechaInicio = startDate.toISOString().split('T')[0] // formato YYYY-MM-DD

    logInfo(`📊 Obteniendo datos PRR producción: últimos ${maxDaysToFetch} días desde ${fechaInicio}`)

    const params: Record<string, string> = {
      'fechapre': `gte.${fechaInicio}`, // fechas >= hace N días
      'operadorpre': 'not.is.null', // operadorpre no nulo
      'select': 'operadorpre,fechapre,numerotramite,dependencia',
      'order': 'fechapre.desc'
    }

    return this.get('/table_prr', params)
  }

  /**
   * Obtener datos de ingresos de CCM para gráfico
   * Basado en fechaexpendiente
   * Obtiene TODOS los datos para análisis completo de ingresos mensuales y semanales
   */
  async getCCMIngresos(daysBack: number = 30) {
    // Para el análisis mensual y semanal, obtenemos los últimos 2 años de datos.
    // Esto evita timeouts al no traer la tabla completa, pero asegura que tenemos
    // datos para el año actual y el anterior.
    const maxDaysToFetch = 730; // ~2 años
    
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - maxDaysToFetch)
    const fechaInicio = startDate.toISOString().split('T')[0] // formato YYYY-MM-DD

    logInfo(`📊 Obteniendo datos CCM ingresos: últimos ${maxDaysToFetch} días desde ${fechaInicio}`)

    const params: Record<string, string> = {
      'fechaexpendiente': `gte.${fechaInicio}`,
      'select': 'fechaexpendiente,numerotramite',
      'order': 'fechaexpendiente.desc'
    }

    const resultado = await this.get('/table_ccm', params)
    logInfo(`✅ CCM: Obtenidos ${resultado.length} registros para análisis de ingresos`)

    return resultado
  }

  /**
   * Obtener datos de ingresos de PRR para gráfico
   * Basado en fechaexpendiente
   * Obtiene TODOS los datos para análisis completo de ingresos mensuales y semanales
   */
  async getPRRIngresos(daysBack: number = 30) {
    // Para el análisis mensual y semanal, obtenemos los últimos 2 años de datos.
    // Esto evita timeouts al no traer la tabla completa, pero asegura que tenemos
    // datos para el año actual y el anterior.
    const maxDaysToFetch = 730; // ~2 años
    
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - maxDaysToFetch)
    const fechaInicio = startDate.toISOString().split('T')[0] // formato YYYY-MM-DD

    logInfo(`📊 Obteniendo datos PRR ingresos: últimos ${maxDaysToFetch} días desde ${fechaInicio}`)

    const params: Record<string, string> = {
      'fechaexpendiente': `gte.${fechaInicio}`,
      'select': 'fechaexpendiente,numerotramite',
      'order': 'fechaexpendiente.desc'
    }

    const resultado = await this.get('/table_prr', params)
    logInfo(`✅ PRR: Obtenidos ${resultado.length} registros para análisis de ingresos`)

    return resultado
  }

  /**
   * Obtener datos filtrados de CCM para módulo "Producción" con paginación
   */
  async getCCMProduccion(limit: number = 100, offset: number = 0) {
    // Calcular fecha de hace 20 días
    const today = new Date()
    const twentyDaysAgo = new Date(today)
    twentyDaysAgo.setDate(today.getDate() - 20)
    const fechaInicio = twentyDaysAgo.toISOString().split('T')[0]

    const params: Record<string, string> = {
      'fechapre': `gte.${fechaInicio}`,
      'operadorpre': 'not.is.null',
      'limit': limit.toString(),
      'offset': offset.toString(),
      'order': 'fechapre.desc,numerotramite.asc'
    }

    return this.get('/table_ccm', params)
  }

  /**
   * Obtener datos filtrados de PRR para módulo "Producción" con paginación
   */
  async getPRRProduccion(limit: number = 100, offset: number = 0) {
    // Calcular fecha de hace 20 días
    const today = new Date()
    const twentyDaysAgo = new Date(today)
    twentyDaysAgo.setDate(today.getDate() - 20)
    const fechaInicio = twentyDaysAgo.toISOString().split('T')[0]

    const params: Record<string, string> = {
      'fechapre': `gte.${fechaInicio}`,
      'operadorpre': 'not.is.null',
      'limit': limit.toString(),
      'offset': offset.toString(),
      'order': 'fechapre.desc,numerotramite.asc'
    }

    return this.get('/table_prr', params)
  }

  /**
   * Contar registros de CCM para módulo "Producción"
   */
  async countCCMProduccion(): Promise<number> {
    try {
      const today = new Date()
      const twentyDaysAgo = new Date(today)
      twentyDaysAgo.setDate(today.getDate() - 20)
      const fechaInicio = twentyDaysAgo.toISOString().split('T')[0]

      const params = new URLSearchParams({
        'fechapre': `gte.${fechaInicio}`,
        'operadorpre': 'not.is.null'
      })

      const response = await fetch(`${this.baseUrl}/table_ccm?${params.toString()}`, {
        method: 'HEAD',
        headers: {
          'Prefer': 'count=exact',
          'User-Agent': 'UFSM-Dashboard/1.0'
        },
        signal: AbortSignal.timeout(10000)
      })
      
      const contentRange = response.headers.get('content-range')
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/)
        return match ? parseInt(match[1]) : 0
      }
      
      return 0
    } catch (error) {
      logError('Error contando CCM producción:')
      return 0
    }
  }

  /**
   * Contar registros de PRR para módulo "Producción"
   */
  async countPRRProduccion(): Promise<number> {
    try {
      const today = new Date()
      const twentyDaysAgo = new Date(today)
      twentyDaysAgo.setDate(today.getDate() - 20)
      const fechaInicio = twentyDaysAgo.toISOString().split('T')[0]

      const params = new URLSearchParams({
        'fechapre': `gte.${fechaInicio}`,
        'operadorpre': 'not.is.null'
      })

      const response = await fetch(`${this.baseUrl}/table_prr?${params.toString()}`, {
        method: 'HEAD',
        headers: {
          'Prefer': 'count=exact',
          'User-Agent': 'UFSM-Dashboard/1.0'
        },
        signal: AbortSignal.timeout(10000)
      })
      
      const contentRange = response.headers.get('content-range')
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/)
        return match ? parseInt(match[1]) : 0
      }
      
      return 0
    } catch (error) {
      logError('Error contando PRR producción:')
      return 0
    }
  }
}

// Instancia singleton
export const neonDB = new NeonDataAPI() 
 
 