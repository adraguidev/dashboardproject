# 🚀 **GUÍA DE OPTIMIZACIONES - PARTE 1: PERFORMANCE Y RENDERIZADO**

## 📖 **INTRODUCCIÓN**

Este documento detalla las optimizaciones recomendadas para mejorar el rendimiento, la experiencia de usuario y la escalabilidad de la aplicación dashboard. Cada optimización incluye explicaciones técnicas, ejemplos de código y el impacto esperado.

---

## 🎯 **1. OPTIMIZACIONES DE PERFORMANCE Y RENDERIZADO**

### **A. Implementación de React.memo Estratégico**

#### **¿Qué es React.memo?**
React.memo es un Higher-Order Component (HOC) que memoriza el resultado de un componente funcional. Solo se re-renderiza si sus props cambian, evitando re-renders innecesarios.

#### **¿Por qué es importante?**
- **Problema actual**: Los componentes de tabla se re-renderizan cada vez que cambia cualquier estado del dashboard, incluso si sus datos no han cambiado
- **Impacto**: Puede reducir entre 30-50% los re-renders innecesarios
- **Casos críticos**: Componentes pesados con muchos datos o cálculos complejos

#### **¿Cuándo usarlo?**
- Componentes que reciben props que no cambian frecuentemente
- Componentes con renderizado costoso (tablas grandes, gráficos complejos)
- Componentes hijos que se re-renderizan por cambios en el padre

#### **Implementación recomendada:**

```typescript
// ❌ ANTES: Sin memorización
export function AdvancedPendientesReportTable({ reportData, loading, otherProcessEvaluadores }) {
  // Componente se re-renderiza siempre que el padre cambie
  const processedData = reportData?.data?.map(item => {
    // Cálculos pesados que se ejecutan en cada render
    return expensiveDataTransformation(item)
  })
  
  return (
    <div>
      {/* Tabla compleja con miles de filas */}
    </div>
  )
}

// ✅ DESPUÉS: Con memorización estratégica
export const AdvancedPendientesReportTable = React.memo(function AdvancedPendientesReportTable({ 
  reportData, 
  loading, 
  otherProcessEvaluadores 
}) {
  // Solo se re-ejecuta si reportData, loading u otherProcessEvaluadores cambian
  const processedData = useMemo(() => 
    reportData?.data?.map(item => expensiveDataTransformation(item)) || []
  , [reportData])
  
  return (
    <div>
      {/* Tabla que solo se re-renderiza cuando es necesario */}
    </div>
  )
}, (prevProps, nextProps) => {
  // Comparación personalizada para casos específicos
  return (
    prevProps.reportData?.timestamp === nextProps.reportData?.timestamp &&
    prevProps.loading === nextProps.loading &&
    prevProps.otherProcessEvaluadores?.length === nextProps.otherProcessEvaluadores?.length
  )
})

// Aplicar a otros componentes críticos
export const MemoizedProduccionReportTable = React.memo(ProduccionReportTable)
export const MemoizedIngresosChart = React.memo(IngresosChart)
export const MemoizedKPICard = React.memo(KPICard)
```

#### **Casos específicos de uso en tu aplicación:**
- `AdvancedPendientesReportTable`: Tabla compleja con filtros y agrupaciones
- `ProduccionReportTable`: Tabla con datos de producción por fechas
- `IngresosChart`: Gráfico que procesa datos para visualización
- `ProcessModules`: Contenedor de módulos que no debe re-renderizarse

---

### **B. Optimización de useMemo y useCallback**

#### **¿Qué son useMemo y useCallback?**
- **useMemo**: Memoriza el resultado de un cálculo costoso
- **useCallback**: Memoriza una función para evitar recrearla en cada render

#### **¿Por qué optimizar?**
- **Problema detectado**: Cálculos pesados se ejecutan en cada render
- **Ejemplo encontrado**: Filtrado y procesamiento de datos de tablas sin memoización
- **Impacto**: Mejora la respuesta de la UI entre 20-40%

#### **Implementación detallada:**

```typescript
// ❌ PROBLEMA DETECTADO en AdvancedPendientesReportTable
export function AdvancedPendientesReportTable({ reportData, otherProcessEvaluadores }) {
  const [activeTab, setActiveTab] = useState('general')
  const [searchTerm, setSearchTerm] = useState('')

  // ❌ MAL: Estos cálculos se ejecutan en CADA render
  const baseData = reportData?.data || []
  const filteredOperators = baseData.filter(item => {
    // Lógica compleja de filtrado que se ejecuta siempre
    if (activeTab === 'general') return item.subEquipo !== 'NO_ENCONTRADO'
    if (activeTab === 'otros') return item.subEquipo === 'NO_ENCONTRADO'
    return true
  }).filter(item => 
    searchTerm ? item.operador.toLowerCase().includes(searchTerm.toLowerCase()) : true
  )

  const totals = reportData.years.reduce((acc, period) => {
    // Cálculo pesado que se repite innecesariamente
    acc[period] = filteredOperators.reduce((sum, item) => sum + (item.years[period] || 0), 0)
    return acc
  }, {})

  return (
    <div>
      {/* Renderizado de tabla */}
    </div>
  )
}

// ✅ SOLUCIÓN OPTIMIZADA
export const AdvancedPendientesReportTable = React.memo(function AdvancedPendientesReportTable({ 
  reportData, 
  otherProcessEvaluadores,
  onGroupingChange 
}) {
  const [activeTab, setActiveTab] = useState('general')
  const [searchTerm, setSearchTerm] = useState('')

  // ✅ OPTIMIZADO: Memorizar datos base
  const baseData = useMemo(() => 
    reportData?.data || []
  , [reportData])

  // ✅ OPTIMIZADO: Memorizar función de verificación
  const isOperadorInExternos = useCallback((operador: string) => {
    return otherProcessEvaluadores.some(eval => eval.nombre_en_base === operador)
  }, [otherProcessEvaluadores])

  // ✅ OPTIMIZADO: Memorizar datos filtrados
  const filteredOperators = useMemo(() => {
    let filtered = []
    
    // Filtro por pestaña
    switch (activeTab) {
      case 'general':
        filtered = baseData.filter(item => item.subEquipo !== 'NO_ENCONTRADO')
        break
      case 'otros':
        filtered = baseData.filter(item => 
          item.subEquipo === 'NO_ENCONTRADO' && 
          !isOperadorInExternos(item.operador)
        )
        break
      case 'por-revisar':
        filtered = baseData.filter(item => 
          item.subEquipo === 'NO_ENCONTRADO' && 
          isOperadorInExternos(item.operador)
        )
        break
      default:
        filtered = baseData
    }

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.operador.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }, [baseData, activeTab, searchTerm, isOperadorInExternos])

  // ✅ OPTIMIZADO: Memorizar totales
  const totals = useMemo(() => {
    if (!reportData?.years) return { total: 0 }
    
    const initialTotals = { total: 0 }
    const periodTotals = reportData.years.reduce((acc, period) => {
      acc[period] = filteredOperators.reduce((sum, item) => sum + (item.years[period] || 0), 0)
      return acc
    }, initialTotals)

    periodTotals.total = filteredOperators.reduce((sum, item) => sum + item.total, 0)
    return periodTotals
  }, [filteredOperators, reportData?.years])

  // ✅ OPTIMIZADO: Memorizar handlers
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab)
  }, [])

  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term)
  }, [])

  const handleGroupingChange = useCallback((groupBy: string) => {
    onGroupingChange?.(groupBy)
  }, [onGroupingChange])

  return (
    <div>
      {/* Renderizado optimizado */}
    </div>
  )
})
```

#### **Patrones de optimización identificados:**

```typescript
// 🎯 PATRÓN 1: Memoización de transformaciones de datos
const processedChartData = useMemo(() => {
  return rawData.map(item => ({
    fecha: formatDate(item.fecha),
    value: calculateValue(item),
    trend: calculateTrend(item)
  }))
}, [rawData])

// 🎯 PATRÓN 2: Memoización de funciones de filtrado
const filterFunction = useCallback((item) => {
  return item.status === selectedStatus && item.date >= dateRange.start
}, [selectedStatus, dateRange.start])

// 🎯 PATRÓN 3: Memoización de configuraciones complejas
const tableConfig = useMemo(() => ({
  columns: generateColumns(selectedProcess),
  sorting: { field: sortField, direction: sortDirection },
  pagination: { page: currentPage, size: pageSize }
}), [selectedProcess, sortField, sortDirection, currentPage, pageSize])
```

---

### **C. Virtualización de Listas Grandes**

#### **¿Qué es la virtualización?**
La virtualización es una técnica que renderiza solo los elementos visibles en pantalla, creando una "ventana" que muestra una porción de una lista muy grande.

#### **¿Por qué es crítica para tu aplicación?**
- **Problema identificado**: Tablas con miles de registros de pendientes/producción
- **Caso específico**: `AdvancedPendientesReportTable` puede mostrar +5000 operadores
- **Impacto actual**: Browser se bloquea con listas grandes (>1000 elementos)
- **Mejora esperada**: 90% mejora en performance para listas grandes

#### **¿Cuándo implementar?**
- Listas con más de 100 elementos
- Tablas que pueden crecer dinámicamente
- Componentes que muestran datos históricos completos

#### **Implementación con react-window:**

```typescript
// 📦 INSTALACIÓN REQUERIDA
// npm install react-window react-window-infinite-loader

import { FixedSizeList as List } from 'react-window'
import { VariableSizeList } from 'react-window'

// ✅ SOLUCIÓN: Tabla virtualizada para pendientes
import React, { useMemo, useCallback } from 'react'
import { FixedSizeList as List } from 'react-window'

interface VirtualizedPendientesTableProps {
  data: PendientesReportData[]
  height: number
  onRowClick?: (item: PendientesReportData) => void
}

export const VirtualizedPendientesTable = React.memo(function VirtualizedPendientesTable({
  data,
  height = 400,
  onRowClick
}: VirtualizedPendientesTableProps) {
  
  // Altura fija por fila para mejor performance
  const ROW_HEIGHT = 48
  const HEADER_HEIGHT = 40

  // Componente de fila optimizado
  const Row = useCallback(({ index, style }: { index: number, style: React.CSSProperties }) => {
    const item = data[index]
    
    return (
      <div 
        style={style}
        className={`flex items-center border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${item.colorClass || ''}`}
        onClick={() => onRowClick?.(item)}
      >
        <div className="flex-1 px-4 py-2 text-sm">{item.operador}</div>
        <div className="w-24 px-4 py-2 text-sm text-center">{item.total}</div>
        <div className="w-32 px-4 py-2 text-sm">{item.subEquipo}</div>
      </div>
    )
  }, [data, onRowClick])

  // Header del componente
  const Header = useMemo(() => (
    <div className="flex items-center bg-gray-50 border-b border-gray-200" style={{ height: HEADER_HEIGHT }}>
      <div className="flex-1 px-4 py-2 text-sm font-medium text-gray-900">Operador</div>
      <div className="w-24 px-4 py-2 text-sm font-medium text-gray-900 text-center">Total</div>
      <div className="w-32 px-4 py-2 text-sm font-medium text-gray-900">Sub Equipo</div>
    </div>
  ), [])

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {Header}
      <List
        height={height - HEADER_HEIGHT}
        itemCount={data.length}
        itemSize={ROW_HEIGHT}
        width="100%"
        itemData={data}
      >
        {Row}
      </List>
    </div>
  )
})

// 🔄 INTEGRACIÓN en AdvancedPendientesReportTable
export const AdvancedPendientesReportTable = React.memo(function AdvancedPendientesReportTable({
  reportData,
  // ... otras props
}) {
  // ... lógica existente de filtros y memoización

  // Determinar si usar virtualización
  const shouldVirtualize = filteredOperators.length > 100

  if (shouldVirtualize) {
    return (
      <div className="space-y-4">
        {/* Controles de filtros existentes */}
        <div className="filters-section">
          {/* Tabs, búsqueda, etc. */}
        </div>
        
        {/* Tabla virtualizada */}
        <VirtualizedPendientesTable
          data={filteredOperators}
          height={600}
          onRowClick={(item) => console.log('Selected:', item)}
        />
        
        {/* Estadísticas y totales */}
        <div className="totals-section">
          {/* Mostrar totales */}
        </div>
      </div>
    )
  }

  // Renderizado normal para listas pequeñas
  return (
    <div>
      {/* Tabla normal existente */}
    </div>
  )
})
```

#### **Casos de uso específicos en tu aplicación:**

```typescript
// 🎯 CASO 1: Tabla de pendientes (actual: puede ser +5000 filas)
<VirtualizedPendientesTable 
  data={pendientesData} 
  height={600}
  estimatedItemSize={48}
/>

// 🎯 CASO 2: Lista de evaluadores con historial
<VirtualizedEvaluadoresList
  data={evaluadoresConHistorial}
  height={400}
  renderItem={({ item, style }) => (
    <EvaluadorCard evaluador={item} style={style} />
  )}
/>

// 🎯 CASO 3: Gráfico con muchos puntos de datos
<VirtualizedChartPoints
  dataPoints={ingresosHistoricos}
  viewport={{ start: startDate, end: endDate }}
/>
```

#### **Beneficios específicos:**
- **Memoria**: Solo renderiza 10-20 filas visibles en lugar de 5000
- **Performance**: Tiempo de renderizado constante independiente del tamaño de datos
- **UX**: Scroll fluido incluso con datasets masivos
- **Escalabilidad**: Soporta datasets de millones de registros sin degradación

---

## 🎯 **2. GESTIÓN DE ESTADO OPTIMIZADA**

### **A. Optimización de TanStack Query**

#### **¿Por qué optimizar TanStack Query?**
- **Problema actual**: Configuración genérica que puede ser más específica
- **Oportunidad**: Configuraciones granulares para diferentes tipos de datos
- **Mejora esperada**: 25-40% reducción en re-fetching innecesario

#### **Configuración optimizada por tipo de datos:**

```typescript
// ❌ CONFIGURACIÓN ACTUAL GENÉRICA
const dashboardQuery = useQuery({
  queryKey: ['dashboard', proceso],
  queryFn: fetchDashboard,
  staleTime: 5 * 60 * 1000, // Genérico para todos los datos
  gcTime: 30 * 60 * 1000,   // Genérico para todos los datos
})

// ✅ CONFIGURACIONES ESPECÍFICAS OPTIMIZADAS
const queryConfigs = {
  // Datos que cambian frecuentemente (KPIs en tiempo real)
  realtime: {
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 60 * 1000, // Auto-refresh cada minuto
    refetchOnWindowFocus: true,
    structuralSharing: false, // Para objetos que cambian completamente
  },

  // Datos que cambian moderadamente (pendientes, producción)
  neartime: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    refetchOnWindowFocus: false,
    structuralSharing: true,
    notifyOnChangeProps: ['data', 'error', 'isLoading'], // Solo propiedades importantes
  },

  // Datos históricos/estáticos (evaluadores, configuraciones)
  static: {
    staleTime: 60 * 60 * 1000, // 1 hora
    gcTime: 24 * 60 * 60 * 1000, // 24 horas
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    structuralSharing: true,
  }
}

// Implementación específica por módulo
export function useDashboardUnified(proceso: string) {
  const queryClient = useQueryClient()

  // Query para KPIs (datos en tiempo real)
  const kpisQuery = useQuery({
    queryKey: ['dashboard', 'kpis', proceso],
    queryFn: () => fetchKPIs(proceso),
    ...queryConfigs.realtime,
    // Configuración específica para KPIs
    select: (data) => ({
      ...data,
      // Transformaciones específicas para KPIs
      formatted: formatKPIsForDisplay(data),
      alerts: detectKPIAlerts(data),
    }),
  })

  // Query para pendientes (datos que cambian moderadamente)
  const pendientesQuery = useQuery({
    queryKey: ['dashboard', 'pendientes', proceso],
    queryFn: () => fetchPendientes(proceso),
    ...queryConfigs.neartime,
    // Configuración específica para pendientes
    select: (data) => ({
      ...data,
      // Solo recalcular si los datos realmente cambiaron
      summary: data.length > 0 ? calculatePendientesSummary(data) : null,
    }),
  })

  // Query para evaluadores (datos estáticos)
  const evaluadoresQuery = useQuery({
    queryKey: ['dashboard', 'evaluadores', proceso],
    queryFn: () => fetchEvaluadores(proceso),
    ...queryConfigs.static,
  })

  return {
    kpis: kpisQuery.data,
    pendientes: pendientesQuery.data,
    evaluadores: evaluadoresQuery.data,
    
    // Estados agregados optimizados
    isLoading: kpisQuery.isLoading || pendientesQuery.isLoading || evaluadoresQuery.isLoading,
    hasError: kpisQuery.isError || pendientesQuery.isError || evaluadoresQuery.isError,
    
    // Funciones de control granular
    refreshKPIs: () => queryClient.invalidateQueries(['dashboard', 'kpis', proceso]),
    refreshPendientes: () => queryClient.invalidateQueries(['dashboard', 'pendientes', proceso]),
    refreshAll: () => queryClient.invalidateQueries(['dashboard']),
  }
}
```

#### **Optimizaciones avanzadas de TanStack Query:**

```typescript
// 🚀 OPTIMIZACIÓN 1: Prefetching inteligente
export function useIntelligentPrefetching(currentProcess: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    // Prefetch del otro proceso solo si el usuario está activo
    const otherProcess = currentProcess === 'CCM' ? 'PRR' : 'CCM'
    
    // Verificar si el usuario está interactuando
    const prefetchTimer = setTimeout(() => {
      // Solo prefetch si los datos no están frescos
      const existingData = queryClient.getQueryData(['dashboard', otherProcess])
      const queryState = queryClient.getQueryState(['dashboard', otherProcess])
      
      const needsPrefetch = !existingData || 
        (queryState && Date.now() - queryState.dataUpdatedAt > 5 * 60 * 1000)

      if (needsPrefetch) {
        queryClient.prefetchQuery({
          queryKey: ['dashboard', otherProcess],
          queryFn: () => fetchDashboard(otherProcess),
          staleTime: 5 * 60 * 1000,
        })
      }
    }, 2000) // Delay para evitar prefetch inmediato

    return () => clearTimeout(prefetchTimer)
  }, [currentProcess, queryClient])
}

// 🚀 OPTIMIZACIÓN 2: Background sync para datos críticos
export function useBackgroundSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    // Sync en background cada 5 minutos para datos críticos
    const interval = setInterval(async () => {
      // Solo si la ventana está visible
      if (document.visibilityState === 'visible') {
        await queryClient.refetchQueries({
          queryKey: ['dashboard'],
          type: 'active',
          // Solo refetch queries que estén stale
          stale: true,
        })
      }
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [queryClient])
}

// 🚀 OPTIMIZACIÓN 3: Selective updates para reducir re-renders
export function useDashboardData(proceso: string) {
  const queryClient = useQueryClient()

  // Solo suscribirse a cambios específicos
  const kpisData = useQuery({
    queryKey: ['dashboard', 'kpis', proceso],
    queryFn: () => fetchKPIs(proceso),
    // Solo notificar cambios en propiedades específicas
    notifyOnChangeProps: ['data'],
    // Comparación personalizada para evitar updates innecesarios
    isDataEqual: (oldData, newData) => {
      return oldData?.timestamp === newData?.timestamp
    },
  })

  return kpisData
}
```

Esta es la primera parte del documento. ¿Quieres que continúe con la segunda parte que cubriría las optimizaciones de bundle, arquitectura de caché y base de datos? 