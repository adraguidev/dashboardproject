# 📅 Guía para Manejo Seguro de Fechas

## ⚠️ **Problema Común: Zona Horaria**

Al usar `new Date(dateStr)` con fechas en formato ISO `YYYY-MM-DD`, JavaScript interpreta la fecha en UTC y luego la convierte a la zona horaria local, causando desfases de días.

### ❌ **Evitar:**
```javascript
// PROBLEMÁTICO - Puede causar desfase de fechas
new Date("2025-06-24") // Puede mostrar 23/6 en lugar de 24/6
new Date(dateStr).toLocaleDateString()
```

### ✅ **Usar siempre las utilidades de `@/lib/date-utils`:**

## 🛠️ **Funciones Disponibles**

### **1. Parsing Seguro**
```javascript
import { parseDateSafe } from '@/lib/date-utils'

// Parsea YYYY-MM-DD, DD/MM/YYYY y otros formatos
const date = parseDateSafe("2025-06-24") // ✅ Sin problemas de zona horaria
```

### **2. Formateo Seguro**
```javascript
import { formatDateSafe, formatDateShort, formatDateMedium } from '@/lib/date-utils'

// Formateo personalizado
const formatted = formatDateSafe("2025-06-24", { day: '2-digit', month: '2-digit' })

// Formatos rápidos
const short = formatDateShort("2025-06-24")     // "24/06"
const medium = formatDateMedium("2025-06-24")   // "24 jun 2025"
```

### **3. Días Laborables**
```javascript
import { isWorkday, getDayOfWeekSafe } from '@/lib/date-utils'

const esLaborable = isWorkday("2025-06-24")     // boolean
const diaSemana = getDayOfWeekSafe("2025-06-24") // 0-6 (0=domingo)
```

## 📋 **Reglas de Desarrollo**

### **1. SIEMPRE usar las utilidades:**
- ❌ `new Date(dateStr)`
- ✅ `parseDateSafe(dateStr)`

### **2. En componentes UI:**
```javascript
import { formatDateShort, formatDateSafe } from '@/lib/date-utils'

// Para tooltips y displays
const displayDate = formatDateShort(fecha)
const tooltipDate = formatDateSafe(fecha, { weekday: 'long', day: 'numeric', month: 'long' })
```

### **3. En APIs y procesamiento:**
```javascript
import { parseDateSafe, isWorkday } from '@/lib/date-utils'

// Para filtros y lógica de negocio
const fechaObj = parseDateSafe(record.fecha)
const esDiaLaboral = isWorkday(record.fecha)
```

### **4. En nuevos componentes:**
**NUNCA** crear funciones locales de formateo. Usar las utilidades globales.

## 🔍 **Detectar Problemas Existentes**

### Buscar en el código:
```bash
# Buscar usos problemáticos
grep -r "new Date(" src/
grep -r "toLocaleDateString" src/
```

### Señales de problemas:
- Fechas que muestran un día anterior en tooltips
- Inconsistencias entre fechas mostradas y datos reales
- Diferentes comportamientos entre desarrollo y producción

## 🧪 **Testing**

Siempre probar con fechas problemáticas:
- Fechas en el futuro: `2025-06-24`
- Fechas límite de mes: `2025-06-30`, `2025-07-01`
- Fin de semana vs días laborables

## 💡 **Ejemplos de Refactoring**

### Antes (problemático):
```javascript
const formatDate = (dateStr) => {
  const date = new Date(dateStr) // ❌ Problema de zona horaria
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
}
```

### Después (seguro):
```javascript
import { formatDateShort } from '@/lib/date-utils'

const formatDate = formatDateShort // ✅ Reutiliza utilidad global
```

---

**🎯 Objetivo:** Eliminar completamente los problemas de zona horaria y mantener consistencia en todo el proyecto. 