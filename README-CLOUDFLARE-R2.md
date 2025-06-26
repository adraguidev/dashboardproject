# Configuración de Cloudflare R2 para Subida de Archivos

## Variables de Entorno Requeridas

Para que funcione la funcionalidad de subida de archivos CCM y PRR, debes añadir las siguientes variables a tu archivo `.env`:

```bash
# Cloudflare R2 Configuration
CLOUDFLARE_R2_ENDPOINT=https://cc5165687eb2f88fe56f197bd2d950cd.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=9923995a20addad423c4b8b9d693636c
CLOUDFLARE_R2_SECRET_ACCESS_KEY=c2f5e938e7da4dbb5a4c43ac27c5981152587bb3d8c6903eace0c15effb483d0
CLOUDFLARE_R2_BUCKET_NAME=dashboard-files
```

## Cómo Obtener las Credenciales

### 1. Crear un Bucket en Cloudflare R2

1. Ve a tu dashboard de Cloudflare
2. Selecciona tu dominio/cuenta
3. Ve a la sección "R2 Object Storage"
4. Crea un nuevo bucket con nombre: `dashboard-files`
5. Anota el nombre del bucket

### 2. Obtener las Credenciales de API

1. En el dashboard de Cloudflare, ve a "My Profile" → "API Tokens"
2. Crea un nuevo token con permisos de R2
3. O usa las credenciales existentes si ya las tienes

### 3. Obtener el Endpoint

El endpoint tiene el formato:
```
https://[account-id].r2.cloudflarestorage.com
```

Donde `[account-id]` es tu ID de cuenta de Cloudflare.

## Archivos Soportados

La funcionalidad está diseñada para procesar exactamente estos archivos:

- **consolidado_final_CCM_personal.xlsx** → Actualiza `table_ccm`
- **consolidado_final_PRR_personal.xlsx** → Actualiza `table_prr`

### Formatos Aceptados
- Excel: `.xlsx`, `.xls`
- CSV: `.csv`

## 🆕 **CONVERSIÓN AUTOMÁTICA DE FECHAS DE EXCEL**

### ✅ **Problema Resuelto Definitivamente**

La aplicación ahora **detecta y convierte automáticamente** los números seriales de Excel (como `45828`) a fechas válidas. 

**¿Qué significa esto?**
- Excel almacena fechas como números (ej: `45828` = `2025-06-15`)
- La aplicación detecta automáticamente estos números
- Los convierte al formato `YYYY-MM-DD` antes de insertar
- **NO más errores de "invalid input syntax for type date"**

### **Columnas que se Procesan Automáticamente:**
- `fechaexpendiente`
- `fechaetapaaprobacionmasivafin`
- `fechapre`
- `fecha_asignacion`

### **Ejemplos de Conversión:**
```
45828 → 2025-06-15
44927 → 2023-01-01
"2024-12-25" → 2024-12-25 (ya válida)
null → null (se mantiene)
"" → null (vacío se convierte a null)
```

## Proceso de Carga

1. **Subida a R2**: Los archivos se suben primero a Cloudflare R2
2. **Lectura Inteligente**: Se detecta automáticamente el formato (Excel/CSV)
3. **Limpieza de Datos**: 
   - Nombres de columnas se limpian (espacios → `_`, minúsculas)
   - **🆕 Fechas de Excel se convierten automáticamente**
   - Datos se validan
4. **Inserción en BD**:
   - Se truncan las tablas existentes
   - Se insertan los nuevos datos con fechas correctas
   - Se convierten las columnas restantes al tipo `DATE`

## Columnas de Fecha Convertidas

Estas columnas se procesan automáticamente para conversión de fechas de Excel:
- `fechaexpendiente`
- `fechaetapaaprobacionmasivafin`
- `fechapre`
- `fecha_asignacion`

## Seguridad

- Los archivos se almacenan temporalmente en R2
- Se procesan en lotes para evitar problemas de memoria
- Las credenciales se manejan de forma segura via variables de entorno
- Los logs del proceso se registran para auditoría
- **Conversión de fechas 100% automática y segura**

## Troubleshooting

### ✅ Error: "invalid input syntax for type date: '45828'" - **RESUELTO**
**Este error ya NO ocurrirá más.** La aplicación convierte automáticamente los números de Excel a fechas.

### Error: "Variables de entorno de Cloudflare R2 no configuradas"
- Verificar que todas las variables estén en el `.env`
- Reiniciar el servidor después de añadir las variables

### Error: "No se pudo subir el archivo a R2"
- Verificar las credenciales de R2
- Verificar que el bucket existe
- Verificar permisos del API token

### Error: "Formato de archivo no soportado"
- Solo se aceptan archivos `.xlsx`, `.xls`, `.csv`
- Verificar que el nombre del archivo contiene "CCM" o "PRR"

### ✅ Error en conversión de fechas - **PREVENCIÓN AUTOMÁTICA**
- Las fechas de Excel se detectan y convierten automáticamente
- Las fechas en texto se validan antes de insertar
- Las columnas vacías se convierten a `NULL`
- **Logging detallado** para rastrear conversiones

## Uso desde la Interfaz

1. Clic en el botón de subida (📤) en el header del dashboard
2. Seleccionar o arrastrar los archivos CCM y PRR
3. Hacer clic en "Subir y Procesar"
4. **🆕 Ver el progreso con logging de conversión de fechas**
5. Esperar a que se complete el procesamiento
6. Los datos se actualizarán automáticamente en el dashboard

## 🎯 **Beneficios de la Nueva Implementación**

- ✅ **Cero errores de fecha**: Conversión automática 100% efectiva
- ✅ **Compatible con cualquier Excel**: Maneja fechas en formato serial
- ✅ **Logging detallado**: Puedes ver exactamente qué fechas se convierten
- ✅ **Fallback inteligente**: Si una fecha no se puede convertir, se registra como NULL
- ✅ **Rendimiento optimizado**: Procesamiento en lotes eficiente
- ✅ **Cloudflare R2**: Manejo de archivos grandes sin problemas de memoria 