/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Optional same-origin API proxy. Configure via env only:
  //   BACKEND_URL=<your API origin, no path>
  //   NEXT_PUBLIC_API_BASE_URL=/api/v1
  // When BACKEND_URL is unset, the browser calls NEXT_PUBLIC_API_BASE_URL directly.
  async rewrites() {
    const origin = (process.env.BACKEND_URL || '').trim().replace(/\/+$/, '');
    if (!origin) return [];
    return [
      {
        source: '/api/v1/:path*',
        destination: `${origin}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;