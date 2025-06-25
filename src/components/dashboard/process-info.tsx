'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Process } from "@/types/dashboard"
import { formatDate, formatRelativeTime } from "@/lib/date-utils"
import { User, Clock, Activity, BarChart3 } from "lucide-react"

interface ProcessInfoProps {
  process: Process
  className?: string
}

export function ProcessInfo({ process, className }: ProcessInfoProps) {
  const getStatusColor = (status: Process['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500'
      case 'inactive':
        return 'bg-gray-500'
      case 'maintenance':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = (status: Process['status']) => {
    switch (status) {
      case 'active':
        return 'Activo'
      case 'inactive':
        return 'Inactivo'
      case 'maintenance':
        return 'Mantenimiento'
      default:
        return 'Desconocido'
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Proceso Actual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nombre y estado */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-base">{process.name}</h3>
            <Badge className={`text-white ${getStatusColor(process.status)}`}>
              {getStatusText(process.status)}
            </Badge>
          </div>
          {process.description && (
            <p className="text-sm text-gray-600">{process.description}</p>
          )}
        </div>

        {/* Información detallada */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-gray-500">Propietario:</span>
            <span className="font-medium">{process.owner}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4 text-gray-500" />
            <span className="text-gray-500">Métricas:</span>
            <span className="font-medium">{process.metrics.length}</span>
          </div>

          <div className="flex items-start gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <div className="text-gray-500">Última actualización:</div>
              <div className="font-medium text-xs mt-1">
                {formatDate(process.lastUpdated)}
              </div>
              <div className="text-gray-400 text-xs">
                {formatRelativeTime(process.lastUpdated)}
              </div>
            </div>
          </div>
        </div>

        {/* Métricas destacadas */}
        {process.metrics.length > 0 && (
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Métricas Principales
            </h4>
            <div className="space-y-1">
              {process.metrics.slice(0, 3).map((metric) => (
                <div key={metric.id} className="flex justify-between text-xs">
                  <span className="text-gray-600">{metric.name}</span>
                  <span className="font-medium">
                    {metric.value}{metric.unit}
                  </span>
                </div>
              ))}
              {process.metrics.length > 3 && (
                <div className="text-xs text-gray-500 text-center pt-1">
                  +{process.metrics.length - 3} métricas más
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 
 
 