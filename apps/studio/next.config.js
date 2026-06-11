const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost'],
  },
  webpack: (config, { dev, nextRuntime }) => {
    // The Edge Runtime sandbox disallows eval(), but Next.js dev mode uses
    // eval-source-map by default. Switch to a non-eval devtool for edge builds
    // to prevent "EvalError: Code generation from strings disallowed".
    if (dev && nextRuntime === 'edge') {
      config.devtool = 'cheap-source-map';
    }
    return config;
  },
}

module.exports = withNextIntl(nextConfig)