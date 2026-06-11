/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  webpack: (config, { dev, nextRuntime }) => {
    if (dev && nextRuntime === 'edge') {
      config.devtool = 'cheap-source-map';
    }
    return config;
  },
}

module.exports = nextConfig
