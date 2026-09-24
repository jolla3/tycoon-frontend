/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The backend is a separate Express/MongoDB service (see NEXT_PUBLIC_API_BASE_URL).
  // We never proxy financial calculations through Next.js API routes — every
  // data request goes straight to the real backend, cookie-authenticated.
};

module.exports = nextConfig;
