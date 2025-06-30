'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAvancePendientes } from '@/hooks/use-avance-pendientes'
import { usePendientesReport } from '@/hooks/use-pendientes-report'
import { useEvaluadores } from '@/hooks/use-evaluadores'
import { format, parseISO, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Activity, Users, Calendar, TrendingDown, Search, Filter, Download, Save, Loader2, LineChart } from 'lucide-react'
import { Evaluador } from '@/types/dashboard'
import { useToast } from '@/components/ui/toast'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from 'recharts';
import { OperatorTrendModal } from './operator-trend-modal'
import { OperatorMovers } from './operator-movers'

interface AvancePendientesTableProps {
  className?: string
  proceso?: 'CCM' | 'PRR'
}

type TabType = 'general' | 'otros' | 'por-revisar'

interface OperadorHistorico {
  operador: string
  subEquipo: string
  colorClass?: string
  total: number
  ultimaFecha: number
  [fecha: string]: string | number | undefined
}

interface SnapshotResponse {
  success: boolean;
  error?: string;
}

export default function AvancePendientesTable({ 
  className, 
  proceso: propProceso
}: AvancePendientesTableProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [selectedProceso, setSelectedProceso] = useState<'CCM' | 'PRR'>(propProceso || 'CCM')
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [searchTerm, setSearchTerm] = useState('')
  const [subEquipoFilter, setSubEquipoFilter] = useState<string>('')
  const [isRecording, setIsRecording] = useState(false)
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<number>(30);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [selectedOperator, setSelectedOperator] = useState<OperadorHistorico | null>(null);

  const { data, isLoading, error, refetch } = useAvancePendientes(selectedProceso)
  
  // Obtener datos de pendientes actuales para el cruce de operadores
  const { report: reportData } = usePendientesReport({
    process: selectedProceso.toLowerCase() as 'ccm' | 'prr',
    groupBy: 'year',
    enabled: true,
  })

  // Obtener evaluadores del otro proceso para comparación
  const otherProcess = selectedProceso === 'CCM' ? 'prr' : 'ccm'
  const { evaluadores: otherProcessEvaluadores } = useEvaluadores({
    process: otherProcess
  })

  // Sincronizar el proceso cuando cambia el prop
  useEffect(() => {
    if (propProceso && propProceso !== selectedProceso) {
      setSelectedProceso(propProceso)
    }
  }, [propProceso, selectedProceso])

  // Normalización definitiva para nombres de operadores
  const normalizeName = useCallback((name: string): string => {
    if (!name) return '';
    return name
      .normalize('NFD') // Separa acentos de las letras (e.g., 'á' -> 'a' + '´')
      .replace(/[\u0300-\u036f]/g, '') // Elimina los acentos
      .toUpperCase() // Convierte a mayúsculas
      .replace(/\s+/g, ' ') // Reemplaza múltiples espacios por uno solo
      .trim(); // Elimina espacios al inicio y final
  }, []);

  // Crear set de nombres normalizados del otro proceso
  const externalNombresEnBase = useMemo(() =>
    new Set(
      (otherProcessEvaluadores || [])
        .filter(e => e && e.nombre_en_base) 
        .map(e => normalizeName(e.nombre_en_base))
    )
  , [otherProcessEvaluadores, normalizeName]);

  // Verificar si un operador existe en el proceso externo
  const isOperadorInExternos = useCallback((operador: string) => {
    const normalizedOperador = normalizeName(operador);
    if (!normalizedOperador) return false;
    return externalNombresEnBase.has(normalizedOperador);
  }, [externalNombresEnBase, normalizeName]);

  // Procesar datos históricos
  const processedData = useMemo(() => {
    if (!data?.success || !data.data || !reportData || !reportData.data) {
      return { fechas: [], operadores: [], subEquipos: [], totalesPorDia: [], fechasFiltradas: [] }
    }

    const { fechas: rawFechas, operadores } = data.data

    const fechasOrdenadas = rawFechas
      .map(fecha => ({
        original: fecha,
        parsed: parseISO(fecha + 'T12:00:00'),
        formatted: format(parseISO(fecha + 'T12:00:00'), 'dd/MM', { locale: es })
      }))
      .sort((a, b) => a.parsed.getTime() - b.parsed.getTime())

    // Filtrar para mostrar los últimos X días CON DATOS
    const fechasFiltradas = fechasOrdenadas.slice(-periodoSeleccionado);

    // Crear mapa de operadores con CLAVE NORMALIZADA y VALOR ORIGINAL
    const operadoresMap = new Map<string, { originalName: string, subEquipo: string; colorClass: string }>()
    if (reportData.data) {
      reportData.data.forEach(item => {
        if (item.operador !== 'Sin Operador') {
          const normalizedKey = normalizeName(item.operador);
          if (!operadoresMap.has(normalizedKey)) { // Mantener el primer nombre encontrado
            operadoresMap.set(normalizedKey, {
              originalName: item.operador, // Guardar el nombre original
              subEquipo: item.subEquipo || 'NO_ENCONTRADO',
              colorClass: item.colorClass || ''
            })
          }
        }
      })
    }

    // Agrupar los datos históricos usando la clave normalizada
    const operadoresAgrupados = operadores.reduce((acc, op) => {
      const normalizedKey = normalizeName(op.operador);
      if (!acc[normalizedKey]) {
        const operadorInfo = operadoresMap.get(normalizedKey) || {
          originalName: op.operador, // Usar el nombre del histórico si no está en el mapa
          subEquipo: 'NO_ENCONTRADO',
          colorClass: ''
        };
        
        acc[normalizedKey] = {
          operador: operadorInfo.originalName,
          subEquipo: operadorInfo.subEquipo,
          colorClass: operadorInfo.colorClass,
          total: 0,
          ultimaFecha: 0,
        };
      }

      // Sumar los valores de las fechas
      fechasFiltradas.forEach(({ original }) => {
        const valor = op[original] as number || 0;
        acc[normalizedKey][original] = ((acc[normalizedKey][original] || 0) as number) + valor;
      });

      return acc;
    }, {} as Record<string, OperadorHistorico>);


    // Convertir el objeto agrupado de nuevo a un array
    const operadoresHistoricos: OperadorHistorico[] = Object.values(operadoresAgrupados);

    // Calcular el total y la última fecha para cada operador agrupado
    const ultimaFechaKey = fechasFiltradas[fechasFiltradas.length - 1]?.original
    if (ultimaFechaKey) {
      operadoresHistoricos.forEach(op => {
        op.ultimaFecha = op[ultimaFechaKey] as number || 0;
        op.total = fechasFiltradas.reduce((sum, fecha) => sum + (op[fecha.original] as number || 0), 0);
      });
    }

    // Ordenar operadores por cantidad de la última fecha (mayor a menor)
    operadoresHistoricos.sort((a, b) => b.ultimaFecha - a.ultimaFecha);
    
    // Debug logs removidos para mejorar rendimiento

    // Obtener sub equipos únicos
    const subEquipos = [...new Set(operadoresHistoricos.map(op => op.subEquipo))]
      .filter(se => se !== 'NO_ENCONTRADO')
      .sort()

    // Calcular totales por día (solo para las fechas filtradas)
    const totalesPorDia = fechasFiltradas.map(fecha => {
      const total = operadoresHistoricos.reduce((sum, op) => sum + (op[fecha.original] as number || 0), 0);
      return { fecha: fecha.formatted, Total: total };
    });

    return {
      fechas: fechasOrdenadas,
      operadores: operadoresHistoricos,
      subEquipos,
      totalesPorDia,
      fechasFiltradas,
    }
  }, [data, reportData, normalizeName, periodoSeleccionado])

  // Filtrar operadores según la pestaña activa
  const filteredOperators = useMemo(() => {
    let filtered = []
    switch (activeTab) {
      case 'general':
        filtered = processedData.operadores.filter(item => item.subEquipo !== 'NO_ENCONTRADO')
        break
      case 'otros':
        filtered = processedData.operadores.filter(item => 
          item.subEquipo === 'NO_ENCONTRADO' && 
          !isOperadorInExternos(item.operador)
        )
        break
      case 'por-revisar':
        filtered = processedData.operadores.filter(item => 
          item.subEquipo === 'NO_ENCONTRADO' && 
          isOperadorInExternos(item.operador)
        )
        break
      default:
        filtered = processedData.operadores
    }

    // Aplicar filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.operador.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Aplicar filtro de sub equipo
    if (subEquipoFilter && subEquipoFilter !== 'all') {
      filtered = filtered.filter(item => 
        item.subEquipo === subEquipoFilter
      )
    }

    // Mantener el ordenamiento por última fecha (mayor a menor)
    filtered.sort((a, b) => b.ultimaFecha - a.ultimaFecha)

    return filtered
  }, [processedData.operadores, activeTab, isOperadorInExternos, searchTerm, subEquipoFilter])

  // NUEVO: Calcular totales BASADO EN LOS OPERADORES FILTRADOS
  const totalesPorDiaFiltrados = useMemo(() => {
    if (!processedData.fechasFiltradas || filteredOperators.length === 0) {
      return [];
    }
    const dataPoints = processedData.fechasFiltradas.map(fecha => {
      const total = filteredOperators.reduce((sum, op) => sum + (op[fecha.original] as number || 0), 0);
      return { fecha: fecha.formatted, Total: total };
    });

    // Cálculo de la línea de tendencia (Regresión Lineal)
    const n = dataPoints.length;
    if (n > 1) {
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      dataPoints.forEach((point, index) => {
        sumX += index;
        sumY += point.Total;
        sumXY += index * point.Total;
        sumXX += index * index;
      });
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      
      // Mapear a un nuevo array con la propiedad de tendencia, eliminando el error de tipo.
      return dataPoints.map((point, index) => ({
        ...point,
        Tendencia: Math.max(0, slope * index + intercept),
      }));
    }

    return dataPoints;
  }, [filteredOperators, processedData.fechasFiltradas]);

  // Configuración de pestañas
  const tabs: { id: TabType; name: string; count: number; description: string }[] = [
    { 
      id: 'general', 
      name: 'General', 
      count: processedData.operadores.filter(item => item.subEquipo !== 'NO_ENCONTRADO').length, 
      description: 'Operadores del proceso actual con sub-equipo asignado.' 
    },
    { 
      id: 'otros', 
      name: 'Otros', 
      count: processedData.operadores.filter(item => 
        item.subEquipo === 'NO_ENCONTRADO' && !isOperadorInExternos(item.operador)
      ).length, 
      description: 'Operadores no identificados en ninguna de las listas de procesos.' 
    },
    { 
      id: 'por-revisar', 
      name: 'Por Revisar', 
      count: processedData.operadores.filter(item => 
        item.subEquipo === 'NO_ENCONTRADO' && isOperadorInExternos(item.operador)
      ).length, 
      description: 'Operadores del proceso actual que se encontraron en la lista del proceso contrario.'
    },
  ]

  // Función para renderizar badge de sub equipo
  const renderSubEquipoBadge = (subEquipo: string) => {
    const displayText = subEquipo === 'NO_ENCONTRADO' ? 'N/A' : subEquipo
    const config: { [key: string]: { bgColor: string; textColor: string; borderColor: string; dotColor: string } } = {
      'EVALUACION': { bgColor: 'bg-blue-50', textColor: 'text-blue-800', borderColor: 'border-blue-200', dotColor: 'bg-blue-500' },
      'REASIGNADOS': { bgColor: 'bg-orange-50', textColor: 'text-orange-800', borderColor: 'border-orange-200', dotColor: 'bg-orange-500' },
      'SUSPENDIDA': { bgColor: 'bg-red-50', textColor: 'text-red-800', borderColor: 'border-red-200', dotColor: 'bg-red-500' },
      'RESPONSABLE': { bgColor: 'bg-green-50', textColor: 'text-green-800', borderColor: 'border-green-200', dotColor: 'bg-green-500' },
    }
    const style = config[subEquipo] || { bgColor: 'bg-gray-50', textColor: 'text-gray-800', borderColor: 'border-gray-200', dotColor: 'bg-gray-500' }

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${style.bgColor} ${style.textColor} border ${style.borderColor}`}>
        <div className={`w-2 h-2 rounded-full mr-1.5 ${style.dotColor}`}></div>
        {displayText}
      </span>
    )
  }

  // Función para exportar CSV
  const exportToCSV = () => {
    const headers = ['OPERADOR', 'SUB EQUIPO', ...processedData.fechasFiltradas.map(f => f.formatted), 'TOTAL']
    const csvData = [
      headers.join(','),
      ...filteredOperators.map(item => [
        `"${item.operador}"`,
        `"${item.subEquipo === 'NO_ENCONTRADO' ? 'N/A' : item.subEquipo}"`,
        ...processedData.fechasFiltradas.map(f => item[f.original] || 0),
        item.total
      ].join(','))
    ]
    
    const blob = new Blob([csvData.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `avance-pendientes-${activeTab}-${selectedProceso}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRegrabarSnapshot = useCallback(async () => {
    setIsRecording(true);
    addToast({
      type: 'info',
      title: "Iniciando regrabación...",
      message: "Esto puede tardar unos segundos.",
    });

    try {
      const response = await fetch('/api/historico/trigger-snapshot', { method: 'POST' });
      const result: SnapshotResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Error del servidor: ${response.status}`);
      }
      
      addToast({
        type: 'success',
        title: "Snapshot Exitoso",
        message: `Se ha regrabado la fecha actual. Refrescando vista...`,
      });

      await queryClient.invalidateQueries({ queryKey: ['avance-pendientes', selectedProceso] });
      await refetch();

    } catch (err) {
      addToast({
        type: 'error',
        title: "Error Inesperado",
        message: err instanceof Error ? err.message : "Ocurrió un error desconocido.",
      });
    } finally {
      setIsRecording(false);
    }
  }, [selectedProceso, refetch, addToast, queryClient]);

  // Efecto para hacer scroll al final por defecto
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollLeft = tableContainerRef.current.scrollWidth;
    }
  }, [processedData.fechasFiltradas]); // Se ejecuta cuando las fechas cambian

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Cargando avance de pendientes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error al cargar los datos: {error.message}</p>
      </div>
    )
  }

  if (!data?.success || !data.data || processedData.fechasFiltradas.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No hay datos históricos disponibles</p>
      </div>
    )
  }

  return (
    <div className={`bg-gray-50 p-4 sm:p-6 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
        <div className="flex items-center mb-4 lg:mb-0">
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mr-4">
            <Activity className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Avance de Pendientes</h3>
            <p className="text-sm text-gray-500">Histórico de pendientes por operador y fecha.</p>
          </div>
        </div>
        <div className="flex items-center text-sm text-gray-600 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200">
          <Calendar className="h-4 w-4 mr-2" />
          {processedData.fechasFiltradas.length} fechas registradas
        </div>
      </div>

      {/* NUEVO: Selector de Período */}
      <div className="mb-4 flex justify-center">
        <div className="flex items-center space-x-1 bg-white p-1.5 rounded-lg shadow-sm border border-gray-200">
          {[7, 15, 30, 60, 90, 180].map((dias) => (
            <button
              key={dias}
              onClick={() => setPeriodoSeleccionado(dias)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                periodoSeleccionado === dias
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-orange-50'
              }`}
            >
              {dias} días
            </button>
          ))}
        </div>
      </div>

      {/* Tabs System */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {`${tab.name} (${tab.count})`}
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {tabs.find(tab => tab.id === activeTab)?.description}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="bg-indigo-100 p-3 rounded-full mr-4">
            <Users className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <span className="text-sm text-gray-500 block">Operadores</span>
            <span className="text-2xl font-bold text-gray-900">{filteredOperators.length}</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="bg-orange-100 p-3 rounded-full mr-4">
            <TrendingDown className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <span className="text-sm text-gray-500 block">Última Fecha</span>
            <span className="text-lg font-bold text-gray-900">
              {processedData.fechasFiltradas[processedData.fechasFiltradas.length - 1]?.formatted || 'N/A'}
            </span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="bg-green-100 p-3 rounded-full mr-4">
            <Activity className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <span className="text-sm text-gray-500 block">Total Actual</span>
            <span className="text-2xl font-bold text-gray-900">
              {filteredOperators.reduce((sum, op) => sum + op.ultimaFecha, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar operador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            />
          </div>
          {activeTab === 'general' && (
            <div className="relative w-full sm:w-64">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
              <select
                value={subEquipoFilter}
                onChange={(e) => setSubEquipoFilter(e.target.value)}
                className="w-full h-10 pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-sm appearance-none"
              >
                <option value="">Todos los sub equipos</option>
                {processedData.subEquipos.map(subEquipo => (
                  <option key={subEquipo} value={subEquipo}>
                    {subEquipo}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRegrabarSnapshot}
            disabled={isRecording}
            className="inline-flex items-center px-3 py-2 border border-orange-300 rounded-md text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRecording ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Regrabar Snapshot de Hoy
          </button>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div ref={tableContainerRef} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 z-20 bg-gray-50 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[250px] w-[250px]">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1.5 text-gray-400" />
                  <span>Operador</span>
                </div>
              </th>
              <th className="sticky left-[250px] z-20 bg-gray-100 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[150px] w-[150px]">
                <span>Sub Equipo</span>
              </th>
              {processedData.fechasFiltradas.map(({ original, formatted }) => (
                <th key={original} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  <div className="flex items-center justify-center">
                    <Calendar className="h-3.5 w-3.5 mr-1 text-gray-400" />
                    <span>{formatted}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOperators.length === 0 ? (
              <tr>
                <td colSpan={processedData.fechasFiltradas.length + 2} className="px-4 py-8 text-center text-gray-500">
                  No hay operadores que coincidan con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredOperators.map((operador, index) => (
                <tr 
                  key={operador.operador}
                  className={`group transition-colors ${operador.colorClass || ''} hover:bg-orange-50 cursor-pointer`}
                  onClick={() => setSelectedOperator(operador)}
                >
                  <td className={`sticky left-0 z-10 px-3 py-2 text-sm font-medium text-gray-900 border-r border-gray-200 transition-colors ${operador.colorClass || 'bg-white'} group-hover:bg-gray-100`}>
                    <div className="whitespace-normal leading-tight text-sm" title={operador.operador}>
                      {operador.operador}
                    </div>
                  </td>
                  <td className={`sticky left-[250px] z-10 px-4 py-3 text-sm text-center transition-colors ${operador.colorClass || 'bg-white'} group-hover:bg-gray-100 border-r border-gray-200`}>
                    {renderSubEquipoBadge(operador.subEquipo)}
                  </td>
                  {processedData.fechasFiltradas.map(({ original }) => {
                    const valor = operador[original] as number || 0
                    return (
                      <td
                        key={original}
                        className="px-2 py-3 text-center text-sm text-gray-900"
                      >
                        <span
                          className={`inline-block px-1.5 py-1 rounded text-xs font-medium min-w-[40px] ${
                            valor === 0
                              ? 'bg-green-100 text-green-800'
                              : valor < 100
                              ? 'bg-yellow-100 text-yellow-800'
                              : valor < 500
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {valor > 0 ? valor.toLocaleString() : '0'}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold text-gray-900">
              <td className="sticky left-0 z-10 px-3 py-3 text-left bg-gray-100 border-r">
                TOTAL PENDIENTES
              </td>
              <td className="sticky left-[250px] z-10 bg-gray-100 border-r"></td>
              {totalesPorDiaFiltrados.map((total, index) => (
                <td key={index} className="px-2 py-3 text-center">
                  <span className="bg-gray-200 px-2 py-1 rounded">
                    {total.Total.toLocaleString()}
                  </span>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Results info */}
      <div className="mt-4 text-sm text-gray-600">
        Mostrando {filteredOperators.length} operadores de {processedData.operadores.length} total
      </div>

      {/* Leyenda de colores por equipo */}
      {reportData?.legend && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Código de Colores por Sub Equipo:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {reportData.legend.map(legend => (
              <div key={legend.subEquipo} className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded ${legend.colorClass}`}></div>
                <p className="text-xs text-gray-500">{legend.subEquipo} ({legend.count})</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leyenda de rangos de pendientes */}
      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Leyenda de Rangos de Pendientes:</h4>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-green-100 border border-green-200 rounded"></span>
            <span className="text-gray-600">0 pendientes</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></span>
            <span className="text-gray-600">1-99 pendientes</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-orange-100 border border-orange-200 rounded"></span>
            <span className="text-gray-600">100-499 pendientes</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-red-100 border border-red-200 rounded"></span>
            <span className="text-gray-600">500+ pendientes</span>
          </div>
        </div>
      </div>
      
      {/* Gráfico de Totales MEJORADO y REUBICADO AL FINAL */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <LineChart className="h-5 w-5 mr-2 text-orange-600"/>
          Evolución de Pendientes Totales (Últimos {periodoSeleccionado} días)
        </h3>
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={totalesPorDiaFiltrados} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 12 }} domain={['dataMin - 100', 'dataMax + 100']} allowDataOverflow />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(5px)',
                  border: '1px solid #e0e0e0',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                }}
                labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
              />
              <Legend verticalAlign="top" height={36} />
              <Area 
                type="monotone" 
                dataKey="Total" 
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#colorTotal)"
                dot={{ r: 4, stroke: '#f97316', fill: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 6, stroke: '#f97316', fill: '#fff', strokeWidth: 2 }}
                name="Pendientes Totales"
              />
              <Line 
                type="monotone"
                dataKey="Tendencia"
                stroke="#4f46e5"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Línea de Tendencia"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ANÁLISIS DE EVOLUCIÓN POR OPERADOR */}
      <OperatorMovers data={filteredOperators} fechas={processedData.fechasFiltradas} />

      {/* RENDERIZADO DEL MODAL */}
      <OperatorTrendModal 
        operatorData={selectedOperator}
        fechas={processedData.fechasFiltradas}
        onClose={() => setSelectedOperator(null)}
      />
    </div>
  )
} 