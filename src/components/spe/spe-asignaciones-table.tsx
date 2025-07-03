'use client'

import React, { useState, useMemo } from 'react'
import { useSpeAsignaciones } from '@/hooks/use-spe-asignaciones'
import { FilterSelect } from '@/components/ui/filter-select'
import { SectionCard } from '@/components/ui/section-card'
import { SectionHeader } from '@/components/ui/section-header'
import { ClipboardList, Users, Calendar, Search, Loader2, AlertTriangle, FileText } from 'lucide-react'

export function SpeAsignacionesTable({ className = '' }: { className?: string }) {
  const [diasMostrar, setDiasMostrar] = useState(30)
  const [searchTerm, setSearchTerm] = useState('')
  const { data: apiResponse, isLoading, error } = useSpeAsignaciones(diasMostrar)

  const { data, procesos, metadata, evaluadores } = useMemo(() => {
    const rawData = apiResponse?.data || []
    const filteredData = searchTerm 
      ? rawData.filter(item => item.evaluador.toLowerCase().includes(searchTerm.toLowerCase()))
      : rawData

    return {
      data: filteredData,
      procesos: apiResponse?.metadata.procesos || [],
      evaluadores: filteredData.map(item => item.evaluador),
      metadata: apiResponse?.metadata || { periodoAnalisis: `${diasMostrar} días` }
    }
  }, [apiResponse, searchTerm, diasMostrar])

  const dataMap = useMemo(() => {
    const map = new Map<string, { [proceso: string]: number }>()
    data.forEach(item => {
      map.set(item.evaluador, item.asignacionesPorProceso)
    })
    return map
  }, [data])

  const totalsByEvaluador = useMemo(() => {
    const totals: { [evaluador: string]: number } = {}
    data.forEach(item => {
      totals[item.evaluador] = item.totalAsignaciones
    })
    return totals
  }, [data])

  const totalsByProceso = useMemo(() => {
    const totals: { [proceso: string]: number } = {}
    procesos.forEach(proceso => {
      totals[proceso] = data.reduce((sum, item) => sum + (item.asignacionesPorProceso[proceso] || 0), 0)
    })
    return totals
  }, [data, procesos])

  const grandTotal = useMemo(() => {
    return data.reduce((sum, item) => sum + item.totalAsignaciones, 0)
  }, [data])

  // Mapeo de nombres cortos para los procesos
  const procesoShortNames: { [key: string]: string } = {
    'ACTUALIZACIÓN, INCLUSIÓN, RECTIFICACIÓN Y SUPRESIÓN DE DATOS CON EMISIÓN DE DOCUMENTO': 'ACD CON DOC',
    'ACTUALIZACIÓN, INCLUSIÓN, RECTIFICACIÓN Y SUPRESIÓN DE DATOS SIN EMISIÓN DE DOCUMENTO': 'ACD SIN DOC',
    'CANCELACIÓN DE CALIDAD MIGRATORIA': 'CANCELACION CM',
    'DUPLICADO DE CARNÉ DE EXTRANJERÍA': 'DUP CE',
    'EXPEDICIÓN DE CE POR SOLICITUD DE CALIDAD MIGRATORIA (VISA) O CALIDAD OTORGADA POR MRE (HUMANITARIA, REFUGIADO, ASILADO)': 'EXP. POR VISA O MRE',
    'INSCRIPCIÓN EN REGISTRO CENTRAL DE EXTRANJERÍA (TUPA ANTERIOR)': 'INS. REG. EXTR.',
    'RENOVACIÓN DE CARNET DE EXTRANJERÍA': 'RENOVACION CE',
  }

  // Matriz de cobertura: evaluador vs procesos (excluyendo YMAGALLANES)
  const coberturaPorEvaluador = useMemo(() => {
    const cobertura: { [evaluador: string]: { [proceso: string]: boolean } } = {}
    data.forEach(item => {
      if (item.evaluador === 'YMAGALLANES') return;
      cobertura[item.evaluador] = {}
      procesos.forEach(proceso => {
        cobertura[item.evaluador][proceso] = (item.asignacionesPorProceso[proceso] || 0) > 0
      })
    })
    return cobertura
  }, [data, procesos])
  const evaluadoresFiltrados = useMemo(() => data.filter(item => item.evaluador !== 'YMAGALLANES'), [data])

  if (isLoading) {
    return (
      <SectionCard className={className}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Cargando asignaciones...</p>
          </div>
        </div>
      </SectionCard>
    )
  }

  if (error) {
    return (
      <SectionCard className={className}>
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <div className="flex items-center text-red-700">
            <AlertTriangle className="h-5 w-5 mr-3" />
            <h3 className="font-semibold">Error al Cargar Asignaciones</h3>
          </div>
          <p className="mt-2 text-red-600 text-sm">{error.message}</p>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard className={className}>
      <SectionHeader
        icon={<ClipboardList className="h-6 w-6 text-blue-600" />}
        title="Asignaciones de Expedientes (SPE)"
        description={`Resumen de expedientes asignados en los últimos ${metadata.periodoAnalisis}`}
      />
      
      <div className="my-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar evaluador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        <FilterSelect
          value={diasMostrar}
          onChange={e => setDiasMostrar(Number(e.target.value))}
          icon={<Calendar className="h-4 w-4" />}
          containerClassName="w-full sm:w-40"
        >
          <option value={15}>15 días</option>
          <option value={30}>30 días</option>
          <option value={60}>60 días</option>
        </FilterSelect>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-gray-600">
              <tr className="border-b border-gray-200">
                <th className="sticky left-0 z-10 bg-gray-50 w-64 px-4 py-3 text-left font-semibold uppercase text-xs tracking-wider border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>Evaluador</span>
                  </div>
                </th>
                {procesos.map(proceso => (
                  <th key={proceso} className="w-40 px-4 py-3 text-center font-semibold uppercase text-xs tracking-wider">
                    {procesoShortNames[proceso] || proceso}
                  </th>
                ))}
                <th className="w-32 px-4 py-3 text-center font-semibold uppercase text-xs tracking-wider bg-gray-100 border-l border-gray-200">
                  Total Asignado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {data.map(item => (
                <tr key={item.evaluador} className="hover:bg-gray-50 transition-colors">
                  <td className="sticky left-0 bg-white group-hover:bg-gray-50 w-64 px-4 py-3 text-sm font-medium text-gray-800 border-r border-gray-200">
                    {item.evaluador}
                  </td>
                  {procesos.map(proceso => (
                    <td key={proceso} className="w-40 px-4 py-3 text-center text-sm font-mono text-gray-600">
                      {item.asignacionesPorProceso[proceso] || 0}
                    </td>
                  ))}
                  <td className="w-32 px-4 py-3 text-center text-sm font-bold text-gray-800 bg-gray-100 border-l border-gray-200">
                    {item.totalAsignaciones}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100">
              <tr className="border-t-2 border-gray-200">
                <th className="sticky left-0 z-10 bg-gray-100 px-4 py-3 text-left text-sm font-bold text-gray-800 border-r border-gray-200">
                  TOTAL
                </th>
                {procesos.map(proceso => (
                  <th key={proceso} className="w-40 px-4 py-3 text-center text-sm font-bold font-mono text-gray-800">
                    {totalsByProceso[proceso] || 0}
                  </th>
                ))}
                <th className="w-32 px-4 py-3 text-center text-sm font-bold text-gray-800 bg-gray-200 border-l border-gray-200">
                  {grandTotal}
                </th>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Matriz de cobertura: qué procesos ve cada evaluador (formato tabla principal, sin YMAGALLANES) */}
      <div className="mt-8">
        <SectionHeader
          icon={<FileText className="h-5 w-5 text-blue-500" />}
          title="Cobertura de Evaluadores por Proceso (últimos 30 días)"
          description="Check ✓ indica que el evaluador ha recibido al menos una asignación de ese proceso."
        />
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-gray-600">
                <tr className="border-b border-gray-200">
                  <th className="sticky left-0 z-10 bg-gray-50 w-64 px-4 py-3 text-left font-semibold uppercase text-xs tracking-wider border-r border-gray-200">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span>Evaluador</span>
                    </div>
                  </th>
                  {procesos.map(proceso => (
                    <th key={proceso} className="w-40 px-4 py-3 text-center font-semibold uppercase text-xs tracking-wider">
                      {procesoShortNames[proceso] || proceso}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {evaluadoresFiltrados.map(item => (
                  <tr key={item.evaluador} className="hover:bg-gray-50 transition-colors">
                    <td className="sticky left-0 bg-white group-hover:bg-gray-50 w-64 px-4 py-3 text-sm font-medium text-gray-800 border-r border-gray-200">
                      {item.evaluador}
                    </td>
                    {procesos.map(proceso => (
                      <td key={proceso} className="w-40 px-4 py-3 text-center text-lg font-bold text-green-600">
                        {coberturaPorEvaluador[item.evaluador][proceso] ? '✓' : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SectionCard>
  )
} 