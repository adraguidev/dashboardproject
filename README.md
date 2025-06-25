# UFSM Dashboard

Dashboard avanzado para análisis de KPIs, métricas y procesos de negocio construido con Next.js, React, TypeScript y PostgreSQL.

## 🚀 Características

- **📊 KPIs Avanzados**: Visualización de métricas clave con tendencias y comparativas
- **📈 Gráficos Interactivos**: Múltiples tipos de gráficos usando Recharts
- **🔄 Gestión de Procesos**: Organización por procesos de negocio
- **🎨 Personalización**: Dashboard completamente personalizable
- **📱 Responsive**: Diseño adaptable a todos los dispositivos
- **⚡ Filtrado Avanzado**: Filtros dinámicos para análisis detallado
- **🗄️ Base de Datos**: Integración con PostgreSQL via Prisma
- **🔒 TypeScript**: Totalmente tipado para mejor desarrollo

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4, Radix UI
- **Charts**: Recharts
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Forms**: React Hook Form + Zod
- **State**: React Query (TanStack Query)

## 📁 Estructura del Proyecto

```
ufsm-dashboard/
├── src/
│   ├── app/                    # App Router (Next.js 13+)
│   │   ├── dashboard/          # Página principal del dashboard
│   │   ├── api/                # API Routes
│   │   ├── layout.tsx          # Layout principal
│   │   └── globals.css         # Estilos globales
│   ├── components/             # Componentes React
│   │   ├── ui/                 # Componentes base de UI
│   │   ├── dashboard/          # Componentes del dashboard
│   │   └── charts/             # Componentes de gráficos
│   ├── lib/                    # Utilidades y configuración
│   ├── hooks/                  # Custom hooks
│   ├── types/                  # Tipos TypeScript
│   └── data/                   # Datos de ejemplo
├── prisma/                     # Esquema de base de datos
├── public/                     # Archivos estáticos
└── ...
```

## 🚦 Inicio Rápido

### Prerrequisitos

- Node.js 18+ 
- pnpm (recomendado)
- PostgreSQL database (Neon recomendado)

### Instalación

1. **Clonar el repositorio**
```bash
git clone <repo-url>
cd ufsm-dashboard
```

2. **Instalar dependencias**
```bash
pnpm install
```

3. **Configurar variables de entorno**
Copiar `.env.example` a `.env` y configurar:
```bash
cp .env.example .env
```

Editar `.env`:
```env
# Neon PostgreSQL Database
DATABASE_URL="postgresql://username:password@host.region.neon.tech/dbname?sslmode=require"

# Next.js Configuration  
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Dashboard Configuration
NODE_ENV="development"
```

4. **Configurar base de datos**
```bash
# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev

# (Opcional) Seed con datos de ejemplo
npx prisma db seed
```

5. **Ejecutar en desarrollo**
```bash
pnpm dev
```

El dashboard estará disponible en `http://localhost:3000/dashboard`

## 📊 Componentes Principales

### KPI Card
Muestra métricas clave con:
- Valor actual y meta
- Tendencia (subida/bajada/estable)
- Porcentaje de cambio
- Categorización

### Process Selector
Selector de procesos de negocio con:
- Estado del proceso (activo/inactivo/mantenimiento)
- Información del propietario
- Cantidad de métricas asociadas

### Chart Wrapper
Componente unificado para gráficos:
- Line charts (tendencias)
- Bar charts (comparativas)
- Pie charts (distribuciones)
- Area charts (crecimiento)

## 🗄️ Base de Datos

### Modelos Principales

- **User**: Usuarios del sistema
- **Process**: Procesos de negocio
- **Metric**: Métricas y KPIs
- **Report**: Reportes generados
- **DashboardConfig**: Configuraciones personalizadas

### Esquema
Ver `prisma/schema.prisma` para el esquema completo.

## 🎨 Personalización

El dashboard soporta:
- Temas claro/oscuro
- Layouts personalizables
- Widgets configurables
- Filtros dinámicos
- Configuraciones por usuario

## 📈 Desarrollo

### Comandos Útiles

```bash
# Desarrollo
pnpm dev

# Build
pnpm build
pnpm start

# Linting
pnpm lint

# Base de datos
npx prisma studio           # Interfaz visual
npx prisma migrate dev      # Nuevas migraciones
npx prisma generate         # Regenerar cliente
```

### Agregar Nuevos KPIs

1. Definir en `src/types/dashboard.ts`
2. Crear componente en `src/components/dashboard/`
3. Agregar datos en `src/data/sample-data.ts`
4. Integrar en `src/app/dashboard/page.tsx`

### Agregar Nuevos Gráficos

1. Extender `ChartWrapper` con nuevo tipo
2. Implementar lógica de renderizado
3. Agregar datos de ejemplo
4. Documentar uso

## 🚀 Próximas Funcionalidades

- [ ] Autenticación de usuarios
- [ ] API REST completa
- [ ] Exportación de reportes (PDF/Excel)
- [ ] Alertas y notificaciones
- [ ] Dashboard en tiempo real
- [ ] Análisis predictivo
- [ ] Integración con APIs externas
- [ ] Cálculos avanzados personalizados

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 📞 Soporte

Para preguntas o soporte:
- Crear issue en GitHub
- Contactar al equipo de desarrollo

---
**Construido con ❤️ para análisis de datos avanzado**
