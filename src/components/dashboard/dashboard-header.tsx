'use client'

import React, { useState, useRef, useEffect } from 'react'
import { RefreshCcw, Settings, Bell, ChevronDown, Users, Upload } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { FileUploadModal } from '@/components/ui/file-upload-modal'
import { ProcessKey } from '@/types/dashboard'
import { motion, AnimatePresence } from 'framer-motion'

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
    <div className="bg-gradient-to-b from-white to-gray-50 border-b border-gray-200/60 shadow-sm backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 relative">
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

              {/* Process Selector - NOW CENTERED on desktop */}
              {onProcessChange && (
                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="relative" ref={dropdownRef}>
                    <button 
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50/50 hover:bg-white border border-gray-200/80 hover:border-gray-300 rounded-lg transition-colors group shadow-sm"
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
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden z-50 min-w-[300px]"
                      >
                        {Object.entries(processes).map(([key, process]) => (
                          <button
                            key={key}
                            onClick={() => handleProcessSelect(key as ProcessKey)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors relative group
                              ${selectedProcess === key ? 'bg-blue-50' : ''}
                            `}
                          >
                            {selectedProcess === key && (
                              <motion.div
                                layoutId="process-active-indicator"
                                className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"
                              />
                            )}
                            <div className={`w-2.5 h-2.5 rounded-full ${process.color} flex-shrink-0`}></div>
                            <div>
                              <div className="font-medium text-gray-900">{process.name}</div>
                              <div className="text-xs text-gray-500">{process.fullName}</div>
                            </div>
                            <div className={`ml-auto w-2 h-2 rounded-full transition-opacity duration-200 ${selectedProcess === key ? 'bg-blue-500 opacity-100' : 'opacity-0 group-hover:opacity-50'}`}></div>
                          </button>
                        ))}
                      </motion.div>
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
                <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : !loading && 'group-hover:rotate-90 transition-transform'}`} />
              </button>
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
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Actualizar datos"
              >
                <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : !loading && 'group-hover:rotate-90 transition-transform'}`} />
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
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Configuración"
              >
                <Settings className="w-4 h-4" />
              </button>
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
 
 