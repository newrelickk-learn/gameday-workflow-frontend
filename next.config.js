/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Jestテスト環境でrequire-hookを無効化
  experimental: {
    swcMinify: true,
  },
}

module.exports = nextConfig

