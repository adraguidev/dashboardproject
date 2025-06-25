/**
 * Cliente HTTP para Neon Data API (PostgREST)
 * Conecta directamente a la API REST de la base de datos
 */

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
   * Realizar petición GET a la API
   */
  private async get<T = any>(endpoint: string, params?: Record<string, string>): Promise<T[]> {
    try {
      const url = new URL(endpoint, this.baseUrl)
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value)
        })
      }

      console.log(`🔍 GET ${url.toString()}`)
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'UFSM-Dashboard/1.0'
        },
        // Agregar timeout para evitar colgarse
        signal: AbortSignal.timeout(10000) // 10 segundos
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`✅ Respuesta recibida: ${Array.isArray(data) ? data.length : 'N/A'} elementos`)
      
      return Array.isArray(data) ? data : [data]

    } catch (error) {
      console.error('❌ Error en petición GET:', error)
      throw error
    }
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
      console.error('Error contando table_ccm:', error)
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
      console.error('Error contando table_prr:', error)
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
      console.error('Conexión a Neon Data API falló:', error)
      if (error instanceof Error) {
        console.error('Error details:', error.message)
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

  /**
   * Obtener TODOS los datos de CCM pendientes para reporte (sin límite)
   */
  async getAllCCMPendientes() {
    const params: Record<string, string> = {
      'ultimaetapa': 'eq.EVALUACIÓN - I',
      'estadopre': 'is.null',
      'estadotramite': 'eq.PENDIENTE',
      'select': 'operador,fechaexpendiente,numerotramite,dependencia',
      'order': 'fechaexpendiente.desc'
    }

    return this.get('/table_ccm', params)
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

    const params: Record<string, string> = {
      'ultimaetapa': `in.(${ultimaetapaValues.map(v => `"${v}"`).join(',')})`,
      'estadopre': 'is.null',
      'estadotramite': 'eq.PENDIENTE',
      'select': 'operador,fechaexpendiente,numerotramite,dependencia',
      'order': 'fechaexpendiente.desc'
    }

    return this.get('/table_prr', params)
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
      console.error('Error contando CCM pendientes:', error)
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
      console.error('Error contando PRR pendientes:', error)
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
}

// Instancia singleton
export const neonDB = new NeonDataAPI() 
 
 