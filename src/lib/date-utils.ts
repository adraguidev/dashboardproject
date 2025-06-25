/**
 * Utilidades para manejo de fechas en el dashboard
 */

export function formatDate(date: Date | string | undefined): string {
  if (!date) return 'N/A'
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    
    // Verificar si la fecha es válida
    if (isNaN(dateObj.getTime())) {
      return 'Fecha inválida'
    }
    
    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Error en fecha'
  }
}

/**
 * Parsea una fecha de manera segura evitando problemas de zona horaria
 * Especialmente útil para fechas en formato ISO YYYY-MM-DD
 */
export function parseDateSafe(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  
  try {
    // Si es formato ISO YYYY-MM-DD, parsear manualmente
    if (dateStr.includes('-') && dateStr.length >= 10) {
      const parts = dateStr.split('T')[0].split('-') // Tomar solo la parte de fecha
      if (parts.length === 3) {
        const year = parseInt(parts[0])
        const month = parseInt(parts[1]) - 1 // Los meses en JS son 0-indexados
        const day = parseInt(parts[2])
        
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          return new Date(year, month, day)
        }
      }
    }
    
    // Si es formato DD/MM/YYYY
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/')
      if (parts.length === 3) {
        const day = parseInt(parts[0])
        const month = parseInt(parts[1]) - 1
        const year = parseInt(parts[2])
        
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          return new Date(year, month, day)
        }
      }
    }
    
    // Fallback para otros formatos
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? null : date
  } catch (error) {
    console.warn('Error parsing date:', dateStr, error)
    return null
  }
}

/**
 * Formatea una fecha de manera segura con opciones personalizadas
 * Evita problemas de zona horaria
 */
export function formatDateSafe(dateStr: string | null | undefined, options: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return 'N/A'
  
  const date = parseDateSafe(dateStr)
  if (!date) return 'Fecha inválida'
  
  try {
    return date.toLocaleDateString('es-ES', options)
  } catch (error) {
    console.error('Error formatting date:', dateStr, error)
    return 'Error en fecha'
  }
}

/**
 * Determina si una fecha es día laborable (lunes a viernes)
 * Evita problemas de zona horaria
 */
export function isWorkday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  
  const date = parseDateSafe(dateStr)
  if (!date) return false
  
  const dayOfWeek = date.getDay() // 0 = domingo, 1 = lunes, ..., 6 = sábado
  return dayOfWeek >= 1 && dayOfWeek <= 5 // Lunes (1) a Viernes (5)
}

/**
 * Obtiene el día de la semana de manera segura
 */
export function getDayOfWeekSafe(dateStr: string | null | undefined): number {
  if (!dateStr) return -1
  
  const date = parseDateSafe(dateStr)
  if (!date) return -1
  
  return date.getDay()
}

/**
 * Formatos rápidos comunes
 */
export const formatDateShort = (dateStr: string | null | undefined): string => {
  return formatDateSafe(dateStr, {
    day: '2-digit',
    month: '2-digit'
  })
}

export const formatDateLong = (dateStr: string | null | undefined): string => {
  return formatDateSafe(dateStr, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export const formatDateMedium = (dateStr: string | null | undefined): string => {
  return formatDateSafe(dateStr, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatDateTime(date: Date | string | undefined): string {
  if (!date) return 'N/A'
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    
    if (isNaN(dateObj.getTime())) {
      return 'Fecha inválida'
    }
    
    return dateObj.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('Error formatting datetime:', error)
    return 'Error en fecha'
  }
}

export function formatRelativeTime(date: Date | string | undefined): string {
  if (!date) return 'N/A'
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    
    if (isNaN(dateObj.getTime())) {
      return 'Fecha inválida'
    }
    
    const now = new Date()
    const diffInMs = now.getTime() - dateObj.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    
    if (diffInDays > 0) {
      return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`
    } else if (diffInHours > 0) {
      return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`
    } else if (diffInMinutes > 0) {
      return `Hace ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`
    } else {
      return 'Hace un momento'
    }
  } catch (error) {
    console.error('Error formatting relative time:', error)
    return 'Error en fecha'
  }
}

export function isValidDate(date: any): boolean {
  if (!date) return false
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    return !isNaN(dateObj.getTime())
  } catch {
    return false
  }
} 
 
 