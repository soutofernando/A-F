import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['qrcode'],
  async rewrites() {
    return [
      { source: '/despesas', destination: '/despensa' },
      { source: '/despesas/:path*', destination: '/despensa/:path*' },
    ];
  },
  async redirects() {
    return [{ source: '/confirmar', destination: '/', permanent: true }];
  },
};

export default nextConfig;
