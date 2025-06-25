'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
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

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  isRetrying: boolean
  isWakingDB: boolean
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { 
      hasError: false, 
      isRetrying: false,
      isWakingDB: false 
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { 
      hasError: true, 
      error, 
      isRetrying: false,
      isWakingDB: false 
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      isRetrying: false,
      isWakingDB: false 
    })
  }

  handleWakeDB = async () => {
    this.setState({ isWakingDB: true })
    
    try {
      console.log('🌅 Intentando despertar la base de datos...')
      const response = await fetch('/api/dashboard/wake-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const result = await response.json()
      console.log('📊 Resultado de wake-db:', result)
      
      if (result.success) {
        console.log('✅ Base de datos despertada exitosamente')
        // Esperar un momento y luego reintentar
        setTimeout(() => {
          this.setState({ 
            hasError: false, 
            error: undefined, 
            isRetrying: false,
            isWakingDB: false 
          })
        }, 2000)
      } else {
        console.error('❌ Error despertando la base de datos:', result)
        this.setState({ isWakingDB: false })
      }
      
    } catch (error) {
      console.error('❌ Error en wake-db:', error)
      this.setState({ isWakingDB: false })
    }
  }

  render() {
    if (this.state.hasError) {
      const error = this.state.error
      const errorMessage = error?.message || 'Error desconocido'
      
      // Detectar si es un error de base de datos dormida
      const isDatabaseError = errorMessage.includes('503') || 
                             errorMessage.includes('Service Unavailable') ||
                             errorMessage.includes('database') ||
                             errorMessage.includes('connection')

      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={error!} retry={this.handleRetry} />
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center space-y-4">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          
          <h2 className="text-2xl font-bold text-gray-800">
            {isDatabaseError ? 'Base de Datos No Disponible' : 'Algo Salió Mal'}
          </h2>
          
          <p className="text-gray-600 max-w-md">
            {isDatabaseError 
              ? 'La base de datos parece estar dormida. Esto es normal después de un período de inactividad.'
              : 'Se produjo un error inesperado. Por favor, inténtalo de nuevo.'
            }
          </p>
          
          <div className="text-sm text-gray-400 bg-gray-100 p-3 rounded-md max-w-lg overflow-x-auto">
            <strong>Error:</strong> {errorMessage}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {isDatabaseError && (
              <Button 
                onClick={this.handleWakeDB}
                disabled={this.state.isWakingDB}
                variant="default"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {this.state.isWakingDB ? (
                  <>
                    <span className="animate-spin mr-2">🔄</span>
                    Despertando DB...
                  </>
                ) : (
                  <>
                    🌅 Despertar Base de Datos
                  </>
                )}
              </Button>
            )}
            
            <Button 
              onClick={this.handleRetry}
              disabled={this.state.isRetrying || this.state.isWakingDB}
              variant="outline"
            >
              {this.state.isRetrying ? (
                <>
                  <span className="animate-spin mr-2">🔄</span>
                  Reintentando...
                </>
              ) : (
                '🔄 Reintentar'
              )}
            </Button>
          </div>
          
          {isDatabaseError && (
            <div className="text-xs text-gray-500 mt-4 max-w-md">
              💡 <strong>Consejo:</strong> Las bases de datos en la nube a veces se "duermen" por inactividad para ahorrar recursos. 
              El botón "Despertar Base de Datos" ayuda a reactivarla.
            </div>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

// Hook para usar el error boundary de forma más sencilla
export const useErrorHandler = () => {
  const handleError = (error: Error) => {
    console.error('Error manejado por useErrorHandler:', error)
    throw error // Esto será capturado por el ErrorBoundary más cercano
  }

  return { handleError }
} 
 
 