// Tipos para el Dashboard

export interface KPI {
  id: string
  name: string
  value: number
  target?: number
  unit?: string
  trend: 'up' | 'down' | 'stable'
  change: number
  category: string
}

export interface Process {
  id: string
  name: string
  description?: string
  status: 'active' | 'inactive' | 'maintenance'
  owner: string
  metrics: Metric[]
  lastUpdated: Date
}

export interface Metric {
  id: string
  name: string
  value: number
  target?: number
  unit?: string
  category: string
  recordedAt: Date
}

export interface ChartData {
  name: string
  value: number
  date?: string
}

export interface DashboardConfig {
  layout: {
    columns: number
    widgets: WidgetConfig[]
  }
  theme: 'light' | 'dark'
  filters: FilterConfig[]
}

export interface WidgetConfig {
  id: string
  type: 'kpi' | 'chart' | 'table' | 'metric'
  title: string
  position: { x: number; y: number; w: number; h: number }
  dataSource: string
  config: Record<string, any>
}

export interface FilterConfig {
  id: string
  name: string
  type: 'date' | 'select' | 'range'
  options?: string[]
  value: any
}

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'user'
}

export interface ProcessData {
  id: string
  name: string
  description: string
  recordCount: number
  lastUpdated: Date
  status: 'active' | 'inactive' | 'error'
}

// Nuevos tipos para módulos y filtros
export interface ProcessModule {
  id: string
  name: string
  description: string
  icon?: string
  active: boolean
}

export interface CCMRecord {
  operador?: string // Nombre del operador
  textbox4?: string // Campo numérico
  dependencia?: string
  fechaexpendiente?: string // Fecha del expediente
  numerotramite?: string
  ultimaetapa?: string
  estadopre?: string
  estadotramite?: string
  // Agregar más campos según la estructura real
  [key: string]: any
}

export interface PRRRecord {
  operador?: string // Nombre del operador
  textbox4?: string // Campo numérico
  dependencia?: string
  fechaexpendiente?: string // Fecha del expediente
  numerotramite?: string
  ultimaetapa?: string
  estadopre?: string
  estadotramite?: string
  // Agregar más campos según la estructura real
  [key: string]: any
}

export interface ProcessFilters {
  ultimaetapa?: string[]
  estadopre?: string[]
  estadotramite?: string[]
  anio?: number[]
  mes?: number[]
  dependencia?: string[]
  [key: string]: any
}

export interface PendientesConfig {
  ccm: {
    filters: ProcessFilters
    columns: string[]
  }
  prr: {
    filters: ProcessFilters
    columns: string[]
  }
}

export interface TableColumn {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'status'
  sortable: boolean
  filterable: boolean
  width?: number
}

export interface DynamicTableConfig {
  columns: TableColumn[]
  filters: ProcessFilters
  sorting: {
    column: string
    direction: 'asc' | 'desc'
  }
  pagination: {
    page: number
    size: number
    total: number
  }
}

// Nuevos tipos para reporte de pendientes
export interface PendientesReportData {
  operador: string
  years: { [year: string]: number }
  total: number
  subEquipo?: string // Sub equipo del evaluador
  colorClass?: string // Clase CSS para el color de fila
}

export interface PendientesReportSummary {
  data: PendientesReportData[]
  years: string[]
  totalByYear: { [year: string]: number }
  grandTotal: number
  process: 'ccm' | 'prr'
  legend: ColorLegend[]
}

// Tipos para evaluadores
export interface Evaluador {
  id?: number
  nombre_en_base: string
  sub_equipo: string
  // Otros campos que puedan tener las tablas
  [key: string]: any
}

export interface ColorLegend {
  subEquipo: string
  color: string
  colorClass: string
  description: string
} 
 
 