# 🚀 **GUÍA DE OPTIMIZACIONES - PARTE 2: BUNDLE, CACHÉ Y BASE DE DATOS**

## 🎯 **3. OPTIMIZACIÓN DE BUNDLE Y CODE SPLITTING**

### **A. Code Splitting Inteligente**

#### **¿Qué es Code Splitting?**
Code Splitting es una técnica que divide el código JavaScript en varios chunks (fragmentos) que se cargan solo cuando son necesarios, reduciendo el tamaño del bundle inicial.

#### **¿Por qué es crítico para tu aplicación?**
- **Problema actual**: Bundle único grande que incluye todos los módulos
- **Impacto detectado**: Tiempo de carga inicial lento (especialmente en conexiones lentas)
- **Mejora esperada**: 60-80% reducción en el bundle inicial

#### **¿Cómo beneficia específicamente tu dashboard?**
- **Módulos pesados**: Cada módulo (pendientes, producción, ingresos) tiene componentes complejos
- **Librerías específicas**: `recharts` solo se usa en el módulo de ingresos
- **Componentes opcionales**: Gestión de equipos solo se accede ocasionalmente

#### **Implementación por módulos:**

```typescript
// ❌ PROBLEMA ACTUAL: Todo en el bundle inicial
import { ProcessModules } from '@/components/dashboard/process-modules'
import { PendientesReportTable } from '@/components/ui/pendientes-report-table'
import { ProduccionReportTable } from '@/components/ui/produccion-report-table'
import { IngresosChart } from '@/components/ui/ingresos-chart'

// ✅ SOLUCIÓN: Lazy loading por módulos
import { lazy, Suspense } from 'react'

// Dividir por módulos funcionales
const PendientesModule = lazy(() => import('@/modules/PendientesModule'))
const ProduccionModule = lazy(() => import('@/modules/ProduccionModule'))  
const IngresosModule = lazy(() => import('@/modules/IngresosModule'))
const GestionEquiposModule = lazy(() => import('@/modules/GestionEquiposModule'))

// Componente de loading específico para módulos
const ModuleLoadingSkeleton = ({ moduleType }: { moduleType: string }) => (
  <div className="space-y-4 animate-pulse">
    <div className="flex items-center gap-4">
      <div className="h-6 bg-gray-200 rounded w-32"></div>
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </div>
    
    {moduleType === 'table' && (
      <div className="space-y-2">
        <div className="h-10 bg-gray-200 rounded"></div>
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded"></div>
        ))}
      </div>
    )}
    
    {moduleType === 'chart' && (
      <div className="h-64 bg-gray-200 rounded"></div>
    )}
  </div>
)

// Nuevo componente ProcessModules optimizado
export function ProcessModules({ selectedModule, selectedProcess, ...props }) {
  const renderModule = () => {
    switch (selectedModule) {
      case 'pendientes':
        return (
          <Suspense fallback={<ModuleLoadingSkeleton moduleType="table" />}>
            <PendientesModule 
              process={selectedProcess} 
              {...props}
            />
          </Suspense>
        )
        
      case 'produccion':
        return (
          <Suspense fallback={<ModuleLoadingSkeleton moduleType="table" />}>
            <ProduccionModule 
              process={selectedProcess} 
              {...props}
            />
          </Suspense>
        )
        
      case 'ingresos':
        return (
          <Suspense fallback={<ModuleLoadingSkeleton moduleType="chart" />}>
            <IngresosModule 
              process={selectedProcess} 
              {...props}
            />
          </Suspense>
        )
        
      default:
        return <ComingSoonModule moduleId={selectedModule} />
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs navigation - siempre visible */}
      <ModuleTabs 
        modules={modules}
        selectedModule={selectedModule}
        onModuleChange={onModuleChange}
      />
      
      {/* Content area - lazy loaded */}
      <div className="flex-1 bg-white">
        {renderModule()}
      </div>
    </div>
  )
}
```

#### **Estructura de módulos recomendada:**

```typescript
// 📁 src/modules/PendientesModule/index.tsx
export default function PendientesModule({ process }) {
  // Todo el código específico de pendientes
  return (
    <div>
      <AdvancedPendientesReportTable />
      <PendientesFilters />
      <PendientesStats />
    </div>
  )
}

// 📁 src/modules/IngresosModule/index.tsx  
export default function IngresosModule({ process }) {
  // Solo carga recharts cuando se necesita
  return (
    <div>
      <IngresosChart />
      <IngresosControls />
      <IngresosTable />
    </div>
  )
}

// 📁 src/modules/ProduccionModule/index.tsx
export default function ProduccionModule({ process }) {
  return (
    <div>
      <ProduccionReportTable />
      <ProduccionFilters />
      <ProduccionMetrics />
    </div>
  )
}
```

#### **Prefetching inteligente de módulos:**

```typescript
// Hook para prefetch inteligente
export function useModulePrefetching(currentModule: string) {
  useEffect(() => {
    // Prefetch módulos relacionados después de 2 segundos
    const prefetchTimer = setTimeout(() => {
      const prefetchModules = {
        'pendientes': ['produccion'], // Si está viendo pendientes, prefetch producción
        'produccion': ['pendientes', 'ingresos'],
        'ingresos': ['produccion']
      }

      const modulesToPrefetch = prefetchModules[currentModule] || []
      
      modulesToPrefetch.forEach(moduleId => {
        switch (moduleId) {
          case 'pendientes':
            import('@/modules/PendientesModule')
            break
          case 'produccion':
            import('@/modules/ProduccionModule')
            break
          case 'ingresos':
            import('@/modules/IngresosModule')
            break
        }
      })
    }, 2000)

    return () => clearTimeout(prefetchTimer)
  }, [currentModule])
}
```

---

### **B. Tree Shaking Optimizado**

#### **¿Qué es Tree Shaking?**
Tree Shaking es una técnica de optimización que elimina código "muerto" (no utilizado) del bundle final, reduciendo significativamente el tamaño.

#### **¿Dónde se puede optimizar en tu aplicación?**
- **date-fns**: Solo usas algunas funciones pero se importa toda la librería
- **lodash**: Funciones específicas vs toda la librería
- **recharts**: Solo algunos tipos de gráficos

#### **Optimizaciones específicas:**

```typescript
// ❌ PROBLEMA: Imports que cargan librerías completas
import * as dateFns from 'date-fns'
import _ from 'lodash'
import { ResponsiveContainer, LineChart, BarChart, PieChart } from 'recharts'

// ✅ SOLUCIÓN: Imports específicos optimizados
import { format } from 'date-fns/format'
import { subDays } from 'date-fns/subDays'
import { startOfMonth } from 'date-fns/startOfMonth'
import { endOfMonth } from 'date-fns/endOfMonth'

// Para lodash, usar imports específicos o reemplazar con vanilla JS
import debounce from 'lodash/debounce'
import groupBy from 'lodash/groupBy'

// O mejor aún, implementar funciones específicas
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Para recharts, cargar solo lo necesario por módulo
// En IngresosModule
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis } from 'recharts'

// En ProduccionModule  
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'
```

#### **Configuración de Webpack para Tree Shaking mejorado:**

```typescript
// next.config.ts - Optimización para Tree Shaking
const nextConfig: NextConfig = {
  // Configuración existente...
  
  experimental: {
    // Habilitar tree shaking más agresivo
    optimizePackageImports: [
      'date-fns',
      'lodash', 
      'recharts',
      'lucide-react'
    ]
  },

  webpack: (config, { isServer, nextRuntime }) => {
    // Tree shaking mejorado
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: false,
      innerGraph: true,
    }

    // Resolver aliases para imports más específicos  
    config.resolve.alias = {
      ...config.resolve.alias,
      '@date-fns': 'date-fns',
      '@lodash': 'lodash-es', // Versión ES modules para mejor tree shaking
    }

    return config
  },
}
```

---

## 🎯 **4. ARQUITECTURA DE CACHÉ ESTRATIFICADA**

### **A. Sistema de Caché Multinivel**

#### **¿Por qué múltiples niveles de caché?**
- **L1 (Memory)**: Datos más frecuentes, acceso instantáneo
- **L2 (LocalStorage)**: Datos de sesión, persiste entre recargas
- **L3 (IndexedDB)**: Datos históricos grandes, mayor capacidad

#### **Problemas identificados en el sistema actual:**
- Solo caché en memoria (se pierde al refrescar)
- TTL uniforme para todos los tipos de datos
- No hay invalidación inteligente por prioridad

#### **Implementación del sistema estratificado:**

```typescript
// 🏗️ Arquitectura de caché multinivel
interface CacheLevel {
  name: string
  storage: CacheStorage
  capacity: number // MB
  defaultTTL: number // segundos
  priority: 'high' | 'medium' | 'low'
}

class StratifiedCacheManager {
  private levels: Map<string, CacheLevel> = new Map()

  constructor() {
    // L1: Memoria - Datos críticos y frecuentes
    this.levels.set('L1', {
      name: 'Memory',
      storage: new MemoryCacheStorage(),
      capacity: 50, // 50MB
      defaultTTL: 5 * 60, // 5 minutos  
      priority: 'high'
    })

    // L2: LocalStorage - Datos de sesión
    this.levels.set('L2', {
      name: 'LocalStorage', 
      storage: new LocalStorageCacheStorage(),
      capacity: 100, // 100MB
      defaultTTL: 60 * 60, // 1 hora
      priority: 'medium'
    })

    // L3: IndexedDB - Datos históricos
    this.levels.set('L3', {
      name: 'IndexedDB',
      storage: new IndexedDBCacheStorage(),
      capacity: 500, // 500MB
      defaultTTL: 24 * 60 * 60, // 24 horas
      priority: 'low'
    })
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    // Buscar en orden de prioridad: L1 -> L2 -> L3
    for (const [levelName, level] of this.levels) {
      const data = await level.storage.get<T>(key)
      
      if (data !== null) {
        // Si se encuentra en un nivel inferior, promover a nivel superior
        if (levelName !== 'L1' && this.shouldPromote(key, data)) {
          await this.promote(key, data, levelName)
        }
        
        logInfo(`[Cache HIT] ${levelName}: ${key}`)
        return data
      }
    }

    logInfo(`[Cache MISS] All levels: ${key}`)
    return null
  }

  async set<T>(key: string, value: T, options: CacheSetOptions): Promise<void> {
    const { 
      level = this.determineOptimalLevel(key, value, options),
      ttl = this.levels.get(level)?.defaultTTL,
      priority = 'medium'
    } = options

    const targetLevel = this.levels.get(level)
    if (!targetLevel) throw new Error(`Invalid cache level: ${level}`)

    await targetLevel.storage.set(key, value, ttl)
    
    // Guardar metadata para invalidación inteligente
    await this.setMetadata(key, {
      level,
      priority,
      timestamp: Date.now(),
      accessCount: 0,
      size: this.estimateSize(value)
    })

    logInfo(`[Cache SET] ${level}: ${key} (TTL: ${ttl}s)`)
  }

  private determineOptimalLevel(key: string, value: any, options: CacheSetOptions): string {
    const size = this.estimateSize(value)
    const { priority = 'medium', accessFrequency = 'medium' } = options

    // Reglas de ubicación inteligente
    if (priority === 'high' || accessFrequency === 'high') {
      return 'L1' // Memoria para datos críticos
    }
    
    if (size > 10 * 1024 * 1024) { // > 10MB
      return 'L3' // IndexedDB para datos grandes
    }
    
    if (key.includes('historical') || key.includes('report')) {
      return 'L3' // Datos históricos en IndexedDB
    }

    return 'L2' // LocalStorage por defecto
  }

  private async promote<T>(key: string, data: T, fromLevel: string): Promise<void> {
    // Promover datos frecuentemente accedidos a niveles superiores
    const metadata = await this.getMetadata(key)
    if (metadata && metadata.accessCount > 5) {
      const targetLevel = fromLevel === 'L3' ? 'L2' : 'L1'
      await this.set(key, data, { level: targetLevel })
      logInfo(`[Cache PROMOTE] ${key}: ${fromLevel} -> ${targetLevel}`)
    }
  }
}

// Instancia global del gestor de caché
export const cacheManager = new StratifiedCacheManager()
```

#### **Uso específico en tu aplicación:**

```typescript
// 🎯 PATRONES DE USO ESPECÍFICOS

// Datos en tiempo real (L1 - Memory)
export async function cacheKPIs(proceso: string, data: any) {
  await cacheManager.set(`kpis:${proceso}`, data, {
    level: 'L1',
    ttl: 30, // 30 segundos para datos en tiempo real
    priority: 'high',
    accessFrequency: 'high'
  })
}

// Datos de sesión (L2 - LocalStorage)
export async function cachePendientesReport(proceso: string, groupBy: string, data: any) {
  await cacheManager.set(`pendientes:${proceso}:${groupBy}`, data, {
    level: 'L2', 
    ttl: 30 * 60, // 30 minutos para reportes
    priority: 'medium'
  })
}

// Datos históricos (L3 - IndexedDB)
export async function cacheHistoricalData(proceso: string, year: number, data: any) {
  await cacheManager.set(`historical:${proceso}:${year}`, data, {
    level: 'L3',
    ttl: 7 * 24 * 60 * 60, // 7 días para datos históricos
    priority: 'low'
  })
}

// Hook para usar caché estratificado en componentes
export function useCachedData<T>(
  key: string, 
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        
        // Intentar desde caché primero
        const cachedData = await cacheManager.get<T>(key)
        
        if (cachedData) {
          setData(cachedData)
          setLoading(false)
          return
        }

        // Si no está en caché, fetch y guardar
        const freshData = await fetcher()
        await cacheManager.set(key, freshData, options)
        setData(freshData)
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [key])

  return { data, loading, error }
}
```

---

### **B. Invalidación Inteligente de Caché**

#### **¿Por qué necesitas invalidación inteligente?**
- **Problema actual**: Invalidación completa del caché (muy agresiva)
- **Oportunidad**: Invalidar solo datos relacionados/dependientes
- **Mejora esperada**: 50% menos requests innecesarios

#### **Sistema de dependencias de caché:**

```typescript
// 🧠 Sistema de dependencias inteligente
class CacheDependencyManager {
  private dependencies: Map<string, Set<string>> = new Map()
  private reverseDependencies: Map<string, Set<string>> = new Map()

  // Definir relaciones entre datos
  setupDependencies() {
    // Cuando cambian evaluadores, afecta a pendientes y producción
    this.addDependency('evaluadores:ccm', ['pendientes:ccm', 'produccion:ccm'])
    this.addDependency('evaluadores:prr', ['pendientes:prr', 'produccion:prr'])
    
    // Cuando cambian pendientes, afecta a KPIs
    this.addDependency('pendientes:ccm', ['kpis:ccm', 'dashboard:unified:ccm'])
    this.addDependency('pendientes:prr', ['kpis:prr', 'dashboard:unified:prr'])
    
    // Cuando cambia la configuración, afecta a todo
    this.addDependency('config:global', ['*']) // Invalidar todo
  }

  async invalidateIntelligent(changedKey: string) {
    const affectedKeys = this.dependencies.get(changedKey) || new Set()
    
    logInfo(`[Smart Invalidation] ${changedKey} affects: ${Array.from(affectedKeys).join(', ')}`)
    
    for (const key of affectedKeys) {
      if (key === '*') {
        // Invalidación completa solo cuando es necesario
        await cacheManager.clear()
        break
      } else {
        await cacheManager.delete(key)
      }
    }
  }

  private addDependency(parent: string, children: string[]) {
    this.dependencies.set(parent, new Set(children))
    
    // Crear índice inverso para búsquedas rápidas
    for (const child of children) {
      if (!this.reverseDependencies.has(child)) {
        this.reverseDependencies.set(child, new Set())
      }
      this.reverseDependencies.get(child)!.add(parent)
    }
  }
}

// Hook para invalidación inteligente en mutaciones
export function useSmartInvalidation() {
  const queryClient = useQueryClient()
  const dependencyManager = new CacheDependencyManager()

  const smartInvalidate = useCallback(async (dataType: string, proceso?: string) => {
    const key = proceso ? `${dataType}:${proceso}` : dataType
    
    // Invalidar caché estratificado
    await dependencyManager.invalidateIntelligent(key)
    
    // Invalidar TanStack Query relacionadas
    const affectedQueries = getAffectedQueries(dataType, proceso)
    for (const queryKey of affectedQueries) {
      queryClient.invalidateQueries({ queryKey })
    }
    
    logInfo(`[Smart Invalidation Complete] ${key}`)
  }, [queryClient, dependencyManager])

  return { smartInvalidate }
}

function getAffectedQueries(dataType: string, proceso?: string): string[][] {
  const queries: string[][] = []

  switch (dataType) {
    case 'evaluadores':
      if (proceso) {
        queries.push(['evaluadores', proceso])
        queries.push(['pendientes', proceso])
        queries.push(['produccion', proceso])
        queries.push(['dashboard', proceso])
      }
      break
    
    case 'pendientes':
      if (proceso) {
        queries.push(['pendientes', proceso])
        queries.push(['kpis', proceso])
        queries.push(['dashboard', proceso])
      }
      break
  }

  return queries
}
```

---

## 🎯 **5. OPTIMIZACIÓN DE BASE DE DATOS Y APIs**

### **A. Optimización de Queries SQL**

#### **Problemas identificados en el rendimiento actual:**
- Queries sin índices en columnas frecuentemente filtradas
- Operaciones FULL TABLE SCAN en tablas grandes
- Agregaciones sin optimizar

#### **Índices recomendados específicos:**

```sql
-- 🚀 ÍNDICES CRÍTICOS PARA PERFORMANCE

-- Para queries de pendientes CCM (muy frecuentes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ccm_pendientes_estado 
ON table_ccm (ultimaetapa, estadopre, estadotramite) 
WHERE estadotramite = 'PENDIENTE';

-- Para queries de pendientes PRR con filtros específicos  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prr_pendientes_etapa_estado
ON table_prr (ultimaetapa, estadopre, estadotramite)
WHERE ultimaetapa IN (
  'ACTUALIZAR DATOS BENEFICIARIO - F',
  'ACTUALIZAR DATOS BENEFICIARIO - I', 
  'ASOCIACION BENEFICIARIO - F',
  'ASOCIACION BENEFICIARIO - I',
  'CONFORMIDAD SUB-DIREC.INMGRA. - I',
  'PAGOS, FECHA Y NRO RD. - F',
  'PAGOS, FECHA Y NRO RD. - I',
  'RECEPCIÓN DINM - F'
) AND estadotramite = 'PENDIENTE';

-- Para consultas de producción por operador y fecha
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ccm_produccion_operador_fecha
ON table_ccm (operadorpre, fechapre)
WHERE operadorpre IS NOT NULL AND fechapre IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prr_produccion_operador_fecha  
ON table_prr (operadorpre, fechapre)
WHERE operadorpre IS NOT NULL AND fechapre IS NOT NULL;

-- Para consultas de ingresos por rango de fechas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ccm_ingresos_fecha
ON table_ccm (fechaexpendiente) 
WHERE fechaexpendiente IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prr_ingresos_fecha
ON table_prr (fechaexpendiente)
WHERE fechaexpendiente IS NOT NULL;

-- Índice compuesto para agrupaciones por año/mes  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ccm_temporal_grouping
ON table_ccm (anio, mes, estadotramite);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prr_temporal_grouping  
ON table_prr (anio, mes, estadotramite);

-- Para conteos rápidos por operador
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ccm_operador_count
ON table_ccm (operador) WHERE operador IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prr_operador_count
ON table_prr (operador) WHERE operador IS NOT NULL;
```

#### **Queries optimizadas específicas:**

```typescript
// ❌ QUERY NO OPTIMIZADA (actual en el código)
async getCCMPendientes(): Promise<any[]> {
  return await this.db
    .select()
    .from(tableCCM)
    .where(
      and(
        eq(tableCCM.ultimaetapa, 'EVALUACIÓN - I'),
        isNull(tableCCM.estadopre), // Esto causa full table scan
        eq(tableCCM.estadotramite, 'PENDIENTE')
      )
    )
}

// ✅ QUERY OPTIMIZADA con índices
async getCCMPendientesOptimized(): Promise<any[]> {
  // Usar el índice específico creado
  return await this.db
    .select({
      numerotramite: tableCCM.numerotramite,
      fechaexpendiente: tableCCM.fechaexpendiente,
      operador: tableCCM.operador,
      ultimaetapa: tableCCM.ultimaetapa,
      estadopre: tableCCM.estadopre,
      estadotramite: tableCCM.estadotramite,
      anio: tableCCM.anio,
      mes: tableCCM.mes
    })
    .from(tableCCM)
    .where(
      and(
        eq(tableCCM.estadotramite, 'PENDIENTE'), // Usar índice primero
        eq(tableCCM.ultimaetapa, 'EVALUACIÓN - I'),
        sql`${tableCCM.estadopre} IS NULL OR ${tableCCM.estadopre} = ''`
      )
    )
    .orderBy(desc(tableCCM.fechaexpendiente)) // Ordenar usando el índice
    .limit(10000) // Evitar queries infinitas
}

// 🚀 QUERY CON AGREGACIÓN OPTIMIZADA
async getCCMPendientesGroupedByOperator(): Promise<any[]> {
  return await this.db
    .select({
      operador: tableCCM.operador,
      total: count(),
      // Agregaciones por año usando índice temporal
      year_2024: sql<number>`COUNT(CASE WHEN anio = 2024 THEN 1 END)`,
      year_2023: sql<number>`COUNT(CASE WHEN anio = 2023 THEN 1 END)`,
      year_2022: sql<number>`COUNT(CASE WHEN anio = 2022 THEN 1 END)`,
    })
    .from(tableCCM)
    .where(
      and(
        eq(tableCCM.estadotramite, 'PENDIENTE'),
        eq(tableCCM.ultimaetapa, 'EVALUACIÓN - I'),
        isNotNull(tableCCM.operador)
      )
    )
    .groupBy(tableCCM.operador)
    .orderBy(desc(count()))
}
```

---

### **B. Paginación del Servidor Optimizada**

#### **¿Por qué cambiar a paginación del servidor?**
- **Problema actual**: Se cargan todos los registros al frontend
- **Impacto**: Queries de 50,000+ registros bloquean la UI
- **Mejora esperada**: 95% reducción en tiempo de carga

#### **Implementación de Cursor-based Pagination:**

```typescript
// 🚀 PAGINACIÓN BASADA EN CURSOR (más eficiente que OFFSET)
interface PaginationCursor {
  id?: number
  timestamp?: string
  direction: 'next' | 'prev'
}

interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    hasNext: boolean
    hasPrev: boolean
    nextCursor?: string
    prevCursor?: string
    totalCount?: number
  }
}

export class OptimizedDatabaseAPI extends DirectDatabaseAPI {
  
  // Pendientes paginados con cursor
  async getCCMPendientesPaginated(
    cursor?: PaginationCursor,
    limit: number = 50
  ): Promise<PaginatedResponse<any>> {
    
    let query = this.db
      .select({
        id: sql<number>`ROW_NUMBER() OVER (ORDER BY fechaexpendiente DESC, numerotramite)`,
        numerotramite: tableCCM.numerotramite,
        fechaexpendiente: tableCCM.fechaexpendiente,
        operador: tableCCM.operador,
        ultimaetapa: tableCCM.ultimaetapa,
        estadotramite: tableCCM.estadotramite,
      })
      .from(tableCCM)
      .where(
        and(
          eq(tableCCM.estadotramite, 'PENDIENTE'),
          eq(tableCCM.ultimaetapa, 'EVALUACIÓN - I'),
          isNull(tableCCM.estadopre)
        )
      )

    // Aplicar cursor si existe
    if (cursor) {
      if (cursor.direction === 'next' && cursor.timestamp) {
        query = query.where(
          sql`fechaexpendiente < ${cursor.timestamp}`
        )
      } else if (cursor.direction === 'prev' && cursor.timestamp) {
        query = query.where(
          sql`fechaexpendiente > ${cursor.timestamp}`
        )
      }
    }

    // Obtener un registro extra para saber si hay más páginas
    const results = await query
      .orderBy(desc(tableCCM.fechaexpendiente), asc(tableCCM.numerotramite))
      .limit(limit + 1)

    const hasNext = results.length > limit
    const data = hasNext ? results.slice(0, -1) : results

    const nextCursor = hasNext && data.length > 0 ? 
      btoa(JSON.stringify({
        timestamp: data[data.length - 1].fechaexpendiente,
        direction: 'next'
      })) : undefined

    const prevCursor = cursor && data.length > 0 ?
      btoa(JSON.stringify({
        timestamp: data[0].fechaexpendiente,
        direction: 'prev'  
      })) : undefined

    return {
      data,
      pagination: {
        hasNext,
        hasPrev: !!cursor,
        nextCursor,
        prevCursor
      }
    }
  }

  // Búsqueda paginada con filtros
  async searchPendientesPaginated(
    filters: {
      operador?: string
      fechaDesde?: string  
      fechaHasta?: string
      proceso: 'ccm' | 'prr'
    },
    cursor?: PaginationCursor,
    limit: number = 50
  ): Promise<PaginatedResponse<any>> {
    
    const table = filters.proceso === 'ccm' ? tableCCM : tablePRR
    
    let whereConditions = []
    
    // Filtros base
    whereConditions.push(eq(table.estadotramite, 'PENDIENTE'))
    
    if (filters.proceso === 'ccm') {
      whereConditions.push(eq(table.ultimaetapa, 'EVALUACIÓN - I'))
    } else {
      whereConditions.push(inArray(table.ultimaetapa, [
        'ACTUALIZAR DATOS BENEFICIARIO - F',
        'ACTUALIZAR DATOS BENEFICIARIO - I',
        // ... otros valores PRR
      ]))
    }

    // Filtros opcionales
    if (filters.operador) {
      whereConditions.push(
        like(table.operador, `%${filters.operador}%`)
      )
    }

    if (filters.fechaDesde) {
      whereConditions.push(
        gte(table.fechaexpendiente, filters.fechaDesde)
      )
    }

    if (filters.fechaHasta) {
      whereConditions.push(
        lte(table.fechaexpendiente, filters.fechaHasta)
      )
    }

    let query = this.db
      .select()
      .from(table)
      .where(and(...whereConditions))

    // Aplicar cursor para paginación
    if (cursor?.timestamp) {
      if (cursor.direction === 'next') {
        query = query.where(
          sql`fechaexpendiente < ${cursor.timestamp}`
        )
      }
    }

    const results = await query
      .orderBy(desc(table.fechaexpendiente))
      .limit(limit + 1)

    const hasNext = results.length > limit
    const data = hasNext ? results.slice(0, -1) : results

    return {
      data,
      pagination: {
        hasNext,
        hasPrev: !!cursor,
        nextCursor: hasNext ? btoa(JSON.stringify({
          timestamp: data[data.length - 1].fechaexpendiente,
          direction: 'next'
        })) : undefined
      }
    }
  }
}
```

#### **Hook para paginación en React:**

```typescript
// Hook para manejar paginación del servidor
export function usePaginatedData<T>(
  fetcher: (cursor?: string, limit?: number) => Promise<PaginatedResponse<T>>,
  limit: number = 50
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    hasNext: false,
    hasPrev: false,
    nextCursor: undefined as string | undefined,
    prevCursor: undefined as string | undefined
  })

  const loadPage = useCallback(async (cursor?: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetcher(cursor, limit)
      
      setData(response.data)
      setPagination(response.pagination)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading data')
    } finally {
      setLoading(false)
    }
  }, [fetcher, limit])

  const nextPage = useCallback(() => {
    if (pagination.nextCursor) {
      loadPage(pagination.nextCursor)
    }
  }, [pagination.nextCursor, loadPage])

  const prevPage = useCallback(() => {
    if (pagination.prevCursor) {
      loadPage(pagination.prevCursor)
    }
  }, [pagination.prevCursor, loadPage])

  const refresh = useCallback(() => {
    loadPage()
  }, [loadPage])

  useEffect(() => {
    loadPage()
  }, [])

  return {
    data,
    loading,
    error,
    pagination,
    nextPage,
    prevPage,
    refresh
  }
}

// Uso en componentes
export function PaginatedPendientesTable({ proceso }: { proceso: 'ccm' | 'prr' }) {
  const {
    data: pendientes,
    loading,
    pagination,
    nextPage,
    prevPage
  } = usePaginatedData(
    (cursor, limit) => api.getCCMPendientesPaginated(cursor, limit),
    100 // 100 registros por página
  )

  return (
    <div>
      <Table data={pendientes} loading={loading} />
      
      <PaginationControls
        hasNext={pagination.hasNext}
        hasPrev={pagination.hasPrev}
        onNext={nextPage}
        onPrev={prevPage}
      />
    </div>
  )
}
```

---

**Continúa en la Parte 3 con UX/UI, Monitoreo y Plan de Implementación...** 