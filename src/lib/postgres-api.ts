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
            fecha_ingreso,
            COUNT(*) as total_ingresos,
            COUNT(CASE WHEN estado = 'PENDIENTE' THEN 1 END) as pendientes,
            COUNT(CASE WHEN estado = 'COMPLETADO' THEN 1 END) as completados
          FROM table_prr 
          WHERE fecha_ingreso >= CURRENT_DATE - INTERVAL '${strategy.days} days'
          GROUP BY fecha_ingreso 
          ORDER BY fecha_ingreso DESC
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
          fecha_ingreso,
          COUNT(*) as total_ingresos,
          COUNT(CASE WHEN estado = 'PENDIENTE' THEN 1 END) as pendientes,
          COUNT(CASE WHEN estado = 'COMPLETADO' THEN 1 END) as completados
        FROM table_ccm 
        WHERE fecha_ingreso >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY fecha_ingreso 
        ORDER BY fecha_ingreso DESC
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
          fecha_produccion,
          evaluador,
          COUNT(*) as casos_procesados,
          COUNT(CASE WHEN estado = 'COMPLETADO' THEN 1 END) as casos_completados,
          ROUND(AVG(tiempo_procesamiento), 2) as tiempo_promedio
        FROM ${tableName}
        WHERE fecha_produccion >= CURRENT_DATE - INTERVAL '${days} days'
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
      const query = `
        SELECT 
          numero_caso,
          fecha_ingreso,
          estado,
          evaluador,
          prioridad,
          tiempo_en_cola,
          motivo_pendiente
        FROM ${tableName}
        WHERE estado = 'PENDIENTE'
        ORDER BY 
          CASE 
            WHEN prioridad = 'ALTA' THEN 1
            WHEN prioridad = 'MEDIA' THEN 2
            ELSE 3
          END,
          fecha_ingreso ASC
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
          evaluador as nombre,
          COUNT(*) as casos_total,
          COUNT(CASE WHEN estado = 'COMPLETADO' THEN 1 END) as casos_completados,
          COUNT(CASE WHEN estado = 'PENDIENTE' THEN 1 END) as casos_pendientes,
          ROUND(AVG(tiempo_procesamiento), 2) as tiempo_promedio
        FROM (
          SELECT evaluador, estado, tiempo_procesamiento FROM table_prr
          UNION ALL
          SELECT evaluador, estado, tiempo_procesamiento FROM table_ccm
        ) combined
        WHERE evaluador IS NOT NULL 
        AND evaluador != ''
        GROUP BY evaluador
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
      
      const queries = await Promise.allSettled([
        // Total casos CCM
        postgres.queryWithTimeout('SELECT COUNT(*) as total FROM table_ccm', [], 10000),
        // Total casos PRR  
        postgres.queryWithTimeout('SELECT COUNT(*) as total FROM table_prr', [], 10000),
        // Pendientes CCM
        postgres.queryWithTimeout("SELECT COUNT(*) as total FROM table_ccm WHERE estado = 'PENDIENTE'", [], 10000),
        // Pendientes PRR
        postgres.queryWithTimeout("SELECT COUNT(*) as total FROM table_prr WHERE estado = 'PENDIENTE'", [], 10000),
        // Evaluadores activos (últimos 7 días)
        postgres.queryWithTimeout(`
          SELECT COUNT(DISTINCT evaluador) as total 
          FROM (
            SELECT evaluador FROM table_ccm WHERE fecha_produccion >= CURRENT_DATE - INTERVAL '7 days'
            UNION
            SELECT evaluador FROM table_prr WHERE fecha_produccion >= CURRENT_DATE - INTERVAL '7 days'
          ) combined
          WHERE evaluador IS NOT NULL AND evaluador != ''
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
}

// Singleton instance
export const postgresAPI = new PostgresAPI();
export default postgresAPI; 