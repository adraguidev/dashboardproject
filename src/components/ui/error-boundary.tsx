'use client'

import { AlertCircle, RefreshCcw } from 'lucide-react'
import { Card } from './card'

interface ErrorDisplayProps {
  error: string
  onRetry?: () => void
  title?: string
  className?: string
}

export function ErrorDisplay({ 
  error, 
  onRetry, 
  title = 'Error',
  className 
}: ErrorDisplayProps) {
  return (
    <Card className={className}>
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-600 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6 max-w-md">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCcw className="h-4 w-4" />
            Intentar de nuevo
          </button>
        )}
      </div>
    </Card>
  )
}

// Error específico para APIs
export function APIError({ 
  error, 
  onRetry,
  className 
}: Omit<ErrorDisplayProps, 'title'>) {
  return (
    <ErrorDisplay
      error={error}
      onRetry={onRetry}
      title="Error de conexión"
      className={className}
    />
  )
}

// Error para datos no encontrados
export function NotFoundError({ 
  message = 'No se encontraron datos',
  className 
}: { 
  message?: string
  className?: string 
}) {
  return (
    <Card className={className}>
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Sin datos</h3>
        <p className="text-gray-500">{message}</p>
      </div>
    </Card>
  )
} 
 
 