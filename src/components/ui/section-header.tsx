import React from 'react'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  /**
   * Icono principal que se mostrará a la izquierda. Puede ser un elemento SVG, un componente Lucide, etc.
   */
  icon: React.ReactNode
  /**
   * Título principal de la sección.
   */
  title: string
  /**
   * Descripción corta opcional.
   */
  description?: string
  /**
   * Elementos que se renderizarán a la derecha (botones, selectores, etc.)
   */
  actions?: React.ReactNode
  /**
   * Clases tailwind adicionales.
   */
  className?: string
}

/**
 * Encabezado estándar para todas las secciones que requieran consistencia visual.
 * Incluye un icono redondeado, título, descripción y zona de acciones.
 */
export function SectionHeader({
  icon,
  title,
  description,
  actions,
  className = '',
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6',
        className
      )}
    >
      {/* Icono + Títulos */}
      <div className="flex items-center">
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mr-4">
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
      </div>

      {/* Acciones opcionales */}
      {actions && (
        <div className="flex items-center space-x-2">
          {actions}
        </div>
      )}
    </div>
  )
} 