import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { logInfo, logError, logWarn } from './logger';

/**
 * Cliente PostgreSQL Enterprise
 * Reemplaza la API beta de Neon con conexión directa optimizada
 */
class PostgresClient {
  private pool: Pool;
  private isConnected = false;

  constructor() {
    // Configuración del pool optimizada para enterprise
    this.pool = new Pool({
      host: process.env.PGHOST || 'ep-dawn-grass-a81bjb9x-pooler.eastus2.azure.neon.tech',
      database: process.env.PGDATABASE || 'bdmigra',
      user: process.env.PGUSER || 'bdmigra_owner',
      password: process.env.PGPASSWORD || 'npg_q5xR6NogtlHh',
      port: parseInt(process.env.PGPORT || '5432'),
      ssl: true, // Neon siempre requiere SSL
      
      // Configuración de pool enterprise
      max: 20, // Máximo 20 conexiones concurrentes
      min: 2,  // Mínimo 2 conexiones siempre activas
      idleTimeoutMillis: 30000, // 30 segundos timeout
      connectionTimeoutMillis: 10000, // 10 segundos para conectar
      
      // Configuración de statement timeout
      statement_timeout: 30000, // 30 segundos máximo por consulta
      query_timeout: 30000,
    });

    // Event listeners para monitoreo
    this.pool.on('connect', (client) => {
      logInfo('Nueva conexión PostgreSQL establecida');
    });

    this.pool.on('error', (err) => {
      logError('Error en pool PostgreSQL:', err);
    });

    this.pool.on('acquire', () => {
      logInfo('Conexión adquirida del pool');
    });

    this.pool.on('remove', () => {
      logInfo('Conexión removida del pool');
    });
  }

  /**
   * Conectar y verificar la base de datos
   */
  async connect(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as server_time');
      client.release();
      
      this.isConnected = true;
      logInfo('✅ Conexión PostgreSQL establecida:', result.rows[0]);
      return true;
    } catch (error) {
      this.isConnected = false;
      logError('❌ Error conectando a PostgreSQL:', error);
      return false;
    }
  }

  /**
   * Ejecutar consulta con manejo de errores robusto
   */
  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    let client: PoolClient | null = null;
    const startTime = Date.now();
    
    try {
      // Obtener conexión del pool
      client = await this.pool.connect();
      
      // Ejecutar consulta
      const result = await client.query<T>(text, params);
      
      const duration = Date.now() - startTime;
      logInfo(`🔍 PostgreSQL query ejecutada en ${duration}ms:`, {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        rows: result.rows.length,
        duration
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logError(`❌ Error en consulta PostgreSQL (${duration}ms):`, {
        error: error instanceof Error ? error.message : 'Error desconocido',
        query: text.substring(0, 100),
        params: params?.slice(0, 5) // Solo primeros 5 parámetros para evitar logs gigantes
      });
      throw error;
    } finally {
      // Liberar conexión al pool
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Ejecutar consulta con timeout específico
   */
  async queryWithTimeout<T extends QueryResultRow = any>(
    text: string, 
    params?: any[], 
    timeoutMs: number = 15000
  ): Promise<QueryResult<T>> {
    return Promise.race([
      this.query<T>(text, params),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  /**
   * Obtener estadísticas del pool
   */
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      isConnected: this.isConnected
    };
  }

  /**
   * Cerrar pool de conexiones
   */
  async close(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnected = false;
      logInfo('Pool PostgreSQL cerrado correctamente');
    } catch (error) {
      logError('Error cerrando pool PostgreSQL:', error);
    }
  }

  /**
   * Verificar salud de la conexión
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    poolStats: any;
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      await this.query('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        poolStats: this.getPoolStats(),
        responseTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        poolStats: this.getPoolStats(),
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}

// Singleton instance
export const postgres = new PostgresClient();

// Conectar automáticamente cuando se importa el módulo
postgres.connect().catch(error => {
  logError('Error en conexión inicial PostgreSQL:', error);
});

// Función helper para transacciones
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await postgres['pool'].connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default postgres; 