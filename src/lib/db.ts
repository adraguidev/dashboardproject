import { neon } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import { eq, and, isNull, isNotNull, desc, asc, count, gte, lte, inArray, like, or, sql, ne, lt } from "drizzle-orm";
import { subYears, format, subDays } from 'date-fns';
import { logInfo } from './logger';
import * as mainSchema from './schema/main';
import * as historicosSchema from './schema/historicos';
import { es } from 'date-fns/locale';

const schema = {
  ...mainSchema,
  ...historicosSchema,
};

// Reexportamos los esquemas individuales para que sigan estando disponibles donde se necesiten
export const { tableCCM, tablePRR, evaluadoresCCM, evaluadoresPRR, fileProcessingJobs } = mainSchema;
export const { historicoPendientesOperador, historicoSinAsignar, historicoSpePendientes } = historicosSchema;

// Función para obtener conexión a la base de datos (POOLED o DIRECTA)
export async function getDrizzleDB(options: { type: 'pooled' | 'direct' } = { type: 'pooled' }) {
  
  let connectionString: string | undefined;
  let connectionType: string;

  if (options.type === 'direct') {
    console.log('🔗 Usando conexión DIRECTA a la base de datos...');
    connectionString = process.env.DATABASE_DIRECT_URL;
    connectionType = 'Directa';
  } else {
    console.log('🌊 Usando conexión POOLED a la base de datos...');
    connectionString = process.env.DATABASE_URL;
    connectionType = 'En Pool';
  }

  if (!connectionString) {
    throw new Error(`No se encontró la URL de la base de datos para el tipo de conexión: ${options.type}`);
  }

  const db = drizzle(neon(connectionString), { schema });

  console.log(`✅ Conexión a DB (${connectionType}) establecida.`);

  return {
    db,
    connectionString: connectionString.replace(/:[^:@]*@/, ':***@')
  };
}

// Clase que reemplaza completamente a NeonDataAPI
export class DirectDatabaseAPI {
  private db: NeonHttpDatabase<typeof schema>;

  constructor(db: NeonHttpDatabase<typeof schema>) {
    this.db = db;
  }

  // ============= MÉTODOS PARA PENDIENTES =============
  
  async getCCMPendientes(limit: number = 100, offset: number = 0) {
    return await this.db
      .select()
      .from(tableCCM)
      .where(
        and(
          eq(tableCCM.ultimaetapa, 'EVALUACIÓN - I'),
          or(isNull(tableCCM.estadopre), eq(tableCCM.estadopre, '')),
          eq(tableCCM.estadotramite, 'PENDIENTE')
        )
      )
      .orderBy(desc(tableCCM.fechaexpendiente), asc(tableCCM.numerotramite))
      .limit(limit)
      .offset(offset);
  }

  async countCCMPendientes(): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(tableCCM)
      .where(
        and(
          eq(tableCCM.ultimaetapa, 'EVALUACIÓN - I'),
          or(isNull(tableCCM.estadopre), eq(tableCCM.estadopre, '')),
          eq(tableCCM.estadotramite, 'PENDIENTE')
        )
      );
    return result[0]?.count || 0;
  }

  async getAllCCMPendientes() {
    return await this.db
      .select()
      .from(tableCCM)
      .where(
        and(
          eq(tableCCM.ultimaetapa, 'EVALUACIÓN - I'),
          or(isNull(tableCCM.estadopre), eq(tableCCM.estadopre, '')),
          eq(tableCCM.estadotramite, 'PENDIENTE')
        )
      )
      .orderBy(desc(tableCCM.fechaexpendiente));
  }

  async getPRRPendientes(limit: number = 100, offset: number = 0) {
    const etapas = [
      'ACTUALIZAR DATOS BENEFICIARIO - F',
      'ACTUALIZAR DATOS BENEFICIARIO - I',
      'ASOCIACION BENEFICIARIO - F',
      'ASOCIACION BENEFICIARIO - I',
      'CONFORMIDAD SUB-DIREC.INMGRA. - I',
      'PAGOS, FECHA Y NRO RD. - F',
      'PAGOS, FECHA Y NRO RD. - I',
      'RECEPCIÓN DINM - F'
    ];

    return await this.db
      .select()
      .from(tablePRR)
      .where(
        and(
          inArray(tablePRR.ultimaetapa, etapas),
          or(isNull(tablePRR.estadopre), eq(tablePRR.estadopre, '')),
          eq(tablePRR.estadotramite, 'PENDIENTE')
        )
      )
      .orderBy(desc(tablePRR.fechaexpendiente), asc(tablePRR.numerotramite))
      .limit(limit)
      .offset(offset);
  }

  async countPRRPendientes(): Promise<number> {
    const etapas = [
      'ACTUALIZAR DATOS BENEFICIARIO - F',
      'ACTUALIZAR DATOS BENEFICIARIO - I',
      'ASOCIACION BENEFICIARIO - F',
      'ASOCIACION BENEFICIARIO - I',
      'CONFORMIDAD SUB-DIREC.INMGRA. - I',
      'PAGOS, FECHA Y NRO RD. - F',
      'PAGOS, FECHA Y NRO RD. - I',
      'RECEPCIÓN DINM - F'
    ];

    const result = await this.db
      .select({ count: count() })
      .from(tablePRR)
      .where(
        and(
          inArray(tablePRR.ultimaetapa, etapas),
          or(isNull(tablePRR.estadopre), eq(tablePRR.estadopre, '')),
          eq(tablePRR.estadotramite, 'PENDIENTE')
        )
      );
    return result[0]?.count || 0;
  }

  async getAllPRRPendientes() {
    const etapas = [
      'ACTUALIZAR DATOS BENEFICIARIO - F',
      'ACTUALIZAR DATOS BENEFICIARIO - I',
      'ASOCIACION BENEFICIARIO - F',
      'ASOCIACION BENEFICIARIO - I',
      'CONFORMIDAD SUB-DIREC.INMGRA. - I',
      'PAGOS, FECHA Y NRO RD. - F',
      'PAGOS, FECHA Y NRO RD. - I',
      'RECEPCIÓN DINM - F'
    ];

    return await this.db
      .select()
      .from(tablePRR)
      .where(
        and(
          inArray(tablePRR.ultimaetapa, etapas),
          or(isNull(tablePRR.estadopre), eq(tablePRR.estadopre, '')),
          eq(tablePRR.estadotramite, 'PENDIENTE')
        )
      )
      .orderBy(desc(tablePRR.fechaexpendiente));
  }

  // ============= MÉTODOS AGREGADOS PARA REPORTES =============

  async getAggregatedPendientesReport(
    proceso: 'ccm' | 'prr',
    groupBy: 'year' | 'quarter' | 'month'
  ) {
    const table = proceso === 'ccm' ? tableCCM : tablePRR;

    // Reutilizamos la misma lógica de filtros que en los métodos originales
    const whereConditions =
      proceso === 'ccm'
        ? and(
            eq(tableCCM.ultimaetapa, 'EVALUACIÓN - I'),
            or(isNull(tableCCM.estadopre), eq(tableCCM.estadopre, '')),
            eq(tableCCM.estadotramite, 'PENDIENTE')
          )
        : and(
            inArray(tablePRR.ultimaetapa, [
              'ACTUALIZAR DATOS BENEFICIARIO - F',
              'ACTUALIZAR DATOS BENEFICIARIO - I',
              'ASOCIACION BENEFICIARIO - F',
              'ASOCIACION BENEFICIARIO - I',
              'CONFORMIDAD SUB-DIREC.INMGRA. - I',
              'PAGOS, FECHA Y NRO RD. - F',
              'PAGOS, FECHA Y NRO RD. - I',
              'RECEPCIÓN DINM - F'
            ]),
            or(isNull(tablePRR.estadopre), eq(tablePRR.estadopre, '')),
            eq(tablePRR.estadotramite, 'PENDIENTE')
          );
          
    // Usamos sql.raw con comillas simples para pasar 'year', 'quarter', etc. como string literal.
    // Además, casteamos la columna a TIMESTAMP para que DATE_TRUNC acepte el tipo correcto.
    const periodExpression = sql`DATE_TRUNC(${sql.raw(`'${groupBy}'`)}, ${table.fechaexpendiente}::timestamp)::date`;

    return await this.db
      .select({
        operador: sql<string>`COALESCE(NULLIF(${table.operador}, ''), 'Sin Operador')`.as('operador'),
        period: sql<Date>`${periodExpression}`.as('period'),
        count: count(table.numerotramite),
      })
      .from(table)
      .where(and(whereConditions, isNotNull(table.fechaexpendiente)))
      .groupBy(sql`operador`, sql`period`);
  }

  // ============= MÉTODOS PARA EVALUADORES =============
  
  async getEvaluadoresCCM() {
    return await this.db.select().from(evaluadoresCCM);
  }

  async getEvaluadoresPRR() {
    return await this.db.select().from(evaluadoresPRR);
  }

  // ============= MÉTODOS PARA EVALUADORES (CRUD) =============

  async getEvaluadoresGestion(processo: 'ccm' | 'prr') {
    const table = processo === 'ccm' ? evaluadoresCCM : evaluadoresPRR;
    return this.db.select().from(table).orderBy(asc(table.nombre_en_base));
  }

  async createEvaluador(processo: 'ccm' | 'prr', data: any) {
    const table = processo === 'ccm' ? evaluadoresCCM : evaluadoresPRR;
    const result = await this.db.insert(table).values(data).returning();
    return result[0];
  }

  async updateEvaluador(processo: 'ccm' | 'prr', id: number, data: any) {
    const table = processo === 'ccm' ? evaluadoresCCM : evaluadoresPRR;
    const result = await this.db.update(table).set(data).where(eq(table.id, id)).returning();
    if (result.length === 0) throw new Error('Evaluador no encontrado');
    return result[0];
  }

  async deleteEvaluador(processo: 'ccm' | 'prr', id: number): Promise<boolean> {
    const table = processo === 'ccm' ? evaluadoresCCM : evaluadoresPRR;
    const result = await this.db.delete(table).where(eq(table.id, id)).returning();
    return result.length > 0;
  }

  // ============= MÉTODOS PARA INGRESOS =============
  
  async getCCMIngresos(daysBack: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysBack);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    return await this.db
      .select({
        fechaexpendiente: tableCCM.fechaexpendiente,
        numerotramite: tableCCM.numerotramite
      })
      .from(tableCCM)
      .where(
        and(
          gte(tableCCM.fechaexpendiente, startDateStr),
          lte(tableCCM.fechaexpendiente, endDateStr)
        )
      )
      .orderBy(desc(tableCCM.fechaexpendiente));
  }

  async getPRRIngresos(daysBack: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysBack);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    return await this.db
      .select({
        fechaexpendiente: tablePRR.fechaexpendiente,
        numerotramite: tablePRR.numerotramite
      })
      .from(tablePRR)
      .where(
        and(
          gte(tablePRR.fechaexpendiente, startDateStr),
          lte(tablePRR.fechaexpendiente, endDateStr)
        )
      )
      .orderBy(desc(tablePRR.fechaexpendiente));
  }

  // MÉTODOS PARA OBTENER TODOS LOS INGRESOS (SIN LÍMITE DE DÍAS)
  
  async getAllCCMIngresos() {
    return await this.db
      .select({
        fechaexpendiente: tableCCM.fechaexpendiente,
        numerotramite: tableCCM.numerotramite
      })
      .from(tableCCM)
      .where(isNotNull(tableCCM.fechaexpendiente))
      .orderBy(desc(tableCCM.fechaexpendiente));
  }

  async getAllPRRIngresos() {
    return await this.db
      .select({
        fechaexpendiente: tablePRR.fechaexpendiente,
        numerotramite: tablePRR.numerotramite
      })
      .from(tablePRR)
      .where(isNotNull(tablePRR.fechaexpendiente))
      .orderBy(desc(tablePRR.fechaexpendiente));
  }

  // ============= MÉTODOS PARA PRODUCCIÓN =============
  
  async getAllCCMProduccion(daysBack: number = 20) {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysBack);
    const fechaInicio = startDate.toISOString().split('T')[0];

    return await this.db
      .select()
      .from(tableCCM)
      .where(
        and(
          gte(tableCCM.fechapre, fechaInicio),
          isNotNull(tableCCM.operadorpre)
        )
      )
      .orderBy(desc(tableCCM.fechapre));
  }

  async getAllPRRProduccion(daysBack: number = 20) {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysBack);
    const fechaInicio = startDate.toISOString().split('T')[0];

    return await this.db
      .select()
      .from(tablePRR)
      .where(
        and(
          gte(tablePRR.fechapre, fechaInicio),
          isNotNull(tablePRR.operadorpre)
        )
      )
      .orderBy(desc(tablePRR.fechapre));
  }

  async getCCMProduccion(limit: number = 100, offset: number = 0) {
    const today = new Date();
    const twentyDaysAgo = new Date(today);
    twentyDaysAgo.setDate(today.getDate() - 20);
    const fechaInicio = twentyDaysAgo.toISOString().split('T')[0];

    return await this.db
      .select()
      .from(tableCCM)
      .where(
        and(
          gte(tableCCM.fechapre, fechaInicio),
          isNotNull(tableCCM.operadorpre)
        )
      )
      .orderBy(desc(tableCCM.fechapre), asc(tableCCM.numerotramite))
      .limit(limit)
      .offset(offset);
  }

  async getPRRProduccion(limit: number = 100, offset: number = 0) {
    const today = new Date();
    const twentyDaysAgo = new Date(today);
    twentyDaysAgo.setDate(today.getDate() - 20);
    const fechaInicio = twentyDaysAgo.toISOString().split('T')[0];

    return await this.db
      .select()
      .from(tablePRR)
      .where(
        and(
          gte(tablePRR.fechapre, fechaInicio),
          isNotNull(tablePRR.operadorpre)
        )
      )
      .orderBy(desc(tablePRR.fechapre), asc(tablePRR.numerotramite))
      .limit(limit)
      .offset(offset);
  }

  async countCCMProduccion(): Promise<number> {
    const today = new Date();
    const twentyDaysAgo = new Date(today);
    twentyDaysAgo.setDate(today.getDate() - 20);
    const fechaInicio = twentyDaysAgo.toISOString().split('T')[0];

    const result = await this.db
      .select({ count: count() })
      .from(tableCCM)
      .where(
        and(
          gte(tableCCM.fechapre, fechaInicio),
          isNotNull(tableCCM.operadorpre)
        )
      );
    return result[0]?.count || 0;
  }

  async countPRRProduccion(): Promise<number> {
    const today = new Date();
    const twentyDaysAgo = new Date(today);
    twentyDaysAgo.setDate(today.getDate() - 20);
    const fechaInicio = twentyDaysAgo.toISOString().split('T')[0];

    const result = await this.db
      .select({ count: count() })
      .from(tablePRR)
      .where(
        and(
          gte(tablePRR.fechapre, fechaInicio),
          isNotNull(tablePRR.operadorpre)
        )
      );
    return result[0]?.count || 0;
  }

  // ============= MÉTODOS AGREGADOS PARA PRODUCCIÓN =============

  async getAggregatedProduccionReport(
    proceso: 'ccm' | 'prr',
    daysBack: number = 20
  ) {
    const table = proceso === 'ccm' ? tableCCM : tablePRR;

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysBack);
    const startDateStr = startDate.toISOString().split('T')[0];

    const whereConditions = and(
      gte(table.fechapre, startDateStr),
      isNotNull(table.operadorpre)
    );

    const dateExpression = sql`DATE_TRUNC('day', ${table.fechapre}::timestamp)::date`;

    const operadorExpression = sql<string>`COALESCE(NULLIF(${table.operadorpre}, ''), 'Sin Operador')`;

    return await this.db
      .select({
        operador: operadorExpression.as('operador'),
        fecha: dateExpression.as('fecha'),
        count: count(table.numerotramite)
      })
      .from(table)
      .where(and(whereConditions, isNotNull(table.fechapre)))
      .groupBy(operadorExpression, dateExpression);
  }

  // ============= MÉTODOS AGREGADOS PARA RESUELTOS =============

  async getAggregatedResueltosAnalysis(
    proceso: 'ccm' | 'prr',
    yearsBack: number = 2
  ) {
    const table = proceso === 'ccm' ? tableCCM : tablePRR;

    const startDate = subYears(new Date(), yearsBack).toISOString().split('T')[0];

    const categoryExpr = sql<string>`COALESCE(NULLIF(${table.estadopre}, ''), 'INDEFINIDO')`;
    const operatorExpr = sql<string>`COALESCE(NULLIF(${table.operadorpre}, ''), 'SIN OPERADOR')`;
    const periodExpr = sql`DATE_TRUNC('month', ${table.fechapre}::timestamp)::date`;

    return await this.db
      .select({
        categoria: categoryExpr.as('categoria'),
        operador: operatorExpr.as('operador'),
        periodo: periodExpr.as('periodo'),
        count: count(table.numerotramite)
      })
      .from(table)
      .where(and(
        isNotNull(table.estadopre),
        ne(table.estadopre, ''),
        gte(table.fechapre, startDate)
      ))
      .groupBy(categoryExpr, operatorExpr, periodExpr);
  }

  // ============= MÉTODOS ADICIONALES =============
  
  async getKPIs() {
    const [
      totalCasosCCM,
      totalCasosPRR,
      pendientesCCM,
      pendientesPRR,
      evaluadoresActivos,
    ] = await Promise.all([
      this.db.select({ count: count() }).from(tableCCM),
      this.db.select({ count: count() }).from(tablePRR),
      this.countCCMPendientes(),
      this.countPRRPendientes(),
      this.db.select({ count: count() }).from(evaluadoresCCM), // Asumiendo que todos están activos
    ]);

    return {
      totalCasosCCM: totalCasosCCM[0]?.count || 0,
      totalCasosPRR: totalCasosPRR[0]?.count || 0,
      pendientesCCM: pendientesCCM,
      pendientesPRR: pendientesPRR,
      evaluadoresActivos: evaluadoresActivos[0]?.count || 0,
    };
  }

  async getProcesos() {
    // Esta función puede necesitar una tabla 'processes' o devolver data estática
    // Por ahora, devolveremos data estática como en el original
    return [
      {
        id: 'ccm',
        nombre: 'CCM',
        descripcion: 'Control de Cambios Migratorios',
        total_casos: (await this.db.select({ count: count() }).from(tableCCM))[0]?.count || 0,
        casos_pendientes: await this.countCCMPendientes(),
        ultimo_lote: new Date().toISOString(), // Simulado
      },
      {
        id: 'prr',
        nombre: 'PRR',
        descripcion: 'Prórroga de Residencia',
        total_casos: (await this.db.select({ count: count() }).from(tablePRR))[0]?.count || 0,
        casos_pendientes: await this.countPRRPendientes(),
        ultimo_lote: new Date().toISOString(), // Simulado
      },
    ];
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.db.select({ count: count() }).from(tableCCM).limit(1);
      return true;
    } catch (error) {
      console.error('Error testing database connection:', error);
      return false;
    }
  }

  async inspectTables() {
    const [ccmCount, prrCount, ccmSample, prrSample] = await Promise.all([
      this.db.select({ count: count() }).from(tableCCM),
      this.db.select({ count: count() }).from(tablePRR),
      this.db.select().from(tableCCM).limit(3),
      this.db.select().from(tablePRR).limit(3)
    ]);

    return {
      table_ccm: {
        exists: true,
        rowCount: ccmCount[0]?.count || 0,
        sampleData: ccmSample,
        description: 'Tabla CCM - Conexión directa con Drizzle ORM'
      },
      table_prr: {
        exists: true,
        rowCount: prrCount[0]?.count || 0,
        sampleData: prrSample,
        description: 'Tabla PRR - Conexión directa con Drizzle ORM'
      }
    };
  }

  /**
   * Obtener evaluadores activos (simplificado)
   */
  async getEvaluadores() {
    try {
      console.log('👥 Obteniendo evaluadores activos');
      
      const listaCCM: any[] = await this.db.select().from(evaluadoresCCM);
      const listaPRR: any[] = await this.db.select().from(evaluadoresPRR);

      const allEvaluadores = [
        ...listaCCM.map((e: any) => ({
          nombre: e.nombre_en_base,
          casos_total: 0,
          casos_completados: 0,
          casos_pendientes: 0,
          proceso: 'CCM'
        })),
        ...listaPRR.map((e: any) => ({
          nombre: e.nombre_en_base,
          casos_total: 0,
          casos_completados: 0,
          casos_pendientes: 0,
          proceso: 'PRR'
        }))
      ];

      console.log(`✅ Evaluadores obtenidos: ${allEvaluadores.length} registros`);
      return allEvaluadores;
      
    } catch (error) {
      console.error('❌ Error obteniendo evaluadores:', error);
      return [];
    }
  }

  /**
   * Health check robusto de la base de datos
   */
  async healthCheck() {
    const startTime = Date.now();
    
    try {
      const testConnection = await this.testConnection();
      
      if (!testConnection) {
        return {
          status: 'unhealthy',
          database: 'PostgreSQL (Neon)',
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          poolStats: { error: 'Conexión fallida' }
        };
      }

      const [ccmCount, prrCount] = await Promise.allSettled([
        this.db.select({ count: count() }).from(tableCCM).limit(1),
        this.db.select({ count: count() }).from(tablePRR).limit(1)
      ]);

      const tablesCounts = {
        table_ccm: ccmCount.status === 'fulfilled' ? ccmCount.value[0]?.count : 'timeout',
        table_prr: prrCount.status === 'fulfilled' ? prrCount.value[0]?.count : 'timeout'
      };

      return {
        status: 'healthy',
        database: 'PostgreSQL (Neon)',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        poolStats: { status: 'Conexión directa sin pool' },
        tablesCounts
      };
      
    } catch (error) {
      console.error('❌ Health check falló:', error);
      return {
        status: 'unhealthy',
        database: 'PostgreSQL (Neon)',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        poolStats: { error: 'No disponible' }
      };
    }
  }

  // Método genérico para filtros personalizados
  async getFilteredData(
    table: 'table_ccm' | 'table_prr',
    filters: Record<string, any>,
    limit: number = 100,
    offset: number = 0,
    orderBy?: string
  ) {
    const targetTable = table === 'table_ccm' ? tableCCM : tablePRR;

    // Construir condiciones dinámicamente
    const conditions = [];
    for (const [field, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        // @ts-expect-error Drizzle no infiere bien el tipo de retorno aquí
        if (targetTable[field]) {
          // Si el valor del filtro es una cadena vacía, buscamos tanto '' como NULL.
          if (value === '') {
            conditions.push(
              or(
                // @ts-expect-error El tipo se pierde, pero es la forma de hacerlo dinámico
                isNull(targetTable[field]), 
                // @ts-expect-error El tipo se pierde, pero es la forma de hacerlo dinámico
                eq(targetTable[field], '')
              )
            );
          } else {
            // Para cualquier otro valor, usamos la comparación de igualdad estándar.
            // @ts-expect-error Drizzle no infiere bien el tipo de retorno aquí
            conditions.push(eq(targetTable[field], value));
          }
        }
      }
    }

    // Construir la consulta de una vez
    let query = this.db.select().from(targetTable);

    if (conditions.length > 0) {
      // @ts-expect-error El tipo se pierde, pero es la forma de hacerlo dinámico
      query = query.where(and(...conditions));
    }

    if (orderBy) {
      const [field, direction] = orderBy.split(':');
      // @ts-expect-error El tipo se pierde, pero es la forma de hacerlo dinámico
      if (targetTable[field]) {
        const orderByClause = direction === 'desc' 
          // @ts-expect-error El tipo se pierde, pero es la forma de hacerlo dinámico
          ? desc(targetTable[field]) 
          // @ts-expect-error El tipo se pierde, pero es la forma de hacerlo dinámico
          : asc(targetTable[field]);
        // @ts-expect-error El tipo se pierde, pero es la forma de hacerlo dinámico
        query = query.orderBy(orderByClause);
      }
    }

    return query.limit(limit).offset(offset);
  }

  // =========== MÉTODOS DE ANÁLISIS AGREGADOS ===========

  async getDailyIngresos(proceso: 'ccm' | 'prr', daysBack: number) {
    const table = proceso === 'ccm' ? tableCCM : tablePRR;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysBack);
    
    return this.db
      .select({
        fecha: table.fechaexpendiente,
        total: count(table.numerotramite)
      })
      .from(table)
      .where(and(
        gte(table.fechaexpendiente, startDate.toISOString().split('T')[0]),
        lte(table.fechaexpendiente, endDate.toISOString().split('T')[0])
      ))
      .groupBy(table.fechaexpendiente)
      .orderBy(desc(table.fechaexpendiente));
  }

  async getDailyProduccion(proceso: 'ccm' | 'prr', daysBack: number) {
    const table = proceso === 'ccm' ? tableCCM : tablePRR;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysBack);

    return this.db
      .select({
        fecha: table.fechapre,
        operador: table.operadorpre,
        total: count(table.numerotramite)
      })
      .from(table)
      .where(and(
        isNotNull(table.fechapre),
        gte(table.fechapre, startDate.toISOString().split('T')[0]),
        lte(table.fechapre, endDate.toISOString().split('T')[0])
      ))
      .groupBy(table.fechapre, table.operadorpre)
      .orderBy(desc(table.fechapre));
  }

  // =========== MÉTODOS PARA HISTÓRICOS ===========

  async upsertHistoricoPendientesOperador(data: (typeof historicoPendientesOperador.$inferInsert)[]) {
    if (data.length === 0) return;
    return this.db.insert(historicoPendientesOperador)
      .values(data)
      .onConflictDoUpdate({
        target: [
          historicoPendientesOperador.fecha,
          historicoPendientesOperador.proceso,
          historicoPendientesOperador.operador,
          historicoPendientesOperador.anioExpediente,
        ],
        set: {
          pendientes: sql`excluded.pendientes`,
        },
      });
  }

  async upsertHistoricoSinAsignar(data: (typeof historicoSinAsignar.$inferInsert)[]) {
    if (data.length === 0) return;
    return this.db.insert(historicoSinAsignar)
      .values(data)
      .onConflictDoUpdate({
        target: [
          historicoSinAsignar.fecha,
          historicoSinAsignar.proceso,
          historicoSinAsignar.anioExpediente,
        ],
        set: {
          sinAsignar: sql`excluded.sin_asignar`,
        },
      });
  }

  // =========== MÉTODOS DE BORRADO PARA HISTÓRICOS ===========

  async deleteHistoricoDelDiaOperador(fecha: string, proceso: 'CCM' | 'PRR') {
    return this.db.delete(historicoPendientesOperador).where(
      and(
        eq(historicoPendientesOperador.fecha, fecha),
        eq(historicoPendientesOperador.proceso, proceso)
      )
    );
  }

  async deleteHistoricoDelDiaSinAsignar(fecha: string, proceso: 'CCM' | 'PRR') {
    const table = proceso === 'CCM' ? historicoSinAsignar : historicoSinAsignar; // Ajusta si tienes tablas separadas
    return this.db.delete(table).where(eq(table.fecha, fecha));
  }

  /**
   * REFACTORIZADO: Nuevo método de análisis de resueltos.
   * Compara el año actual vs. el año anterior.
   */
  async getResueltosAnalysis(proceso: 'ccm' | 'prr') {
    const table = proceso === 'ccm' ? tableCCM : tablePRR;

    const now = new Date();
    const currentYear = now.getFullYear();
    const previousYear = currentYear - 1;
    
    // Obtener datos de los últimos 2 años
    const twoYearsAgo = subYears(now, 2);
    const twoYearsAgoStr = twoYearsAgo.toISOString().split('T')[0];

    const rawData = await this.db
      .select({
        estadopre: table.estadopre,
        operadorpre: table.operadorpre,
        fechapre: table.fechapre,
      })
      .from(table)
      .where(and(
        isNotNull(table.estadopre),
        ne(table.estadopre, ''),
        gte(table.fechapre, twoYearsAgoStr)
      ));

    // -- INICIALIZACIÓN DE ESTRUCTURAS --
    const getYearlyDataTemplate = () => ({
      total: 0,
      byCategory: new Map<string, number>(),
      byMonth: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: 0 })),
      operators: new Map<string, { total: number; byCategory: Map<string, number> }>()
    });

    const yearlyData = {
      [currentYear]: getYearlyDataTemplate(),
      [previousYear]: getYearlyDataTemplate(),
    };
    
    const allCategories = new Set<string>();
    
    // -- PROCESAMIENTO DE DATOS --
    for (const row of rawData) {
      if (!row.fechapre) continue;
      
      const date = new Date(row.fechapre);
      const year = date.getUTCFullYear();
      
      if (year === currentYear || year === previousYear) {
        const month = date.getUTCMonth(); // 0-11
        const category = row.estadopre || 'INDEFINIDO';
        const operator = row.operadorpre || 'SIN OPERADOR';

        const yearStats = yearlyData[year];
        
        // Totales
        yearStats.total++;
        yearStats.byMonth[month].total++;
        
        // Categorías
        allCategories.add(category);
        yearStats.byCategory.set(category, (yearStats.byCategory.get(category) || 0) + 1);
        
        // Operadores
        if (!yearStats.operators.has(operator)) {
          yearStats.operators.set(operator, { total: 0, byCategory: new Map() });
        }
        const opStats = yearStats.operators.get(operator)!;
        opStats.total++;
        opStats.byCategory.set(category, (opStats.byCategory.get(category) || 0) + 1);
      }
    }
    
    const monthNames = Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), 'MMM', { locale: es }));
    
    // -- ESTRUCTURACIÓN DE LA RESPUESTA FINAL --
    
    const formatSummary = (year: number) => {
      const data = yearlyData[year];
      const categories = Array.from(data.byCategory.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);

      return {
        year,
        total: data.total,
        avgMonthly: data.total > 0 ? data.total / 12 : 0,
        categories,
      };
    };
    
    const summary = {
      currentYear: formatSummary(currentYear),
      previousYear: formatSummary(previousYear),
    };
    
    const monthlyTrends = {
      comparison: monthNames.map((name, i) => ({
        month: name,
        currentYear: yearlyData[currentYear].byMonth[i].total,
        previousYear: yearlyData[previousYear].byMonth[i].total,
      })),
    };
    
    const categoryTrendsData = yearlyData[currentYear];
    const categoryTrends = {
      categories: Array.from(allCategories),
      byMonth: monthNames.map((monthName, monthIndex) => {
        const monthData: { [key: string]: string | number } = { month: monthName };
        for (const category of allCategories) {
          monthData[category] = 0;
        }
        for (const row of rawData) {
            if (!row.fechapre) continue;
            const date = new Date(row.fechapre);
            if (date.getUTCFullYear() === currentYear && date.getUTCMonth() === monthIndex) {
               const category = row.estadopre || 'INDEFINIDO';
               monthData[category] = (monthData[category] as number) + 1;
            }
        }
        return monthData;
      }),
    };
    
    const operatorsDetails = {
      categories: Array.from(allCategories),
      operators: Array.from(yearlyData[currentYear].operators.entries())
        .map(([operator, data]) => {
          const byCategory: { [key: string]: number } = {};
          for (const category of allCategories) {
            byCategory[category] = data.byCategory.get(category) || 0;
          }
          return {
            operator,
            total: data.total,
            ...byCategory,
          };
        })
        .filter(op => op.operator !== 'SIN OPERADOR')
        .sort((a, b) => b.total - a.total),
    };
    
    return {
      summary,
      monthlyTrends,
      categoryTrends,
      operatorsDetails,
    };
  }

  // ============= MÉTODOS PARA SPE =============

  /**
   * Función auxiliar para obtener datos de pendientes SPE desde Google Sheets.
   * Este método hace una llamada a la API de SPE para obtener los datos actuales.
   */
  async getAllSpePendientes(): Promise<any[]> {
    try {
      // Hacer una llamada interna a la API de SPE
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/spe/data`);
      if (!response.ok) {
        throw new Error(`Error al obtener datos SPE: ${response.status}`);
      }
      const data = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error('No se pudieron obtener datos de SPE');
      }

      // Convertir los datos agrupados por evaluador a registros individuales para el snapshot
      const registrosPendientes: any[] = [];
      
      data.data.forEach((evaluadorData: any) => {
        const evaluador = evaluadorData.evaluador || 'Sin Asignar';
        const totalPendientes = evaluadorData.totalGeneral || 0;
        
        if (totalPendientes > 0) {
          registrosPendientes.push({
            evaluador,
            pendientes: totalPendientes
          });
        }
      });

      return registrosPendientes;
    } catch (error) {
      console.error('❌ Error obteniendo datos SPE para snapshot:', error);
      throw error;
    }
  }

  /**
   * Insertar/actualizar registros de histórico SPE pendientes
   */
  async upsertHistoricoSpePendientes(data: (typeof historicoSpePendientes.$inferInsert)[]) {
    if (data.length === 0) return;
    
    return this.db.insert(historicoSpePendientes)
      .values(data)
      .onConflictDoUpdate({
        target: [
          historicoSpePendientes.fecha,
          historicoSpePendientes.operador,
        ],
        set: {
          pendientes: sql`excluded.pendientes`,
        },
      });
  }

  /**
   * Eliminar registros históricos de SPE para una fecha específica
   */
  async deleteHistoricoDelDiaSpe(fecha: string) {
    return this.db.delete(historicoSpePendientes).where(
      eq(historicoSpePendientes.fecha, fecha)
    );
  }
}

// Función helper para crear una instancia de la API
export async function createDirectDatabaseAPI(options: { type: 'pooled' | 'direct' } = { type: 'pooled' }): Promise<DirectDatabaseAPI> {
  const { db } = await getDrizzleDB(options);
  return new DirectDatabaseAPI(db);
} 