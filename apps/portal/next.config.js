/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Optimize for Cloudflare Pages deployment
  output: 'standalone',
}

module.exports = nextConfig
