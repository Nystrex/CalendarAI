/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Force clean build - change this value to bust cache
  env: {
    BUILD_ID: Date.now().toString(),
  },
}

export default nextConfig
