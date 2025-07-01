import React from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Variante opcional (p.ej. 'gray' para fondo gris claro).
   */
  variant?: 'white' | 'gray'
}

/**
 * Contenedor estándar para secciones del dashboard.
 * Proporciona fondo, padding, borde y sombra uniformes.
 */
export const SectionCard = React.forwardRef<HTMLDivElement, SectionCardProps>(
  ({ className = '', variant = 'gray', ...props }, ref) => {
    const baseClasses = variant === 'gray'
      ? 'bg-gray-50'
      : 'bg-white'

    return (
      <Card
        ref={ref}
        className={cn(baseClasses, 'p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200', className)}
        {...props}
      />
    )
  }
)
SectionCard.displayName = 'SectionCard' 