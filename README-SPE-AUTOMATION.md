# 🤖 Automatización de Snapshots SPE con GitHub Actions

## 📅 **Snapshot Automático Diario**

El sistema toma automáticamente un snapshot de los pendientes SPE todos los días a las **11:00 PM hora de Perú** usando GitHub Actions.

### ⏰ **Horario Configurado**
- **Hora Local**: 11:00 PM (Perú, UTC-5)
- **Hora UTC**: 4:00 AM del día siguiente
- **Frecuencia**: Todos los días del año

## 🔧 **Configuración Requerida**

### **1. Variables de Entorno en GitHub**
Asegúrate de tener estos secretos configurados en tu repositorio:

```
Repositorio → Settings → Secrets and variables → Actions → Repository secrets
```

**Secretos Requeridos:**
- `API_URL`: URL base de tu aplicación (ej: `https://tu-app.vercel.app`)
- `INTERNAL_API_SECRET`: Token secreto para autenticación interna
- Otros secretos existentes del proyecto

### **2. Variables Ya Configuradas**
El proyecto ya debería tener estos secretos del workflow anterior:
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID` 
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `DATABASE_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## 🚀 **Funcionamiento**

### **Flujo Automático:**
1. **GitHub Actions** se ejecuta a las 11 PM Perú
2. **Llama al endpoint** `/api/historico/spe-snapshot`
3. **Obtiene datos** actuales desde Google Sheets
4. **Guarda snapshot** en base de datos PostgreSQL
5. **Logs detallados** en GitHub Actions

### **Flujo Manual (Botón):**
1. Usuario hace clic en **"Tomar Snapshot"**
2. **Mismo endpoint** pero sin autenticación de GitHub
3. **Resultado inmediato** en la interfaz
4. **Refresh automático** de la tabla

## 📊 **Monitoreo**

### **Ver Ejecuciones:**
```
Repositorio → Actions → SPE Daily Snapshot
```

### **Logs Incluyen:**
- ✅ Hora UTC y hora de Perú
- 📊 Número de evaluadores procesados
- 🔢 Total de pendientes registrados
- ❌ Errores detallados si los hay

### **Testing Manual:**
Puedes ejecutar el workflow manualmente:
```
Repositorio → Actions → SPE Daily Snapshot → Run workflow
```

## 🔍 **Resolución de Problemas**

### **Error de Fecha Incorrecta:**
- Verificar logs de zona horaria en GitHub Actions
- Revisar conversión UTC ↔ Lima en el endpoint

### **Error de Autenticación:**
- Verificar que `INTERNAL_API_SECRET` esté configurado
- Asegurar que coincida con `process.env.INTERNAL_API_SECRET`

### **Error de Google Sheets:**
- Verificar configuración de Google Sheets API
- Revisar permisos de la hoja de SPE

### **Error de Base de Datos:**
- Confirmar que tabla `historico_spe_pendientes` existe
- Verificar `DATABASE_URL` en secretos

## 📅 **Próximos Pasos**

### **Para Activar:**
1. ✅ Crear tabla `historico_spe_pendientes` (SQL proporcionado)
2. ✅ Configurar secretos en GitHub
3. ✅ Hacer push del workflow
4. ✅ Probar ejecución manual
5. ✅ Esperar primera ejecución automática

### **Personalización:**
- **Cambiar horario**: Editar cron en `.github/workflows/spe-daily-snapshot.yml`
- **Agregar notificaciones**: Integrar Slack/Teams en el workflow
- **Múltiples snapshots**: Duplicar workflow con diferentes horarios

## 🎯 **Resultado Final**

Cada día tendrás automáticamente:
- 📈 **Histórico completo** de pendientes SPE
- 📊 **Tabla visual** con filtros por período
- 📋 **Exportación CSV** disponible
- 🔄 **Datos consistentes** sin intervención manual 