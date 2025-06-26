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
};

export default nextConfig;
