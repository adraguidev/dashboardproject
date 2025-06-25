import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatCurrency(value: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
  }).format(value)
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${formatNumber(value, decimals)}%`
}

export function calculateTrend(current: number, previous: number): {
  trend: 'up' | 'down' | 'stable'
  change: number
} {
  if (current === previous) return { trend: 'stable', change: 0 }
  
  const change = ((current - previous) / previous) * 100
  const trend = change > 0 ? 'up' : 'down'
  
  return { trend, change: Math.abs(change) }
} 
 
 