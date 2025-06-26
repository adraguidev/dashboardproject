'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Users } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { useEvaluadoresCRUD, Evaluador } from '@/hooks/use-evaluadores-crud'

interface FormData {
  nombres_apellidos: string
  nombre_en_base: string
  regimen: string
  turno: string
  modalidad: string
  sub_equipo: string
}

const SUB_EQUIPOS = [
  'EVALUACION',
  'REASIGNADOS', 
  'SUSPENDIDA',
  'RESPONSABLE'
]

const REGIMENES = [
  'CAS',
  'LOCADOR'
]

const TURNOS = [
  'ADMINISTRATIVO',
  'MAÑANA',
  'TARDE'
]

const MODALIDADES = [
  'PRESENCIAL',
  'REMOTO'
]

export function GestionEquiposContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedProcess = (searchParams.get('proceso') as 'ccm' | 'prr') || 'ccm'

  const {
    evaluadores,
    loading,
    error,
    refetch,
    createEvaluador,
    updateEvaluador,
    deleteEvaluador,
    creating,
    updating,
    deleting
  } = useEvaluadoresCRUD(selectedProcess)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    nombres_apellidos: '',
    nombre_en_base: '',
    regimen: 'CAS',
    turno: 'ADMINISTRATIVO',
    modalidad: 'PRESENCIAL',
    sub_equipo: 'EVALUACION'
  })
  const [editFormData, setEditFormData] = useState<FormData>({
    nombres_apellidos: '',
    nombre_en_base: '',
    regimen: 'CAS',
    turno: 'ADMINISTRATIVO',
    modalidad: 'PRESENCIAL',
    sub_equipo: 'EVALUACION'
  })

  // El hook useQuery ya maneja automáticamente el cambio de proceso
  // No necesitamos useEffect manual

  const handleProcessChange = (process: 'ccm' | 'prr') => {
    router.push(`/gestion-equipos?proceso=${process}`)
  }

  const handleAdd = async () => {
    if (!formData.nombres_apellidos.trim() || !formData.nombre_en_base.trim()) {
      alert('Los nombres y apellidos, y el nombre en base son requeridos')
      return
    }

    const success = await createEvaluador(selectedProcess, formData)
    if (success) {
      setFormData({ 
        nombres_apellidos: '',
        nombre_en_base: '', 
        regimen: 'CAS',
        turno: 'ADMINISTRATIVO',
        modalidad: 'PRESENCIAL',
        sub_equipo: 'EVALUACION' 
      })
      setShowAddForm(false)
    }
  }

  const handleEdit = (evaluador: Evaluador) => {
    setEditingId(evaluador.id)
    setEditFormData({
      nombres_apellidos: evaluador.nombres_apellidos || '',
      nombre_en_base: evaluador.nombre_en_base,
      regimen: evaluador.regimen || 'CAS',
      turno: evaluador.turno || 'ADMINISTRATIVO',
      modalidad: evaluador.modalidad || 'PRESENCIAL',
      sub_equipo: evaluador.sub_equipo
    })
  }

  const handleUpdate = async () => {
    if (!editFormData.nombre_en_base.trim() || !editingId) {
      return
    }

    const success = await updateEvaluador(selectedProcess, {
      id: editingId,
      ...editFormData
    })
    
    if (success) {
      setEditingId(null)
      setEditFormData({ 
        nombres_apellidos: '',
        nombre_en_base: '', 
        regimen: 'CAS',
        turno: 'ADMINISTRATIVO',
        modalidad: 'PRESENCIAL',
        sub_equipo: 'EVALUACION' 
      })
    }
  }

  const handleDelete = async (id: number, nombre: string) => {
    if (confirm(`¿Estás seguro de eliminar al evaluador "${nombre}"?`)) {
      await deleteEvaluador(selectedProcess, id)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditFormData({ 
      nombres_apellidos: '',
      nombre_en_base: '', 
      regimen: 'CAS',
      turno: 'ADMINISTRATIVO',
      modalidad: 'PRESENCIAL',
      sub_equipo: 'EVALUACION' 
    })
  }

  const getSubEquipoColor = (sub_equipo: string) => {
    switch (sub_equipo) {
      case 'EVALUACION': return 'bg-white border border-gray-300 text-gray-900'
      case 'REASIGNADOS': return 'bg-orange-100 text-orange-800'
      case 'SUSPENDIDA': return 'bg-red-100 text-red-800'
      case 'RESPONSABLE': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading && evaluadores.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500">Error: {error}</div>
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Header con estilo consistente */}
      <DashboardHeader
        selectedProcess={selectedProcess}
        onProcessChange={handleProcessChange}
        onRefresh={() => refetch()}
        loading={loading}
      />
      
      {/* Container principal con ancho consistente */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Navegación y título */}
        <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Dashboard
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-xl font-semibold text-gray-900">Gestión de Equipos</h1>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Añadir Evaluador
          </button>
        </div>

        {/* Formulario de adición con estilo mejorado */}
        {showAddForm && (
          <div className="bg-white border border-gray-200/60 rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Nuevo Evaluador</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nombres y Apellidos</label>
                <input
                  type="text"
                  placeholder="Ingrese nombres y apellidos"
                  value={formData.nombres_apellidos}
                  onChange={(e) => setFormData({ ...formData, nombres_apellidos: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nombre en Base</label>
                <input
                  type="text"
                  placeholder="Ingrese nombre en base"
                  value={formData.nombre_en_base}
                  onChange={(e) => setFormData({ ...formData, nombre_en_base: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Régimen</label>
                <select
                  value={formData.regimen}
                  onChange={(e) => setFormData({ ...formData, regimen: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                >
                  {REGIMENES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Turno</label>
                <select
                  value={formData.turno}
                  onChange={(e) => setFormData({ ...formData, turno: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                >
                  {TURNOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Modalidad</label>
                <select
                  value={formData.modalidad}
                  onChange={(e) => setFormData({ ...formData, modalidad: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                >
                  {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Sub Equipo</label>
                <select
                  value={formData.sub_equipo}
                  onChange={(e) => setFormData({ ...formData, sub_equipo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                >
                  {SUB_EQUIPOS.map(se => <option key={se} value={se}>{se}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setShowAddForm(false)} 
                className="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                disabled={creating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {creating ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}

        {/* Tabla principal con estilo consistente */}
        <div className="bg-white border border-gray-200/60 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombres y Apellidos
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre en Base
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Régimen
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Turno
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modalidad
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sub Equipo
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && evaluadores.length > 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-sm text-gray-600">Actualizando...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && evaluadores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-lg font-medium">No hay evaluadores</p>
                      <p className="text-sm">No se encontraron evaluadores para el proceso {selectedProcess.toUpperCase()}.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                evaluadores.map((evaluador) => (
                  <tr key={evaluador.id} className="hover:bg-gray-50 transition-colors">
                    {editingId === evaluador.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editFormData.nombres_apellidos}
                            onChange={(e) => setEditFormData({ ...editFormData, nombres_apellidos: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editFormData.nombre_en_base}
                            onChange={(e) => setEditFormData({ ...editFormData, nombre_en_base: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                            value={editFormData.regimen}
                            onChange={(e) => setEditFormData({ ...editFormData, regimen: e.target.value })}
                          >
                            {REGIMENES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                            value={editFormData.turno}
                            onChange={(e) => setEditFormData({ ...editFormData, turno: e.target.value })}
                          >
                            {TURNOS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                            value={editFormData.modalidad}
                            onChange={(e) => setEditFormData({ ...editFormData, modalidad: e.target.value })}
                          >
                            {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                            value={editFormData.sub_equipo}
                            onChange={(e) => setEditFormData({ ...editFormData, sub_equipo: e.target.value })}
                          >
                            {SUB_EQUIPOS.map(se => <option key={se} value={se}>{se}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={handleUpdate}
                              disabled={updating}
                              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Guardar cambios"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={handleCancel} 
                              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                              title="Cancelar edición"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          <div className="max-w-xs break-words">{evaluador.nombres_apellidos || '-'}</div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          <div className="max-w-xs break-words font-medium">{evaluador.nombre_en_base}</div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-md">
                            {evaluador.regimen || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-md">
                            {evaluador.turno || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-md">
                            {evaluador.modalidad || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getSubEquipoColor(evaluador.sub_equipo)}`}>
                            {evaluador.sub_equipo}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              onClick={() => handleEdit(evaluador)} 
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar evaluador"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(evaluador.id, evaluador.nombres_apellidos || evaluador.nombre_en_base)}
                              disabled={deleting}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Eliminar evaluador"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
