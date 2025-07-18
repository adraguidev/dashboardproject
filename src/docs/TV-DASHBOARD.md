# Dashboard para TV - UFSM (Actualizado)

## 🖥️ Descripción General

El Dashboard para TV es una versión especialmente optimizada del dashboard de UFSM para ser mostrado en televisores y pantallas grandes. Está diseñado para funcionar como una presentación automática que rota entre diferentes vistas de datos. **Versión actualizada con soporte completo para CCM, PRR, SPE y VISAS**.

## 🆕 Mejoras Implementadas

### ✅ **Problemas Solucionados**
- **Números grandes**: Ahora usan formato inteligente (K, M) y contenedores flexibles
- **Top 10 pendientes**: Cambio de barras confusas a lista clara con rankings
- **Período de producción**: Reducido de 20 a 5 días para mayor relevancia
- **Compatibilidad total**: SPE y VISAS ahora funcionan correctamente

### ⭐ **Nuevas Características**
- **Vista Avance Pendientes**: Nueva vista con evolución temporal de 30 días
- **Formato inteligente**: Los números grandes se muestran como 1.2K, 3.5M
- **Rankings visuales**: Medallas para top 3 (🥇🥈🥉) y colores distintivos
- **Auto-refresh inteligente**: Refresco específico por proceso (SPE, SOL, CCM, PRR)

## 🚀 Características Principales

### ✨ Optimización para TV
- **Texto grande**: Fuentes optimizadas para visualización a distancia
- **Alto contraste**: Colores y fondos diseñados para máxima legibilidad en TV
- **Interfaz limpia**: Sin elementos distractores, enfoque en los datos principales
- **Responsive**: Se adapta a diferentes tamaños de pantalla

### 🔄 Presentación Automática
- **Rotación automática**: Cambia entre 5 vistas diferentes automáticamente
- **Intervalos configurables**: 10s, 15s, 30s, 1m, 2m entre slides
- **Controles de reproducción**: Play/Pause, avance manual
- **Barra de progreso**: Indica tiempo restante en cada slide

### 📊 6 Vistas Principales

1. **Vista KPIs**: Indicadores principales del proceso seleccionado (adaptado para SPE/SOL)
2. **Vista Pendientes**: Lista optimizada de top 10 operadores con más pendientes (mejor legibilidad en TV)
3. **Vista Ingresos**: Gráfico de área con tendencia de ingresos (30 días)
4. **Vista Producción**: Ranking de operadores más productivos (últimos 5 días)
5. **Vista Avance Pendientes**: Evolución temporal con gráfico y métricas (30 días)
6. **Vista Análisis**: Métricas de eficiencia y distribución por años

### 🔄 Auto-Refresh
- **Actualización automática**: Datos se refrescan cada 5 minutos
- **Refresh inteligente**: Solo actualiza queries relevantes del proceso actual
- **Indicadores visuales**: Muestra cuando los datos están siendo actualizados

## 🎮 Controles y Navegación

### Controles de Teclado
- **ESPACIO**: Play/Pause de la presentación
- **F**: Activar/desactivar pantalla completa
- **ESC**: Salir de pantalla completa

### Controles en Pantalla
- **Selector de proceso**: CCM, PRR, SPE, VISAS
- **Play/Pause**: Control de reproducción
- **Selector de intervalo**: Cambiar velocidad de rotación
- **Pantalla completa**: Botón para modo fullscreen
- **Navegación manual**: Puntos indicadores para saltar a slides específicos

### Auto-Hide de Controles
- Los controles se ocultan automáticamente después de 5 segundos de inactividad
- Mover el mouse o presionar cualquier tecla los hace aparecer de nuevo

## 🛠️ Configuración y Uso

### Acceso
```
URL: https://tu-dominio.com/tv-dashboard
```

### Configuración Recomendada

#### Para TV/Monitor
1. **Resolución**: 1920x1080 o superior
2. **Modo pantalla completa**: Activar (tecla F)
3. **Zoom del navegador**: 100% (o ajustar según distancia de visualización)
4. **Intervalo recomendado**: 30 segundos para visualización general

#### Para Navegador
1. **Navegadores soportados**: Chrome, Firefox, Safari, Edge
2. **JavaScript**: Debe estar habilitado
3. **Conexión**: Estable a internet para auto-refresh

### Pasos de Configuración

1. **Abrir la URL** del dashboard de TV
2. **Seleccionar el proceso** (CCM, PRR, SPE, VISAS)
3. **Configurar intervalo** de rotación según necesidad
4. **Activar pantalla completa** (recomendado para TV)
5. **Iniciar presentación** (automático)

## 📺 Optimizaciones para TV

### Diseño Visual
- **Fondo oscuro**: Reduce fatiga visual y resalta los datos
- **Gradientes suaves**: Fondos con gradientes para mejor visualización
- **Bordes redondeados**: Elementos más amigables visualmente
- **Espaciado generoso**: Mayor separación entre elementos

### Tipografía
- **Títulos**: 48px+ para máxima legibilidad
- **Contenido**: 20px+ escalable según pantalla
- **Fuente**: Sans-serif para mejor legibilidad en pantalla

### Colores
- **Paleta TV-safe**: Colores optimizados para transmisión
- **Alto contraste**: Texto blanco sobre fondos oscuros
- **Colores temáticos**: Azul para CCM, Verde para PRR, etc.

## 🔧 Características Técnicas

### Performance
- **Lazy loading**: Componentes se cargan según demanda
- **Caching inteligente**: Datos en caché para respuesta rápida
- **Transiciones suaves**: Animaciones optimizadas para TV

### Responsividad
- **Grid adaptativo**: Se ajusta automáticamente al tamaño de pantalla
- **Viewport units**: Usa vw/vh para escalado proporcional
- **Breakpoints**: Optimizado para 1920x1080, 4K y pantallas intermedias

### Compatibilidad
- **Navegadores modernos**: Chrome 80+, Firefox 75+, Safari 13+
- **Dispositivos**: PCs, Smart TVs, Tablets en landscape
- **Resoluciones**: 1280x720 mínimo, optimizado para 1920x1080+

## 🚨 Solución de Problemas

### Problemas Comunes

#### La presentación no avanza
- Verificar que esté en modo "Play" (no pausado)
- Revisar la conexión a internet
- Refrescar la página (F5)

#### Texto muy pequeño en TV
- Activar pantalla completa (tecla F)
- Ajustar zoom del navegador (Ctrl + Plus)
- Verificar resolución de la TV

#### Datos no se actualizan
- Los datos se refrescan automáticamente cada 5 minutos
- Forzar refresh moviendo el mouse y presionando F5
- Verificar conexión a internet

#### Controles no aparecen
- Mover el mouse o presionar cualquier tecla
- Los controles se auto-ocultan después de 5 segundos

### Rendimiento Óptimo

#### Recomendaciones de Hardware
- **CPU**: Dual-core 2.0GHz mínimo
- **RAM**: 4GB mínimo, 8GB recomendado
- **GPU**: Aceleración por hardware habilitada
- **Conexión**: 10Mbps mínimo para auto-refresh

#### Configuración del Navegador
```javascript
// Para mejor rendimiento, habilitar:
- Aceleración por hardware
- JavaScript JIT compilation
- CSS Grid y Flexbox
- requestAnimationFrame para animaciones
```

## 📊 Datos Mostrados

### Vista KPIs (Compatible con CCM, PRR, SPE, VISAS)
- Total expedientes pendientes (adaptado por proceso)
- Operadores activos
- Producción total (5 días)
- Promedio diario de producción
- Ingresos últimos 7 días
- Eficiencia de procesamiento
- Balance ingresos vs producción
- **Números con formato inteligente** (K, M para valores grandes)

### Vista Pendientes (Mejorada)
- Top 10 operadores con más pendientes
- **Lista optimizada con rankings** en lugar de barras
- **Nombres completos** de operadores (hasta 40 caracteres)
- **Porcentajes** del total por operador
- **Medallas** para top 3 (oro, plata, bronce)

### Vista Ingresos
- Tendencia de ingresos (30 días)
- Gráfico de área con gradiente
- Métricas de período, promedio y máximo

### Vista Producción (Optimizada)
- Top 10 operadores más productivos
- **Período reducido** a últimos 5 días
- Gráfico de barras por cantidad procesada
- Métricas de productividad total

### Vista Avance Pendientes (Nueva)
- **Evolución temporal** de pendientes totales (30 días)
- **Gráfico de área** con tendencia
- **Top 5 operadores** actuales
- **Métricas de variación** día a día
- **Compatible** con CCM, PRR, SPE y VISAS

### Vista Análisis
- Distribución de pendientes por año (gráfico circular)
- Métricas de eficiencia general
- Velocidad de procesamiento
- Balance entre ingresos y producción

## 🔄 Actualizaciones y Mantenimiento

### Auto-Refresh
- **Frecuencia**: Cada 5 minutos automáticamente
- **Datos actualizados**: Solo del proceso actualmente seleccionado
- **Indicadores**: Se muestra timestamp de última actualización

### Logs y Monitoreo
```javascript
// Los logs aparecen en Console del navegador:
🔄 [TV Auto-Refresh] Refrescando datos para proceso: ccm
✅ [TV Auto-Refresh] Datos refrescados exitosamente
⏰ [TV Auto-Refresh] Configurado para refrescar cada 5 minutos
```

### Mantenimiento
- **Cache**: Se limpia automáticamente
- **Memoria**: Optimizada para uso prolongado
- **Conexión**: Reconexión automática en caso de pérdida

---

## 🎯 Casos de Uso Recomendados

### Salas de Monitoreo
- Intervalo: 30-60 segundos
- Proceso: Rotar entre CCM y PRR cada hora
- Pantalla completa: Siempre activa

### Oficinas Abiertas
- Intervalo: 15-30 segundos
- Proceso: El más relevante para el área
- Audio: Silenciado

### Presentaciones Ejecutivas
- Intervalo: 60-120 segundos
- Control manual: Usar puntos de navegación
- Proceso: Mostrar múltiples según agenda

---

*Dashboard TV desarrollado para UFSM - Optimizado para experiencia en pantallas grandes* 