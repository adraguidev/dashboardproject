# UFSM Dashboard - Plataforma de Análisis de Datos

Dashboard avanzado de alto rendimiento para el análisis de KPIs, métricas y procesos de negocio. Construido con un stack tecnológico moderno y enfocado en la performance y la experiencia de usuario.

![Dashboard Screenshot](https://i.imgur.com/your-screenshot.png) <!-- Reemplazar con una screenshot real -->

## 🚀 Características Principales

- **📊 KPIs Dinámicos**: Visualización de métricas clave con tendencias y comparativas en tiempo real.
- **📈 Gráficos Interactivos**: Múltiples tipos de gráficos (líneas, barras) usando Recharts, con carga optimizada.
- **🔄 Gestión de Procesos**: Análisis modular y separado para procesos de negocio (CCM y PRR).
- **⚡ Arquitectura de Alto Rendimiento**:
  - **Caché Multinivel**: Sistema de caché en memoria (server-side) y en cliente para una respuesta casi instantánea.
  - **Carga de Datos Unificada**: Hook `useDashboardUnified` que obtiene todos los datos necesarios en una sola petición.
  - **Prefetching Inteligente**: Precarga de datos de otros procesos en segundo plano para una navegación fluida.
- **📂 Carga de Archivos Optimizada**: Subida y procesamiento de archivos Excel (.xlsx, .xls) y CSV directamente a la base de datos a través de Cloudflare R2.
- **🔒 TypeScript End-to-End**: Totalmente tipado para robustez y mantenibilidad del código.
- **📱 Interfaz Moderna y Responsiva**: Construido con Tailwind CSS y Radix UI para una UI/UX de alta calidad en todos los dispositivos.
- **🔑 Gestión de Autenticación**: Sistema de autenticación integrado con Stackframe.

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 15.3 (con App Router y React 19)
- **Lenguaje**: TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Visualización de Datos**: Recharts
- **Gestión de Estado del Servidor**: TanStack Query (React Query) v5
- **ORM**: Drizzle ORM
- **Base de Datos**: PostgreSQL (optimizado para Neon Serverless)
- **Almacenamiento de Archivos**: Cloudflare R2
- **Autenticación**: Stackframe

## 📁 Estructura del Proyecto

La arquitectura está diseñada para ser escalable y mantenible.

```
dashboardproject/
├── src/
│   ├── app/                    # Rutas de la aplicación (App Router)
│   │   ├── dashboard/          # Página principal del dashboard
│   │   └── api/                # API Routes para backend
│   │       ├── dashboard/
│   │       │   ├── unified/    # Endpoint unificado de datos
│   │       │   └── upload-files/ # Endpoint para subida de archivos
│   │       └── ...
│   ├── components/             # Componentes React reutilizables
│   │   ├── ui/                 # Componentes de UI (botones, cards, etc.)
│   │   └── dashboard/          # Componentes específicos del dashboard
│   ├── hooks/                  # Custom Hooks de React
│   │   ├── use-dashboard-unified.ts # Hook principal para carga de datos
│   │   └── ...
│   ├── lib/                    # Librerías auxiliares y utilidades
│   │   ├── db.ts               # Lógica de conexión y queries con Drizzle
│   │   ├── server-cache.ts     # Sistema de caché del lado del servidor
│   │   └── ...
│   └── types/                  # Definiciones de tipos de TypeScript
├── public/                     # Archivos estáticos
├── scripts/                    # Scripts SQL para configuración
└── ...
```

## 🚦 Inicio Rápido

### Prerrequisitos

- Node.js v18+
- pnpm (recomendado)
- Una base de datos PostgreSQL (se recomienda [Neon](https://neon.tech/))
- Credenciales de Cloudflare R2 para la subida de archivos.

### Instalación

1.  **Clonar el repositorio**
    ```bash
    git clone git@github.com:adraguidev/dashboardproject.git
    cd dashboardproject
    ```

2.  **Instalar dependencias**
    ```bash
    pnpm install
    ```

3.  **Configurar variables de entorno**
    Crea un archivo `.env.local` en la raíz del proyecto basándote en `.env.example` (si existe) o usando las siguientes variables:

    ```env
    # Base de Datos PostgreSQL (Neon)
    # URL para la aplicación (pooler)
    DATABASE_URL="postgresql://user:password@host.region.neon.tech/dbname?sslmode=require"
    # URL para cargas masivas y migraciones (directa)
    DATABASE_DIRECT_URL="postgresql://user:password@host.region.neon.tech/dbname?sslmode=require"

    # Cloudflare R2 (para subida de archivos)
    CLOUDFLARE_R2_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
    CLOUDFLARE_R2_ACCESS_KEY_ID="..."
    CLOUDFLARE_R2_SECRET_ACCESS_KEY="..."
    CLOUDFLARE_R2_BUCKET_NAME="..."
    
    # Stackframe (Autenticación)
    NEXT_PUBLIC_STACK_API_URL="http://localhost:8000"
    NEXT_PUBLIC_STACK_PUBLISHABLE_KEY="..."
    ```

4.  **Ejecutar la aplicación en modo de desarrollo**
    ```bash
    pnpm dev
    ```

El dashboard estará disponible en `http://localhost:3000/dashboard`.

## ⚙️ Scripts Disponibles

-   `pnpm dev`: Inicia el servidor de desarrollo.
-   `pnpm build`: Compila la aplicación para producción.
-   `pnpm start`: Inicia un servidor de producción.
-   `pnpm lint`: Ejecuta el linter para revisar la calidad del código.

## 🗄️ Arquitectura de Datos

La aplicación utiliza un enfoque optimizado para la gestión de datos:

1.  **Drizzle ORM**: Se conecta directamente a la base de datos PostgreSQL para ejecutar queries de alta performance. Es un ORM ligero que no requiere un paso de "generación" como otros.
2.  **API Unificada**: El endpoint `/api/dashboard/unified` actúa como un Backend-For-Frontend (BFF), consolidando múltiples consultas a la base de datos en una sola petición HTTP desde el cliente.
3.  **Caché del Servidor**: Antes de consultar la base de datos, el endpoint de la API revisa un caché en memoria. Si los datos están presentes y no han expirado, se devuelven instantáneamente, evitando accesos innecesarios a la base de datos.
4.  **TanStack Query**: En el frontend, gestiona el estado del servidor, el `stale-while-revalidate`, el `prefetching` y las invalidaciones de caché del cliente.

Este flujo asegura que la UI sea extremadamente rápida, mostrando datos cacheados mientras obtiene actualizaciones frescas en segundo plano.

---
**Construido con un enfoque en la performance y la escalabilidad.**
