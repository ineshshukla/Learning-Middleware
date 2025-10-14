/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://www.gstatic.com; " +
              "frame-src 'self' https://accounts.google.com; " +
              "connect-src 'self' https://accounts.google.com http://itservices-gpurack.iiit.ac.in:8001/v1 http://localhost:8000 http://localhost:8001 http://localhost:8002 http://localhost:8003;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
