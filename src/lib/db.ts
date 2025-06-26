import { neon } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import { pgTable, text, integer, timestamp, serial, date } from "drizzle-orm/pg-core";
import { eq, and, isNull, isNotNull, desc, asc, count, gte, lte, inArray, like, or } from "drizzle-orm";

// Schema para table_ccm
export const tableCCM = pgTable('table_ccm', {
  id: serial('id').primaryKey(),
  numerotramite: text('numerotramite'),
  fechaexpendiente: text('fechaexpendiente'),
  operador: text('operador'),
  ultimaetapa: text('ultimaetapa'),
  estadopre: text('estadopre'),
  estadotramite: text('estadotramite'),
  anio: integer('anio'),
  mes: integer('mes'),
  operadorpre: text('operadorpre'),
  fechapre: text('fechapre'),
  // Agregar más campos según sea necesario
});

// Schema para table_prr
export const tablePRR = pgTable('table_prr', {
  id: serial('id').primaryKey(),
  numerotramite: text('numerotramite'),
  fechaexpendiente: text('fechaexpendiente'),
  operador: text('operador'),
  ultimaetapa: text('ultimaetapa'),
  estadopre: text('estadopre'),
  estadotramite: text('estadotramite'),
  anio: integer('anio'),
  mes: integer('mes'),
  operadorpre: text('operadorpre'),
  fechapre: text('fechapre'),
  // Agregar más campos según sea necesario
});

// Schema para evaluadores
export const evaluadoresCCM = pgTable('evaluadores_ccm', {
  id: serial('id').primaryKey(),
  nombre_en_base: text('nombre_en_base').notNull(),
  sub_equipo: text('sub_equipo').notNull(),
});

export const evaluadoresPRR = pgTable('evaluadores_prr', {
  id: serial('id').primaryKey(),
  nombre_en_base: text('nombre_en_base').notNull(),
  sub_equipo: text('sub_equipo').notNull(),
});

export const schema = {
  tableCCM,
  tablePRR,
  evaluadoresCCM,
  evaluadoresPRR,
};

// Función para obtener conexión directa a PostgreSQL
export async function getDrizzleDB() {
  // Usar la URL directa de conexión
  const connectionString = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error("No se encontró DATABASE_DIRECT_URL ni DATABASE_URL en variables de entorno");
  }

  const db = drizzle(neon(connectionString), { schema });
  
  return {
    db,
    connectionString: connectionString.replace(/:[^:@]*@/, ':***@') // Ocultar password en logs
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
          isNull(tableCCM.estadopre),
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
          isNull(tableCCM.estadopre),
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
          isNull(tableCCM.estadopre),
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
          isNull(tablePRR.estadopre),
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
          isNull(tablePRR.estadopre),
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
          isNull(tablePRR.estadopre),
          eq(tablePRR.estadotramite, 'PENDIENTE')
        )
      )
      .orderBy(desc(tablePRR.fechaexpendiente));
  }

  // ============= MÉTODOS PARA EVALUADORES =============
  
  async getEvaluadoresCCM() {
    return await this.db.select().from(evaluadoresCCM);
  }

  async getEvaluadoresPRR() {
    return await this.db.select().from(evaluadoresPRR);
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

  // ============= MÉTODOS ADICIONALES =============
  
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

  // Método genérico para filtros personalizados
  async getFilteredData(
    table: 'table_ccm' | 'table_prr',
    filters: Record<string, any>,
    limit: number = 100,
    offset: number = 0,
    orderBy?: string
  ) {
    const targetTable = table === 'table_ccm' ? tableCCM : tablePRR;
    
    let query = this.db.select().from(targetTable);
    
    // Aplicar filtros dinámicamente
    const conditions = [];
    for (const [field, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        // @ts-ignore - Drizzle column access
        conditions.push(eq(targetTable[field], value));
      }
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Aplicar ordenamiento y paginación
    query = query.limit(limit).offset(offset);
    
    return await query;
  }
}

// Función helper para crear una instancia de la API
export async function createDirectDatabaseAPI(): Promise<DirectDatabaseAPI> {
  const { db } = await getDrizzleDB();
  return new DirectDatabaseAPI(db);
} 