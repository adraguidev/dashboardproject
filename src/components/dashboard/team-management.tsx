'use client'

import React, { useState, useEffect } from 'react'
import { X, Plus, Edit, Trash2, Save } from 'lucide-react'
import { useEvaluadoresCRUD, Evaluador } from '@/hooks/use-evaluadores-crud'

interface TeamManagementProps {
  isOpen: boolean
  onClose: () => void
  selectedProcess: 'ccm' | 'prr'
}

interface EvaluadorFormData {
  nombre_en_base: string
  sub_equipo: string
}

const SUB_EQUIPOS = [
  'EVALUACION',
  'REASIGNADOS', 
  'SUSPENDIDA',
  'RESPONSABLE'
]

export function TeamManagement({ isOpen, onClose, selectedProcess }: TeamManagementProps) {
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
  const [formData, setFormData] = useState<EvaluadorFormData>({
    nombre_en_base: '',
    sub_equipo: 'EVALUACION'
  })
  const [editFormData, setEditFormData] = useState<EvaluadorFormData>({
    nombre_en_base: '',
    sub_equipo: 'EVALUACION'
  })

  // Cargar datos cuando se abre el modal o cambia el proceso
  useEffect(() => {
    if (isOpen) {
      fetchEvaluadores(selectedProcess)
    }
  }, [isOpen, selectedProcess, fetchEvaluadores])

  const handleAdd = async () => {
    if (!formData.nombre_en_base.trim()) {
      alert('El nombre del evaluador es requerido')
      return
    }

    const success = await createEvaluador(selectedProcess, formData)
    if (success) {
      setFormData({ nombre_en_base: '', sub_equipo: 'EVALUACION' })
      setShowAddForm(false)
    }
  }

  const handleEdit = (evaluador: Evaluador) => {
    setEditingId(evaluador.id)
    setEditFormData({
      nombre_en_base: evaluador.nombre_en_base,
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
      setEditFormData({ nombre_en_base: '', sub_equipo: 'EVALUACION' })
    }
  }

  const handleDelete = async (id: number, nombre: string) => {
    if (confirm(`¿Estás seguro de eliminar al evaluador "${nombre}"?`)) {
      await deleteEvaluador(selectedProcess, id)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditFormData({ nombre_en_base: '', sub_equipo: 'EVALUACION' })
  }

  const getSubEquipoColor = (subEquipo: string) => {
    switch (subEquipo) {
      case 'EVALUACION': return 'bg-white border border-gray-300 text-gray-900'
      case 'REASIGNADOS': return 'bg-orange-100 text-orange-800'
      case 'SUSPENDIDA': return 'bg-orange-300 text-orange-900'
      case 'RESPONSABLE': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-200 text-gray-700'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Gestión de Equipos - {selectedProcess.toUpperCase()}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Administra los evaluadores y sus sub equipos
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">❌ {error}</p>
            </div>
          )}

          {/* Add Button */}
          <div className="mb-6 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Total de evaluadores: <span className="font-semibold">{evaluadores.length}</span>
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
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Agregar Nuevo Evaluador</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nombre en Base *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre_en_base}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre_en_base: e.target.value }))}
                    placeholder="Apellidos, Nombres"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Sub Equipo
                  </label>
                  <select
                    value={formData.sub_equipo}
                    onChange={(e) => setFormData(prev => ({ ...prev, sub_equipo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {SUB_EQUIPOS.map(equipo => (
                      <option key={equipo} value={equipo}>{equipo}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAdd}
                  disabled={creating || !formData.nombre_en_base.trim()}
                  className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {creating ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setFormData({ nombre_en_base: '', sub_equipo: 'EVALUACION' })
                  }}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre en Base
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sub Equipo
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Cargando evaluadores...</span>
                      </div>
                    </td>
                  </tr>
                ) : evaluadores.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No hay evaluadores registrados para {selectedProcess.toUpperCase()}
                    </td>
                  </tr>
                ) : (
                  evaluadores.map((evaluador) => (
                    <tr key={evaluador.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {evaluador.id}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === evaluador.id ? (
                          <input
                            type="text"
                            value={editFormData.nombre_en_base}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, nombre_en_base: e.target.value }))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{evaluador.nombre_en_base}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === evaluador.id ? (
                          <select
                            value={editFormData.sub_equipo}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, sub_equipo: e.target.value }))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {SUB_EQUIPOS.map(equipo => (
                              <option key={equipo} value={equipo}>{equipo}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getSubEquipoColor(evaluador.sub_equipo)}`}>
                            {evaluador.sub_equipo}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingId === evaluador.id ? (
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={handleUpdate}
                              disabled={updating}
                              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Guardar"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancel}
                              className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                              title="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => handleEdit(evaluador)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(evaluador.id, evaluador.nombre_en_base)}
                              disabled={deleting}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              Gestiona los evaluadores del proceso {selectedProcess.toUpperCase()}. 
              Los cambios se reflejan inmediatamente en el dashboard.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 