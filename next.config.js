/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["firebase-admin", "@google-cloud/firestore", "@opentelemetry/api"],
  images: {
    domains: ["ik.imagekit.io"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent webpack from trying to bundle optional opentelemetry modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "@opentelemetry/api": false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
