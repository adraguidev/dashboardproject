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
 
 