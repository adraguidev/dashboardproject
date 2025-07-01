import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Solo usar configuración de webpack cuando NO se use Turbopack
  // Turbopack maneja los polyfills automáticamente
  webpack: (config, { isServer, nextRuntime }) => {
    // Solo aplicar cuando no se usa Turbopack
    if (process.env.TURBOPACK !== '1' && !isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        stream: false,
        crypto: false,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
      };
    }
    return config;
  },

  // Directorio de salida para `next build`
  distDir: 'build',

  // Configuración de ESLint para permitir builds con warnings
  eslint: {
    // ¡Advertencia! Esto permite que los builds de producción se completen
    // incluso si el proyecto tiene errores de ESLint. Es útil para no bloquear
    // deploys por reglas de estilo o advertencias menores.
    ignoreDuringBuilds: true,
  },

  // Manejo de errores de hidratación de React
  reactStrictMode: true, // Habilitado para detectar problemas potenciales
  
  // No generar source-maps del navegador en producción; ahorra ~40-50 MB
  productionBrowserSourceMaps: false,
  
  // Configuraciones experimentales para Next.js 15
  experimental: {
    // Configuraciones específicas para Next.js 15 si las necesitamos
  },
};

export default nextConfig;
