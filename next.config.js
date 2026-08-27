const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  experimental: {
    swcMinify: true,
  },
  serverExternalPackages: ['newrelic'],
}

module.exports = nextConfig

