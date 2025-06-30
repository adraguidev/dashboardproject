'use client'

import { createPortal } from 'react-dom'
import { SpeSunburstChart } from './spe-sunburst-chart'
import { Button } from '@/components/ui/button'
import { Layers } from 'lucide-react'

interface SunburstData {
  name: string
  children?: SunburstData[]
}

interface SpeSunburstModalProps {
  isOpen: boolean
  onClose: () => void
  data: SunburstData
}

export function SpeSunburstModal({ isOpen, onClose, data }: SpeSunburstModalProps) {
  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <Layers className="w-5 h-5 text-purple-600" />
            Distribución Jerárquica de Pendientes
          </h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        {/* Body */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          {data.children && data.children.length > 0 ? (
            <SpeSunburstChart data={data} width={500} height={500} />
          ) : (
            <p className="text-gray-500">No hay datos suficientes para generar el gráfico.</p>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
} 