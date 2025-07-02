declare module '@next/bundle-analyzer' {
  import type { NextConfig } from 'next';

  export interface BundleAnalyzerOptions {
    enabled?: boolean;
  }

  function withBundleAnalyzer(options: BundleAnalyzerOptions): (config: NextConfig) => NextConfig;

  export default withBundleAnalyzer;
}