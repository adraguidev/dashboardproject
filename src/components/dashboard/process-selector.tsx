'use client'

import { useState } from 'react'
import { Process } from '@/types/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ProcessSelectorProps {
  processes: Process[]
  selectedProcessId?: string
  onProcessSelect: (processId: string) => void
  className?: string
  isLoading?: boolean
}

export function ProcessSelector({ 
  processes, 
  selectedProcessId, 
  onProcessSelect,
  className,
  isLoading = false
}: ProcessSelectorProps) {
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
      <CardHeader>
        <CardTitle>Procesos de Negocio</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {processes.map((process) => (
            <div
              key={process.id}
              onClick={() => onProcessSelect(process.id)}
              className={cn(
                "p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                selectedProcessId === process.id 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{process.name}</h3>
                <Badge variant="secondary" className={cn("text-white", getStatusColor(process.status))}>
                  {getStatusText(process.status)}
                </Badge>
              </div>
              {process.description && (
                <p className="text-sm text-muted-foreground mb-2">
                  {process.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Propietario: {process.owner}</span>
                <span>{process.metrics.length} métricas</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 
 
 