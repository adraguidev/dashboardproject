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
 * Parsea una fecha de manera segura forzando UTC para evitar problemas de zona horaria.
 * Cuando se recibe '2024-07-20', se interpreta como medianoche UTC de ese día.
 */
export function parseDateSafe(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  try {
    // Regex para YYYY-MM-DD
    const isoDateRegex = /^([0-9]{4})-([0-9]{2})-([0-9]{2})/;
    const matchIso = dateStr.match(isoDateRegex);
    if (matchIso) {
      const year = parseInt(matchIso[1], 10);
      const month = parseInt(matchIso[2], 10) - 1;
      const day = parseInt(matchIso[3], 10);
      return new Date(Date.UTC(year, month, day));
    }
    // Regex para dd/mm/yyyy o d/m/yyyy
    const latamDateRegex = /^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})/;
    const matchLatam = dateStr.match(latamDateRegex);
    if (matchLatam) {
      const day = parseInt(matchLatam[1], 10);
      const month = parseInt(matchLatam[2], 10) - 1;
      const year = parseInt(matchLatam[3], 10);
      return new Date(Date.UTC(year, month, day));
    }
    // Fallback para otros formatos
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  } catch (error) {
    console.warn('Error parsing date:', dateStr, error)
    return null
  }
}

/**
 * Formatea una fecha de manera segura con opciones personalizadas
 * Evita problemas de zona horaria forzando la salida en UTC.
 */
export function formatDateSafe(dateStr: string | null | undefined, options: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return 'N/A'
  
  const date = parseDateSafe(dateStr)
  if (!date) return 'Fecha inválida'
  
  try {
    // Forzamos la zona horaria a UTC para que no dependa del navegador.
    return date.toLocaleDateString('es-ES', { ...options, timeZone: 'UTC' })
  } catch (error) {
    console.error('Error formatting date:', dateStr, error)
    return 'Error en fecha'
  }
}

/**
 * Determina si una fecha es día laborable (lunes a viernes) usando UTC.
 * Esto asegura que el día de la semana sea consistente sin importar el timezone.
 */
export function isWorkday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  
  const date = parseDateSafe(dateStr)
  if (!date) return false
  
  // getUTCDay() devuelve 0 para Domingo, 1 para Lunes, ..., 6 para Sábado.
  const dayOfWeek = date.getUTCDay()
  
  // Lunes (1) a Viernes (5) se consideran días laborables.
  return dayOfWeek >= 1 && dayOfWeek <= 5
}

/**
 * Obtiene el día de la semana de manera segura
 */
export function getDayOfWeekSafe(dateStr: string | null | undefined): number {
  if (!dateStr) return -1
  
  const date = parseDateSafe(dateStr)
  if (!date) return -1
  
  // Usamos getUTCDay para que el cálculo sea independiente de la zona horaria
  // y sea consistente con la función isWorkday().
  return date.getUTCDay()
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
 
 