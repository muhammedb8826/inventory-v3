/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir:
    process.env.INVENTORY_E2E === "true"
      ? ".next-e2e"
      : process.env.INVENTORY_BUILD_CHECK === "true"
        ? ".next-build-check"
        : ".next",
  typescript: {
    tsconfigPath:
      process.env.INVENTORY_E2E === "true" ||
      process.env.INVENTORY_BUILD_CHECK === "true"
        ? "tsconfig.verify.json"
        : "tsconfig.json",
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
          },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
