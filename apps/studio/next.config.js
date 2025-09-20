/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@contentsmith/database', '@contentsmith/validation', '@contentsmith/ui'],
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
  // For Docker deployment
  output: 'standalone',
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig