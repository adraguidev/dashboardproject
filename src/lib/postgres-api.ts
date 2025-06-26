import postgres from './postgres';
import { logInfo, logError } from './logger';
import { parseDateSafe, formatDateSafe } from './date-utils';

/**
 * Servicio API PostgreSQL Enterprise
 * Reemplaza completamente la API beta de Neon con consultas optimizadas
 */
export class PostgresAPI {
  
  /**
   * FUNCIÓN DE DEBUGGING: Inspeccionar estructura de la base de datos
   */
  async inspectDatabase(): Promise<{
    tables: string[];
    tableDetails: Record<string, any[]>;
  }> {
    try {
      logInfo('🔍 Inspeccionando estructura de la base de datos...');
      
      // Obtener todas las tablas
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `;
      
      const tablesResult = await postgres.queryWithTimeout(tablesQuery, [], 10000);
      const tables = tablesResult.rows.map(row => row.table_name);
      
      logInfo(`📋 Tablas encontradas: ${tables.length}`, tables);
      
      // Obtener detalles de columnas para cada tabla
      const tableDetails: Record<string, any[]> = {};
      
      for (const tableName of tables) {
        try {
          const columnsQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1
            ORDER BY ordinal_position
          `;
          
          const columnsResult = await postgres.queryWithTimeout(columnsQuery, [tableName], 5000);
          tableDetails[tableName] = columnsResult.rows;
          
          logInfo(`📊 Tabla ${tableName}: ${columnsResult.rows.length} columnas`);
        } catch (error) {
          logError(`❌ Error obteniendo columnas de ${tableName}:`, error);
          tableDetails[tableName] = [];
        }
      }
      
      return { tables, tableDetails };
      
    } catch (error) {
      logError('❌ Error inspeccionando base de datos:', error);
      return { tables: [], tableDetails: {} };
    }
  }

  /**
   * FUNCIÓN DE DEBUGGING: Obtener muestra de datos de una tabla
   */
  async getSampleData(tableName: string, limit: number = 5): Promise<any[]> {
    try {
      logInfo(`🔬 Obteniendo muestra de datos de ${tableName} (${limit} registros)`);
      
      const query = `SELECT * FROM ${tableName} LIMIT $1`;
      const result = await postgres.queryWithTimeout(query, [limit], 10000);
      
      logInfo(`✅ Muestra obtenida: ${result.rows.length} registros de ${tableName}`);
      return result.rows;
      
    } catch (error) {
      logError(`❌ Error obteniendo muestra de ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Obtener datos de ingresos PRR con estrategias de fallback
   */
  async getPRRIngresos(days: number = 30): Promise<any[]> {
    const strategies = [
      { days: days, name: `${days} días solicitados` },
      { days: 30, name: '1 mes' },
      { days: 15, name: '15 días' },
      { days: 7, name: '1 semana' }
    ];

    for (const strategy of strategies) {
      try {
        logInfo(`📊 Obteniendo datos PRR ingresos: últimos ${strategy.days} días (${strategy.name})`);
        
        const query = `
          SELECT 
            fechaexpendiente AS fecha_ingreso,
            COUNT(*) as total_ingresos,
            COUNT(CASE WHEN estadotramite = 'APROBADO' THEN 1 END) as completados,
            COUNT(CASE WHEN estadotramite != 'APROBADO' THEN 1 END) as otros_estados
          FROM table_prr 
          WHERE fechaexpendiente >= CURRENT_DATE - INTERVAL '${strategy.days} days'
          GROUP BY fechaexpendiente 
          ORDER BY fechaexpendiente DESC
          LIMIT 1000
        `;

        const result = await postgres.queryWithTimeout(query, [], 15000);
        
        logInfo(`✅ Datos PRR obtenidos: ${result.rows.length} registros (${strategy.name})`);
        return result.rows;
        
      } catch (error) {
        logError(`⚠️ Falló estrategia PRR ${strategy.name}:`, error);
        if (strategy === strategies[strategies.length - 1]) {
          // Última estrategia, devolver datos vacíos
          logError('❌ PRR: Todas las estrategias fallaron. Devolviendo datos vacíos.');
          return [];
        }
      }
    }
    
    return [];
  }

  /**
   * Obtener datos de ingresos CCM
   */
  async getCCMIngresos(days: number = 30): Promise<any[]> {
    try {
      logInfo(`📊 Obteniendo datos CCM ingresos: últimos ${days} días`);
      
      const query = `
        SELECT 
          fechaexpendiente AS fecha_ingreso,
          COUNT(*) as total_ingresos,
          COUNT(CASE WHEN estadotramite = 'APROBADO' THEN 1 END) as completados,
          COUNT(CASE WHEN estadotramite != 'APROBADO' THEN 1 END) as otros_estados
        FROM table_ccm 
        WHERE fechaexpendiente >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY fechaexpendiente 
        ORDER BY fechaexpendiente DESC
        LIMIT 1000
      `;

      const result = await postgres.queryWithTimeout(query, [], 15000);
      logInfo(`✅ Datos CCM obtenidos: ${result.rows.length} registros`);
      return result.rows;
      
    } catch (error) {
      logError('❌ Error obteniendo datos CCM ingresos:', error);
      return [];
    }
  }

  /**
   * Obtener datos de producción
   */
  async getProduccionData(proceso: string, days: number = 30): Promise<any[]> {
    try {
      logInfo(`🏭 Obteniendo datos de producción: ${proceso} (${days} días)`);
      
      const tableName = proceso.toLowerCase() === 'prr' ? 'table_prr' : 'table_ccm';
      const query = `
        SELECT 
          fechapre AS fecha_produccion,
          operadorpre AS evaluador,
          COUNT(*) as casos_procesados
        FROM ${tableName}
        WHERE fechapre >= CURRENT_DATE - INTERVAL '${days} days'
        AND operadorpre IS NOT NULL AND operadorpre != ''
        GROUP BY fecha_produccion, evaluador 
        ORDER BY fecha_produccion DESC, evaluador
        LIMIT 1000
      `;

      const result = await postgres.queryWithTimeout(query, [], 15000);
      logInfo(`✅ Datos de producción obtenidos: ${result.rows.length} registros`);
      return result.rows;
      
    } catch (error) {
      logError(`❌ Error obteniendo datos de producción ${proceso}:`, error);
      return [];
    }
  }

  /**
   * Obtener pendientes
   */
  async getPendientes(proceso: string): Promise<any[]> {
    try {
      logInfo(`📋 Obteniendo pendientes: ${proceso}`);
      
      const tableName = proceso.toLowerCase() === 'prr' ? 'table_prr' : 'table_ccm';
      let whereClause: string;

      if (proceso.toLowerCase() === 'ccm') {
        whereClause = `
          ultimaetapa = 'EVALUACIÓN - I' 
          AND estadopre IS NULL 
          AND estadotramite = 'PENDIENTE'
        `;
      } else { // PRR
        const prrEtapas = [
          'ACTUALIZAR DATOS BENEFICIARIO - F', 'ACTUALIZAR DATOS BENEFICIARIO - I', 
          'ASOCIACION BENEFICIARIO - F', 'ASOCIACION BENEFICIARIO - I',
          'CONFORMIDAD SUB-DIREC.INMGRA. - I', 'PAGOS, FECHA Y NRO RD. - F',
          'PAGOS, FECHA Y NRO RD. - I', 'RECEPCIÓN DINM - F'
        ];
        whereClause = `
          ultimaetapa IN (${prrEtapas.map(e => `'${e}'`).join(', ')})
          AND estadopre IS NULL
          AND estadotramite = 'PENDIENTE'
        `;
      }

      const query = `
        SELECT 
          numerotramite,
          fechaexpendiente,
          estadotramite,
          ultimaetapa,
          operador
        FROM ${tableName}
        WHERE ${whereClause}
        ORDER BY fechaexpendiente ASC
        LIMIT 500
      `;

      const result = await postgres.queryWithTimeout(query, [], 15000);
      logInfo(`✅ Pendientes obtenidos: ${result.rows.length} registros`);
      return result.rows;
      
    } catch (error) {
      logError(`❌ Error obteniendo pendientes ${proceso}:`, error);
      return [];
    }
  }

  /**
   * Obtener evaluadores activos
   */
  async getEvaluadores(): Promise<any[]> {
    try {
      logInfo('👥 Obteniendo evaluadores activos');
      
      const query = `
        SELECT DISTINCT
          operador as nombre,
          COUNT(*) as casos_total,
          COUNT(CASE WHEN estadotramite = 'APROBADO' THEN 1 END) as casos_completados,
          COUNT(CASE WHEN estadotramite != 'APROBADO' THEN 1 END) as casos_pendientes
        FROM (
          SELECT operador, estadotramite FROM table_prr
          UNION ALL
          SELECT operador, estadotramite FROM table_ccm
        ) combined
        WHERE operador IS NOT NULL 
        AND operador != ''
        GROUP BY operador
        HAVING COUNT(*) > 0
        ORDER BY casos_completados DESC
        LIMIT 100
      `;

      const result = await postgres.queryWithTimeout(query, [], 15000);
      logInfo(`✅ Evaluadores obtenidos: ${result.rows.length} registros`);
      return result.rows;
      
    } catch (error) {
      logError('❌ Error obteniendo evaluadores:', error);
      return [];
    }
  }

  /**
   * ==========================================
   * GESTIÓN DE EQUIPOS - CRUD EVALUADORES
   * ==========================================
   */

  /**
   * Obtener evaluadores de gestión por proceso
   */
  async getEvaluadoresGestion(proceso: 'ccm' | 'prr'): Promise<any[]> {
    try {
      logInfo(`👥 Obteniendo evaluadores de gestión para proceso: ${proceso.toUpperCase()}`);
      
      // Validar proceso para seguridad
      if (!['ccm', 'prr'].includes(proceso)) {
        throw new Error('Proceso inválido');
      }
      
      const tableName = `evaluadores_${proceso}`;
      const query = `
        SELECT 
          id,
          nombre_en_base,
          nombres_apellidos,
          regimen,
          turno,
          modalidad,
          sub_equipo,
          creado_en
        FROM "${tableName}"
        ORDER BY nombre_en_base ASC
      `;

      logInfo(`🔍 Ejecutando consulta: ${query}`);
      const result = await postgres.queryWithTimeout(query, [], 15000);
      
      // Mapear datos para compatibilidad con frontend
      const evaluadores = result.rows.map((row: any) => ({
        id: row.id,
        operador: row.nombre_en_base ?? '-',
        nombre_en_base: row.nombre_en_base ?? '-',
        nombres_apellidos: row.nombres_apellidos ?? '-',
        nombre_real: row.nombres_apellidos ?? '-',
        regimen: row.regimen ?? '-',
        turno: row.turno ?? '-',
        modalidad: row.modalidad ?? '-',
        sub_equipo: row.sub_equipo ?? '-',
        activo: true, // Por defecto activo ya que no existe la columna
        fecha_ingreso: null, // Columna no existe
        fecha_salida: null, // Columna no existe
        lider: false, // Por defecto no lider ya que no existe la columna
        creado_en: row.creado_en ?? null
      }));

      logInfo(`✅ Evaluadores de gestión obtenidos: ${evaluadores.length} registros`);
      return evaluadores;
      
    } catch (error) {
      logError(`❌ Error obteniendo evaluadores de gestión para ${proceso}:`, error);
      return [];
    }
  }

  /**
   * Crear nuevo evaluador
   */
  async createEvaluador(proceso: 'ccm' | 'prr', data: {
    nombre_en_base: string;
    nombres_apellidos: string;
    regimen?: string;
    turno?: string;
    modalidad?: string;
    sub_equipo?: string;
  }): Promise<any> {
    try {
      logInfo(`➕ Creando evaluador para proceso: ${proceso.toUpperCase()}`);
      
      const { nombre_en_base, nombres_apellidos, regimen, turno, modalidad, sub_equipo } = data;
      
      if (!nombre_en_base || !nombres_apellidos) {
        throw new Error('Nombre en base y nombres y apellidos son requeridos');
      }

      const tableName = `evaluadores_${proceso}`;
      const query = `
        INSERT INTO "${tableName}"
        (nombre_en_base, nombres_apellidos, regimen, turno, modalidad, sub_equipo)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const params = [
        nombre_en_base,
        nombres_apellidos,
        regimen || null,
        turno || null,
        modalidad || null,
        sub_equipo || null
      ];

      const result = await postgres.queryWithTimeout(query, params, 15000);
      
      if (result.rows.length === 0) {
        throw new Error('No se pudo crear el evaluador');
      }

      logInfo(`✅ Evaluador creado exitosamente: ${nombre_en_base}`);
      return result.rows[0];
      
    } catch (error) {
      logError(`❌ Error creando evaluador para ${proceso}:`, error);
      throw error;
    }
  }

  /**
   * Actualizar evaluador existente
   */
  async updateEvaluador(proceso: 'ccm' | 'prr', id: number, data: {
    nombre_en_base?: string;
    nombres_apellidos?: string;
    regimen?: string;
    turno?: string;
    modalidad?: string;
    sub_equipo?: string;
  }): Promise<any> {
    try {
      logInfo(`🔄 Actualizando evaluador ID ${id} para proceso: ${proceso.toUpperCase()}`);
      
      const { nombre_en_base, nombres_apellidos, regimen, turno, modalidad, sub_equipo } = data;
      
      const tableName = `evaluadores_${proceso}`;
      const query = `
        UPDATE "${tableName}" 
        SET 
          nombre_en_base = COALESCE($1, nombre_en_base),
          nombres_apellidos = COALESCE($2, nombres_apellidos),
          regimen = COALESCE($3, regimen),
          turno = COALESCE($4, turno),
          modalidad = COALESCE($5, modalidad),
          sub_equipo = COALESCE($6, sub_equipo)
        WHERE id = $7 
        RETURNING *
      `;
      
      const params = [
        nombre_en_base || null,
        nombres_apellidos || null,
        regimen || null,
        turno || null,
        modalidad || null,
        sub_equipo || null,
        id
      ];

      const result = await postgres.queryWithTimeout(query, params, 15000);
      
      if (result.rows.length === 0) {
        throw new Error('Evaluador no encontrado');
      }

      logInfo(`✅ Evaluador actualizado exitosamente: ID ${id}`);
      return result.rows[0];
      
    } catch (error) {
      logError(`❌ Error actualizando evaluador ID ${id} para ${proceso}:`, error);
      throw error;
    }
  }

  /**
   * Eliminar evaluador
   */
  async deleteEvaluador(proceso: 'ccm' | 'prr', id: number): Promise<boolean> {
    try {
      logInfo(`🗑️ Eliminando evaluador ID ${id} para proceso: ${proceso.toUpperCase()}`);
      
      const tableName = `evaluadores_${proceso}`;
      const query = `
        DELETE FROM "${tableName}" 
        WHERE id = $1 
        RETURNING *
      `;

      const result = await postgres.queryWithTimeout(query, [id], 15000);
      
      if (result.rows.length === 0) {
        throw new Error('Evaluador no encontrado');
      }

      logInfo(`✅ Evaluador eliminado exitosamente: ID ${id}`);
      return true;
      
    } catch (error) {
      logError(`❌ Error eliminando evaluador ID ${id} para ${proceso}:`, error);
      throw error;
    }
  }

  /**
   * Obtener KPIs
   */
  async getKPIs(): Promise<{
    totalCasosCCM: number;
    totalCasosPRR: number;
    pendientesCCM: number;
    pendientesPRR: number;
    evaluadoresActivos: number;
  }> {
    try {
      logInfo('📊 Obteniendo KPIs del dashboard');
      
      const ccmPendientesWhere = `ultimaetapa = 'EVALUACIÓN - I' AND estadopre IS NULL AND estadotramite = 'PENDIENTE'`;
      
      const prrEtapas = [
        'ACTUALIZAR DATOS BENEFICIARIO - F', 'ACTUALIZAR DATOS BENEFICIARIO - I', 
        'ASOCIACION BENEFICIARIO - F', 'ASOCIACION BENEFICIARIO - I',
        'CONFORMIDAD SUB-DIREC.INMGRA. - I', 'PAGOS, FECHA Y NRO RD. - F',
        'PAGOS, FECHA Y NRO RD. - I', 'RECEPCIÓN DINM - F'
      ];
      const prrPendientesWhere = `ultimaetapa IN (${prrEtapas.map(e => `'${e}'`).join(', ')}) AND estadopre IS NULL AND estadotramite = 'PENDIENTE'`;

      const queries = await Promise.allSettled([
        // Total casos CCM
        postgres.queryWithTimeout('SELECT COUNT(*) as total FROM table_ccm', [], 10000),
        // Total casos PRR  
        postgres.queryWithTimeout('SELECT COUNT(*) as total FROM table_prr', [], 10000),
        // Pendientes CCM
        postgres.queryWithTimeout(`SELECT COUNT(*) as total FROM table_ccm WHERE ${ccmPendientesWhere}`, [], 10000),
        // Pendientes PRR
        postgres.queryWithTimeout(`SELECT COUNT(*) as total FROM table_prr WHERE ${prrPendientesWhere}`, [], 10000),
        // Evaluadores activos (últimos 7 días)
        postgres.queryWithTimeout(`
          SELECT COUNT(DISTINCT operadorpre) as total 
          FROM (
            SELECT operadorpre FROM table_ccm WHERE fechapre >= CURRENT_DATE - INTERVAL '7 days'
            UNION
            SELECT operadorpre FROM table_prr WHERE fechapre >= CURRENT_DATE - INTERVAL '7 days'
          ) combined
          WHERE operadorpre IS NOT NULL AND operadorpre != ''
        `, [], 10000)
      ]);

      const kpis = {
        totalCasosCCM: queries[0].status === 'fulfilled' ? parseInt(queries[0].value.rows[0]?.total || '0') : 0,
        totalCasosPRR: queries[1].status === 'fulfilled' ? parseInt(queries[1].value.rows[0]?.total || '0') : 0,
        pendientesCCM: queries[2].status === 'fulfilled' ? parseInt(queries[2].value.rows[0]?.total || '0') : 0,
        pendientesPRR: queries[3].status === 'fulfilled' ? parseInt(queries[3].value.rows[0]?.total || '0') : 0,
        evaluadoresActivos: queries[4].status === 'fulfilled' ? parseInt(queries[4].value.rows[0]?.total || '0') : 0,
      };

      logInfo('✅ KPIs obtenidos:', kpis);
      return kpis;
      
    } catch (error) {
      logError('❌ Error obteniendo KPIs:', error);
      return {
        totalCasosCCM: 0,
        totalCasosPRR: 0,
        pendientesCCM: 0,
        pendientesPRR: 0,
        evaluadoresActivos: 0,
      };
    }
  }

  /**
   * Obtener procesos disponibles
   */
  async getProcesos(): Promise<string[]> {
    try {
      logInfo('🔄 Obteniendo procesos disponibles');
      
      // Por ahora retornamos los procesos conocidos
      // En el futuro podríamos obtenerlos dinámicamente de la BD
      const procesos = ['CCM', 'PRR', 'MDF'];
      
      logInfo('✅ Procesos obtenidos:', procesos);
      return procesos;
      
    } catch (error) {
      logError('❌ Error obteniendo procesos:', error);
      return ['CCM', 'PRR', 'MDF'];
    }
  }

  /**
   * Health check de la base de datos
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    database: string;
    timestamp: string;
    responseTime: number;
    poolStats: any;
    tablesCounts?: any;
  }> {
    const startTime = Date.now();
    
    try {
      // Test básico de conexión
      const healthResult = await postgres.healthCheck();
      
      if (healthResult.status === 'unhealthy') {
        return {
          status: 'unhealthy',
          database: process.env.PGDATABASE || 'bdmigra',
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          poolStats: healthResult.poolStats
        };
      }

      // Contar registros en tablas principales (opcional, solo si la BD responde rápido)
      try {
        const tablesResult = await Promise.allSettled([
          postgres.queryWithTimeout('SELECT COUNT(*) as count FROM table_ccm LIMIT 1', [], 5000),
          postgres.queryWithTimeout('SELECT COUNT(*) as count FROM table_prr LIMIT 1', [], 5000)
        ]);

        const tablesCounts = {
          table_ccm: tablesResult[0].status === 'fulfilled' ? tablesResult[0].value.rows[0]?.count : 'timeout',
          table_prr: tablesResult[1].status === 'fulfilled' ? tablesResult[1].value.rows[0]?.count : 'timeout'
        };

        return {
          status: 'healthy',
          database: process.env.PGDATABASE || 'bdmigra',
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          poolStats: healthResult.poolStats,
          tablesCounts
        };
      } catch (error) {
        // Si falla el conteo de tablas, aún consideramos saludable si la conexión básica funciona
        return {
          status: 'healthy',
          database: process.env.PGDATABASE || 'bdmigra',
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          poolStats: healthResult.poolStats
        };
      }
      
    } catch (error) {
      logError('❌ Health check falló:', error);
      return {
        status: 'unhealthy',
        database: process.env.PGDATABASE || 'bdmigra',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        poolStats: { error: 'No disponible' }
      };
    }
  }

  async getIngresosData(proceso: string, days: number = 730): Promise<any[]> {
    try {
      logInfo(`💰 Obteniendo datos de ingresos: ${proceso} (${days} días)`);
      
      const tableName = proceso.toLowerCase() === 'prr' ? 'table_prr' : 'table_ccm';
      const query = `
        SELECT 
          fechaexpendiente AS fecha_ingreso,
          numerotramite
        FROM ${tableName}
        WHERE fechaexpendiente >= CURRENT_DATE - INTERVAL '${days} days'
        ORDER BY fechaexpendiente DESC
        LIMIT 20000
      `;

      const result = await postgres.queryWithTimeout(query, [], 20000); // 20 segundos de timeout
      
      logInfo(`✅ Datos de ingresos obtenidos: ${result.rows.length} registros`);
      return result.rows;
      
    } catch (error) {
      logError(`❌ Error obteniendo datos de ingresos ${proceso}:`, error);
      return [];
    }
  }
}

// Singleton instance
export const postgresAPI = new PostgresAPI();
export default postgresAPI; 