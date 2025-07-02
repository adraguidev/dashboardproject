import type { NextConfig } from "next";

// Solo cargar bundle analyzer en desarrollo o cuando se solicite análisis
const withBundleAnalyzer = process.env.NODE_ENV === 'development' || process.env.ANALYZE === 'true' 
  ? require('@next/bundle-analyzer')({
      enabled: process.env.ANALYZE === 'true',
    })
  : (config: NextConfig) => config;

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
    // Optimizar imports de paquetes pesados - carga solo lo que se usa
    optimizePackageImports: ['lucide-react', 'd3', 'recharts', '@radix-ui/react-dialog'],
  },
  
  // Excluir paquetes pesados del bundle del servidor
  serverExternalPackages: ['@aws-sdk/client-s3', '@aws-sdk/lib-storage', '@aws-sdk/s3-request-presigner', 'exceljs', 'googleapis'],
};

export default withBundleAnalyzer(nextConfig);
