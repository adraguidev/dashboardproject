# Registro de Advertencias del Linter (ESLint)

Este documento sirve como un registro de las advertencias (warnings) de ESLint identificadas durante el proceso de `build` en Heroku. Aunque estas advertencias no impiden que la aplicación se compile y despliegue, solucionarlas es una buena práctica para mejorar la calidad, mantenibilidad y robustez del código.

## Plan de Acción

El objetivo es reducir a cero el número de advertencias. Se pueden abordar en el orden que se prefiera, ya sea por tipo de advertencia o por archivo.

---

### 1. Uso Inesperado del Tipo `any`

- **Regla:** `@typescript-eslint/no-explicit-any`
- **Problema:** El uso del tipo `any` desactiva la verificación de tipos de TypeScript para una variable o parámetro. Esto puede ocultar errores que solo se manifestarán en tiempo de ejecución. El objetivo es proporcionar tipos más específicos siempre que sea posible.
- **Archivos Afectados:**
  - `src/app/api/cache/clear/route.ts`
  - `src/app/api/dashboard/ai-data/route.ts`
  - `src/app/api/dashboard/evaluadores/route.ts`
  - `src/app/api/dashboard/ingresos/route.ts`
  - `src/app/api/dashboard/pendientes/route.ts`
  - `src/app/api/dashboard/pendientes-report/route.ts`
  - `src/app/api/dashboard/produccion/route.ts`
  - `src/app/api/dashboard/produccion-report/route.ts`
  - `src/app/api/database/inspect/route.ts`
  - `src/app/api/debug-jwt/route.ts`
  - `src/app/api/test-auth/route.ts`
  - `src/app/dashboard/page.tsx`
  - `src/app/debug-jwt/page.tsx`
  - `src/app/handler/[...stack]/page.tsx`
  - `src/app/test-auth/page.tsx`
  - `src/components/providers/query-provider.tsx`
  - `src/components/ui/advanced-data-table.tsx`
  - `src/components/ui/dynamic-table.tsx`
  - `src/components/ui/ingresos-chart.tsx`
  - `src/components/ui/monthly-ingresos-table.tsx`
  - `src/components/ui/produccion-chart.tsx`
  - `src/components/ui/produccion-report-table.tsx`
  - `src/components/ui/weekly-ingresos-table.tsx`
  - `src/hooks/use-dashboard-api.ts`
  - `src/hooks/use-dashboard-unified.ts`
  - `src/hooks/use-pendientes-report.ts`
  - `src/hooks/use-pendientes.ts`
  - `src/hooks/use-produccion-report.ts`
  - `src/lib/date-utils.ts`
  - `src/lib/db.ts`
  - `src/lib/logger.ts`
  - `src/lib/neon-api.ts`
  - `src/lib/server-cache.ts`
  - `src/types/dashboard.ts`

### 2. Variables, Funciones o Importaciones No Utilizadas

- **Regla:** `@typescript-eslint/no-unused-vars`
- **Problema:** Código declarado (variables, funciones, importaciones) que nunca se utiliza. Este "código muerto" aumenta el desorden, confunde a los desarrolladores y puede ocultar bugs (por ejemplo, si se pensaba usar una variable pero se usó otra por error).
- **Archivos Afectados:**
  - `src/app/api/dashboard/ingresos/route.ts`
  - `src/app/api/dashboard/pendientes/route.ts`
  - `src/app/api/dashboard/produccion/route.ts`
  - `src/app/dashboard/page.tsx`
  - `src/components/dashboard/dashboard-header.tsx`
  - `src/components/dashboard/database-status.tsx`
  - `src/components/dashboard/process-modules.tsx`
  - `src/components/dashboard/process-selector.tsx`
  - `src/components/dashboard/team-management.tsx`
  - `src/components/ui/advanced-data-table.tsx`
  - `src/components/ui/advanced-pendientes-report-table.tsx`
  - `src/components/ui/dynamic-table.tsx`
  - `src/components/ui/gestion-equipos-content.tsx`
  - `src/components/ui/ingresos-chart.tsx`
  - `src/components/ui/monthly-ingresos-table.tsx`
  - `src/components/ui/pendientes-report-table.tsx`
  - `src/components/ui/produccion-chart.tsx`
  - `src/components/ui/produccion-report-table.tsx`
  - `src/components/ui/weekly-ingresos-table.tsx`
  - `src/hooks/use-dashboard.ts`
  - `src/hooks/use-evaluadores-crud.ts`
  - `src/hooks/use-pendientes-report.ts`
  - `src/hooks/use-pendientes.ts`
  - `src/hooks/use-produccion-report.ts`
  - `src/lib/db.ts`
  - `src/lib/neon-api.ts`
  - `src/lib/server-cache.ts`

### 3. Dependencias Faltantes en Hooks de React

- **Regla:** `react-hooks/exhaustive-deps`
- **Problema:** Un `useEffect` o `useCallback` utiliza una variable o función externa que puede cambiar, pero no la declara en su array de dependencias. Esto puede causar que el hook no se actualice cuando los datos cambian, llevando a comportamientos inesperados y "stale state" (estado desactualizado).
- **Archivos Afectados:**
  - `src/hooks/use-evaluadores.ts`
  - `src/hooks/use-pendientes.ts` 