/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    GAME_DATABASE_URL: process.env.GAME_DATABASE_URL,
  },
  output: 'standalone',
  webpack: (config, { dev, nextRuntime }) => {
    if (dev && nextRuntime === 'edge') {
      config.devtool = 'cheap-source-map';
    }
    return config;
  },
}

module.exports = nextConfig
