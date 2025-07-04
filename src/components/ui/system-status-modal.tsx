'use client'

import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertTriangle, Database, Clock, Server, Table } from 'lucide-react'
import { Button } from './button'
import { Badge } from './badge'

interface SystemStatusModalProps {
  isOpen: boolean
  onClose: () => void
  statusData: any // Debería ser una interfaz más específica
  isLoading: boolean
  error: Error | null
}

export function SystemStatusModal({ isOpen, onClose, statusData, isLoading, error }: SystemStatusModalProps) {
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  }

  const modalVariants = {
    hidden: { opacity: 0, y: -50, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 50, scale: 0.95 },
  }

  const renderStatusBadge = () => {
    if (isLoading) {
      return <Badge variant="secondary">Verificando...</Badge>
    }
    if (error) {
      return <Badge variant="destructive">Error</Badge>
    }
    if (statusData?.status === 'healthy') {
      return <Badge className="bg-green-100 text-green-800">Saludable</Badge>
    }
    return <Badge variant="destructive">Desconocido</Badge>
  }

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen) {
    return null;
  }

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm"
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={backdropVariants}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Server className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Estado del Sistema</h2>
                <p className="text-sm text-gray-500">Información en tiempo real sobre los servicios.</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-6 bg-gray-50/70">
            {isLoading && (
              <div className="text-center py-12">
                <p className="text-gray-600">Cargando estado del sistema...</p>
              </div>
            )}
            {error && (
              <div className="text-center py-12 text-red-600">
                <AlertTriangle className="mx-auto h-10 w-10 mb-4" />
                <h3 className="text-lg font-semibold">Error al verificar el estado</h3>
                <p className="text-sm">{error.message}</p>
              </div>
            )}
            {statusData && !error && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Columna Izquierda: Estado General */}
                <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm">
                  <h3 className="font-semibold text-lg text-gray-800 mb-4">Base de Datos Principal</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500"/>Estado General</span>
                      {renderStatusBadge()}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-2"><Database className="w-4 h-4 text-gray-400"/>Tipo</span>
                      <span className="font-medium text-gray-800">{statusData.details?.database}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400"/>Tiempo de Respuesta</span>
                      <span className="font-medium text-gray-800">{statusData.details?.responseTime}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400"/>Última Verificación</span>
                      <span className="font-medium text-gray-800 text-xs">{new Date(statusData.details?.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Conteo de Tablas */}
                <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm">
                  <h3 className="font-semibold text-lg text-gray-800 mb-4">Registros por Tabla</h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                    {statusData.details?.tablesCounts.map((table: any) => (
                      <div key={table.table} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-2"><Table className="w-4 h-4 text-gray-400"/>{table.table}</span>
                        <span className="font-mono font-medium text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{table.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-100 border-t border-gray-200 text-right rounded-b-2xl">
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.getElementById('modal-root') as HTMLElement
  );
}
