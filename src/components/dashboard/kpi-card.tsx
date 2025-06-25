'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPI } from "@/types/dashboard"
import { formatNumber, formatCurrency, formatPercentage } from "@/lib/utils"
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface KPICardProps {
  kpi: KPI
  className?: string
}

export function KPICard({ kpi, className }: KPICardProps) {
  const getTrendIcon = () => {
    switch (kpi.trend) {
      case 'up':
        return <ArrowUpIcon className="h-4 w-4 text-green-500" />
      case 'down':
        return <ArrowDownIcon className="h-4 w-4 text-red-500" />
      default:
        return <MinusIcon className="h-4 w-4 text-gray-500" />
    }
  }

  const getTrendColor = () => {
    switch (kpi.trend) {
      case 'up':
        return 'text-green-500'
      case 'down':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const formatValue = (value: number) => {
    if (kpi.unit === '%') return formatPercentage(value)
    if (kpi.unit === '€' || kpi.unit === 'EUR') return formatCurrency(value)
    return formatNumber(value) + (kpi.unit || '')
  }

  return (
    <Card className={cn("transition-all hover:shadow-lg", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {kpi.name}
        </CardTitle>
        <div className="flex items-center space-x-1">
          {getTrendIcon()}
          <span className={cn("text-xs font-medium", getTrendColor())}>
            {formatPercentage(kpi.change, 1)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatValue(kpi.value)}
        </div>
        {kpi.target && (
          <p className="text-xs text-muted-foreground">
            Meta: {formatValue(kpi.target)}
          </p>
        )}
        <div className="text-xs text-muted-foreground">
          Categoría: {kpi.category}
        </div>
      </CardContent>
    </Card>
  )
} 
 
 