/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Must match your GitHub repository name when hosted at username.github.io/repo-name
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
