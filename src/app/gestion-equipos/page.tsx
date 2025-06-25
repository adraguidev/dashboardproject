'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Plus, Edit, Trash2, Save, X } from 'lucide-react'
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

function GestionEquiposContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedProcess = (searchParams.get('proceso') as 'ccm' | 'prr') || 'ccm'

  const {
    evaluadores,
    loading,
    error,
    fetchEvaluadores,
    createEvaluador,
    updateEvaluador,
    deleteEvaluador,
    creating,
    updating,
    deleting
  } = useEvaluadoresCRUD()

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

  // Cargar datos cuando cambia el proceso
  useEffect(() => {
    fetchEvaluadores(selectedProcess)
  }, [selectedProcess, fetchEvaluadores])

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
      case 'SUSPENDIDA': return 'bg-orange-300 text-orange-900'
      case 'RESPONSABLE': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-200 text-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al Dashboard
              </button>
              
              <div className="h-6 w-px bg-gray-300"></div>
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Gestión de Equipos
                </h1>
                <p className="text-sm text-gray-600">
                  Administra los evaluadores del proceso {selectedProcess.toUpperCase()}
                </p>
              </div>
            </div>

            {/* Process Selector */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Proceso:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => handleProcessChange('ccm')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    selectedProcess === 'ccm'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  CCM
                </button>
                <button
                  onClick={() => handleProcessChange('prr')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    selectedProcess === 'prr'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  PRR
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">❌ {error}</p>
            <details className="mt-2">
              <summary className="text-xs text-red-500 cursor-pointer">Detalles técnicos</summary>
              <pre className="text-xs text-red-400 mt-1 whitespace-pre-wrap">{JSON.stringify({error}, null, 2)}</pre>
            </details>
          </div>
        )}

        {/* Stats & Add Button */}
        <div className="mb-6 flex justify-between items-center">
          <div className="text-lg text-gray-700">
            Total de evaluadores: <span className="font-bold text-blue-600">{evaluadores.length}</span>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar Evaluador
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
                    <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Nuevo Evaluador</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nombres y Apellidos"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.nombres_apellidos}
                onChange={(e) => setFormData({ ...formData, nombres_apellidos: e.target.value })}
              />
              <input
                type="text"
                placeholder="Nombre en Base"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.nombre_en_base}
                onChange={(e) => setFormData({ ...formData, nombre_en_base: e.target.value })}
              />
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.regimen}
                onChange={(e) => setFormData({ ...formData, regimen: e.target.value })}
              >
                {REGIMENES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.turno}
                onChange={(e) => setFormData({ ...formData, turno: e.target.value })}
              >
                {TURNOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.modalidad}
                onChange={(e) => setFormData({ ...formData, modalidad: e.target.value })}
              >
                {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.sub_equipo}
                onChange={(e) => setFormData({ ...formData, sub_equipo: e.target.value })}
              >
                {SUB_EQUIPOS.map(se => <option key={se} value={se}>{se}</option>)}
              </select>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
                <div className="bg-white border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombres y Apellidos</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre en Base</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Régimen</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turno</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modalidad</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sub Equipo</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Cargando evaluadores...</p>
                  </td>
                </tr>
              ) : (
                evaluadores.map((evaluador) => (
                  <tr key={evaluador.id} className="hover:bg-gray-50">
                    {editingId === evaluador.id ? (
                      <>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                            value={editFormData.nombres_apellidos}
                            onChange={(e) => setEditFormData({ ...editFormData, nombres_apellidos: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                            value={editFormData.nombre_en_base}
                            onChange={(e) => setEditFormData({ ...editFormData, nombre_en_base: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                            value={editFormData.regimen}
                            onChange={(e) => setEditFormData({ ...editFormData, regimen: e.target.value })}
                          >
                            {REGIMENES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                           <select
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                            value={editFormData.turno}
                            onChange={(e) => setEditFormData({ ...editFormData, turno: e.target.value })}
                          >
                            {TURNOS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <select
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                            value={editFormData.modalidad}
                            onChange={(e) => setEditFormData({ ...editFormData, modalidad: e.target.value })}
                          >
                            {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <select
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                            value={editFormData.sub_equipo}
                            onChange={(e) => setEditFormData({ ...editFormData, sub_equipo: e.target.value })}
                          >
                            {SUB_EQUIPOS.map(se => <option key={se} value={se}>{se}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2 flex items-center gap-2">
                          <button
                            onClick={handleUpdate}
                            disabled={updating}
                            className="text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700">
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-4 text-sm text-gray-700 break-words max-w-xs">{evaluador.nombres_apellidos}</td>
                        <td className="px-2 py-4 text-sm text-gray-700 break-words max-w-xs">{evaluador.nombre_en_base}</td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700">{evaluador.regimen}</td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700">{evaluador.turno}</td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700">{evaluador.modalidad}</td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getSubEquipoColor(evaluador.sub_equipo)}`}>
                            {evaluador.sub_equipo}
                          </span>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                          <button onClick={() => handleEdit(evaluador)} className="text-blue-600 hover:text-blue-800">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(evaluador.id, evaluador.nombres_apellidos || evaluador.nombre_en_base)}
                            disabled={deleting}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}

export default function GestionEquiposPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GestionEquiposContent />
    </Suspense>
  )
} 