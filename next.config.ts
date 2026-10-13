import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Ninguna página de la demo debe quedar en cachés intermedias: muestran datos de salud.
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'microphone=(self), camera=(), geolocation=()' },
      ],
    },
  ],
};

export default nextConfig;
