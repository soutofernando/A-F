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
};

export default nextConfig;
