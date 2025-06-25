import { KPI, Process, ChartData, User } from '@/types/dashboard'
import { PendientesConfig, ProcessModule, TableColumn } from '@/types/dashboard'

export const sampleUsers: User[] = [
  {
    id: '1',
    email: 'admin@ufsm.com',
    name: 'Administrador UFSM',
    role: 'admin'
  },
  {
    id: '2', 
    email: 'manager@ufsm.com',
    name: 'Manager Operativo',
    role: 'manager'
  }
]

export const sampleKPIs: KPI[] = [
  {
    id: '1',
    name: 'Ingresos Totales',
    value: 125000,
    target: 120000,
    unit: '€',
    trend: 'up',
    change: 4.2,
    category: 'Financiero'
  },
  {
    id: '2',
    name: 'Satisfacción Cliente',
    value: 87.5,
    target: 85,
    unit: '%',
    trend: 'up',
    change: 2.1,
    category: 'Calidad'
  },
  {
    id: '3',
    name: 'Tiempo Promedio Respuesta',
    value: 2.3,
    target: 2.0,
    unit: 'h',
    trend: 'down',
    change: 15,
    category: 'Operativo'
  },
  {
    id: '4',
    name: 'Ventas Online',
    value: 1250,
    target: 1200,
    unit: 'unidades',
    trend: 'stable',
    change: 0,
    category: 'Ventas'
  },
  {
    id: '5',
    name: 'Eficiencia Operativa',
    value: 92.1,
    target: 90,
    unit: '%',
    trend: 'up',
    change: 3.5,
    category: 'Operativo'
  },
  {
    id: '6',
    name: 'Costos de Operación',
    value: 45000,
    target: 50000,
    unit: '€',
    trend: 'up',
    change: 8.2,
    category: 'Financiero'
  }
]

export const sampleProcesses: Process[] = [
  {
    id: '1',
    name: 'Gestión de Ventas',
    description: 'Proceso completo de gestión de ventas desde lead hasta cierre',
    status: 'active',
    owner: 'Juan Pérez',
    metrics: [
      {
        id: 'm1',
        name: 'Conversión de Leads',
        value: 15.2,
        target: 18,
        unit: '%',
        category: 'Ventas',
        recordedAt: new Date()
      },
      {
        id: 'm2',
        name: 'Tiempo Ciclo Venta',
        value: 14,
        target: 12,
        unit: 'días',
        category: 'Ventas',
        recordedAt: new Date()
      }
    ],
    lastUpdated: new Date()
  },
  {
    id: '2',
    name: 'Atención al Cliente',
    description: 'Proceso de soporte y atención a clientes',
    status: 'active',
    owner: 'María García',
    metrics: [
      {
        id: 'm3',
        name: 'Satisfacción Cliente',
        value: 87.5,
        target: 85,
        unit: '%',
        category: 'Calidad',
        recordedAt: new Date()
      }
    ],
    lastUpdated: new Date()
  },
  {
    id: '3',
    name: 'Inventario',
    description: 'Control y gestión de inventario',
    status: 'maintenance',
    owner: 'Carlos López',
    metrics: [
      {
        id: 'm4',
        name: 'Rotación Inventario',
        value: 6.2,
        target: 8,
        unit: 'veces/año',
        category: 'Operativo',
        recordedAt: new Date()
      }
    ],
    lastUpdated: new Date()
  },
  {
    id: '4',
    name: 'Marketing Digital',
    description: 'Gestión de campañas y presencia digital',
    status: 'active',
    owner: 'Ana Rodríguez',
    metrics: [
      {
        id: 'm5',
        name: 'ROI Campañas',
        value: 3.2,
        target: 3.5,
        unit: 'x',
        category: 'Marketing',
        recordedAt: new Date()
      }
    ],
    lastUpdated: new Date()
  }
]

// Datos estructurados para gráficos
export const sampleChartData = {
  monthly: [
    { name: 'Ene', value: 4000 },
    { name: 'Feb', value: 3000 },
    { name: 'Mar', value: 5000 },
    { name: 'Abr', value: 4500 },
    { name: 'May', value: 6000 },
    { name: 'Jun', value: 5500 },
    { name: 'Jul', value: 7000 },
    { name: 'Ago', value: 6800 },
    { name: 'Sep', value: 7200 },
    { name: 'Oct', value: 6900 },
    { name: 'Nov', value: 8100 },
    { name: 'Dic', value: 8500 }
  ],
  quarterly: [
    { name: 'Q1 2023', value: 65 },
    { name: 'Q2 2023', value: 70 },
    { name: 'Q3 2023', value: 75 },
    { name: 'Q4 2023', value: 82 },
    { name: 'Q1 2024', value: 87 },
    { name: 'Q2 2024', value: 91 }
  ],
  byCategory: [
    { name: 'Ventas', value: 35 },
    { name: 'Marketing', value: 25 },
    { name: 'Soporte', value: 20 },
    { name: 'Desarrollo', value: 20 }
  ],
  targets: [
    { name: 'Ventas', value: 85 },
    { name: 'Calidad', value: 92 },
    { name: 'Eficiencia', value: 78 },
    { name: 'Satisfacción', value: 88 }
  ]
}

// Legacy exports for compatibility
export const sampleTrendData: ChartData[] = sampleChartData.quarterly
export const sampleCategoryData: ChartData[] = sampleChartData.byCategory 

// Configuración de módulos para cada proceso
export const processModules: ProcessModule[] = [
  {
    id: 'pendientes',
    name: 'Pendientes',
    description: 'Expedientes con trámites pendientes',
    icon: 'clock',
    active: true
  },
  {
    id: 'en-proceso',
    name: 'En Proceso',
    description: 'Expedientes en curso de evaluación',
    icon: 'progress',
    active: false
  },
  {
    id: 'finalizados',
    name: 'Finalizados',
    description: 'Expedientes completados',
    icon: 'check',
    active: false
  },
  {
    id: 'rechazados',
    name: 'Rechazados',
    description: 'Expedientes rechazados',
    icon: 'x',
    active: false
  }
]

// Configuración específica de filtros para módulo "Pendientes"
export const pendientesConfig: PendientesConfig = {
  ccm: {
    filters: {
      ultimaetapa: ['EVALUACIÓN - I'],
      estadopre: [''], // En blanco
      estadotramite: ['PENDIENTE']
    },
    columns: [
      'operador',
      'dependencia', 
      'fechaexpendiente',
      'numerotramite',
      'ultimaetapa',
      'estadopre',
      'estadotramite'
    ]
  },
  prr: {
    filters: {
      ultimaetapa: [
        'ACTUALIZAR DATOS BENEFICIARIO - F',
        'ACTUALIZAR DATOS BENEFICIARIO - I',
        'ASOCIACION BENEFICIARIO - F',
        'ASOCIACION BENEFICIARIO - I',
        'CONFORMIDAD SUB-DIREC.INMGRA. - I',
        'PAGOS, FECHA Y NRO RD. - F',
        'PAGOS, FECHA Y NRO RD. - I',
        'RECEPCIÓN DINM - F'
      ],
      estadopre: [''], // En blanco
      estadotramite: ['PENDIENTE']
    },
    columns: [
      'operador',
      'dependencia',
      'fechaexpendiente', 
      'numerotramite',
      'ultimaetapa',
      'estadopre',
      'estadotramite'
    ]
  }
}

// Configuración de columnas para tabla dinámica
export const tableColumns: TableColumn[] = [
  {
    key: 'operador',
    label: 'Operador',
    type: 'text',
    sortable: true,
    filterable: true,
    width: 200
  },
  {
    key: 'dependencia',
    label: 'Dependencia',
    type: 'text',
    sortable: true,
    filterable: true,
    width: 150
  },
  {
    key: 'fechaexpendiente',
    label: 'Fecha Expediente',
    type: 'date',
    sortable: true,
    filterable: true,
    width: 120
  },
  {
    key: 'numerotramite',
    label: 'Número Trámite',
    type: 'text',
    sortable: true,
    filterable: true,
    width: 120
  },
  {
    key: 'ultimaetapa',
    label: 'Última Etapa',
    type: 'text',
    sortable: true,
    filterable: true,
    width: 180
  },
  {
    key: 'estadopre',
    label: 'Estado Pre',
    type: 'text',
    sortable: true,
    filterable: true,
    width: 100
  },
  {
    key: 'estadotramite',
    label: 'Estado Trámite',
    type: 'status',
    sortable: true,
    filterable: true,
    width: 120
  }
] 
 
 