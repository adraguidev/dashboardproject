'use client'

import React, { useState, useRef, useEffect } from 'react'
import { RefreshCcw, Settings, Bell, ChevronDown, Users, Upload } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { FileUploadModal } from '@/components/ui/file-upload-modal'
import { ProcessKey } from '@/types/dashboard'

interface DashboardHeaderProps {
  selectedProcess?: ProcessKey
  onProcessChange?: (process: ProcessKey) => void
  onRefresh?: () => void
  loading?: boolean
}

export function DashboardHeader({ 
  selectedProcess = 'ccm', 
  onProcessChange, 
  onRefresh,
  loading = false
}: DashboardHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const processes: Record<ProcessKey, { name: string; fullName: string; color: string }> = {
    ccm: { name: 'CCM', fullName: 'Cambio de Calidad Migratoria', color: 'bg-blue-500' },
    prr: { name: 'PRR', fullName: 'Prórroga de Residencia', color: 'bg-emerald-500' },
    spe: { name: 'SPE', fullName: 'Servicios Prestados por Exclusividad', color: 'bg-purple-500' },
    pas: { name: 'PAS', fullName: 'Solicitud de Visas', color: 'bg-yellow-500' }
  }

  const currentProcess = processes[selectedProcess]

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleProcessSelect = (process: ProcessKey) => {
    onProcessChange?.(process)
    setShowDropdown(false)
  }

  return (
    <div className="bg-white border-b border-gray-200/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: Logo + Process Selector */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3 sm:gap-6">
              {/* Logo/Title */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">U</span>
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold text-gray-900">UFSM Dashboard</h1>
                  <div className="text-xs text-gray-500 hidden sm:block">Gestión de Expedientes</div>
                </div>
              </div>

              {/* Process Selector */}
              {onProcessChange && (
                <div className="hidden md:flex items-center gap-3">
                  <span className="text-sm text-gray-500">Proceso:</span>
                  <div className="relative" ref={dropdownRef}>
                    <button 
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors group"
                    >
                      <div className={`w-2 h-2 rounded-full ${currentProcess.color}`}></div>
                      <span className="font-medium text-gray-900">{currentProcess.name}</span>
                      <span className="text-xs text-gray-500 hidden lg:inline">
                        {currentProcess.fullName}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Dropdown */}
                    {showDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50 min-w-[280px]">
                        {Object.entries(processes).map(([key, process]) => (
                          <button
                            key={key}
                            onClick={() => handleProcessSelect(key as ProcessKey)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                              selectedProcess === key ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full ${process.color}`}></div>
                            <div>
                              <div className="font-medium text-gray-900">{process.name}</div>
                              <div className="text-xs text-gray-500">{process.fullName}</div>
                            </div>
                            {selectedProcess === key && (
                              <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Right: Status + Actions (Mobile) */}
            <div className="flex md:hidden items-center gap-1">
              <button
                onClick={onRefresh}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Actualizar datos"
              >
                <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {/* User Avatar */}
              <div className="ml-1 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-medium text-sm">A</span>
              </div>
            </div>
          </div>

          {/* Combined Controls (Mobile) / Process Selector (Tablet) */}
          <div className="w-full md:w-auto md:hidden">
            <div className="flex flex-col gap-3 bg-gray-50 p-3 rounded-lg border">
                {onProcessChange && (
                    <div className="flex items-center gap-3">
                        <label htmlFor="process-select-mobile" className="text-sm font-medium text-gray-700">Proceso:</label>
                        <select 
                            id="process-select-mobile"
                            value={selectedProcess}
                            onChange={(e) => handleProcessSelect(e.target.value as ProcessKey)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        >
                            {Object.entries(processes).map(([key, process]) => (
                                <option key={key} value={key}>{process.name} - {process.fullName}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                     <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex flex-col items-center justify-center gap-1 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-xs"
                        title="Subir Archivos"
                    >
                        <Upload className="w-4 h-4" />
                        <span>Subir</span>
                    </button>
                     <button
                        onClick={() => window.location.href = `/gestion-equipos?proceso=${selectedProcess}`}
                        className="flex flex-col items-center justify-center gap-1 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-xs"
                        title="Gestión de Equipos"
                    >
                        <Users className="w-4 h-4" />
                        <span>Equipos</span>
                    </button>
                    <button
                        className="flex flex-col items-center justify-center gap-1 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-xs"
                        title="Configuración"
                    >
                        <Settings className="w-4 h-4" />
                        <span>Ajustes</span>
                    </button>
                </div>
            </div>
          </div>

          {/* Right: Status + Actions (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            {/* Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-700">Sistema Activo</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={onRefresh}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Actualizar datos"
              >
                <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setShowUploadModal(true)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Subir Archivos de Datos"
              >
                <Upload className="w-4 h-4" />
              </button>

              <button
                onClick={() => window.location.href = `/gestion-equipos?proceso=${selectedProcess}`}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Gestión de Equipos"
              >
                <Users className="w-4 h-4" />
              </button>
              
              <button
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative"
                title="Notificaciones"
              >
                <Bell className="w-4 h-4" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-[10px] text-white font-bold">2</span>
                </div>
              </button>
              
              <button
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Configuración"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* User Avatar */}
              <div className="ml-2 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-medium text-sm">A</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Upload Modal - Renderizado como portal */}
      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={() => {
          onRefresh?.() // Refrescar datos después de subir archivos
        }}
      />
    </div>
  )
} 
 
 